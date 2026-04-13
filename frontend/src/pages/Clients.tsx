import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { 
  UserPlus, Phone, Edit2, Trash2, User,
  Sparkles, X, Calendar, Camera, Mail, Info, Lock, Eye, EyeOff
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { countries } from '../utils/countries';
import { validatePhoneNumber, getPhoneValidationProtocol } from '../utils/validation';
import { Modal } from '../components/Modal';
import { notify } from '../components/ZenNotification';

// Global Zen Components
import { ZenPageLayout } from '../components/zen/ZenLayout';
import { ZenDropdown, ZenInput, ZenTextarea, ZenDatePicker } from '../components/zen/ZenInputs';
import { ZenIconButton, ZenBadge, ZenButton } from '../components/zen/ZenButtons';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useBranches } from '../context/BranchContext';


interface Branch {
  _id: string;
  name: string;
}


interface Client {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  dob?: string;
  anniversary?: string;
  notes?: string;
  totalSpending: number;
  visits: number;
  profilePic?: string;
  status: string;
  branch?: Branch;
  createdAt: string;
}

const Clients = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { branches, selectedBranch } = useBranches();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('zen_clients_view') as 'grid' | 'table') || 'grid';
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    dob: '',
    notes: '',
    branch: '',
    status: 'Active',
    password: '',
    confirmPassword: ''
  });

  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100/api';

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  const openConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'danger') => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm,
      type
    });
  };


  useEffect(() => {
    localStorage.setItem('zen_clients_view', viewMode);
  }, [viewMode]);

  const fetchClients = async () => {
    try {
      const response = await fetch(`${API_URL}/clients`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setClients(data);
      }
    } catch (error) {
      notify('error', 'Error', 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = useMemo(() => {
    let filtered = clients;

    // Filter by Branch
    if (selectedBranch !== 'all') {
      filtered = filtered.filter(client => client.branch?._id === selectedBranch || (client as any).branch === selectedBranch);
    }

    // Filter by Search Term
    return filtered.filter(client => 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      client.phone.includes(searchTerm)
    );
  }, [clients, searchTerm, selectedBranch]);

  const handleOpenModal = (client: Client | null = null) => {
    if (client) {
      setEditingClient(client);
      // Strip dialing code for editing if it exists
      const dialingCode = settings?.general.dialingCode || '+974';
      const cleanPhone = client.phone.startsWith(dialingCode) 
        ? client.phone.slice(dialingCode.length) 
        : client.phone;

      setFormData({
        name: client.name,
        phone: cleanPhone,
        email: client.email || '',
        dob: client.dob ? new Date(client.dob).toISOString().split('T')[0] : '',
        notes: client.notes || '',
        branch: client.branch?._id || '',
        status: client.status || 'Active',
        password: '',
        confirmPassword: ''
      });
    } else {
      setEditingClient(null);
      setFormData({ name: '', phone: '', email: '', dob: '', notes: '', branch: branches.length > 0 ? branches[0]._id : '', status: 'Active', password: '', confirmPassword: '' });
    }
    setProfilePicFile(null);
    setIsModalOpen(true);
  };

// Administrative archival logic removed


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      notify('error', 'Validation Error', 'Passwords do not match');
      return;
    }

    // Validation
    const phoneValidation = validatePhoneNumber(formData.phone, settings?.general.countryIso || 'QA');
    if (!phoneValidation.isValid) {
      notify('error', 'Validation Error', phoneValidation.message || 'Invalid phone number');
      return;
    }

    const data = new FormData();
    const fullPhone = `${settings?.general.dialingCode || '+974'}${formData.phone}`;
    
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'confirmPassword') return;
      if (key === 'phone') {
        data.append(key, fullPhone);
      } else {
        data.append(key, (value !== undefined && value !== null) ? value.toString() : '');
      }
    });

    if (profilePicFile) data.append('profilePic', profilePicFile);

    try {
      const url = editingClient ? `${API_URL}/clients/${editingClient._id}` : `${API_URL}/clients`;
      const method = editingClient ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${user?.token}` },
        body: data
      });
      if (response.ok) {
        notify('success', 'Refined', editingClient ? 'Profile updated' : 'Client welcomed');
        setIsModalOpen(false);
        fetchClients();
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
      'Archive Profile',
      'Archive this client profile? Their historical data will be moved to the sacred archives.',
      async () => {
        try {
          const response = await fetch(`${API_URL}/clients/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${user?.token}` }
          });
          if (response.ok) {
            notify('success', 'Archived', 'Record removed');
            fetchClients();
          }
        } catch (error) {
          notify('error', 'Error', 'Action failed');
        }
      }
    );
  };


  const toggleClientStatus = async (client: Client) => {
    const newStatus = client.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const response = await fetch(`${API_URL}/clients/${client._id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        notify('success', 'Status Divergence', `Profile ${newStatus}`);
        fetchClients();
      }
    } catch (error) {
       notify('error', 'Error', 'Toggle failed');
    }
  };

  const getImageUrl = (path: string | undefined) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    // Remove ./ if present and ensure a leading slash
    const cleanPath = path.replace(/^\.?\//, '');
    return `${API_URL.replace('/api', '')}/${cleanPath}`;
  };

  return (
    <ZenPageLayout
      title="Clients"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      addButtonLabel="Add New Client"
      addButtonIcon={<UserPlus size={18} />}
      onAddClick={() => handleOpenModal()}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-zen-brown border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-10">
          {filteredClients.map((client) => (
            <div key={client._id} className="group relative bg-white/80 backdrop-blur-xl rounded-[3.5rem] p-8 shadow-2xl shadow-zen-brown/5 border border-white transition-all duration-700 hover:shadow-zen-brown/15 hover:-translate-y-2 h-full flex flex-col justify-between overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-zen-sand/5 rounded-bl-full -z-0 pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>

              <div className="relative z-10">
                <div className="flex items-center gap-4 lg:gap-6 mb-4 lg:mb-6">
                   <div className="relative w-16 lg:w-20 h-16 lg:h-20 rounded-full overflow-hidden border-4 border-zen-cream bg-zen-cream flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-700 shadow-xl">
                      {client.profilePic ? (
                        <img src={getImageUrl(client.profilePic)} alt={client.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zen-sand/20 text-zen-brown font-serif text-2xl uppercase">
                          {client.name.charAt(0)}
                        </div>
                      )}
                   </div>
                   
                   <div className="min-w-0 flex-1">
                       <h3 className="text-xl lg:text-2xl font-serif text-zen-brown tracking-tight truncate">{client.name}</h3>
                       <div className="flex items-center gap-2 mt-1 lg:mt-2">
                          <p className="text-[10px] lg:text-[11px] font-bold text-zen-brown/40 uppercase tracking-[0.4em]">Member</p>
                          {client.branch && (
                             <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest px-2 py-0.5 bg-indigo-50 rounded-md">
                                {client.branch.name}
                             </span>
                          )}
                       </div>
                    </div>

                   <div className="flex flex-col sm:flex-row gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all lg:translate-x-4 lg:group-hover:translate-x-0 duration-500">
                      <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(client)} />
                      <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDelete(client._id)} />
                   </div>
                </div>

                <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-3 p-3 bg-zen-cream/10 rounded-[1.2rem] border border-zen-brown/5 group/contact hover:bg-white hover:shadow-lg transition-all">
                       <div className="w-8 h-8 rounded-xl bg-white border border-zen-brown/5 flex items-center justify-center text-zen-brown/30 group-hover/contact:text-zen-brown transition-colors"><Phone size={14} /></div>
                       <span className="text-xs text-zen-brown/70 italic font-medium">{client.phone}</span>
                    </div>
                    {client.email && (
                      <div className="flex items-center gap-3 p-3 bg-zen-cream/10 rounded-[1.2rem] border border-zen-brown/5 group/contact hover:bg-white hover:shadow-lg transition-all">
                        <div className="w-8 h-8 rounded-xl bg-white border border-zen-brown/5 flex items-center justify-center text-zen-brown/30 group-hover/contact:text-zen-brown transition-colors"><Mail size={14} /></div>
                        <span className="text-xs text-zen-brown/70 italic font-medium truncate">{client.email}</span>
                      </div>
                    )}
                </div>
              </div>

              <div className="relative z-10 pt-4 border-t border-zen-brown/5">
                     <div className="flex items-center gap-2">
                        <button 
                          onClick={() => toggleClientStatus(client)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 hover:scale-105 active:scale-95 ${client.status === 'Active' ? 'bg-zen-leaf/10 text-zen-leaf border-zen-leaf/20 shadow-sm' : 'bg-red-50 text-red-400 border-red-100'}`}
                        >
                           <span className="text-[9px] font-bold uppercase tracking-widest">{client.status}</span>
                        </button>
                        <ZenBadge variant="leaf">{client.visits} Visits</ZenBadge>
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
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">S.No</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Portrait</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Client</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Contact</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Email</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Branch</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Spending</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Status</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zen-brown/5">
              {filteredClients.map((client, index) => (
                <tr key={client._id} className="hover:bg-zen-cream/5 transition-all duration-500 group">
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <span className="font-serif text-base lg:text-lg text-zen-brown/40">{(index + 1).toString().padStart(2, '0')}</span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <div className="flex justify-center">
                      <div className="w-10 lg:w-12 h-10 lg:h-12 rounded-full overflow-hidden bg-zen-cream border-2 border-white shadow-lg shrink-0 group-hover:scale-110 transition-transform duration-500 flex items-center justify-center">
                        {client.profilePic ? (
                          <img src={getImageUrl(client.profilePic)} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-serif text-zen-brown uppercase">{client.name.charAt(0)}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <div className="flex flex-col items-center">
                      <p className="font-serif text-base lg:text-lg text-zen-brown tracking-tight font-bold whitespace-nowrap">{client.name}</p>
                      <p className="text-[8px] lg:text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest mt-0.5 lg:mt-1">Member Since 2024</p>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                     <span className="text-sm text-zen-brown/70 italic font-medium">{client.phone}</span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                     <span className="text-sm text-zen-brown/70 italic font-medium">{client.email || 'N/A'}</span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                     {client.branch ? (
                        <ZenBadge variant="sand">{client.branch.name}</ZenBadge>
                     ) : (
                        <span className="text-[10px] font-bold text-slate-300">N/A</span>
                     )}
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <div className="flex flex-col items-center">
                       <span className="font-bold text-zen-brown text-sm">{settings?.general.currencySymbol || 'QR'} {client.totalSpending?.toLocaleString()}</span>
                       <span className="text-[8px] uppercase tracking-widest text-zen-brown/30 font-bold whitespace-nowrap">{client.visits} Visits</span>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                     <div className="flex justify-center">
                        <button 
                          onClick={() => toggleClientStatus(client)}
                          className={`flex items-center justify-center gap-2 hover:bg-slate-50 px-3 py-1.5 rounded-full transition-all active:scale-95 border ${client.status === 'Active' ? 'bg-zen-leaf/5 border-zen-leaf/10' : 'bg-red-50 border-red-100'}`}
                        >
                           <span className={`text-[10px] font-bold uppercase tracking-widest ${client.status === 'Active' ? 'text-zen-leaf' : 'text-red-400'}`}>{client.status}</span>
                        </button>
                     </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <div className="flex items-center justify-center gap-2 lg:gap-3">
                       <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(client)} />
                       <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDelete(client._id)} />
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
        title={editingClient ? "Update Profile" : "Add New Client"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-[90vh] sm:h-[85vh] w-full relative">
          
          <div className="flex items-center justify-between px-6 sm:px-10 py-6 sm:py-10 border-b border-zen-brown/5 sticky top-0 bg-white/95 backdrop-blur-sm z-[60]">
             <div className="flex items-center gap-4 sm:gap-8 flex-1">
                <div className="relative w-24 sm:w-32 h-24 sm:h-32 group cursor-pointer shrink-0">
                   <div className="w-full h-full rounded-full ring-4 ring-zen-cream ring-offset-4 overflow-hidden bg-zen-cream flex items-center justify-center transition-all duration-700 group-hover:ring-zen-brown/20 shadow-2xl relative">
                      {(profilePicFile || (editingClient && editingClient.profilePic)) ? (
                        <img 
                          src={profilePicFile ? URL.createObjectURL(profilePicFile) : getImageUrl(editingClient?.profilePic)} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zen-sand/20 text-zen-brown font-serif text-5xl uppercase tracking-tighter">
                          {formData.name.charAt(0) || <User size={40} strokeWidth={1} />}
                        </div>
                      )}
                      
                      {/* Overlay for upload */}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="text-white" size={32} />
                      </div>
                   </div>
                   <input 
                     type="file" 
                     className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                     onChange={e => setProfilePicFile(e.target.files?.[0] || null)} 
                   />
                   <div className="absolute bottom-1 right-1 p-2.5 bg-zen-brown text-white rounded-full shadow-2xl scale-90 group-hover:scale-100 transition-all ring-4 ring-white"><Edit2 size={12} /></div>
                </div>

                <div className="space-y-4">
                   <ZenInput label="Client Identity" placeholder="E.g. Maria Thompson" value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} className="font-serif text-2xl sm:text-4xl border-none p-0 h-auto" />
                   <div className="w-full sm:w-80 relative">
                      <p className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.4em]">Proprietary Member Registry</p>
                   </div>
                </div>
             </div>
             <ZenIconButton icon={X} onClick={() => setIsModalOpen(false)} className="self-start mt-2" />
          </div>

          <div className="flex items-center gap-8 px-12 border-b border-zen-brown/5 bg-white/50 backdrop-blur-sm z-50">
             <div className="py-4 text-[10px] font-bold uppercase tracking-[0.3em] relative text-zen-brown">
                Client Matrix
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zen-brown" />
             </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-8 sm:py-12 scrollbar-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 sm:gap-x-16 gap-y-10 sm:gap-y-14 animate-in slide-in-from-left-4 duration-500">
                    <div className="relative">
                      <ZenInput 
                        label="Direct Contact Line" 
                        icon={Phone} 
                        prefix={settings?.general.dialingCode || '+974'}
                        value={formData.phone} 
                        onChange={(e: any) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} 
                      />
                      <div className="flex items-center gap-2 mt-2 px-1">
                        <Info size={10} className="text-zen-brown/30" />
                        <p className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest whitespace-nowrap">
                          {getPhoneValidationProtocol(settings?.general.countryIso || 'QA')}
                        </p>
                      </div>
                    </div>
                   <ZenInput label="Email Interface" icon={Mail} type="email" value={formData.email} onChange={(e: any) => setFormData({...formData, email: e.target.value})} />
                   <ZenDatePicker label="Celebration Date (DOB)" value={formData.dob} onChange={val => setFormData({...formData, dob: val})} />
                   
                   <ZenDropdown 
                       label="Preferred Branch" 
                       options={['None', ...branches.filter(b => b.isActive).map(b => b.name)]} 
                       value={branches.find(b => b._id === formData.branch)?.name || 'None'} 
                       onChange={(val) => {
                         const branch = branches.find(b => b.name === val);
                         setFormData({...formData, branch: branch ? branch._id : ''});
                       }} 
                    />

                   <ZenDropdown 
                      label="Operational Status"
                      options={['Active', 'Inactive']}
                      value={formData.status}
                      onChange={(val) => setFormData({...formData, status: val})}
                    />

                    <div className="relative">
                      <ZenInput label="Secure Entry Code (Password)" icon={Lock} type={showPassword ? "text" : "password"} placeholder={editingClient ? "Leave blank to maintain current" : "Minimum 6 characters"} value={formData.password} onChange={(e: any) => setFormData({...formData, password: e.target.value})} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 bottom-3 text-zen-brown/20 hover:text-zen-brown transition-colors">
                         {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {!editingClient && (
                      <ZenInput label="Confirm Security Code" icon={Lock} type={showPassword ? "text" : "password"} value={formData.confirmPassword} onChange={(e: any) => setFormData({...formData, confirmPassword: e.target.value})} />
                    )}
                   
                   <div className="md:col-span-2">
                      <ZenTextarea label="Personal Notes & Inner Rituals" placeholder="Describe client preferences, allergies, or special resonance..." value={formData.notes} onChange={(e: any) => setFormData({...formData, notes: e.target.value})} />
                   </div>
                </div>
          </div>

          <div className="px-6 sm:px-12 py-6 sm:py-10 border-t border-zen-brown/5 bg-white/95 backdrop-blur-sm sticky bottom-0 z-[60] flex flex-col sm:flex-row gap-4 sm:gap-6">
             <ZenButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="order-2 sm:order-1 flex-1 text-lg">Discard</ZenButton>
             <ZenButton type="submit" className="order-1 sm:order-2 flex-[2] text-lg">
                <span>{editingClient ? 'Finalize Profile' : 'Invite to Registry'}</span>
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
        type={confirmState.type}
      />
    </ZenPageLayout>

  );
};

export default Clients;



