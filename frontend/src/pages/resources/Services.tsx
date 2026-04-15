import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { 
  Plus, Edit2, Trash2, Clock, Coins, Sparkles, X, 
  Upload, Camera, Search, User, Info, FileText, MapPin, Zap
} from 'lucide-react';
import { Modal } from '../../components/shared/Modal';
import { notify } from '../../components/shared/ZenNotification';
import { ZenIconButton, ZenBadge, ZenButton } from '../../components/zen/ZenButtons';
import { ZenDropdown, ZenInput, ZenTextarea } from '../../components/zen/ZenInputs';
import { useSettings } from '../../context/SettingsContext';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { useBranches } from '../../context/BranchContext';
import { useCategories } from '../../context/CategoryContext';


interface Branch {
  _id: string;
  name: string;
  isActive?: boolean;
}

interface Service {
  _id: string;
  name: string;
  duration: number;
  price: number;
  branch?: Branch;
  image?: string;
  category?: string;
  description?: string;
  status: 'Active' | 'Inactive';
  commissionType: 'Percentage' | 'Fixed';
  commissionValue: number;
}

const Services = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { branches, selectedBranch } = useBranches();
  const { getServiceCategories } = useCategories();
  const serviceCategories = getServiceCategories();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('zen_services_view') as 'grid' | 'table') || 'grid';
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };


  useEffect(() => {
    localStorage.setItem('zen_services_view', viewMode);
    setPage(1);
  }, [viewMode]);

  const PAGE_LIMIT = 12;

  const fetchServices = async () => {
    try {
      const response = await fetch(`${API_URL}/services?page=${page}&limit=${PAGE_LIMIT}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      if (data.data) {
        setServices(data.data);
        setTotalPages(data.pagination.pages);
      } else if (Array.isArray(data)) {
        setServices(data);
        setTotalPages(1);
      }
    } catch (error) {
      notify('error', 'Error', 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [page]);

  const filteredServices = useMemo(() => {
    let filtered = services;

    // Filter by Branch
    if (selectedBranch !== 'all') {
      filtered = filtered.filter(service => service.branch?._id === selectedBranch || (service as any).branch === selectedBranch);
    }

    // Filter by Search Term
    return filtered.filter(service => 
      service.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [services, searchTerm, selectedBranch]);

  const [formData, setFormData] = useState({
    name: '',
    duration: 60,
    price: 0,
    branch: '',
    category: 'None',
    description: '',
    image: '',
    status: 'Active' as 'Active' | 'Inactive',
    commissionType: 'Percentage' as 'Percentage' | 'Fixed',
    commissionValue: 10
  });

  const getImageUrl = (path: string | undefined) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.replace(/^\.?\//, '');
    return `${API_URL.replace('/api', '')}/${cleanPath}`;
  };

  const handleOpenModal = (service: Service | null = null) => {
    setImageFile(null);
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        duration: service.duration,
        price: service.price,
        branch: service.branch?._id || '',
        category: service.category || 'None',
        description: service.description || '',
        image: service.image || '',
        status: service.status || 'Active',
        commissionType: service.commissionType || 'Percentage',
        commissionValue: service.commissionValue || 0
      });
    } else {
      setEditingService(null);
      setFormData({
        name: '',
        duration: 60,
        price: 0,
        branch: selectedBranch === 'all' ? '' : selectedBranch,
        category: 'None',
        description: '',
        image: '',
        status: 'Active' as 'Active' | 'Inactive',
        commissionType: 'Percentage' as 'Percentage' | 'Fixed',
        commissionValue: 10
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingService ? `${API_URL}/services/${editingService._id}` : `${API_URL}/services`;
      const method = editingService ? 'PUT' : 'POST';
      
      const data = new FormData();
      data.append('name', formData.name);
      data.append('duration', (formData.duration ?? 0).toString());
      data.append('price', (formData.price ?? 0).toString());
      data.append('image', formData.image);
      data.append('category', formData.category);
      data.append('description', formData.description);
      data.append('branch', formData.branch);
      data.append('status', formData.status);
      data.append('commissionType', formData.commissionType);
      data.append('commissionValue', formData.commissionValue.toString());
      
      if (imageFile) {
        data.append('serviceImage', imageFile);
      }

      const response = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${user?.token}` 
        },
        body: data
      });

      if (response.ok) {
        notify('success', 'Refined', editingService ? 'Service updated' : 'Service curated');
        setIsModalOpen(false);
        fetchServices();
      } else {
        const error = await response.json();
        notify('error', 'Error', error.message || 'Action failed');
      }
    } catch (error) {
      notify('error', 'Error', 'Connection failed');
    }
  };

  const handleDelete = async (id: string) => {
    openConfirm(
      'Remove Service',
      'Remove this service from menu? This will delist the offering from the registry.',
      async () => {
        try {
          const response = await fetch(`${API_URL}/services/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${user?.token}` }
          });
          if (response.ok) {
            notify('success', 'Removed', 'Service delisted');
            fetchServices();
          }
        } catch (error) {
          notify('error', 'Error', 'Action failed');
        }
      }
    );
  };
  const toggleStatus = async (service: Service) => {
    try {
      const newStatus = service.status === 'Active' ? 'Inactive' : 'Active';
      const response = await fetch(`${API_URL}/services/${service._id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        notify('success', 'Status Switched', `Service is now ${newStatus}`);
        fetchServices();
      }
    } catch (error) {
      notify('error', 'Error', 'Failed to update status');
    }
  };



  return (
    <ZenPageLayout
      title="Services"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      addButtonLabel="Craft New Service"
      addButtonIcon={<Plus size={18} />}
      onAddClick={() => handleOpenModal()}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-zen-brown border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10">
          {filteredServices.map((service, i) => {
            const imgUrl = getImageUrl(service.image);
            const branchName = service.branch?.name || 'Sanctuary HQ';

            return (
              <div 
                key={service._id} 
                className="group relative bg-white/80 backdrop-blur-xl rounded-[2.5rem] sm:rounded-[4rem] shadow-sm border border-white overflow-hidden flex flex-col transition-all duration-700 hover:shadow-zen-brown/15 hover:-translate-y-2 animate-in fade-in slide-in-from-bottom-8"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {/* Visual Frame */}
                <div className="aspect-[16/9] sm:aspect-[4/3] relative overflow-hidden">
                  {imgUrl ? (
                    <img 
                      src={imgUrl} 
                      alt={service.name}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale-[0.2] group-hover:grayscale-0"
                    />
                  ) : (
                    <div className="w-full h-full bg-zen-cream flex items-center justify-center text-zen-brown/10">
                      <Sparkles size={48} strokeWidth={0.5} />
                    </div>
                  )}

                  {/* Dynamic Badges */}
                  <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex flex-col items-end gap-2">
                    <div className="px-3 py-1 sm:px-5 sm:py-2 backdrop-blur-3xl bg-white/80 rounded-full text-[9px] sm:text-[10px] font-bold tracking-widest text-zen-brown flex items-center gap-2 shadow-lg border border-white/20">
                      <Clock size={10} className="sm:w-3 sm:h-3 text-zen-brown/40" />
                      {service.duration} MIN
                    </div>
                    <div className="px-3 py-1 sm:px-5 sm:py-2 backdrop-blur-3xl bg-zen-brown/90 rounded-full text-[9px] sm:text-[10px] font-bold tracking-widest text-white flex items-center gap-2 shadow-lg">
                      <Coins size={10} className="sm:w-3 sm:h-3 text-white/40" />
                      {settings?.general?.currencySymbol || 'QR'} {service.price}
                    </div>
                  </div>

                  {/* Branch & Status Labels */}
                  <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 flex flex-col gap-2">
                    <span className="px-3 py-1 sm:px-4 sm:py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[8px] sm:text-[9px] font-bold tracking-widest text-white uppercase border border-white/40 shadow-sm">
                       {branchName}
                    </span>
                  </div>
                </div>
                
                <div className="p-6 sm:p-8 flex flex-col flex-1 gap-4 sm:gap-6">
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex items-center gap-2 text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.3em] text-zen-brown/40">
                      <Sparkles size={10} />
                      {service.category || 'Wellness Ritual'}
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-serif font-bold text-zen-brown leading-tight truncate-2-lines">{service.name}</h3>
                  </div>

                  {service.description && (
                    <p className="text-zen-brown/60 text-xs sm:text-sm leading-relaxed italic line-clamp-2">
                      {service.description}
                    </p>
                  )}
                  
                  <div className="mt-auto pt-4 sm:pt-6 flex items-center justify-between border-t border-zen-brown/5">
                    <div className="flex items-center gap-2">
                      <ZenBadge variant={service.status === 'Active' ? 'leaf' : 'sand'} className="lowercase italic font-serif text-[10px] sm:text-xs">
                        {service.status}
                      </ZenBadge>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                      <ZenIconButton 
                         icon={Zap} 
                         variant={service.status === 'Active' ? 'leaf' : 'sand'} 
                         onClick={() => toggleStatus(service)} 
                         className={service.status === 'Active' ? 'text-zen-leaf' : 'text-zen-sand'}
                         size="sm"
                         title="Toggle Presence"
                      />
                      <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(service)} size="sm" title="Refine Ritual" />
                      <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDelete(service._id)} size="sm" title="Decommission" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] sm:rounded-[3.5rem] shadow-sm border border-white overflow-hidden overflow-x-auto custom-scrollbar animate-in fade-in duration-700">
          <table className="w-full text-center border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-zen-brown border-b border-zen-brown/15">
                <th className="px-6 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center whitespace-nowrap">S NO</th>
                <th className="px-6 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Visual</th>
                <th className="px-6 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Branch</th>
                <th className="px-6 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Service Name</th>
                <th className="px-6 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Duration</th>
                <th className="px-6 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Price</th>
                <th className="px-10 py-8 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] whitespace-nowrap">Status</th>
                <th className="px-10 py-8 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zen-brown/15">
              {filteredServices.map((service, index) => (
                <tr key={service._id} className="hover:bg-zen-cream/5 transition-all duration-500 group">
                  <td className="px-8 py-5 text-center">
                    <span className="font-serif text-xl text-zen-brown/40">{((page - 1) * PAGE_LIMIT + index + 1).toString().padStart(2, '0')}</span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <div className="flex justify-center">
                      <div className="w-12 lg:w-16 h-10 lg:h-12 rounded-xl overflow-hidden bg-zen-cream border-2 border-white shadow-lg shrink-0 group-hover:scale-110 transition-transform duration-500 flex items-center justify-center">
                        {service.image ? (
                          <img src={getImageUrl(service.image)} className="w-full h-full object-cover" />
                        ) : (
                          <Sparkles className="text-zen-brown/20" size={16} />
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-black text-zen-brown/60 uppercase tracking-widest">{service.branch?.name || 'H.Q'}</span>
                  </td>
                  <td className="px-10 py-5 text-left">
                    <div className="flex flex-col items-center">
                      <p className="font-serif text-lg text-zen-brown font-black tracking-tight leading-tight whitespace-nowrap">{service.name}</p>
                      <p className="text-[9px] font-black text-zen-brown/20 uppercase tracking-widest mt-0.5">Premium Offering</p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center justify-center gap-2 text-[10px] text-zen-brown/70 italic font-black uppercase tracking-widest">
                      <Clock size={12} className="text-zen-sand" />
                      {service.duration} Min
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col items-center">
                      <p className="font-serif text-lg text-zen-brown font-black tracking-tight leading-tight whitespace-nowrap">{settings?.general?.currencySymbol || 'QR'} {service.price}</p>
                      <p className="text-[9px] font-black text-zen-brown/20 uppercase tracking-widest mt-0.5">Energy Exchange</p>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <ZenBadge variant={service.status === 'Active' ? 'leaf' : 'sand'} className="uppercase font-black tracking-widest">{service.status}</ZenBadge>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex items-center justify-end gap-3">
                       <ZenIconButton 
                          icon={Sparkles} 
                          variant={service.status === 'Active' ? 'leaf' : 'sand'} 
                          onClick={() => toggleStatus(service)} 
                          className={service.status === 'Active' ? 'text-zen-leaf' : 'text-zen-sand'}
                       />
                       <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(service)} />
                       <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDelete(service._id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ZenPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        maxWidth="max-w-4xl"
        title={editingService ? "Update Offering" : "Curate New Service"}
        subtitle="Premium Offering Registry"
        footer={
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full">
             <ZenButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="order-2 sm:order-1 flex-1 text-lg">Discard</ZenButton>
             <ZenButton onClick={(e) => {
               const form = document.getElementById('serviceForm') as HTMLFormElement;
               form?.requestSubmit();
             }} className="order-1 sm:order-2 flex-[2] text-lg">
                <span>{editingService ? 'Finalize Masterpiece' : 'Establish Offering'}</span>
                <Sparkles size={18} />
             </ZenButton>
          </div>
        }
      >
        <form id="serviceForm" onSubmit={handleSubmit} className="space-y-12">
           <div className="flex items-center gap-8 sm:gap-12">
              <div className="relative w-24 sm:w-40 h-24 sm:h-40 group cursor-pointer shrink-0">
                 <div className="w-full h-full rounded-[2.5rem] ring-4 ring-zen-sand/20 ring-offset-4 overflow-hidden bg-zen-cream flex items-center justify-center transition-all duration-700 group-hover:ring-zen-brown/20 shadow-xl relative">
                    {(imageFile || (editingService && editingService.image)) ? (
                      <img 
                        src={imageFile ? URL.createObjectURL(imageFile) : getImageUrl(editingService?.image)} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zen-sand/20 text-zen-brown font-serif text-4xl sm:text-6xl uppercase tracking-tighter profile-pic-placeholder">
                        {formData.name.charAt(0) || <Sparkles size={48} strokeWidth={0.5} />}
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="text-white" size={32} />
                    </div>
                 </div>
                 <input 
                   type="file" 
                   className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                   onChange={e => setImageFile(e.target.files?.[0] || null)} 
                 />
                 <div className="absolute bottom-1 right-1 p-3 bg-zen-brown text-white rounded-full shadow-lg scale-90 group-hover:scale-100 transition-all ring-4 ring-white"><Edit2 size={16} /></div>
              </div>

              <div className="flex-1">
                 <ZenInput label="Offered Name" placeholder="E.g. Himalayan Salt Therapy" value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} className="font-serif text-2xl sm:text-5xl border-none p-0 h-auto font-bold tracking-tighter" />
                 <p className="mt-4 text-[11px] font-bold text-zen-brown/20 uppercase tracking-[0.5em]">Identity & Recognition</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 sm:gap-x-16 gap-y-10 sm:gap-y-14 animate-in fade-in duration-500">
              <ZenInput 
                label={`Price (${settings?.general.currencySymbol || 'QR'})`} 
                icon={Coins} 
                type="number"
                placeholder="0"
                value={formData.price} 
                onChange={(e: any) => setFormData({...formData, price: parseInt(e.target.value) || 0})} 
              />
              <ZenInput 
                label="Sacred Duration (Minutes)" 
                icon={Clock} 
                type="number"
                placeholder="60"
                value={formData.duration} 
                onChange={(e: any) => setFormData({...formData, duration: parseInt(e.target.value) || 0})} 
              />
              
              <ZenDropdown 
                 label="Assigned Branch" 
                 options={['None', ...branches.filter(b => b.isActive).map(b => b.name)]} 
                 value={branches.find(b => b._id === formData.branch)?.name || 'None'} 
                 onChange={(val) => {
                   const branch = branches.filter(b => b.isActive).find(b => b.name === val);
                   setFormData({...formData, branch: branch ? branch._id : ''});
                 }} 
              />

              <ZenDropdown 
                 label="Service Category" 
                 options={['None', ...serviceCategories]} 
                 value={formData.category} 
                 onChange={(val: any) => setFormData({...formData, category: val})} 
              />
              
              <ZenDropdown 
                 label="Initial State"
                 options={['Active', 'Inactive']}
                 value={formData.status}
                 onChange={(val: any) => setFormData({...formData, status: val})}
              />
              
              <div className="md:col-span-2">
                 <ZenTextarea 
                   label="Ritual Description & Inner Resonance" 
                   placeholder="Describe the soul of this service, its benefits, and sensory journey..." 
                   value={formData.description}
                   onChange={(e: any) => setFormData({...formData, description: e.target.value})}
                 />
              </div>

               <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-10 p-10 bg-zen-sand/5 rounded-[3rem] border border-zen-sand/10 shadow-inner">
                  <div className="md:col-span-2 pb-4 border-b border-zen-brown/10 flex items-center justify-between">
                     <p className="text-[11px] font-bold text-zen-brown/40 uppercase tracking-[0.4em] flex items-center gap-3">
                        <Zap size={14} className="text-zen-sand" /> Commission Configuration
                     </p>
                     <ZenBadge variant="sand" className="scale-90 opacity-40">Golden Intelligence</ZenBadge>
                  </div>
                  <ZenDropdown 
                     label="Reward Logic" 
                     options={['Percentage', 'Fixed']} 
                     value={formData.commissionType} 
                     onChange={(val: any) => setFormData({...formData, commissionType: val})} 
                  />
                  <ZenInput 
                     label={formData.commissionType === 'Percentage' ? "Reward Value (%)" : `Reward Value (${settings?.general.currencySymbol || 'QR'})`} 
                     icon={Sparkles} 
                     type="number"
                     placeholder="e.g. 10"
                     value={formData.commissionValue} 
                     onChange={(e: any) => setFormData({...formData, commissionValue: parseInt(e.target.value) || 0})} 
                  />
               </div>
           </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
      />
    </ZenPageLayout>

  );
};

export default Services;
