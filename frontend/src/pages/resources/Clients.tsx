import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import dayjs from 'dayjs';
import { 
  UserPlus, Phone, Edit2, Trash2, User as UserIcon,
  Sparkles, X, Calendar, Camera, Mail, Info, Lock, Eye, EyeOff, MapPin, ChevronRight, History, Search, Grid, List, Zap, Users
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { countries } from '../../utils/countries';
import { validatePhoneNumber, getPhoneValidationProtocol } from '../../utils/validation';
import { Modal } from '../../components/shared/Modal';
import { notify } from '../../components/shared/ZenNotification';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { ZenDropdown, ZenInput, ZenTextarea, ZenDatePicker, ZenMonthPicker } from '../../components/zen/ZenInputs';
import { ZenIconButton, ZenBadge, ZenButton } from '../../components/zen/ZenButtons';
import { ZenStatCard } from '../../components/zen/ZenStatCard';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';


interface MembershipPlan {
  _id: string;
  name: string;
  price: number;
}

interface Membership {
  _id: string;
  plan: MembershipPlan;
  remainingSessions: number;
  totalSessions: number;
  endDate: string;
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
  role: string;
  membership?: Membership | null;
  memberships?: Membership[];
  appointments?: any[];
  createdAt: string;
}

const Clients = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();
  const [roles, setRoles] = useState<string[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    active: 0,
    membership: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
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
    status: 'Active',
    role: '',
    password: '',
    confirmPassword: ''
  });

  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'membership' | 'history'>('profile');
  const [historyMonth, setHistoryMonth] = useState(dayjs().format('YYYY-MM'));
  const [selectedMembershipHistory, setSelectedMembershipHistory] = useState<any>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

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
    setPage(1);
  }, [viewMode]);

  const PAGE_LIMIT = 12;

  const fetchClients = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await fetch(`${API_URL}/clients?page=${page}&limit=${PAGE_LIMIT}`, {
        headers: { 
          'Authorization': `Bearer ${user?.token}`,
          'Accept': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.data) {
        setClients(data.data);
        setTotalPages(data.pagination.pages);
        setCounts({
          total: data.pagination.total || 0,
          active: data.pagination.activeTotal || 0,
          membership: data.pagination.membershipTotal || 0
        });
      } else if (Array.isArray(data)) {
        setClients(data);
        setTotalPages(1);
        setCounts({
          total: data.length,
          active: data.filter((c: any) => c.status === 'Active').length,
          membership: data.filter((c: any) => c.membership).length
        });
      }
    } catch (error: any) {
      console.error('Error in fetchClients:', error);
      if (!silent) notify('error', 'Error', 'Failed to load clients');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_URL}/roles`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const roleData = data.data || data;
        if (Array.isArray(roleData)) {
          const roleNames = roleData.map((r: any) => r.name);
          setRoles(roleNames);
          
          if (!editingClient && roleNames.includes('Client')) {
            setFormData(prev => ({ ...prev, role: 'Client' }));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchRoles();

    const interval = setInterval(() => {
      fetchClients(true);
    }, 10000); // 10s sync

    return () => clearInterval(interval);
  }, [page, user?.token]);

  const filteredClients = useMemo(() => {
    let filtered = clients;

    // Filter by Search Term
    return filtered.filter(client => 
      (client.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
      (client.phone || '').includes(searchTerm)
    );
  }, [clients, searchTerm]);

  const handleOpenModal = (client: Client | null = null) => {
    if (client) {
      setEditingClient(client);
      // Strip dialing code for editing if it exists
      const dialingCode = settings?.general?.dialingCode || '+974';
      const rawPhone = client.phone || '';
      const cleanPhone = rawPhone.startsWith(dialingCode) 
        ? rawPhone.slice(dialingCode.length) 
        : rawPhone;

      setFormData({
        name: client.name,
        phone: cleanPhone,
        email: client.email || '',
        dob: client.dob ? dayjs(client.dob).format('YYYY-MM-DD') : '',
        notes: client.notes || '',
        status: client.status || 'Active',
        role: client.role || '',
        password: '',
        confirmPassword: ''
      });
    } else {
      setEditingClient(null);
      setFormData({ 
        name: '', 
        phone: '', 
        email: '', 
        dob: '', 
        notes: '', 
        status: 'Active', 
        role: roles.includes('Client') ? 'Client' : (roles[0] || ''), 
        password: '', 
        confirmPassword: '' 
      });
    }
    setProfilePicFile(null);
    setActiveTab('profile');
    setHistoryMonth(dayjs().format('YYYY-MM'));
    setSelectedMembershipHistory(null);
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
    const phoneValidation = validatePhoneNumber(formData.phone, settings?.general?.countryIso || 'QA');
    if (!phoneValidation.isValid) {
      notify('error', 'Validation Error', phoneValidation.message || 'Invalid phone number');
      return;
    }

    const data = new FormData();
    const fullPhone = `${settings?.general?.dialingCode || '+974'}${formData.phone}`;
    
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
        notify('success', 'Updated', editingClient ? 'Profile updated' : 'Client welcomed');
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
      'Archive this client profile? Their historical data will be moved to the archives.',
      async () => {
        try {
          const response = await fetch(`${API_URL}/clients/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${user?.token}` }
          });
          if (response.ok) {
            notify('success', 'Archived', 'Client record removed');
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
        notify('success', 'Status Updated', `Client ${newStatus}`);
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

  const clientTabs: Array<{ id: 'profile' | 'membership' | 'history'; label: string }> = [
    { id: 'profile', label: 'Profile' }
  ];

  if (editingClient) {
    clientTabs.push(
      { id: 'membership', label: 'Memberships' },
      { id: 'history', label: 'Visits' }
    );
  }

  const modalTitle = editingClient ? 'Edit client profile' : 'New client profile';
  const modalSubtitle = editingClient
    ? 'Update contact details, access, memberships, and visit history.'
    : 'Capture contact information, client role, and access details for a new client.';

  return (
    <ZenPageLayout
      title="Clients"
      hideSearch
      hideBranchSelector
      hideViewToggle
      hideAddButton
      onAddClick={() => handleOpenModal()}
    >
      <div className="space-y-10 pb-20">
        {/* Summary Metrics */}
        <div className="flex overflow-x-auto pt-4 pb-6 gap-6 lg:grid lg:grid-cols-4 lg:gap-8 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-2">
          {[
            { label: 'Total Registry', value: counts.total, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', glow: 'bg-blue-500/20', trend: 'Base population' },
            { label: 'Active Clients', value: counts.active, icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', trend: 'Currently engaged' },
            { label: 'Membership Zen', value: counts.membership, icon: Sparkles, color: 'text-amber-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', trend: 'Loyalty tier' },
            { label: 'Security Roles', value: roles.length, icon: Lock, color: 'text-zen-sand', bg: 'bg-zen-sand/10', glow: 'bg-zen-sand/20', trend: 'Access levels' }
          ].map((stat, i) => (
            <ZenStatCard key={i} {...stat} delay={i * 0.2} />
          ))}
        </div>

        {/* Global Filter Bar */}
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl border border-zen-brown/15 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-8 items-end">
            <div className="flex-1 w-full flex flex-col gap-3">
               <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-2">Registry Search</label>
               <div className="relative group">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-zen-brown/20 group-focus-within:text-zen-sand transition-colors">
                    <Search size={16} />
                  </span>
                  <input 
                    type="text"
                    placeholder="Search clients by name or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-6 py-3.5 bg-zen-cream/30 border border-zen-brown/10 rounded-xl focus:bg-white focus:ring-4 focus:ring-zen-sand/5 focus:border-zen-sand/20 outline-none transition-all duration-500 text-sm font-medium shadow-sm"
                  />
               </div>
            </div>

             <div className="flex flex-wrap lg:flex-nowrap gap-4 w-full lg:w-auto items-end">
                <div className="flex items-center gap-4">
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

               <div className="flex flex-col gap-3 w-full lg:w-auto">
                  <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-2">Management</label>
                  <ZenButton onClick={() => handleOpenModal()} variant="primary" className="w-full sm:w-auto px-8 h-[48px] shadow-sm flex items-center justify-center gap-2 group">
                     <UserPlus size={16} className="group-hover:rotate-12 transition-transform duration-500" />
                     <span className="uppercase tracking-[0.2em] text-[10px] font-black">Welcome Client</span>
                  </ZenButton>
               </div>
            </div>
          </div>
        </div>
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-zen-brown border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-10">
          {filteredClients.map((client) => (
            <div key={client._id} className="group relative bg-white/80 backdrop-blur-xl rounded-[1rem] sm:rounded-[1.5rem] p-6 sm:p-8 shadow-sm border border-white transition-all duration-700 hover:shadow-zen-brown/15 hover:-translate-y-2 h-full flex flex-col justify-between overflow-hidden">
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
                           <p className="text-[10px] lg:text-[11px] font-bold text-zen-brown/40 uppercase tracking-[0.4em]">
                             {client.membership ? client.membership.plan.name : 'Member'}
                           </p>
                        </div>
                    </div>

                   <div className="flex flex-col sm:flex-row gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all lg:translate-x-4 lg:group-hover:translate-x-0 duration-500">
                      <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(client)} size="sm" />
                      <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDelete(client._id)} size="sm" />
                   </div>
                </div>

                <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-3 p-3 bg-zen-cream/10 rounded-[1.2rem] border border-zen-brown/15 group/contact hover:bg-white hover:shadow-lg transition-all">
                       <div className="w-8 h-8 rounded-xl bg-white border border-zen-brown/15 flex items-center justify-center text-zen-brown/30 group-hover/contact:text-zen-brown transition-colors"><Phone size={14} /></div>
                       <span className="text-xs text-zen-brown/70 italic font-medium">{client.phone}</span>
                    </div>
                    {client.email && (
                      <div className="flex items-center gap-3 p-3 bg-zen-cream/10 rounded-[1.2rem] border border-zen-brown/15 group/contact hover:bg-white hover:shadow-lg transition-all">
                        <div className="w-8 h-8 rounded-xl bg-white border border-zen-brown/15 flex items-center justify-center text-zen-brown/30 group-hover/contact:text-zen-brown transition-colors"><Mail size={14} /></div>
                        <span className="text-xs text-zen-brown/70 italic font-medium truncate">{client.email}</span>
                      </div>
                    )}
                </div>
              </div>

              <div className="relative z-10 pt-4 border-t border-zen-brown/15">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button 
                              onClick={() => toggleClientStatus(client)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 hover:scale-105 active:scale-95 ${client.status === 'Active' ? 'bg-zen-leaf/10 text-zen-leaf border-zen-leaf/20 shadow-sm' : 'bg-red-50 text-red-400 border-red-100'}`}
                            >
                               <span className="text-[9px] font-bold uppercase tracking-widest">{client.status}</span>
                            </button>
                            {client.membership ? (
                              <ZenBadge variant="sand" className="text-[9px] sm:text-[10px]">
                                {client.membership.remainingSessions}/{client.membership.totalSessions} Sessions
                              </ZenBadge>
                            ) : (
                              <ZenBadge variant="leaf" className="text-[9px] sm:text-[10px]">{client.visits} Visits</ZenBadge>
                            )}
                        </div>
                        {client.role && (
                           <span className="text-[8px] sm:text-[9px] font-bold text-zen-sand/70 uppercase tracking-widest px-2 py-0.5 bg-zen-sand/10 rounded-md">
                              {client.role}
                           </span>
                        )}
                     </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="w-full bg-white rounded-xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in fade-in duration-700">
          <div className="table-container">
            <table className="w-full text-center border-collapse min-w-[800px]">
              <thead>
                <tr>
                <th>S NO</th>
                <th>Portrait</th>
                <th>Client</th>
                <th>Contact & Email</th>
                <th>Membership</th>
                <th>Spending</th>
                <th>Status</th>
                <th>Actions</th>
                </tr>
              </thead>
              <tbody className="">
                {(!filteredClients || filteredClients.length === 0) && (

                   <tr>

                      <td colSpan={8} className="px-6 py-16 text-center text-[13px] font-sans text-gray-400 bg-gray-50/30">No registry data available</td>

                   </tr>

                )}

                {filteredClients.map((client, index) => (
                  <tr key={client._id} className="group">
                    <td className="px-4 lg:px-6 py-4 lg:py-6">
                      <span>{((page - 1) * PAGE_LIMIT + index + 1).toString().padStart(2, '0')}</span>
                    </td>
                    <td className="px-4 lg:px-6 py-4 lg:py-6">
                      <div className="flex justify-center">
                        <div className="w-10 lg:w-12 h-10 lg:h-12 rounded-full overflow-hidden bg-zen-cream border-2 border-white shadow-lg shrink-0 group-hover:scale-110 transition-transform duration-500 flex items-center justify-center">
                          {client.profilePic ? (
                            <img src={getImageUrl(client.profilePic)} alt={client.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-serif text-zen-brown uppercase">{client.name.charAt(0)}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 lg:py-6">
                      <div className="flex flex-col items-center">
                        <span className="zen-table-primary">{client.name}</span>
                        <span className="zen-table-meta text-[10px]">Member since {dayjs(client.createdAt).format('YYYY')}</span>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 lg:py-6">
                      <div className="flex flex-col items-center">
                        <span className="text-sm text-zen-brown/70 italic font-medium">{client.phone}</span>
                        <span className="text-[10px] text-zen-brown/30 font-medium lowercase tracking-tight mt-1 truncate max-w-[150px]">{client.email || 'No email registered'}</span>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 lg:py-6">
                      {client.membership ? (
                        <div className="flex flex-col items-center">
                          <ZenBadge variant="sand" className="scale-90">{client.membership.plan.name}</ZenBadge>
                          <span className="zen-table-meta mt-1">
                            {client.membership.remainingSessions}/{client.membership.totalSessions} SESS. LEFT
                          </span>
                        </div>
                      ) : (
                        <ZenBadge variant="inactive" className="scale-90">None</ZenBadge>
                      )}
                    </td>
                    <td className="px-4 lg:px-6 py-4 lg:py-6">
                      <div className="flex flex-col items-center">
                        <span className="zen-table-primary">{settings?.general?.currencySymbol || 'QR'} {client.totalSpending?.toLocaleString()}</span>
                        <span className="zen-table-meta">{client.visits} visits</span>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 lg:py-6">
                      <div className="flex justify-center">
                        <button 
                          onClick={() => toggleClientStatus(client)}
                          className="transition-transform active:scale-95"
                        >
                          <ZenBadge variant={client.status === 'Active' ? 'leaf' : 'danger'}>{client.status}</ZenBadge>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 lg:py-6">
                      <div className="flex items-center justify-center gap-2 lg:gap-3">
                        <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(client)} size="md" />
                        <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDelete(client._id)} size="md" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ZenPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="max-w-5xl"
        header={
          <div className="flex items-start justify-between gap-6 px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-start gap-4 sm:gap-5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-zen-brown text-white flex items-center justify-center shadow-sm shrink-0">
                <UserIcon size={24} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Client Profile</p>
                <h3 className="mt-1 text-xl sm:text-2xl font-semibold text-zen-brown truncate">{modalTitle}</h3>
                <p className="mt-2 text-sm text-zen-brown/60 max-w-2xl">{modalSubtitle}</p>
              </div>
            </div>
            <ZenIconButton icon={X} onClick={() => setIsModalOpen(false)} size="md" />
          </div>
        }
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-xs text-zen-brown/40">
              {editingClient
                ? 'Saved changes update the client profile immediately.'
                : 'New client profiles can be edited later from the table.'}
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
                form="client-modal-form"
                className="w-full sm:w-auto"
              >
                {editingClient ? 'Save changes' : 'Create client'}
              </ZenButton>
            </div>
          </div>
        }
      >
        <form id="client-modal-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {clientTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full border px-4 py-2 text-[11px] font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'border-zen-brown bg-zen-brown text-white shadow-sm'
                    : 'border-zen-brown/10 bg-white text-zen-brown/55 hover:border-zen-brown/20 hover:text-zen-brown'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'profile' ? (
              <motion.div
                key="profile-tab"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-6"
              >
                <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
                  <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Profile photo</p>
                    <div className="relative mx-auto mt-5 aspect-square w-40 sm:w-48 group">
                      <div className="absolute inset-0 rounded-full bg-zen-cream/30 blur-sm" />
                      <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-white bg-zen-cream flex items-center justify-center shadow-lg">
                        {(profilePicFile || (editingClient && editingClient.profilePic)) ? (
                          <img
                            src={profilePicFile ? URL.createObjectURL(profilePicFile) : getImageUrl(editingClient?.profilePic)}
                            alt={formData.name || 'Client profile preview'}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zen-sand/20 text-zen-brown font-semibold text-4xl uppercase tracking-tighter">
                            {formData.name.charAt(0) || <UserIcon size={40} strokeWidth={1} />}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="text-white" size={28} />
                        </div>
                      </div>
                      <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        onChange={e => setProfilePicFile(e.target.files?.[0] || null)}
                      />
                      <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-zen-brown text-white flex items-center justify-center shadow-lg ring-4 ring-white">
                        <Edit2 size={14} />
                      </div>
                    </div>
                    <p className="mt-5 text-sm text-center text-zen-brown/55">
                      Upload a clear portrait for the client card.
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm">
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Client details</p>
                        <h4 className="mt-1 text-lg font-semibold text-zen-brown">Identity and contact information</h4>
                      </div>
                      <ZenBadge variant={formData.status === 'Active' ? 'leaf' : 'inactive'}>
                        {formData.status}
                      </ZenBadge>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <ZenInput
                        label="Client name"
                        placeholder="e.g. Maria Thompson"
                        value={formData.name}
                        onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                        containerClassName="sm:col-span-2"
                      />

                      <div className="sm:col-span-2 space-y-2">
                        <ZenInput
                          label="Phone number"
                          icon={Phone}
                          prefix={settings?.general?.dialingCode || '+974'}
                          value={formData.phone}
                          onChange={(e: any) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                        />
                        <div className="flex items-center gap-2 px-1 text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.25em]">
                          <Info size={10} className="shrink-0" />
                          <span>{getPhoneValidationProtocol(settings?.general?.countryIso || 'QA')}</span>
                        </div>
                      </div>

                      <ZenInput
                        label="Email address"
                        icon={Mail}
                        type="email"
                        value={formData.email}
                        onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
                      />

                      <ZenDatePicker
                        label="Date of birth"
                        value={formData.dob}
                        onChange={val => setFormData({ ...formData, dob: val })}
                      />

                      <ZenDropdown
                        label="Account Role"
                        options={roles}
                        value={formData.role}
                        onChange={(val) => setFormData({ ...formData, role: val })}
                        placeholder="Select Account Role"
                      />

                      <ZenDropdown
                        label="Status"
                        options={['Active', 'Inactive']}
                        value={formData.status}
                        onChange={(val) => setFormData({ ...formData, status: val })}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Account access</p>
                    <h4 className="mt-1 text-lg font-semibold text-zen-brown">Security details</h4>
                    <div className="mt-6 grid gap-5 sm:grid-cols-2">
                      <ZenInput
                        label="Password"
                        icon={Lock}
                        type="password"
                        placeholder={editingClient ? 'Leave blank to keep current password' : 'Minimum 6 characters'}
                        value={formData.password}
                        onChange={(e: any) => setFormData({ ...formData, password: e.target.value })}
                        containerClassName={editingClient ? 'sm:col-span-2' : ''}
                      />
                      {!editingClient && (
                        <ZenInput
                          label="Confirm password"
                          icon={Lock}
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e: any) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        />
                      )}
                      {editingClient && (
                        <div className="sm:col-span-2 rounded-2xl border border-zen-brown/10 bg-zen-cream/25 px-4 py-4 text-sm text-zen-brown/60">
                          Leave the password blank to keep the current credential.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Internal notes</p>
                    <h4 className="mt-1 text-lg font-semibold text-zen-brown">Preferences and follow-up context</h4>
                    <div className="mt-2">
                      <ZenTextarea
                        label="Client notes"
                        placeholder="Add preferences, sensitivities, or follow-up context."
                        value={formData.notes}
                        onChange={(e: any) => setFormData({ ...formData, notes: e.target.value })}
                        className="mt-0 h-40"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'membership' && editingClient ? (
              <motion.div
                key="membership-tab"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-6"
              >
                {selectedMembershipHistory ? (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <ZenIconButton
                          icon={X}
                          onClick={() => setSelectedMembershipHistory(null)}
                          size="sm"
                        />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Membership detail</p>
                          <h4 className="mt-1 text-xl font-semibold text-zen-brown">{selectedMembershipHistory.plan?.name}</h4>
                          <p className="mt-1 text-sm text-zen-brown/55">Usage history for this membership plan.</p>
                        </div>
                      </div>
                      <ZenBadge variant="sand">
                        {selectedMembershipHistory.remainingSessions} / {selectedMembershipHistory.totalSessions || selectedMembershipHistory.plan?.maxSessions || 0} sessions left
                      </ZenBadge>
                    </div>

                    <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left">
                          <thead>
                            <tr className="border-b border-zen-brown/10 bg-zen-cream/30">
                              <th>S No</th>
                              <th>Date</th>
                              <th>Branch</th>
                              <th>Service</th>
                              <th>Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zen-brown/5">
                            {selectedMembershipHistory.usageHistory?.length > 0 ? selectedMembershipHistory.usageHistory.map((usage: any, idx: number) => (
                              <tr key={idx} className="group hover:bg-zen-cream/20 transition-colors duration-300">
                                <td className="px-8 py-6 text-sm font-semibold text-zen-brown/30">{(idx + 1).toString().padStart(2, '0')}</td>
                                <td className="px-8 py-6">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-zen-brown">{dayjs(usage.usedAt).format('MMM DD, YYYY')}</span>
                                    <span className="text-[10px] text-zen-brown/30 uppercase tracking-[0.2em]">{dayjs(usage.usedAt).format('dddd')}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                  <div className="flex items-center gap-2 text-sm text-zen-brown/75">
                                    <MapPin size={12} className="text-zen-sand" />
                                    <span>{usage.branch?.name || 'Main branch'}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                  <span className="text-sm font-medium text-zen-brown">{usage.service?.name || 'Service'}</span>
                                </td>
                                <td className="px-8 py-6">
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-full border border-zen-brown/10 bg-zen-cream text-[11px] font-semibold text-zen-brown">
                                    {dayjs(usage.usedAt).format('hh:mm A')}
                                  </span>
                                </td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan={5} className="px-8 py-16 text-center text-sm text-zen-brown/45">
                                  No usage history recorded for this membership.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex justify-start">
                      <ZenButton
                        type="button"
                        variant="secondary"
                        onClick={() => setSelectedMembershipHistory(null)}
                        className="!px-5 !py-3 !text-[10px]"
                      >
                        Back to memberships
                      </ZenButton>
                    </div>
                  </div>
                ) : editingClient?.memberships && editingClient.memberships.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Memberships</p>
                      <ZenBadge variant="secondary">{editingClient.memberships.length} total</ZenBadge>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {editingClient.memberships.map((m: any) => (
                        <div
                          key={m._id}
                          className={`rounded-[1.5rem] border p-6 sm:p-7 shadow-sm flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 transition-colors ${
                            m.status === 'Active'
                              ? 'bg-white border-emerald-100'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-start gap-4 sm:gap-5 min-w-0">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${m.status === 'Active' ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'}`}>
                              <Sparkles size={22} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-lg sm:text-xl font-semibold text-zen-brown truncate">
                                {m.plan?.name || 'Membership plan'}
                              </h4>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <ZenBadge variant={m.status === 'Active' ? 'leaf' : 'inactive'}>
                                  {m.status || 'Inactive'}
                                </ZenBadge>
                                <span className="text-[11px] text-zen-brown/45 uppercase tracking-[0.22em]">
                                  Valid until {dayjs(m.endDate).format('DD MMM YYYY')}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-5 sm:gap-8">
                            <div className="text-right">
                              <p className="text-2xl font-semibold text-zen-brown">
                                {m.remainingSessions} / {m.totalSessions || m.plan?.maxSessions || 0}
                              </p>
                              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zen-brown/35">
                                Sessions remaining
                              </p>
                            </div>

                            <ZenButton
                              variant="secondary"
                              onClick={() => setSelectedMembershipHistory(m)}
                              className="!px-5 !py-3 !text-[10px]"
                            >
                              View usage
                              <ChevronRight size={14} />
                            </ZenButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-zen-brown/35 space-y-4 rounded-[1.5rem] border border-dashed border-zen-brown/10 bg-white">
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-zen-brown/15 flex items-center justify-center">
                      <Sparkles size={30} strokeWidth={1} />
                    </div>
                    <p className="text-sm text-center">No memberships are linked to this client yet.</p>
                  </div>
                )}
              </motion.div>
            ) : activeTab === 'history' && editingClient ? (
              <motion.div
                key="history-tab"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-6"
              >
                <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Visit history</p>
                    <h4 className="mt-1 text-lg font-semibold text-zen-brown">Filter by month</h4>
                  </div>
                  <div className="w-full sm:w-[260px]">
                    <ZenMonthPicker
                      label="Visit month"
                      value={historyMonth}
                      onChange={(val: string) => setHistoryMonth(val)}
                    />
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white shadow-sm overflow-hidden">
                  {(editingClient?.appointments?.filter((a: any) => dayjs(a.date).format('YYYY-MM') === historyMonth)?.length || 0) > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-left">
                        <thead>
                          <tr className="border-b border-zen-brown/10 bg-zen-cream/30">
                            <th>S No</th>
                            <th>Date</th>
                            <th>Branch</th>
                            <th>Service</th>
                            <th>Staff</th>
                            <th>Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zen-brown/5">
                          {editingClient?.appointments
                            ?.filter((a: any) => dayjs(a.date).format('YYYY-MM') === historyMonth)
                            ?.map((apt: any, index: number) => (
                              <tr key={apt._id} className="group hover:bg-zen-cream/20 transition-colors duration-300">
                                <td className="px-8 py-6 text-sm font-semibold text-zen-brown/30">{(index + 1).toString().padStart(2, '0')}</td>
                                <td className="px-8 py-6">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-zen-brown">{dayjs(apt.date).format('MMM DD, YYYY')}</span>
                                    <span className="text-[10px] text-zen-brown/30 uppercase tracking-[0.2em]">{dayjs(apt.date).format('dddd')}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                  <div className="flex items-center gap-2 text-sm text-zen-brown/75">
                                    <MapPin size={12} className="text-zen-sand" />
                                    <span>{apt.branch?.name || 'Main branch'}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                  <span className="text-sm font-medium text-zen-brown">{apt.service}</span>
                                </td>
                                <td className="px-8 py-6">
                                  <span className="text-sm text-zen-brown/75">With {apt.employee}</span>
                                </td>
                                <td className="px-8 py-6">
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-full border border-zen-brown/10 bg-zen-cream text-[11px] font-semibold text-zen-brown">
                                    {apt.time}
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-zen-brown/35 space-y-4">
                      <div className="w-20 h-20 rounded-full border-2 border-dashed border-zen-brown/15 flex items-center justify-center">
                        <Calendar size={30} strokeWidth={1} />
                      </div>
                      <p className="text-sm text-center">No visits found for the selected month.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
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
