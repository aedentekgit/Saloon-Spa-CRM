import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { 
  Plus, Edit2, Trash2, Clock, Coins, Sparkles, X, 
  Upload, Camera, Search, User, Info, FileText, MapPin, Zap,
  Grid, List
} from 'lucide-react';
import { Modal } from '../../components/shared/Modal';
import { notify } from '../../components/shared/ZenNotification';
import { ZenIconButton, ZenBadge, ZenButton } from '../../components/zen/ZenButtons';
import { ZenStatCard } from '../../components/zen/ZenStatCard';
import { ZenDropdown, ZenInput, ZenTextarea } from '../../components/zen/ZenInputs';
import { useSettings } from '../../context/SettingsContext';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { useBranches } from '../../context/BranchContext';
import { useCategories } from '../../context/CategoryContext';
import { getPollIntervalMs, shouldPollNow } from '../../utils/polling';


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
  inventoryUsage?: {
    inventoryItem: any;
    quantity: number;
    unit: string;
  }[];
}

const Services = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { branches, selectedBranch, setSelectedBranch } = useBranches();
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
  const [activeTab, setActiveTab] = useState<'basic' | 'inventory' | 'commission'>('basic');
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [inventoryList, setInventoryList] = useState<any[]>([]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

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

  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchServices = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: PAGE_LIMIT.toString(),
        search: debouncedSearch,
        branch: selectedBranch !== 'all' ? selectedBranch : ''
      });

      const response = await fetch(`${API_URL}/services?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });
      const data = await response.json();
      if (data.data) {
        setServices(Array.isArray(data.data) ? data.data : []);
        setTotalPages(data.pagination?.pages || 1);
      } else if (Array.isArray(data)) {
        setServices(data);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      if (!silent) notify('error', 'Error', 'Failed to load services');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();

    const interval = setInterval(() => {
      if (!shouldPollNow()) return;
      fetchServices(true);
    }, getPollIntervalMs(30000)); // default 30s

    return () => clearInterval(interval);
  }, [page, debouncedSearch, selectedBranch, user?.token]);

  const fetchInventory = async () => {
    try {
      const response = await fetch(`${API_URL}/inventory?limit=1000`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      setInventoryList(data.data || []);
    } catch (error) {
      console.error('Fetch inventory error:', error);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const filteredServices = services;

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
    commissionValue: 10,
    inventoryUsage: [] as any[]
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
        commissionValue: service.commissionValue || 0,
        inventoryUsage: service.inventoryUsage?.map(usage => ({
          inventoryItem: usage.inventoryItem?._id || usage.inventoryItem,
          quantity: usage.quantity,
          unit: usage.unit
        })) || []
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
        commissionValue: 10,
        inventoryUsage: []
      });
    }
    setActiveTab('basic');
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
      data.append('inventoryUsage', JSON.stringify(formData.inventoryUsage));
      
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
         notify('success', 'Service Saved', editingService ? 'Service updated successfully' : 'Service created successfully');
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
      'Are you sure you want to remove this service? This will delete the service from the system.',
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
      hideSearch
      hideBranchSelector
      hideViewToggle
      hideAddButton={user?.role === 'Client'}
      onAddClick={() => handleOpenModal()}
    >
      <div className="space-y-10 pb-20">
        {/* Dynamic Summary Cards */}
        <div className="flex overflow-x-auto overflow-y-visible pt-4 pb-6 gap-6 lg:grid lg:grid-cols-4 lg:gap-8 lg:overflow-visible scrollbar-hide px-4 lg:px-2">
          {[
            { label: 'Total Services', value: services.length, icon: Sparkles, color: 'text-yellow-600', bg: 'bg-yellow-600/10', glow: 'bg-yellow-600/20', trend: 'Catalog size' },
            { label: 'Active Presence', value: services.filter(s => s.status === 'Active').length, icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', trend: 'Live services' },
            { label: 'System Inactive', value: services.filter(s => s.status !== 'Active').length, icon: X, color: 'text-rose-500', bg: 'bg-rose-500/10', glow: 'bg-rose-500/20', trend: 'Offline services' },
            { label: 'Service Categories', value: serviceCategories.length, icon: Info, color: 'text-zen-sand', bg: 'bg-zen-sand/10', glow: 'bg-zen-sand/20', trend: 'Service groups' }
          ].map((stat, i) => (
            <ZenStatCard key={i} {...stat} delay={i * 0.05} />
          ))}
        </div>

        {/* Global Filter Bar */}
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl border border-zen-brown/15 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-8 items-end">
            <div className="flex-1 w-full flex flex-col gap-3">
               <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-2">Service Search</label>
               <div className="relative group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zen-brown/20 group-focus-within:text-zen-sand transition-colors" size={16} />
                  <input 
                    type="text"
                    placeholder="Search services by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-6 py-3.5 bg-zen-cream/30 border border-zen-brown/10 rounded-xl focus:bg-white focus:ring-4 focus:ring-zen-sand/5 focus:border-zen-sand/20 outline-none transition-all duration-500 text-sm font-medium shadow-sm"
                  />
               </div>
            </div>

            <div className="flex flex-wrap lg:flex-nowrap gap-4 w-full lg:w-auto items-end">
               <div className="flex items-center gap-4">
                  <div className="w-full lg:w-[240px]">
                     <ZenDropdown 
                       label="Active Branch"
                       options={['All Branches', ...branches.map(b => b.name)]}
                       value={branches.find(b => b._id === selectedBranch)?.name || 'All Branches'}
                       onChange={(val: any) => {
                         if (val === 'All Branches') {
                           setSelectedBranch('all');
                         } else {
                           const branch = branches.find(b => b.name === val);
                           if (branch) setSelectedBranch(branch._id);
                         }
                       }}
                       className="w-full"
                     />
                  </div>

                  <div className="flex flex-col gap-3">
                     <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-2">Perspective</label>
                     <div className="flex items-center h-[48px] bg-zen-cream/50 p-1 rounded-xl border border-zen-brown/10 shadow-inner">
                        <button 
                          onClick={() => setViewMode('grid')}
                          className={`h-full aspect-square flex items-center justify-center rounded-lg transition-all duration-500 ${viewMode === 'grid' ? 'bg-zen-brown text-white shadow-lg' : 'text-zen-brown/30 hover:text-zen-brown hover:bg-white'}`}
                        >
                          <Grid size={16} />
                        </button>
                        <button 
                          onClick={() => setViewMode('table')}
                          className={`h-full aspect-square flex items-center justify-center rounded-lg transition-all duration-500 ${viewMode === 'table' ? 'bg-zen-brown text-white shadow-lg' : 'text-zen-brown/30 hover:text-zen-brown hover:bg-white'}`}
                        >
                          <List size={16} />
                        </button>
                     </div>
                  </div>
               </div>

               {user?.role !== 'Client' && (
                  <div className="flex flex-col gap-3 w-full lg:w-auto">
                     <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-2">Action</label>
                     <ZenButton onClick={() => handleOpenModal()} variant="primary" className="w-full sm:w-auto px-8 h-[48px] shadow-sm flex items-center justify-center gap-2 group">
                        <Plus size={16} className="group-hover:rotate-90 transition-transform duration-500" />
                        <span className="uppercase tracking-[0.2em] text-[10px] font-black">Enroll Service</span>
                     </ZenButton>
                  </div>
               )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-10 h-10 border-4 border-zen-brown border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredServices.map((service, i) => {
              const imgUrl = getImageUrl(service.image);
              const branchName = service.branch?.name || 'Main Registry';

              return (
                <div 
                  key={service._id} 
                  className="group relative bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-zen-brown/15 overflow-hidden flex flex-col transition-all duration-700 hover:shadow-xl hover:translate-y-[-4px]"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {/* Visual Frame */}
                  <div className="aspect-[16/10] relative overflow-hidden bg-zen-cream/50">
                    {imgUrl ? (
                      <img 
                        src={imgUrl} 
                        alt={service.name}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zen-brown/10">
                        <Sparkles size={48} strokeWidth={0.5} />
                      </div>
                    )}

                    {/* Status Badges */}
                    <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                      <div className="px-3 py-1 rounded-full text-[9px] font-black tracking-widest bg-white/90 text-zen-brown border border-white/20 shadow-lg">
                        {service.duration} MIN
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 flex flex-col flex-1">
                    <div className="mb-4">
                       <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zen-brown/30">{service.category || 'General Service'}</span>
                       <h3 className="text-xl font-serif font-black text-zen-brown leading-tight truncate-2-lines">{service.name}</h3>
                    </div>

                    <div className="mt-auto pt-4 flex flex-col gap-4">
                       <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                             <span className="text-[18px] font-serif font-black text-zen-brown leading-none">
                                {settings?.general?.currencySymbol || 'QR'} {service.price}
                             </span>
                             <span className="text-[8px] font-black text-zen-brown/30 uppercase tracking-widest mt-1">Rate</span>
                          </div>
                          <ZenBadge variant={service.status === 'Active' ? 'leaf' : 'sand'} className="text-[8px] font-bold uppercase py-1">{branchName}</ZenBadge>
                       </div>
                       
                       <div className="flex items-center justify-between gap-2 pt-4 border-t border-black/[0.03]">
                          <ZenBadge variant={service.status === 'Active' ? 'leaf' : 'sand'} className="text-[8px] font-black uppercase tracking-widest px-3">{service.status}</ZenBadge>
                          {user?.role !== 'Client' && (
                             <div className="flex items-center gap-2">
                                <ZenIconButton 
                                   icon={Zap} 
                                   variant={service.status === 'Active' ? 'leaf' : 'sand'} 
                                   onClick={() => toggleStatus(service)} 
                                />
                                <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(service)} />
                                <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDelete(service._id)} />
                             </div>
                          )}
                       </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full bg-white rounded-xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden table-container animate-in fade-in duration-700">
            <table className="w-full text-center border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-zen-brown text-white/50 border-y border-zen-brown/10">
                  <th>S No</th>
                  <th>Visual</th>
                  <th>Protocol Details</th>
                  <th>Metrics</th>
                  <th>Mechanism & Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(!filteredServices || filteredServices.length === 0) && (
                   <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-[11px] font-sans text-gray-400 bg-gray-50/30">No services recorded in the workspace</td>
                   </tr>
                )}

                {filteredServices.map((service, index) => {
                  const branchName = service.branch?.name || 'Main Registry';
                  return (
                    <tr key={service._id} className="transition-all group border-b border-black/[0.02]">
                      <td className="text-center italic opacity-40 text-[11px]">
                        {((page - 1) * PAGE_LIMIT + index + 1).toString().padStart(2, '0')}
                      </td>
                      <td>
                        <div className="flex justify-center">
                          <div className="w-12 h-10 zen-pointed-surface overflow-hidden bg-zen-cream border border-zen-brown/10 shadow-sm shrink-0 group-hover:scale-110 transition-transform duration-500 flex items-center justify-center text-xs">
                            {service.image ? (
                              <img src={getImageUrl(service.image)} className="w-full h-full object-cover" />
                            ) : (
                              <Sparkles className="text-zen-brown/20" size={16} />
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col items-center px-6">
                          <span className="zen-table-primary">{service.name}</span>
                          <span className="zen-table-meta">{branchName} • {service.category || 'General'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col items-center">
                          <span className="text-base font-serif font-black text-zen-brown leading-none">
                            {settings?.general?.currencySymbol || 'QR'} {service.price}
                          </span>
                          <span className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest mt-1">{service.duration} MIN</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex justify-center">
                          <ZenBadge variant={service.status === 'Active' ? 'leaf' : 'sand'}>
                            {service.status}
                          </ZenBadge>
                        </div>
                      </td>
                        <td>
                          <div className="flex items-center justify-center gap-2">
                            <ZenIconButton 
                              icon={Zap} 
                              variant={service.status === 'Active' ? 'leaf' : 'sand'} 
                              onClick={() => toggleStatus(service)} 
                            />
                            <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(service)} />
                            <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDelete(service._id)} />
                          </div>
                        </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}


      <ZenPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        maxWidth="max-w-4xl"
        title={editingService ? "Edit Service" : "New Service"}
        subtitle="Create and update service definitions"
        footer={
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full">
             <ZenButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="order-2 sm:order-1 flex-1 text-lg">Cancel</ZenButton>
             <ZenButton onClick={(e) => {
               const form = document.getElementById('serviceForm') as HTMLFormElement;
               form?.requestSubmit();
             }} className="order-1 sm:order-2 flex-[2] text-lg">
                <span>{editingService ? 'Save Service' : 'Create Service'}</span>
                <Sparkles size={18} />
             </ZenButton>
          </div>
        }
      >
        <div className="flex items-center gap-3 mb-10 overflow-x-auto scrollbar-hide pb-2 border-b border-zen-brown/5">
            {[
              { id: 'basic', label: 'Basic Info', icon: Info },
              { id: 'inventory', label: 'Inventory', icon: Grid },
              { id: 'commission', label: 'Commission', icon: Zap }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-t-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 whitespace-nowrap border-b-2 ${
                  activeTab === tab.id 
                    ? 'bg-zen-brown/5 text-zen-brown border-zen-brown' 
                    : 'bg-transparent text-zen-brown/30 border-transparent hover:text-zen-brown/60 hover:bg-zen-cream/30'
                }`}
              >
                <tab.icon size={14} className={activeTab === tab.id ? 'text-zen-sand' : 'text-zen-brown/20'} />
                {tab.label}
              </button>
            ))}
        </div>

        <form id="serviceForm" onSubmit={handleSubmit} className="space-y-12">
           {activeTab === 'basic' && (
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="space-y-12"
             >
                <div className="flex items-center gap-8 sm:gap-12">
                   <div className="relative w-24 sm:w-40 h-24 sm:h-40 group cursor-pointer shrink-0">
                      <div className="w-full h-full zen-pointed-surface ring-4 ring-zen-sand/20 ring-offset-4 overflow-hidden bg-zen-cream flex items-center justify-center transition-all duration-700 group-hover:ring-zen-brown/20 shadow-xl relative">
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
                      <ZenInput label="Service Name" placeholder="E.g. Himalayan Salt Therapy" value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} className="font-serif text-2xl sm:text-5xl border-none p-0 h-auto font-bold tracking-tighter" />
                      <p className="mt-4 text-[11px] font-bold text-zen-brown/20 uppercase tracking-[0.5em]">Core identity</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 sm:gap-x-16 gap-y-10 sm:gap-y-14 animate-in fade-in duration-500">
                   <ZenInput 
                     label={`Price (${settings?.general?.currencySymbol || 'QR'})`} 
                     icon={Coins} 
                     type="number"
                     placeholder="0.00"
                     value={formData.price} 
                     onChange={(e: any) => setFormData({...formData, price: parseInt(e.target.value) || 0})} 
                   />
                   <ZenInput 
                     label="Duration (Minutes)" 
                     icon={Clock} 
                     type="number"
                     placeholder="60"
                     value={formData.duration} 
                     onChange={(e: any) => setFormData({...formData, duration: parseInt(e.target.value) || 0})} 
                   />
                   
                   <ZenDropdown 
                      label="Primary Branch" 
                      options={['None', ...(branches || []).map(b => b.name)]} 
                      value={(branches || []).find(b => b._id === formData.branch)?.name || 'None'} 
                      onChange={(val) => {
                        const branch = (branches || []).find(b => b.name === val);
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
                      label="Availability Status"
                      options={['Active', 'Inactive']}
                      value={formData.status}
                      onChange={(val: any) => setFormData({...formData, status: val})}
                   />
                   
                   <div className="md:col-span-2">
                      <ZenTextarea 
                        label="Service Description" 
                        placeholder="Provide a detailed description of the service, including benefits and protocols..." 
                        value={formData.description}
                        onChange={(e: any) => setFormData({...formData, description: e.target.value})}
                      />
                   </div>
                </div>
             </motion.div>
           )}

           {activeTab === 'inventory' && (
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="space-y-8"
             >
                <div className="md:col-span-2 space-y-8 p-10 bg-zen-sand/5 rounded-[1.5rem] border border-zen-sand/10 shadow-inner">
                   <div className="flex items-center justify-between pb-4 border-b border-zen-brown/10 mb-8">
                      <div className="flex items-center gap-3">
                         <Grid size={16} className="text-zen-sand" />
                         <p className="text-[11px] font-bold text-zen-brown/40 uppercase tracking-[0.4em]">Inventory Consumption</p>
                      </div>
                      <ZenButton 
                        type="button" 
                        variant="secondary" 
                        className="scale-90 text-[10px] py-2"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            inventoryUsage: [...formData.inventoryUsage, { inventoryItem: '', quantity: 0, unit: 'ml' }]
                          });
                        }}
                      >
                        <Plus size={14} /> Add Product
                      </ZenButton>
                   </div>

                   {formData.inventoryUsage.length === 0 ? (
                     <div className="py-24 flex flex-col items-center justify-center text-zen-brown/20 border-2 border-dashed border-zen-brown/5 rounded-2xl">
                        <Grid size={48} strokeWidth={1} className="mb-4 opacity-50" />
                        <p className="text-xs uppercase tracking-widest font-black">No products linked to this service</p>
                        <p className="text-[10px] opacity-60 mt-2">Add supplies required for this treatment</p>
                     </div>
                   ) : (
                     <div className="space-y-4">
                       {formData.inventoryUsage.map((usage: any, index: number) => (
                         <div key={index} className="flex flex-col md:flex-row gap-4 items-end bg-white/50 p-6 rounded-2xl border border-zen-brown/5 shadow-sm group hover:border-zen-sand/30 transition-all duration-500">
                            <div className="flex-1 w-full">
                               <ZenDropdown 
                                 label="Product" 
                                 options={['Select Product', ...inventoryList.map(i => i.name)]}
                                 value={inventoryList.find(i => i._id === usage.inventoryItem)?.name || 'Select Product'}
                                 onChange={(val) => {
                                   const product = inventoryList.find(i => i.name === val);
                                   const newList = [...formData.inventoryUsage];
                                   newList[index] = { 
                                     ...newList[index], 
                                     inventoryItem: product?._id || '',
                                     unit: product?.unit || 'ml'
                                   };
                                   setFormData({ ...formData, inventoryUsage: newList });
                                 }}
                               />
                            </div>
                            <div className="w-full md:w-32">
                               <ZenInput 
                                 label="Qty" 
                                 type="number"
                                 value={usage.quantity}
                                 onChange={(e: any) => {
                                   const newList = [...formData.inventoryUsage];
                                   newList[index].quantity = parseFloat(e.target.value) || 0;
                                   setFormData({ ...formData, inventoryUsage: newList });
                                 }}
                               />
                            </div>
                            <div className="w-full md:w-32">
                               <ZenDropdown 
                                 label="Unit"
                                 options={['ml', 'gm', 'L', 'kg', 'Nos', 'Pack', 'Bottle']}
                                 value={usage.unit}
                                 onChange={(val: any) => {
                                   const newList = [...formData.inventoryUsage];
                                   newList[index].unit = val;
                                   setFormData({ ...formData, inventoryUsage: newList });
                                 }}
                               />
                            </div>
                            <ZenIconButton 
                              type="button"
                              icon={Trash2} 
                              variant="danger" 
                              className="mb-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                const newList = formData.inventoryUsage.filter((_, i) => i !== index);
                                setFormData({ ...formData, inventoryUsage: newList });
                              }}
                            />
                         </div>
                       ))}
                     </div>
                   )}
                </div>
             </motion.div>
           )}

           {activeTab === 'commission' && (
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="space-y-8"
             >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 p-10 bg-zen-sand/5 rounded-[1.5rem] border border-zen-sand/10 shadow-inner">
                   <div className="md:col-span-2 pb-4 border-b border-zen-brown/10 flex items-center justify-between">
                      <p className="text-[11px] font-bold text-zen-brown/40 uppercase tracking-[0.4em] flex items-center gap-3">
                         <Zap size={14} className="text-zen-sand" /> Commission Rules
                      </p>
                      <ZenBadge variant="sand" className="scale-90 opacity-40">Staff Rewards</ZenBadge>
                   </div>
                   <ZenDropdown 
                      label="Commission Type" 
                      options={['Percentage', 'Fixed']} 
                      value={formData.commissionType} 
                      onChange={(val: any) => setFormData({...formData, commissionType: val})} 
                   />
                   <ZenInput 
                      label={formData.commissionType === 'Percentage' ? "Commission Value (%)" : `Commission Value (${settings?.general?.currencySymbol || 'QR'})`} 
                      icon={Sparkles} 
                      type="number"
                      placeholder="e.g. 10"
                      value={formData.commissionValue} 
                      onChange={(e: any) => setFormData({...formData, commissionValue: parseInt(e.target.value) || 0})} 
                   />
                </div>
             </motion.div>
           )}
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
