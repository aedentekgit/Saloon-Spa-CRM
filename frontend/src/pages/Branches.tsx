import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Edit2, Trash2, MapPin, Mail, Phone, X, 
  Search, Building2, Globe, Activity, Camera
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { countries } from '../utils/countries';

import { Modal } from '../components/Modal';
import { notify } from '../components/ZenNotification';
import { ZenIconButton, ZenBadge, ZenButton } from '../components/zen/ZenButtons';
import { ZenInput, ZenDropdown } from '../components/zen/ZenInputs';
import { ZenPageLayout } from '../components/zen/ZenLayout';
import { ZenPagination } from '../components/zen/ZenPagination';
import { ConfirmDialog } from '../components/ConfirmDialog';


interface Branch {
  _id: string;
  name: string;
  contactNumber: string;
  email: string;
  address: string;
  logo?: string;
  isActive: boolean;
  lat?: number;
  lng?: number;
  radius?: number;
  allowedIPs?: string[];
}


const Branches = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('zen_branches_view') as 'grid' | 'table') || 'grid';
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
    fetchBranches();
  }, [page]);

  useEffect(() => {
    localStorage.setItem('zen_branches_view', viewMode);
    setPage(1);
  }, [viewMode]);

  const PAGE_LIMIT = 12;

  const fetchBranches = async () => {
    try {
      const response = await fetch(`${API_URL}/branches?page=${page}&limit=${PAGE_LIMIT}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      if (data.data) {
        setBranches(data.data);
        setTotalPages(data.pagination.pages);
      } else if (Array.isArray(data)) {
        setBranches(data);
        setTotalPages(1);
      }
    } catch (error) {
      notify('error', 'Sync Error', 'Failed to synchronize branch directory.');
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    contactNumber: '',
    email: '',
    address: '',
    isActive: true,
    lat: 0,
    lng: 0,
    radius: 100,
    allowedIPs: '' as any
  });

  const handleOpenModal = (branch: Branch | null = null) => {
    if (branch) {
      setEditingBranch(branch);
      const dialingCode = settings?.general.dialingCode || '+974';
      const cleanPhone = branch.contactNumber.startsWith(dialingCode) 
        ? branch.contactNumber.slice(dialingCode.length) 
        : branch.contactNumber;

      setFormData({
        name: branch.name,
        contactNumber: cleanPhone,
        email: branch.email,
        address: branch.address,
        isActive: branch.isActive,
        lat: branch.lat || 0,
        lng: branch.lng || 0,
        radius: branch.radius || 100,
        allowedIPs: Array.isArray(branch.allowedIPs) ? branch.allowedIPs.join(', ') : ''
      });
    } else {
      setEditingBranch(null);
      setFormData({
        name: '',
        contactNumber: '',
        email: '',
        address: '',
        isActive: true,
        lat: 0,
        lng: 0,
        radius: 100,
        allowedIPs: ''
      });
    }
    setLogoFile(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingBranch ? `${API_URL}/branches/${editingBranch._id}` : `${API_URL}/branches`;
      const method = editingBranch ? 'PUT' : 'POST';
      
      const data = new FormData();
      const dialingCode = settings?.general.dialingCode || '+974';
      const fullPhone = `${dialingCode}${formData.contactNumber}`;

      data.append('name', formData.name);
      data.append('contactNumber', fullPhone);
      data.append('email', formData.email);
      data.append('address', formData.address);
      data.append('isActive', formData.isActive.toString());
      data.append('lat', formData.lat.toString());
      data.append('lng', formData.lng.toString());
      data.append('radius', formData.radius.toString());
      
      const ipsArray = formData.allowedIPs.toString().split(',').map(ip => ip.trim()).filter(ip => ip);
      data.append('allowedIPs', JSON.stringify(ipsArray));

      if (logoFile) data.append('logo', logoFile);

      const response = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${user?.token}` 
        },
        body: data
      });

      if (response.ok) {
        notify('success', 'Refined', editingBranch ? 'Branch details updated' : 'New branch established');
        setIsModalOpen(false);
        fetchBranches();
      } else {
        const error = await response.json();
        notify('error', 'Protocol Error', error.message || 'Action failed');
      }
    } catch (error) {
      notify('error', 'Link Failure', 'Could not establish connection to headquarters.');
    }
  };

  const handleDelete = async (id: string) => {
    openConfirm(
      'Decommission Branch',
      'Are you sure you want to decommission this branch? This will remove it from the active network.',
      async () => {
        try {
          const response = await fetch(`${API_URL}/branches/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${user?.token}` }
          });
          if (response.ok) {
            notify('success', 'Success', 'Branch decommissioned');
            fetchBranches();
          }
        } catch (error) {
          notify('error', 'Error', 'Action failed');
        }
      }
    );
  };


  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

   const toggleBranchStatus = async (branch: Branch) => {
    try {
      const data = new FormData();
      data.append('isActive', (!branch.isActive).toString());

      const response = await fetch(`${API_URL}/branches/${branch._id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${user?.token}`
        },
        body: data
      });

      if (response.ok) {
        notify('success', 'Status Resonance', `Branch ${!branch.isActive ? 'Activated' : 'Paused'}`);
        fetchBranches();
      }
    } catch (error) {
       notify('error', 'Status Error', 'Failed to synchronize operational state');
    }
  };

  const getImageUrl = (path: string | undefined) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.replace(/^\.?\//, '');
    return `${API_URL.replace('/api', '')}/${cleanPath}`;
  };

  return (
    <ZenPageLayout
      title="Branch Network"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      addButtonLabel="Add Location"
      onAddClick={() => handleOpenModal()}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-zen-brown border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
          {filteredBranches.map((branch) => (
            <div key={branch._id} className="group relative bg-white rounded-[2rem] p-5 lg:p-6 shadow-sm border border-zen-brown/15 transition-all duration-700 hover:shadow-zen-brown/15 hover:-translate-y-2 h-full flex flex-col justify-between overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-zen-sand/5 rounded-bl-full -z-0 pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>

               <div className="relative z-10">
                 <div className="flex items-center gap-4 lg:gap-6 mb-4 lg:mb-6">
                    <div className="relative w-16 lg:w-20 h-16 lg:h-20 rounded-[1.5rem] overflow-hidden border-4 border-zen-cream bg-zen-cream flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-700 shadow-xl">
                       {branch.logo ? (
                          <img src={getImageUrl(branch.logo)} alt={branch.name} className="w-full h-full object-cover" />
                       ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zen-sand/20 text-zen-brown font-serif text-2xl uppercase">
                            {branch.name.charAt(0)}
                          </div>
                       )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                        <h3 className="text-xl lg:text-2xl font-serif text-zen-brown tracking-tight truncate">{branch.name}</h3>
                        <div className="flex items-center gap-2 mt-1 lg:mt-2">
                           <p className="text-[10px] lg:text-[11px] font-bold text-zen-brown/40 lowercase tracking-wider truncate">{branch.email}</p>
                        </div>
                     </div>

                    <div className="flex flex-col sm:flex-row gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all lg:translate-x-4 lg:group-hover:translate-x-0 duration-500">
                       <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(branch)} />
                       <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDelete(branch._id)} />
                    </div>
                 </div>

                 <div className="flex flex-col gap-2 mb-4">
                     <div className="flex items-center gap-3 p-3 bg-zen-cream/10 rounded-[1.2rem] border border-zen-brown/15 group/contact hover:bg-white hover:shadow-lg transition-all">
                        <div className="w-8 h-8 rounded-xl bg-white border border-zen-brown/15 flex items-center justify-center text-zen-brown/30 group-hover/contact:text-zen-brown transition-colors"><Phone size={14} /></div>
                        <span className="text-xs text-zen-brown/70 italic font-medium">{branch.contactNumber}</span>
                     </div>
                     <div className="flex items-center gap-3 p-3 bg-zen-cream/10 rounded-[1.2rem] border border-zen-brown/15 group/contact hover:bg-white hover:shadow-lg transition-all">
                        <div className="w-8 h-8 rounded-xl bg-white border border-zen-brown/15 flex items-center justify-center text-zen-brown/30 group-hover/contact:text-zen-brown transition-colors"><Mail size={14} /></div>
                        <span className="text-xs text-zen-brown/70 italic font-medium truncate">{branch.email}</span>
                     </div>
                     <div className="flex items-start gap-3 p-3 bg-zen-cream/10 rounded-[1.2rem] border border-zen-brown/15 group/contact hover:bg-white hover:shadow-lg transition-all">
                        <div className="w-8 h-8 rounded-xl bg-white border border-zen-brown/15 flex items-center justify-center text-zen-brown/30 group-hover/contact:text-zen-brown transition-colors shrink-0"><MapPin size={14} /></div>
                        <span className="text-xs text-zen-brown/70 italic font-medium leading-relaxed">{branch.address}</span>
                     </div>
                 </div>
               </div>

                <div className="relative z-10 pt-4 border-t border-zen-brown/15">
                       <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleBranchStatus(branch)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm ${branch.isActive ? 'bg-zen-leaf/10 text-zen-leaf border-zen-leaf/20' : 'bg-red-50 text-red-500 border-red-100'}`}
                          >
                             <div className={`w-1.5 h-1.5 rounded-full ${branch.isActive ? 'bg-zen-leaf animate-pulse' : 'bg-red-500'}`}></div>
                             <span className="text-[10px] font-bold uppercase tracking-widest">{branch.isActive ? 'Active' : 'Paused'}</span>
                          </button>
                          <ZenBadge variant="sand">Operational Hub</ZenBadge>
                       </div>
                </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] lg:rounded-[2.5rem] shadow-sm border border-zen-brown/15 overflow-x-auto custom-scrollbar animate-in fade-in duration-700">
          <table className="w-full text-center border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-zen-brown border-b border-zen-brown/15">
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">S.No</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Visual</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Designation</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Contact Protocol</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Operational Status</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zen-brown/15">
              {filteredBranches.map((branch, index) => (
                <tr key={branch._id} className="hover:bg-zen-cream/5 transition-all duration-500 group">
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <span className="font-serif text-base lg:text-lg text-zen-brown/40">{((page - 1) * PAGE_LIMIT + index + 1).toString().padStart(2, '0')}</span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <div className="flex justify-center">
                      <div className="w-10 lg:w-12 h-10 lg:h-12 rounded-xl overflow-hidden bg-zen-cream border-2 border-white shadow-lg shrink-0 group-hover:scale-110 transition-transform duration-500 flex items-center justify-center">
                        {branch.logo ? (
                          <img src={getImageUrl(branch.logo)} className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="text-zen-brown/20" size={16} />
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <div className="flex flex-col items-center">
                      <p className="font-serif text-base lg:text-lg text-zen-brown tracking-tight font-bold whitespace-nowrap">{branch.name}</p>
                      <p className="text-[8px] lg:text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest mt-0.5 lg:mt-1">Active Space Registry</p>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                     <div className="flex flex-col items-center">
                        <span className="text-sm text-zen-brown/70 italic font-medium">{branch.contactNumber}</span>
                        <span className="text-[10px] text-zen-brown/30 font-bold lowercase">{branch.email}</span>
                     </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                     <div className="flex justify-center">
                        <button 
                          onClick={() => toggleBranchStatus(branch)}
                          className={`flex items-center justify-center gap-2 hover:bg-slate-50 px-4 py-2 rounded-full transition-all active:scale-95 border shadow-sm ${branch.isActive ? 'bg-zen-leaf/5 border-zen-leaf/10' : 'bg-red-50 border-red-100'}`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${branch.isActive ? 'bg-zen-leaf animate-pulse' : 'bg-red-500'}`}></div>
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${branch.isActive ? 'text-zen-leaf' : 'text-red-500'}`}>{branch.isActive ? 'Active' : 'Paused'}</span>
                        </button>
                     </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <div className="flex items-center justify-center gap-2 lg:gap-3">
                       <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(branch)} />
                       <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDelete(branch._id)} />
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
        hideHeader 
        maxWidth="max-w-4xl"
        title={editingBranch ? "Refine Location" : "New Presence"}      
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-auto w-full relative">
          
          <div className="flex items-center justify-between px-6 sm:px-10 py-6 sm:py-10 border-b border-zen-brown/15 sticky top-0 bg-white/95 backdrop-blur-sm z-[60]">
             <div className="flex items-center gap-4 sm:gap-8 flex-1">
                <div className="relative w-24 sm:w-32 h-24 sm:h-32 group cursor-pointer shrink-0">
                   <div className="w-full h-full rounded-[2rem] ring-4 ring-zen-cream ring-offset-4 overflow-hidden bg-zen-cream flex items-center justify-center transition-all duration-700 group-hover:ring-zen-brown/20 shadow-sm relative">
                      {(logoFile || (editingBranch && editingBranch.logo)) ? (
                        <img 
                          src={logoFile ? URL.createObjectURL(logoFile) : getImageUrl(editingBranch?.logo)} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zen-sand/20 text-zen-brown font-serif text-5xl uppercase tracking-tighter">
                          {formData.name.charAt(0) || <Building2 size={40} strokeWidth={1} />}
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="text-white" size={32} />
                      </div>
                   </div>
                   <input 
                     type="file" 
                     className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                     onChange={e => setLogoFile(e.target.files?.[0] || null)} 
                   />
                   <div className="absolute bottom-1 right-1 p-2.5 bg-zen-brown text-white rounded-full shadow-sm scale-90 group-hover:scale-100 transition-all ring-4 ring-white"><Edit2 size={12} /></div>
                </div>

                <div className="space-y-4">
                   <ZenInput label="Branch Designation" placeholder="E.g. Downtown Wellness Hub" value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} className="font-serif text-2xl sm:text-4xl border-none p-0 h-auto" />
                   <div className="w-full sm:w-80 relative">
                      <p className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.4em]">Space Registry Allocation</p>
                   </div>
                </div>
             </div>
             <ZenIconButton icon={X} onClick={() => setIsModalOpen(false)} className="self-start mt-2" />
          </div>

          <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-8 sm:py-12 scrollbar-none">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 sm:gap-x-16 gap-y-10 sm:gap-y-14 animate-in slide-in-from-left-4 duration-500">
                 <div className="relative">
                   <ZenInput 
                     label="Contact Protocol" 
                     icon={Phone} 
                     prefix={settings?.general.dialingCode || '+974'}
                     value={formData.contactNumber} 
                     onChange={(e: any) => setFormData({...formData, contactNumber: e.target.value.replace(/\D/g, '')})} 
                   />
                 </div>
                <ZenInput label="Communication Email" icon={Mail} type="email" value={formData.email} onChange={(e: any) => setFormData({...formData, email: e.target.value})} />
                
                <ZenDropdown 
                   label="Operational Status"
                   options={['Active', 'Inactive']}
                   value={formData.isActive ? 'Active' : 'Inactive'}
                   onChange={(val) => setFormData({...formData, isActive: val === 'Active'})}
                 />
                
                <div className="md:col-span-2">
                   <ZenInput label="Physical Address" icon={MapPin} placeholder="Enter physical address..." value={formData.address} onChange={(e: any) => setFormData({...formData, address: e.target.value})} />
                </div>

                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 bg-zen-cream/20 rounded-[2rem] border border-zen-brown/15">
                   <div className="sm:col-span-3 pb-2 border-b border-zen-brown/15">
                      <p className="text-[10px] font-bold text-zen-brown uppercase tracking-widest flex items-center gap-2">
                         <Globe size={12} /> Geofencing Credentials
                      </p>
                   </div>
                   <ZenInput label="Latitude" type="number" step="any" value={formData.lat} onChange={(e: any) => setFormData({...formData, lat: parseFloat(e.target.value)})} />
                   <ZenInput label="Longitude" type="number" step="any" value={formData.lng} onChange={(e: any) => setFormData({...formData, lng: parseFloat(e.target.value)})} />
                   <ZenInput label="Security Radius (Meters)" type="number" value={formData.radius} onChange={(e: any) => setFormData({...formData, radius: parseInt(e.target.value)})} />
                </div>

                <div className="md:col-span-2">
                    <ZenInput 
                      label="Authorized IP Addresses" 
                      icon={Globe} 
                      placeholder="e.g. 192.168.1.1, 122.164.20.1" 
                      value={formData.allowedIPs} 
                      onChange={(e: any) => setFormData({...formData, allowedIPs: e.target.value})} 
                    />
                    <p className="text-[9px] text-zen-brown/30 mt-2 ml-4 tracking-widest uppercase">Separate multiple IPs with commas. Leave empty to allow any network.</p>
                </div>
             </div>
          </div>

          <div className="px-6 sm:px-12 py-6 sm:py-10 border-t border-zen-brown/15 bg-white/95 backdrop-blur-sm sticky bottom-0 z-[60] flex flex-col sm:flex-row gap-4 sm:gap-6">
             <ZenButton variant="secondary" onClick={() => setIsModalOpen(false)} className="order-2 sm:order-1 flex-1 text-lg">Discard</ZenButton>
             <ZenButton type="submit" className="order-1 sm:order-2 flex-[2] text-lg">
                <span>{editingBranch ? 'Finalize Refinement' : 'Establish Presence'}</span>
                <Activity size={18} className="ml-2" />
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

export default Branches;
