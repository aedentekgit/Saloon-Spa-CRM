import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { ZenPageLayout } from '../components/zen/ZenLayout';
import { 
  Plus, Edit2, Trash2, Clock, Coins, Sparkles, X, 
  Upload, Camera, Search, User, Info, FileText, MapPin, Zap
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { notify } from '../components/ZenNotification';
import { ZenIconButton, ZenBadge, ZenButton } from '../components/zen/ZenButtons';
import { ZenDropdown, ZenInput, ZenTextarea } from '../components/zen/ZenInputs';
import { useSettings } from '../context/SettingsContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useBranches } from '../context/BranchContext';
import { useCategories } from '../context/CategoryContext';


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
  
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('zen_services_view') as 'grid' | 'table') || 'grid';
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100/api';

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
  }, [viewMode]);

  const fetchServices = async () => {
    try {
      const response = await fetch(`${API_URL}/services`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setServices(data);
      }
    } catch (error) {
      notify('error', 'Error', 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredServices.map((service) => (
            <div key={service._id} className="group relative bg-white/80 backdrop-blur-xl rounded-[3.5rem] shadow-2xl shadow-zen-brown/5 border border-white overflow-hidden flex flex-col transition-all duration-700 hover:shadow-zen-brown/15 hover:-translate-y-2">
              <div className="h-40 sm:h-48 relative overflow-hidden">
                {service.image ? (
                  <img 
                    src={getImageUrl(service.image)} 
                    alt={service.name}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-zen-cream flex items-center justify-center text-zen-brown/10">
                    <Sparkles size={48} strokeWidth={0.5} />
                  </div>
                )}
                <div className="absolute top-5 right-5">
                   <ZenBadge variant={service.status === 'Active' ? 'leaf' : 'sand'} className="backdrop-blur-md bg-white/80 py-1.5 px-4 text-[10px] tracking-widest uppercase">{service.status}</ZenBadge>
                </div>
              </div>
              
              <div className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                   <h3 className="text-2xl font-serif font-bold text-zen-brown tracking-tight truncate">{service.name}</h3>
                   <div className="flex items-center gap-2">
                      <MapPin size={10} className="text-zen-brown/30" />
                      <p className="text-[9px] font-bold text-zen-brown/40 uppercase tracking-widest leading-none">{service.branch?.name || 'Sanctuary HQ'}</p>
                   </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-8">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest mb-1">Duration</span>
                      <div className="flex items-center gap-2 text-zen-brown font-serif italic text-sm">
                        <Clock size={16} className="text-zen-brown/20" />
                        <span>{service.duration} min</span>
                      </div>
                    </div>
                    <div className="flex flex-col border-l border-zen-brown/5 pl-8">
                      <span className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest mb-1">Price</span>
                      <div className="flex items-center gap-2 text-zen-brown font-bold text-sm">
                        <Coins size={16} className="text-zen-brown/20" />
                        <span>{settings?.general.currencySymbol || 'QR'} {service.price}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-500">
                    <ZenIconButton 
                       icon={Sparkles} 
                       variant={service.status === 'Active' ? 'leaf' : 'sand'} 
                       onClick={() => toggleStatus(service)} 
                       className={service.status === 'Active' ? 'text-zen-leaf' : 'text-zen-sand'}
                    />
                    <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(service)} />
                    <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDelete(service._id)} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-xl rounded-[3.5rem] shadow-2xl shadow-zen-brown/5 border border-white overflow-hidden overflow-x-auto custom-scrollbar animate-in fade-in duration-700">
          <table className="w-full text-center border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-zen-cream/10 border-b border-zen-brown/5">
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">S NO</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Visual</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Branch</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Service Name</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Duration</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Price</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Status</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zen-brown/5">
              {filteredServices.map((service, index) => (
                <tr key={service._id} className="hover:bg-zen-cream/5 transition-all duration-500 group">
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <span className="font-serif text-base lg:text-lg text-zen-brown/40">{(index + 1).toString().padStart(2, '0')}</span>
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
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <span className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest">{service.branch?.name || 'H.Q'}</span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <div className="flex flex-col items-center">
                      <p className="font-serif text-base lg:text-lg text-zen-brown tracking-tight font-bold whitespace-nowrap">{service.name}</p>
                      <p className="text-[8px] lg:text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest mt-0.5 lg:mt-1">Premium Offering</p>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <div className="flex items-center justify-center gap-2 text-sm text-zen-brown/70 italic font-medium">
                      <Clock size={12} />
                      {service.duration} Min
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <div className="flex flex-col items-center">
                      <p className="font-serif text-base lg:text-lg text-zen-brown tracking-tight font-bold whitespace-nowrap">{settings?.general.currencySymbol || 'QR'} {service.price}</p>
                      <p className="text-[8px] lg:text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest mt-0.5 lg:mt-1">Energy Exchange</p>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6 text-center">
                    <ZenBadge variant={service.status === 'Active' ? 'leaf' : 'sand'}>{service.status}</ZenBadge>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <div className="flex items-center justify-center gap-2 lg:gap-3">
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

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        hideHeader 
        maxWidth="max-w-4xl"
        title={editingService ? "Update Offering" : "Curate New Service"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-[90vh] sm:h-[85vh] w-full relative">
          
          <div className="flex items-center justify-between px-6 sm:px-10 py-6 sm:py-10 border-b border-zen-brown/5 sticky top-0 bg-white/95 backdrop-blur-sm z-[60]">
             <div className="flex items-center gap-4 sm:gap-8 flex-1">
                <div className="relative w-24 sm:w-32 h-24 sm:h-32 group cursor-pointer shrink-0">
                   <div className="w-full h-full rounded-3xl ring-4 ring-zen-cream ring-offset-4 overflow-hidden bg-zen-cream flex items-center justify-center transition-all duration-700 group-hover:ring-zen-brown/20 shadow-2xl relative">
                      {(imageFile || (editingService && editingService.image)) ? (
                        <img 
                          src={imageFile ? URL.createObjectURL(imageFile) : getImageUrl(editingService?.image)} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zen-sand/20 text-zen-brown font-serif text-5xl uppercase tracking-tighter profile-pic-placeholder">
                          {formData.name.charAt(0) || <Sparkles size={40} strokeWidth={1} />}
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
                   <div className="absolute bottom-1 right-1 p-2.5 bg-zen-brown text-white rounded-full shadow-2xl scale-90 group-hover:scale-100 transition-all ring-4 ring-white"><Edit2 size={12} /></div>
                </div>

                <div className="space-y-4 flex-1">
                   <ZenInput label="Service Identity" placeholder="E.g. Himalayan Salt Therapy" value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} className="font-serif text-2xl sm:text-4xl border-none p-0 h-auto" />
                   <div className="w-full sm:w-80 relative">
                      <p className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.4em]">Premium Offering Registry</p>
                   </div>
                </div>
             </div>
             <ZenIconButton icon={X} onClick={() => setIsModalOpen(false)} className="self-start mt-2" />
          </div>

          <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-8 sm:py-12 scrollbar-none pb-40">
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

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-10 p-8 bg-zen-sand/5 rounded-[2.5rem] border border-zen-sand/10">
                   <div className="md:col-span-2 pb-2 border-b border-zen-brown/5 flex items-center justify-between">
                      <p className="text-[10px] font-bold text-zen-brown uppercase tracking-widest flex items-center gap-2">
                         <Zap size={12} className="text-zen-sand" /> Commission Flow Configuration
                      </p>
                      <ZenBadge variant="sand">Golden Intelligence</ZenBadge>
                   </div>
                   <ZenDropdown 
                      label="Reward Logic" 
                      options={['Percentage', 'Fixed']} 
                      value={formData.commissionType} 
                      onChange={(val: any) => setFormData({...formData, commissionType: val})} 
                   />
                   <ZenInput 
                      label={formData.commissionType === 'Percentage' ? "Commission Value (%)" : `Commission Value (${settings?.general.currencySymbol || 'QR'})`} 
                      icon={Sparkles} 
                      type="number"
                      placeholder="e.g. 10"
                      value={formData.commissionValue} 
                      onChange={(e: any) => setFormData({...formData, commissionValue: parseInt(e.target.value) || 0})} 
                   />
                </div>
            </div>
          </div>

          <div className="px-6 sm:px-12 py-6 sm:py-10 border-t border-zen-brown/5 bg-white/95 backdrop-blur-sm sticky bottom-0 z-[60] flex flex-col sm:flex-row gap-4 sm:gap-6">
             <ZenButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="order-2 sm:order-1 flex-1 text-lg">Discard</ZenButton>
             <ZenButton type="submit" className="order-1 sm:order-2 flex-[2] text-lg">
                <span>{editingService ? 'Finalize Masterpiece' : 'Establish Offering'}</span>
                <Sparkles size={18} />
             </ZenButton>
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
