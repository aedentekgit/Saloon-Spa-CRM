import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Trash2, 
  Plus, 
  Edit, 
  Lock,
  Sparkles,
  Key,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { ZenPageLayout } from '../components/zen/ZenLayout';
import { ZenPagination } from '../components/zen/ZenPagination';
import { ZenBadge, ZenButton, ZenIconButton } from '../components/zen/ZenButtons';
import { ZenInput, ZenTextarea, ZenDropdown } from '../components/zen/ZenInputs';
import { notify } from '../components/ZenNotification';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface Role {
  _id: string;
  name: string;
  permissions: string[];
  status?: 'Active' | 'Inactive';
}

const ALL_PAGES = [
  { id: 'dashboard', name: 'Dashboard Sanctuary' },
  { id: 'clients', name: 'Ambassador Registry' },
  { id: 'appointments', name: 'Sacred Appointments' },
  { id: 'rooms', name: 'Treatment Rooms' },
  { id: 'employees', name: 'Specialist Collective' },
  { id: 'attendance', name: 'Presence Logs' },
  { id: 'leave', name: 'Departure Rituals' },
  { id: 'services', name: 'Sanctuary Rituals' },
  { id: 'billing', name: 'Financial Sanctuary' },
  { id: 'finance', name: 'Sacred Ledger' },
  { id: 'inventory', name: 'Material Sanctuary' },
  { id: 'whatsapp', name: 'Messaging Sanctuary' },
  { id: 'reports', name: 'Insight Sanctuary' },
  { id: 'settings', name: 'Global Calibration' },
  { id: 'roles', name: 'Authority Sanctuary' }
];

