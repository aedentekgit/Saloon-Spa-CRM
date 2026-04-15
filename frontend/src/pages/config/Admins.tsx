import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { 
  UserPlus, Mail, Edit2, Trash2, User,
  UserCircle, Lock, Eye, EyeOff, Sparkles, X, Calendar, Info,
  Shield, MapPin
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { Modal } from '../../components/shared/Modal';
import { notify } from '../../components/shared/ZenNotification';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { ZenDropdown, ZenInput } from '../../components/zen/ZenInputs';
import { ZenIconButton, ZenBadge, ZenButton } from '../../components/zen/ZenButtons';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';


interface Admin {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

const Admins = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('zen_admin_view') as 'grid' | 'table') || 'grid';
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    status: 'Active' as 'Active' | 'Inactive'
  });

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
    localStorage.setItem('zen_admin_view', viewMode);
    setPage(1);
  }, [viewMode]);

  const PAGE_LIMIT = 12;

  useEffect(() => {
    fetchAdmins();
  }, [page]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/admins?page=${page}&limit=${PAGE_LIMIT}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      if (data.data) {
        setAdmins(data.data);
        setTotalPages(data.pagination?.pages || 1);
      } else if (Array.isArray(data)) {
        setAdmins(data);
        setTotalPages(1);
      } else {
        setAdmins([]);
        setTotalPages(1);
      }
    } catch (error) {
      notify('error', 'Error', 'Failed to load administrative collective');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (admin: Admin) => {
    const newStatus = admin.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const response = await fetch(`${API_URL}/admins/${admin._id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        notify('success', 'Refined', `Authority level ${newStatus === 'Active' ? 'restored' : 'suspended'}`);
        fetchAdmins();
      }
    } catch (error) {
      notify('error', 'Error', 'Toggle failed');
    }
  };

  const handleOpenModal = (admin: Admin | null = null) => {
    if (admin) {
      setEditingAdmin(admin);
      setFormData({
        name: admin.name,
        email: admin.email,
        password: '',
        confirmPassword: '',
        status: admin.status || 'Active'
      });
    } else {
      setEditingAdmin(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        status: 'Active'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin && (!formData.password || formData.password !== formData.confirmPassword)) {
      if (!formData.password) return notify('error', 'Validation', 'Security key is required');
      return notify('error', 'Validation', 'Security keys do not match');
    }

    try {
      const url = editingAdmin ? `${API_URL}/admins/${editingAdmin._id}` : `${API_URL}/admins`;
      const method = editingAdmin ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          status: formData.status,
          ...(formData.password && { password: formData.password })
        })
      });
      if (response.ok) {
        notify('success', 'Refined', editingAdmin ? 'Authority record updated' : 'Authority level established');
        setIsModalOpen(false);
        fetchAdmins();
      } else {
        const error = await response.json();
        notify('error', 'Error', error.message || 'Action failed');
      }
    } catch (error) {
      notify('error', 'Error', 'Connection failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (id === user?._id) return notify('warning', 'Protection', 'Cannot dissolve your own authority level');
    
    openConfirm(
      'Dissolve Authority',
      'Dissolve this authority level? This will remove the administrator from the sanctuary ecosystem.',
      async () => {
        try {
          const response = await fetch(`${API_URL}/admins/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${user?.token}` }
          });
          if (response.ok) {
            notify('success', 'Purged', 'Authority level removed from sanctuary');
            fetchAdmins();
          }
        } catch (error) {
          notify('error', 'Error', 'Action failed');
        }
      }
    );
  };


  const filteredAdmins = admins.filter(admin => 
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ZenPageLayout
      title="Authority Collective"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      addButtonLabel="Establish Authority"
      addButtonIcon={<UserPlus size={18} />}
      onAddClick={() => handleOpenModal()}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-zen-brown border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {filteredAdmins.map((admin) => (
            <div key={admin._id} className={`group relative bg-white/80 backdrop-blur-xl rounded-[3.5rem] p-8 shadow-sm border border-white transition-all duration-700 hover:shadow-zen-brown/15 hover:-translate-y-2 h-full flex flex-col justify-between overflow-hidden ${admin.status === 'Inactive' ? 'opacity-60 grayscale' : ''}`}>
               <div className="absolute top-0 right-0 w-32 h-32 bg-zen-sand/5 rounded-bl-full -z-0 pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>

              <div className="relative z-10">
                <div className="flex items-center gap-6 mb-8">
                   <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-zen-cream bg-zen-cream flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-700 shadow-xl text-zen-brown/10">
                      <UserCircle size={48} strokeWidth={1} />
                   </div>
                   
                   <div className="min-w-0 flex-1">
                       <h3 className="text-2xl font-serif text-zen-brown tracking-tight truncate">{admin.name}</h3>
                       <div className="flex items-center gap-2 mt-2">
                          <Shield size={10} className="text-zen-sand" />
                          <p className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.4em]">{admin.role}</p>
                       </div>
                    </div>

                   <div className="flex items-center gap-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-500">
                      <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(admin)} />
                      <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDelete(admin._id)} />
                   </div>
                </div>

                <div className="flex flex-col gap-3 mb-8">
                   <div className="flex items-center gap-4 p-4 bg-zen-cream/10 rounded-[1.5rem] border border-zen-brown/15 group/contact hover:bg-white hover:shadow-lg transition-all">
                      <div className="w-10 h-10 rounded-xl bg-white border border-zen-brown/15 flex items-center justify-center text-zen-brown/30 group-hover/contact:text-zen-brown transition-colors"><Mail size={16} /></div>
                      <span className="text-sm text-zen-brown/70 truncate italic font-medium">{admin.email}</span>
                   </div>
                </div>
              </div>

              <div className="relative z-10 pt-6 border-t border-zen-brown/15">
                 <div className="flex items-center justify-between">
                    <button 
                      onClick={() => toggleStatus(admin)}
                      className={`flex items-center gap-3 px-4 py-2 rounded-full border transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm ${admin.status === 'Active' ? 'bg-zen-leaf/10 text-zen-leaf border-zen-leaf/20' : 'bg-red-50 text-red-400 border-red-100'}`}
                    >
                       <span className="text-[10px] font-bold uppercase tracking-widest leading-none">{admin.status === 'Inactive' ? 'Suspended' : 'Operational'}</span>
                    </button>
                    
                    <div className="flex items-center gap-2 text-zen-brown/20 italic text-[10px] font-medium">
                       <Calendar size={14} strokeWidth={1.5} />
                       Established {new Date(admin.createdAt).toLocaleDateString()}
                    </div>
                 </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-xl rounded-[3.5rem] shadow-sm border border-white overflow-hidden overflow-x-auto custom-scrollbar animate-in fade-in duration-700">
          <table className="w-full text-center border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-zen-brown border-b border-zen-brown/15">
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center whitespace-nowrap">S NO</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Identity</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Email Hub</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Authority</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Status</th>
                <th className="px-4 lg:px-6 py-4 lg:py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zen-brown/15">
              {filteredAdmins.map((admin, index) => (
                <tr key={admin._id} className={`hover:bg-zen-cream/5 transition-all duration-500 group ${admin.status === 'Inactive' ? 'opacity-50 grayscale' : ''}`}>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <span className="font-serif text-base lg:text-lg text-zen-brown/40">{((page - 1) * PAGE_LIMIT + index + 1).toString().padStart(2, '0')}</span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <div className="flex items-center justify-center gap-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-zen-cream border-2 border-white shadow-lg shrink-0 group-hover:scale-110 transition-transform duration-500 flex items-center justify-center text-zen-brown/10">
                        <User size={24} />
                      </div>
                      <span className="font-serif text-lg text-zen-brown font-bold tracking-tight">{admin.name}</span>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <span className="text-sm text-zen-brown/60 italic">{admin.email}</span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                     <ZenBadge variant="sand">{admin.role}</ZenBadge>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <div className="flex items-center justify-center">
                       <button 
                        onClick={() => toggleStatus(admin)}
                        className={`text-[9px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border transition-all duration-300 hover:scale-110 active:scale-95 whitespace-nowrap ${admin.status === 'Active' ? 'bg-zen-leaf/10 text-zen-leaf border-zen-leaf/20 shadow-sm' : 'bg-red-50 text-red-400 border-red-100'}`}
                       >
                          {admin.status === 'Inactive' ? 'Suspended' : 'Operational'}
                       </button>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <div className="flex items-center gap-2 lg:gap-3">
                       <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(admin)} />
                       <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDelete(admin._id)} />
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
        maxWidth="max-w-2xl"
        title={editingAdmin ? "Refine Authority" : "Establish Authority"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col w-full relative">
          
          <div className="flex items-center justify-between px-10 py-10 border-b border-zen-brown/15">
             <div className="flex items-center gap-8 flex-1">
                <div className="w-20 h-20 rounded-full border-4 border-zen-cream bg-zen-cream flex items-center justify-center shadow-xl text-zen-brown/10">
                   <UserCircle size={40} strokeWidth={1} />
                </div>

                <div className="flex-1">
                   <h2 className="text-3xl font-serif font-bold text-zen-brown tracking-tight">{editingAdmin ? 'Refine Authority' : 'Establish Authority'}</h2>
                   <p className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.4em] mt-2">Authority Registry Allocation</p>
                </div>
             </div>
             <ZenIconButton icon={X} onClick={() => setIsModalOpen(false)} />
          </div>

          <div className="px-10 py-12 space-y-10">
             <ZenInput label="Authority Identity" placeholder="E.g. Alexander Pierce" value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} />
             <ZenInput label="Digital Mail Hub" icon={Mail} value={formData.email} onChange={(e: any) => setFormData({...formData, email: e.target.value})} />
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <ZenInput label={`Security Key ${editingAdmin ? '(Optional)' : ''}`} icon={Lock} type="password" value={formData.password} onChange={(e: any) => setFormData({...formData, password: e.target.value})} />
                {!editingAdmin && <ZenInput label="Confirm Security Key" icon={Lock} type="password" value={formData.confirmPassword} onChange={(e: any) => setFormData({...formData, confirmPassword: e.target.value})} />}
             </div>

             <ZenDropdown 
                label="Operational State"
                options={['Active', 'Deactive']}
                value={formData.status === 'Inactive' ? 'Deactive' : formData.status}
                onChange={(val) => setFormData({...formData, status: val === 'Deactive' ? 'Inactive' : val as 'Active' | 'Inactive'})}
             />
          </div>

          <div className="px-10 py-10 border-t border-zen-brown/15 bg-gray-50/50 flex gap-4">
             <ZenButton variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Discard</ZenButton>
             <ZenButton type="submit" className="flex-[2]">
                <span>{editingAdmin ? 'Update Record' : 'Establish Authority'}</span>
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

export default Admins;
