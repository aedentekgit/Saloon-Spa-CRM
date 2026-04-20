import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Trash2, 
  Plus, 
  Edit, 
  Lock,
  Key,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { ZenBadge, ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { ZenInput, ZenDropdown } from '../../components/zen/ZenInputs';
import { notify } from '../../components/shared/ZenNotification';
import { Modal } from '../../components/shared/Modal';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { useData } from '../../context/DataContext';

interface Role {
  _id: string;
  name: string;
  permissions: string[];
  status?: 'Active' | 'Inactive';
}

const ALL_PAGES = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'memberships', name: 'Memberships' },
  { id: 'services', name: 'Services' },
  { id: 'rooms', name: 'Rooms' },
  { id: 'clients', name: 'Clients' },
  { id: 'appointments', name: 'Appointments' },
  { id: 'employees', name: 'Employees' },
  { id: 'attendance', name: 'Attendance' },
  { id: 'shifts', name: 'Shifts' },
  { id: 'payroll', name: 'Payroll' },
  { id: 'leave', name: 'Leave' },
  { id: 'finance', name: 'Finance' },
  { id: 'transactions', name: 'Transactions' },
  { id: 'inventory', name: 'Inventory' },
  { id: 'billing', name: 'Billing' },
  { id: 'whatsapp', name: 'WhatsApp' },
  { id: 'reports', name: 'Reports' },
  { id: 'branches', name: 'Branches' },
  { id: 'room-categories', name: 'Room Category' },
  { id: 'service-categories', name: 'Service Category' },
  { id: 'admins', name: 'Admins' },
  { id: 'roles', name: 'Roles' },
  { id: 'settings', name: 'Settings' }
];

const PAGE_LIMIT = 12;