const Roles = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    permissions: [] as string[],
    status: 'Active' as 'Active' | 'Inactive'
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchRoles();
  }, [page]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/roles?page=${page}&limit=10`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      if (data.data) {
        setRoles(data.data);
        setTotalPages(data.pagination?.pages || 1);
      } else if (Array.isArray(data)) {
        setRoles(data);
        setTotalPages(1);
      } else {
        setRoles([]);
        setTotalPages(1);
      }
    } catch (error) {
      notify('error', 'Sync Failure', 'Failed to synchronize authority records');
    } finally {
      setLoading(false);
    }
  };

  const filteredRoles = useMemo(() => {
    return roles.filter(role => 
      (role.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [roles, searchTerm]);

  const handleOpenModal = (role: Role | null = null) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        permissions: role.permissions,
        status: role.status || 'Active'
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        permissions: ['dashboard'],
        status: 'Active'
      });
    }
    setIsModalOpen(true);
  };

  const togglePermission = (permId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId]
    }));
  };

  const toggleAllPermissions = () => {
    if (formData.permissions.length === ALL_PAGES.length) {
      setFormData(prev => ({ ...prev, permissions: [] }));
    } else {
      setFormData(prev => ({ ...prev, permissions: ALL_PAGES.map(p => p.id) }));
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const url = editingRole ? `${API_URL}/roles/${editingRole._id}` : `${API_URL}/roles`;
    const method = editingRole ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        notify('success', editingRole ? 'Authority Refined' : 'Authority Established', editingRole ? 'Role permissions updated in the sanctuary.' : 'New authority level established.');
        setIsModalOpen(false);
        fetchRoles();
      }
    } catch (error) {
      notify('error', 'Calibration Error', 'Failed to conclude the authority establishment.');
    }
  };

  const toggleStatus = async (role: Role) => {
    const newStatus = role.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const response = await fetch(`${API_URL}/roles/${role._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        notify('success', 'Authority Refined', `Authority level ${newStatus === 'Active' ? 'Activated' : 'Deactivated'}`);
        fetchRoles();
      }
    } catch (error) {
      notify('error', 'Toggle Error', 'Failed to update authority status.');
    }
  };

  const executeDelete = async () => {
    if (!roleToDelete) return;
    try {
      const response = await fetch(`${API_URL}/roles/${roleToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (response.ok) {
        notify('success', 'Authority Purged', 'The role has been removed from the sanctuary.');
        setIsConfirmOpen(false);
        fetchRoles();
      }
    } catch (error) {
      notify('error', 'Removal Error', 'Failed to purge authority record.');
    }
  };

  return (
    <ZenPageLayout
      title="Authority Sanctuary"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      addButtonLabel="Establish Authority"
      onAddClick={() => handleOpenModal()}
      addButtonIcon={<Plus size={18} />}
    >
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredRoles.map(role => (
            <div key={role._id} className={`group relative bg-white rounded-[2rem] p-6 lg:p-8 shadow-2xl shadow-zen-brown/15 border border-zen-brown/15 transition-all duration-700 hover:shadow-zen-brown/15 hover:-translate-y-2 h-full flex flex-col justify-between overflow-hidden ${role.status === 'Inactive' ? 'opacity-60 grayscale' : ''}`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-zen-sand/5 rounded-bl-full -z-0 pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>
              

              
               <div className="relative z-10">
                 <div className="flex items-start justify-between mb-8">
                 <div>
                    <h3 className="text-2xl font-serif font-bold text-zen-brown mb-2 tracking-tight transition-colors group-hover:text-zen-sand">{role.name}</h3>
                     <div className="flex items-center gap-2">
                        <Shield size={10} className="text-zen-sand" />
                        <p className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.4em]">Authority_{role._id.slice(-4)}</p>
                     </div>
                 </div>
                    <div className="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all lg:translate-x-4 lg:group-hover:translate-x-0 duration-500">
                       <ZenIconButton icon={Edit} onClick={() => handleOpenModal(role)} />
                       <ZenIconButton 
                         icon={Trash2} 
                         variant="danger" 
                         onClick={() => { setRoleToDelete(role._id); setIsConfirmOpen(true); }} 
                       />
                    </div>
                 </div>
              </div>

              <div className="flex-1 relative z-10">
                 <div className="flex items-center justify-between mb-6">
                    <p className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest ">Authority Sectors ({role.permissions.length})</p>
                    <Key size={14} className="text-zen-sand opacity-30" />
                 </div>
                 <div className="flex flex-wrap gap-2">
                   {role.permissions.slice(0, 6).map(perm => (
                     <ZenBadge key={perm} variant="sand" className="px-3 py-1.5 bg-zen-cream/30 border-none text-[9px]">{ALL_PAGES.find(p => p.id === perm)?.name || perm}</ZenBadge>
                   ))}
                   {role.permissions.length > 6 && (
                     <span className="px-3 py-1.5 bg-zen-brown/5 text-zen-brown/30 text-[9px] font-bold rounded-lg border border-zen-brown/15">
                       + {role.permissions.length - 6} more
                     </span>
                   )}
                 </div>
              </div>
              
               <div className="relative z-10 mt-8 pt-6 border-t border-zen-brown/15">
                  <div className="flex items-center justify-between">
                     <button 
                       onClick={() => toggleStatus(role)}
                       className={`flex items-center gap-2 px-6 py-2 rounded-full border transition-all duration-500 hover:scale-105 active:scale-95 shadow-sm ${role.status === 'Active' ? 'bg-zen-leaf/10 text-zen-leaf border-zen-leaf/20' : 'bg-red-50 text-red-400 border-red-100'}`}
                     >
                        <span className="text-[10px] font-bold uppercase tracking-widest leading-none">{role.status === 'Inactive' ? 'Deactive' : 'Active'}</span>
                     </button>
                     <div className="flex items-center gap-2 text-zen-sand/40 italic text-[10px] font-medium uppercase tracking-[0.2em] transition-opacity duration-700 opacity-50 group-hover:opacity-100">
                        Secured
                     </div>
                  </div>
               </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] lg:rounded-[2.5rem] shadow-2xl shadow-zen-brown/15 border border-zen-brown/15 overflow-hidden">
           <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-separate border-spacing-0">
                 <thead>
                    <tr className="bg-zen-cream/10">
                       <th className="px-10 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] whitespace-nowrap">S NO</th>
                       <th className="px-10 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em]">Authority Mandate</th>
                       <th className="px-10 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em]">Sector Summary</th>
                       <th className="px-10 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em]">Status</th>
                       <th className="px-10 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-right">Ritual Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-zen-brown/15">
                    {filteredRoles.map((role, index) => (
                       <tr key={role._id} className="group hover:bg-white transition-all duration-500">
                          <td className="px-10 py-8">
                             <span className="font-serif text-lg text-zen-brown/60 font-bold">{((page - 1) * 10 + index + 1).toString().padStart(2, '0')}</span>
                          </td>
                          <td className="px-10 py-8">
                             <div className="flex items-center gap-4">
                                <div className="p-3 bg-zen-cream/30 rounded-xl text-zen-sand">
                                   <Shield size={18} />
                                </div>
                                <div>
                                   <p className="font-serif text-lg text-zen-brown font-bold tracking-tight">{role.name}</p>
                                   <p className="text-[8px] font-bold text-zen-brown/20 uppercase tracking-widest mt-0.5">ID_{role._id.slice(-6)}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-10 py-8">
                             <div className="flex items-center gap-3">
                                <ZenBadge variant="sand" className="bg-zen-cream/30 border-none">{role.permissions.length} Sectors</ZenBadge>
                                <div className="flex -space-x-2">
                                   {role.permissions.slice(0, 3).map((p, i) => (
                                      <div key={i} className="w-6 h-6 rounded-full bg-white border border-zen-brown/15 flex items-center justify-center shadow-sm" title={ALL_PAGES.find(pg => pg.id === p)?.name}>
                                         <Lock size={10} className="text-zen-brown/20" />
                                      </div>
                                   ))}
                                </div>
                             </div>
                          </td>
                          <td className="px-10 py-8">
                             <button 
                               onClick={() => toggleStatus(role)}
                               className={`px-6 py-2 rounded-full border transition-all duration-500 hover:scale-105 active:scale-95 shadow-sm whitespace-nowrap ${role.status === 'Active' ? 'bg-zen-leaf/10 text-zen-leaf border-zen-leaf/20' : 'bg-red-50 text-red-400 border-red-100'}`}
                             >
                                <span className="text-[10px] font-bold uppercase tracking-widest">{role.status === 'Inactive' ? 'Deactive' : 'Active'}</span>
                             </button>
                          </td>
                          <td className="px-10 py-8 text-right">
                             <div className="flex items-center justify-end gap-3 transition-all duration-500">
                                <ZenIconButton 
                                  icon={Edit} 
                                  onClick={() => handleOpenModal(role)} 
                                />
                                <ZenIconButton 
                                  icon={Trash2} 
                                  variant="danger" 
                                  onClick={() => { setRoleToDelete(role._id); setIsConfirmOpen(true); }} 
                                />
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {filteredRoles.length === 0 && (
          <div className="py-40 text-center">
             <p className="text-2xl font-serif text-zen-brown/20 italic">No authority records resonance in this sector.</p>
          </div>
      )}

      <ZenPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        maxWidth="max-w-4xl"
        title={editingRole ? 'Refine Authority' : 'Establish Authority'}
        subtitle="Foundational Access Calibration"
        headerIcon={Shield}
        footer={
          <div className="flex w-full gap-6">
            <ZenButton 
              type="button"
              variant="outline"
              className="flex-1 py-5 rounded-[2rem]"
              onClick={() => setIsModalOpen(false)}
            >
              Discard
            </ZenButton>
            <ZenButton 
              type="submit"
              form="role-modal-form"
              className="flex-[2] py-5 rounded-[2rem] shadow-2xl shadow-zen-brown/20"
            >
              {editingRole ? 'Archive Refinement' : 'Commit Authority'}
            </ZenButton>
          </div>
        }
      >
        <form id="role-modal-form" onSubmit={handleSubmit} className="px-6 sm:px-10 py-8 sm:py-12 space-y-12">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 animate-in fade-in duration-500">
              <ZenInput 
                label="Authority Mandate"
                required
                disabled={!!editingRole && ['Admin', 'Manager', 'Employee', 'Client'].includes(editingRole.name)}
                value={formData.name}
                onChange={(e: any) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Master Specialist"
              />
              <ZenDropdown 
                label="Authority State"
                options={['Active', 'Deactive']}
                value={formData.status === 'Inactive' ? 'Deactive' : formData.status}
                onChange={(val) => setFormData({...formData, status: val === 'Deactive' ? 'Inactive' : val as 'Active' | 'Inactive'})}
              />
           </div>

           <div>
              <div className="flex items-center justify-between mb-8 px-2">
                 <div>
                    <h3 className="text-xl font-serif font-bold text-zen-brown tracking-tight">Access Sectors</h3>
                    <p className="text-[10px] font-bold text-zen-brown/20 uppercase tracking-[.3em] mt-1">Foundational Permission Calibration</p>
                 </div>
                 <div className="flex items-center gap-6">
                    <button
                      type="button"
                      onClick={toggleAllPermissions}
                      className="group flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-zen-brown/5 hover:bg-zen-sand hover:text-white transition-all duration-500 active:scale-95 border border-zen-brown/15"
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${formData.permissions.length === ALL_PAGES.length ? 'bg-white border-white' : 'border-zen-sand'}`}>
                        {formData.permissions.length === ALL_PAGES.length && <CheckCircle2 size={12} className="text-zen-sand" />}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                        {formData.permissions.length === ALL_PAGES.length ? 'Rescind All' : 'Select All'}
                      </span>
                    </button>
                    <div className="flex items-center gap-2 border-l border-zen-brown/25 pl-6">
                       <span className="text-[10px] font-bold text-zen-brown/30 uppercase mr-2 tracking-widest">Selected</span>
                       <ZenBadge variant="leaf" className="px-4 py-1.5 shadow-lg shadow-zen-leaf/10">{formData.permissions.length}</ZenBadge>
                    </div>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ALL_PAGES.map(page => {
                  const isActive = formData.permissions.includes(page.id);
                  return (
                    <button
                      type="button"
                      key={page.id}
                      onClick={() => togglePermission(page.id)}
                      className={`flex items-center justify-between p-6 rounded-[2rem] border transition-all duration-700 relative overflow-hidden group/btn ${
                        isActive 
                          ? 'bg-zen-leaf text-white border-zen-leaf shadow-2xl shadow-zen-leaf/20' 
                          : 'bg-white text-zen-brown/60 border-zen-brown/15 hover:border-zen-leaf/40 hover:bg-zen-cream'
                      }`}
                    >
                       <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                      <div className="flex items-center gap-4 relative z-10">
                         <div className={`w-12 h-12 rounded-full transition-all duration-700 flex items-center justify-center relative ${isActive ? 'bg-white/20 text-white shadow-inner' : 'bg-zen-cream text-zen-brown/20 border border-zen-brown/15'}`}>
                            {isActive ? (
                               <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                  <CheckCircle2 size={24} />
                               </motion.div>
                            ) : (
                               <Circle size={20} strokeWidth={1.5} />
                            )}
                         </div>
                         <span className="text-sm font-bold tracking-tight">{page.name}</span>
                      </div>
                      
                      {isActive && (
                         <motion.div 
                           initial={{ scale: 0, opacity: 0 }}
                           animate={{ scale: 1, opacity: 1 }}
                           className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none"
                         >
                            <Sparkles size={20} />
                         </motion.div>
                      )}
                    </button>
                  );
                })}
              </div>
           </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Purge Authority?"
        message="Are you certain you wish to dissolve this authority level? This ritual cannot be undone."
      />
    </ZenPageLayout>
  );
};

export default Roles;
