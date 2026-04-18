import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Plus, Edit2, Trash2, MapPin, Mail, Phone, X, 
  Search, Building2, Globe, Activity, Camera
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { countries } from '../../utils/countries';

import { Modal } from '../../components/shared/Modal';
import { notify } from '../../components/shared/ZenNotification';
import { ZenIconButton, ZenBadge, ZenButton } from '../../components/zen/ZenButtons';
import { ZenInput, ZenDropdown } from '../../components/zen/ZenInputs';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';


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
        notify('success', 'Updated', editingBranch ? 'Branch details updated' : 'Branch created');
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
        notify('success', 'Branch Updated', `Branch ${!branch.isActive ? 'Activated' : 'Paused'}`);
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
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 group-hover/contact:bg-indigo-500 group-hover/contact:text-white transition-all"><Phone size={14} /></div>
                        <span className="text-xs text-zen-brown/70 italic font-medium">{branch.contactNumber}</span>
                     </div>
                     <div className="flex items-center gap-3 p-3 bg-zen-cream/10 rounded-[1.2rem] border border-zen-brown/15 group/contact hover:bg-white hover:shadow-lg transition-all">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover/contact:bg-amber-500 group-hover/contact:text-white transition-all"><Mail size={14} /></div>
                        <span className="text-xs text-zen-brown/70 italic font-medium truncate">{branch.email}</span>
                     </div>
                     <div className="flex items-start gap-3 p-3 bg-zen-cream/10 rounded-[1.2rem] border border-zen-brown/15 group/contact hover:bg-white hover:shadow-lg transition-all">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover/contact:bg-emerald-500 group-hover/contact:text-white transition-all shrink-0"><MapPin size={14} /></div>
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
        <div className="w-full bg-white rounded-xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden overflow-x-auto custom-scrollbar animate-in fade-in duration-700">
          <table className="w-full text-center border-collapse min-w-[800px]">
               <thead>
                  <tr className="bg-slate-50 border-y border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                     <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">S No</th>
                     <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Visual</th>
                     <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Identity & Registry</th>
                     <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Contact Protocol</th>
                     <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Presence</th>
                     <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Actions</th>
                  </tr>
               </thead>
               <tbody>
                  {(!filteredBranches || filteredBranches.length === 0) && (
                     <tr>
                        <td colSpan={6} className="px-6 py-16 text-center text-[11px] font-sans text-gray-400 bg-gray-50/30">No branches recorded yet</td>
                     </tr>
                  )}

                  {filteredBranches.map((branch, index) => (
                    <tr key={branch._id} className="transition-all group border-b border-black/[0.02]">
                      <td className="text-center italic opacity-40 text-[11px]">
                        {((page - 1) * PAGE_LIMIT + index + 1).toString().padStart(2, '0')}
                      </td>
                      <td>
                        <div className="flex justify-center">
                          <div className="w-12 h-10 rounded-xl overflow-hidden bg-zen-cream border border-zen-brown/10 shadow-sm shrink-0 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                            {branch.logo ? (
                              <img src={getImageUrl(branch.logo)} className="w-full h-full object-cover" />
                            ) : (
                              <Building2 className="text-zen-brown/20" size={16} />
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                         <div className="flex flex-col items-center px-6">
                            <span className="zen-table-primary">{branch.name}</span>
                            <span className="zen-table-meta">Active Space Registry</span>
                         </div>
                      </td>
                      <td>
                         <div className="flex flex-col items-center">
                            <span className="text-base font-serif font-black text-zen-brown leading-none">{branch.contactNumber}</span>
                            <span className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest mt-1 lowercase">{branch.email}</span>
                         </div>
                      </td>
                      <td>
                         <div className="flex justify-center">
                            <button 
                              onClick={() => toggleBranchStatus(branch)}
                              className="group/status transition-transform active:scale-95"
                            >
                               <ZenBadge variant={branch.isActive ? 'leaf' : 'sand'}>
                                 <div className={`w-1 h-1 rounded-full mr-1.5 ${branch.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-zen-sand'}`}></div>
                                 {branch.isActive ? 'Active' : 'Paused'}
                               </ZenBadge>
                            </button>
                         </div>
                      </td>
                      <td>
                         <div className="flex items-center justify-center gap-2">
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
        maxWidth="max-w-5xl"
        header={
          <div className="flex items-start justify-between gap-6 px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-start gap-4 sm:gap-5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-zen-brown text-white flex items-center justify-center shadow-sm shrink-0">
                <Building2 size={24} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Branch profile</p>
                <h3 className="mt-1 text-xl sm:text-2xl font-semibold text-zen-brown truncate">
                  {editingBranch ? 'Edit branch profile' : 'New branch profile'}
                </h3>
                <p className="mt-2 text-sm text-zen-brown/60 max-w-2xl">
                  Manage branch identity, contact information, location, and geofence settings.
                </p>
              </div>
            </div>
            <ZenIconButton icon={X} onClick={() => setIsModalOpen(false)} size="md" />
          </div>
        }
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-xs text-zen-brown/40">
              {editingBranch
                ? 'Branch changes apply to future scheduling and visibility immediately.'
                : 'New branches become available for scheduling once saved.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <ZenButton
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </ZenButton>
              <ZenButton
                type="submit"
                form="branch-modal-form"
                className="w-full sm:w-auto"
              >
                {editingBranch ? 'Save branch' : 'Create branch'}
              </ZenButton>
            </div>
          </div>
        }
      >
        <form id="branch-modal-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
            <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Branch logo</p>
              <div className="relative mx-auto mt-5 aspect-square w-40 sm:w-48 group">
                <div className="absolute inset-0 rounded-[2rem] bg-zen-cream/30 blur-sm" />
                <div className="relative h-full w-full overflow-hidden rounded-[2rem] border-4 border-white bg-zen-cream flex items-center justify-center shadow-lg">
                  {logoFile || (editingBranch && editingBranch.logo) ? (
                    <img
                      src={logoFile ? URL.createObjectURL(logoFile) : getImageUrl(editingBranch?.logo)}
                      alt={formData.name || 'Branch logo preview'}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zen-sand/20 text-zen-brown font-semibold text-4xl uppercase tracking-tighter">
                      {formData.name.charAt(0) || <Building2 size={40} strokeWidth={1} />}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="text-white" size={28} />
                  </div>
                </div>
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  onChange={e => setLogoFile(e.target.files?.[0] || null)}
                />
                <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-zen-brown text-white flex items-center justify-center shadow-lg ring-4 ring-white">
                  <Edit2 size={14} />
                </div>
              </div>
              <p className="mt-5 text-sm text-center text-zen-brown/55">
                Upload a clear logo for the branch card and selector.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Branch details</p>
                  <h4 className="mt-1 text-lg font-semibold text-zen-brown">Identity and contact information</h4>
                </div>
                <ZenBadge variant={formData.isActive ? 'leaf' : 'inactive'}>
                  {formData.isActive ? 'Active' : 'Inactive'}
                </ZenBadge>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <ZenInput
                  label="Branch name"
                  placeholder="e.g. Downtown Wellness Hub"
                  value={formData.name}
                  onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                  containerClassName="sm:col-span-2"
                />
                <div className="sm:col-span-2 space-y-2">
                  <ZenInput
                    label="Phone number"
                    icon={Phone}
                    prefix={settings?.general.dialingCode || '+974'}
                    value={formData.contactNumber}
                    onChange={(e: any) => setFormData({ ...formData, contactNumber: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                <ZenInput
                  label="Email address"
                  icon={Mail}
                  type="email"
                  value={formData.email}
                  onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
                />
                <ZenDropdown
                  label="Status"
                  options={['Active', 'Inactive']}
                  value={formData.isActive ? 'Active' : 'Inactive'}
                  onChange={(val) => setFormData({ ...formData, isActive: val === 'Active' })}
                />
                <ZenInput
                  label="Address"
                  icon={MapPin}
                  placeholder="Enter the physical address"
                  value={formData.address}
                  onChange={(e: any) => setFormData({ ...formData, address: e.target.value })}
                  containerClassName="sm:col-span-2"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Location settings</p>
                <h4 className="mt-1 text-lg font-semibold text-zen-brown">Geofence and access</h4>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zen-brown/35">
                <Globe size={12} />
                Branch network
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <ZenInput
                label="Latitude"
                type="number"
                step="any"
                value={formData.lat}
                onChange={(e: any) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
              />
              <ZenInput
                label="Longitude"
                type="number"
                step="any"
                value={formData.lng}
                onChange={(e: any) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
              />
              <ZenInput
                label="Radius (meters)"
                type="number"
                value={formData.radius}
                onChange={(e: any) => setFormData({ ...formData, radius: parseInt(e.target.value) })}
              />
            </div>

            <div className="mt-6">
              <ZenInput
                label="Authorized IP addresses"
                icon={Globe}
                placeholder="e.g. 192.168.1.1, 122.164.20.1"
                value={formData.allowedIPs}
                onChange={(e: any) => setFormData({ ...formData, allowedIPs: e.target.value })}
              />
              <p className="text-[10px] text-zen-brown/35 mt-3 ml-1 tracking-[0.25em] uppercase">
                Separate multiple IPs with commas. Leave empty to allow any network.
              </p>
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

export default Branches;