const Roles = () => {
  const { user } = useAuth();
  const { roles, refreshData, loading } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [page, setPage] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    permissions: [] as string[],
    status: 'Active' as 'Active' | 'Inactive'
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  const fetchRoles = async () => {
    refreshData();
  };

  const filteredRoles = useMemo(() => {
    return roles.filter(role => 
      (role.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [roles, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / PAGE_LIMIT));
  const currentPage = Math.min(page, totalPages);

  const paginatedRoles = useMemo(() => {
    const start = (currentPage - 1) * PAGE_LIMIT;
    return filteredRoles.slice(start, start + PAGE_LIMIT);
  }, [filteredRoles, currentPage]);

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
        notify('success', editingRole ? 'Role saved' : 'Role created', editingRole ? 'Role permissions updated.' : 'New role created.');
        setIsModalOpen(false);
        fetchRoles();
      }
    } catch (error) {
      notify('error', 'Save Error', 'Failed to save the role.');
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
        notify('success', 'Role updated', `Role ${newStatus === 'Active' ? 'activated' : 'deactivated'}`);
        fetchRoles();
      }
    } catch (error) {
      notify('error', 'Toggle Error', 'Failed to update role status.');
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
        notify('success', 'Role deleted', 'The role has been removed.');
        setIsConfirmOpen(false);
        fetchRoles();
      }
    } catch (error) {
      notify('error', 'Removal Error', 'Failed to delete the role.');
    }
  };

  return (
    <ZenPageLayout
      title="Role Management"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      addButtonLabel="Create Role"
      onAddClick={() => handleOpenModal()}
      addButtonIcon={<Plus size={18} />}
    >
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {paginatedRoles.map(role => (
            <div key={role._id} className={`group relative bg-white rounded-[2rem] p-6 lg:p-8 shadow-sm border border-zen-brown/15 transition-all duration-700 hover:shadow-zen-brown/15 hover:-translate-y-2 h-full flex flex-col justify-between overflow-hidden ${role.status === 'Inactive' ? 'opacity-60 grayscale' : ''}`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-zen-sand/5 rounded-bl-full -z-0 pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>
              

              
               <div className="relative z-10">
                 <div className="flex items-start justify-between mb-8">
                 <div>
                    <h3 className="text-2xl font-serif font-bold text-zen-brown mb-2 tracking-tight transition-colors group-hover:text-zen-sand">{role.name}</h3>
                     <div className="flex items-center gap-2">
                        <Shield size={10} className="text-zen-sand" />
                        <p className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.4em]">Role ID_{role._id.slice(-4)}</p>
                     </div>
                 </div>
                    <div className="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all lg:translate-x-4 lg:group-hover:translate-x-0 duration-500">
                       <ZenIconButton icon={Edit} onClick={() => handleOpenModal(role)} />
                       {role.name !== 'Admin' && (
                         <ZenIconButton 
                           icon={Trash2} 
                           variant="danger" 
                           onClick={() => { setRoleToDelete(role._id); setIsConfirmOpen(true); }} 
                         />
                       )}
                    </div>
                 </div>
              </div>

              <div className="flex-1 relative z-10">
                 <div className="flex items-center justify-between mb-6">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest ">Page access ({role.permissions.length})</p>
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
                       <span className="text-[10px] font-bold uppercase tracking-widest leading-none">{role.status === 'Inactive' ? 'Inactive' : 'Active'}</span>
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
        <div className="table-container w-full bg-white rounded-xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in fade-in duration-700">
          <table className="w-full text-center border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th>S NO</th>
                <th>Role Name</th>
                <th>Page Access</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(!filteredRoles || filteredRoles.length === 0) && (
                 <tr>
                    <td colSpan={5}>
                       <span className="text-[13px] font-sans text-gray-400 italic">No records available.</span>
                    </td>
                 </tr>
              )}

              {paginatedRoles.map((role, index) => (
                <tr key={role._id} className="transition-all group border-b border-black/[0.02]">
                  <td className="text-center italic opacity-40 text-[11px]">
                    {((currentPage - 1) * PAGE_LIMIT + index + 1).toString().padStart(2, '0')}
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-4">
                      <div className="p-3 bg-zen-cream/30 rounded-xl text-zen-sand">
                        <Shield size={18} />
                      </div>
                      <div>
                        <p className="zen-table-primary">{role.name}</p>
                        <p className="text-[8px] font-bold text-zen-brown/20 uppercase tracking-widest mt-0.5">ID_{role._id.slice(-6)}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-3">
                      <ZenBadge variant="sand" className="bg-zen-cream/30 border-none">{role.permissions.length} Pages</ZenBadge>
                      <div className="flex -space-x-2">
                        {role.permissions.slice(0, 3).map((p, i) => (
                           <div key={i} className="w-6 h-6 rounded-full bg-white border border-zen-brown/15 flex items-center justify-center shadow-sm" title={ALL_PAGES.find(pg => pg.id === p)?.name}>
                              <Lock size={10} className="text-zen-brown/20" />
                           </div>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td>
                    <button 
                      onClick={() => toggleStatus(role)}
                      className={`px-6 py-2 rounded-full border transition-all duration-500 hover:scale-105 active:scale-95 shadow-sm whitespace-nowrap ${role.status === 'Active' ? 'bg-zen-leaf/10 text-zen-leaf border-zen-leaf/20' : 'bg-red-50 text-red-400 border-red-100'}`}
                    >
                       <span className="text-[10px] font-bold uppercase tracking-widest">{role.status === 'Inactive' ? 'Inactive' : 'Active'}</span>
                    </button>
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-2 transition-all duration-500">
                       <ZenIconButton icon={Edit} onClick={() => handleOpenModal(role)} />
                       {role.name !== 'Admin' && (
                         <ZenIconButton icon={Trash2} variant="danger" onClick={() => { setRoleToDelete(role._id); setIsConfirmOpen(true); }} />
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      

      <ZenPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        maxWidth="max-w-6xl"
        title={editingRole ? 'Edit Role' : 'New Role'}
        subtitle="Configure access and account status"
        headerIcon={Shield}
        footer={
          <div className="flex w-full gap-4 sm:gap-6">
            <ZenButton 
              type="button"
              variant="secondary"
              className="flex-1 rounded-[2rem] py-5"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </ZenButton>
            <ZenButton 
              type="submit"
              form="role-modal-form"
              className="flex-[2] rounded-[2rem] py-5 shadow-sm shadow-zen-brown/20"
            >
              {editingRole ? 'Save Role' : 'Create Role'}
            </ZenButton>
          </div>
        }
      >
        <form id="role-modal-form" onSubmit={handleSubmit} className="space-y-8">
          <div className="grid gap-8 xl:grid-cols-[0.82fr_1.18fr]">
            <div className="rounded-[1.75rem] border border-zen-brown/10 bg-gradient-to-b from-zen-cream/60 to-white p-6 sm:p-8 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-zen-brown/10 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-zen-brown/55">
                <Shield size={12} />
                Role overview
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl font-serif font-bold text-zen-brown">
                  {editingRole ? 'Editing access profile' : 'Creating access profile'}
                </h3>
                <p className="text-sm leading-relaxed text-zen-brown/60">
                  Configure a role name, account status, and only the modules this team member should
                  access.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-[1.25rem] border border-white/70 bg-white/90 p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/35">
                    Selected
                  </p>
                  <p className="mt-2 text-3xl font-serif font-bold text-zen-brown">
                    {formData.permissions.length.toString().padStart(2, '0')}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.3em] text-zen-brown/25">
                    permissions
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-white/70 bg-white/90 p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/35">
                    Status
                  </p>
                  <p className="mt-2 text-lg font-medium text-zen-brown">{formData.status}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.3em] text-zen-brown/25">
                    account state
                  </p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/35">
                  Notes
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zen-brown/60">
                  Core system roles such as Admin, Manager, Employee, and Client are protected. Custom
                  roles can be tailored for branch operations.
                </p>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-zen-brown/10 bg-white/90 p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 animate-in fade-in duration-500">
                <ZenInput 
                  label="Role Name"
                  required
                  disabled={!!editingRole && ['Admin', 'Manager', 'Employee', 'Client'].includes(editingRole.name)}
                  value={formData.name}
                  onChange={(e: any) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Front desk manager"
                />
                <ZenDropdown 
                  label="Status"
                  options={['Active', 'Inactive']}
                  value={formData.status}
                  onChange={(val) => setFormData({...formData, status: val as 'Active' | 'Inactive'})}
                />
              </div>

              <div className="flex flex-col gap-4 rounded-[1.5rem] border border-zen-brown/10 bg-zen-cream/45 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-serif font-bold text-zen-brown tracking-tight">
                    Module permissions
                  </h3>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[.3em] text-zen-brown/20">
                    Choose the pages this role can open
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleAllPermissions}
                    className="inline-flex items-center gap-3 rounded-full border border-zen-brown/15 bg-white px-4 py-2.5 text-zen-brown transition-all duration-300 hover:border-zen-primary/30 hover:bg-zen-primary/5 active:scale-95"
                  >
                    <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-300 ${formData.permissions.length === ALL_PAGES.length ? 'border-zen-primary bg-zen-primary text-white' : 'border-zen-primary/30 text-zen-primary'}`}>
                      {formData.permissions.length === ALL_PAGES.length ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        <Circle size={10} strokeWidth={1.5} />
                      )}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                      {formData.permissions.length === ALL_PAGES.length ? 'Clear all' : 'Select all'}
                    </span>
                  </button>
                  <ZenBadge variant="leaf" className="px-4 py-1.5 shadow-sm shadow-zen-leaf/10">
                    {formData.permissions.length} selected
                  </ZenBadge>
                </div>
              </div>

              <div className="max-h-[46vh] overflow-y-auto pr-1 custom-scrollbar">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {ALL_PAGES.map((page) => {
                    const isActive = formData.permissions.includes(page.id);
                    return (
                      <button
                        type="button"
                        key={page.id}
                        onClick={() => togglePermission(page.id)}
                        className={`group flex items-center gap-4 rounded-[1.35rem] border px-4 py-4 text-left transition-all duration-300 ${
                          isActive
                            ? 'border-zen-primary/25 bg-zen-primary/5 text-zen-brown shadow-sm'
                            : 'border-zen-brown/10 bg-white text-zen-brown/65 hover:border-zen-primary/25 hover:bg-zen-cream/60'
                        }`}
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 ${
                          isActive ? 'border-zen-primary/20 bg-zen-primary text-white' : 'border-zen-brown/10 bg-zen-cream text-zen-brown/25'
                        }`}>
                          {isActive ? <CheckCircle2 size={17} /> : <Circle size={17} strokeWidth={1.5} />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold tracking-tight text-zen-brown">
                            {page.name}
                          </p>
                          <p className={`mt-1 text-[9px] font-bold uppercase tracking-[0.28em] ${
                            isActive ? 'text-zen-primary/55' : 'text-zen-brown/25'
                          }`}>
                            {isActive ? 'Included in role' : 'Available module'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Delete role?"
        message="Are you sure you want to delete this role? This action cannot be undone."
      />
    </ZenPageLayout>
  );
};

export default Roles;
