import React, { useState, useMemo } from 'react';
import {
  Shield, Trash2, Edit, Lock, Key,
  CheckCircle2, Circle, Grid, Zap, X, Info
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
import { ZenStatCard } from '../../components/zen/ZenStatCard';
import { ExportPopup, ExportColumn } from '../../components/shared/ExportPopup';
import { PERMISSION_DEFINITIONS } from '../../config/accessControl';

interface Role {
  _id: string;
  name: string;
  permissions: string[];
  isActive?: boolean;
  status?: 'Active' | 'Inactive';
  createdAt?: string;
}

const ALL_PAGES = [...PERMISSION_DEFINITIONS];

const PAGE_LIMIT = 12;

const CORE_ROLES = ['Admin', 'Manager', 'Employee', 'Client'];

const permissionName = (permissionId: string) =>
  ALL_PAGES.find((page) => page.id === permissionId)?.name || permissionId;

const permissionNames = (permissions: string[] = []) =>
  permissions.map(permissionName).join(', ') || '-';

const missingPermissions = (permissions: string[] = []) =>
  ALL_PAGES.filter((page) => !permissions.includes(page.id));

const formatExportDateTime = (value?: string) => {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().slice(0, 16).replace('T', ' ');
};

const roleMatchesSearch = (role: Role, searchTerm: string) => {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) return true;

  const missing = missingPermissions(role.permissions);
  return [
    role._id,
    role.name,
    role.status || 'Active',
    role.isActive ?? (role.status || 'Active') === 'Active',
    role.permissions.length,
    role.permissions.join(', '),
    permissionNames(role.permissions),
    missing.map((page) => page.id).join(', '),
    missing.map((page) => page.name).join(', '),
    CORE_ROLES.includes(role.name) ? 'Core Role' : 'Custom Role',
    role.createdAt
  ].some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch));
};

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
    return roles.filter(role => roleMatchesSearch(role, searchTerm));
  }, [roles, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / PAGE_LIMIT));
  const currentPage = Math.min(page, totalPages);

  const paginatedRoles = useMemo(() => {
    const start = (currentPage - 1) * PAGE_LIMIT;
    return filteredRoles.slice(start, start + PAGE_LIMIT);
  }, [filteredRoles, currentPage]);

  const fetchAllRolesForExport = async (): Promise<Role[]> => {
    if (!user?.token) return [];

    const allRoles: Role[] = [];
    const exportLimit = 200;
    let exportPage = 1;
    let exportTotalPages = 1;

    do {
      const response = await fetch(`${API_URL}/roles?page=${exportPage}&limit=${exportLimit}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });

      if (!response.ok) {
        throw new Error('Unable to fetch roles for export');
      }

      const payload = await response.json();
      const pageRows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      allRoles.push(...pageRows);
      exportTotalPages = Number(payload?.pagination?.pages || 1);
      exportPage += 1;
    } while (exportPage <= exportTotalPages);

    const unique = new Map<string, Role>();
    allRoles.forEach((role) => {
      if (role?._id) unique.set(role._id, role);
    });

    return Array.from(unique.values()).filter((role) => roleMatchesSearch(role, searchTerm));
  };

  const roleExportColumns = useMemo<ExportColumn<Role>[]>(
    () => [
      { header: 'Role ID', accessor: (role) => role._id },
      { header: 'Role Name', accessor: (role) => role.name },
      { header: 'Role Type', accessor: (role) => (CORE_ROLES.includes(role.name) ? 'Core Role' : 'Custom Role') },
      { header: 'Status', accessor: (role) => role.status || 'Active' },
      { header: 'Is Active', accessor: (role) => role.isActive ?? (role.status || 'Active') === 'Active' },
      { header: 'Permission Count', accessor: (role) => role.permissions.length },
      { header: 'Permission IDs', accessor: (role) => role.permissions.join(', ') || '-' },
      { header: 'Permission Names', accessor: (role) => permissionNames(role.permissions) },
      { header: 'Missing Permission IDs', accessor: (role) => missingPermissions(role.permissions).map((page) => page.id).join(', ') || '-' },
      { header: 'Missing Permission Names', accessor: (role) => missingPermissions(role.permissions).map((page) => page.name).join(', ') || '-' },
      { header: 'Protected From Delete', accessor: (role) => CORE_ROLES.includes(role.name) },
      { header: 'Created At', accessor: (role) => formatExportDateTime(role.createdAt) },
      ...ALL_PAGES.map((page) => ({
        header: `${page.name} Access`,
        accessor: (role: Role) => (role.permissions.includes(page.id) ? 'Yes' : 'No')
      }))
    ],
    []
  );

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
    // Prevent removing core permissions for Client role
    if (editingRole?.name === 'Client' && ['dashboard', 'book', 'profile', 'history'].includes(permId) && formData.permissions.includes(permId)) {
      notify('error', 'Restricted', 'Core permissions for Client role are mandatory.');
      return;
    }

    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId]
    }));
  };

  const toggleAllPermissions = () => {
    if (formData.permissions.length === ALL_PAGES.length) {
      // If Client, keep the core 4 even when clearing all
      if (editingRole?.name === 'Client') {
        setFormData(prev => ({ ...prev, permissions: ['dashboard', 'book', 'profile', 'history'] }));
      } else {
        setFormData(prev => ({ ...prev, permissions: [] }));
      }
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
      title="Roles"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      addButtonLabel="Create Role"
      onAddClick={() => handleOpenModal()}
      hideBranchSelector
      searchActions={
        <ExportPopup
          data={filteredRoles}
          columns={roleExportColumns}
          fileName="roles"
          title="Roles"
          triggerLabel="Download"
          description="Choose format and export the complete role sheet with status, permission summaries, per-module access values, and audit fields."
          resolveData={fetchAllRolesForExport}
        />
      }
      topContent={
        <div className="flex overflow-x-auto overflow-y-visible pt-4 pb-6 gap-6 lg:grid lg:grid-cols-4 lg:gap-8 lg:overflow-visible scrollbar-hide px-4 lg:px-2">
          {[
            { label: 'Total Roles', value: roles.length, icon: Shield, color: 'text-yellow-600', bg: 'bg-yellow-600/10', glow: 'bg-yellow-600/20', trend: 'Global profiles' },
            { label: 'Active Profiles', value: roles.filter(r => (r.status || 'Active') === 'Active').length, icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', trend: 'Live access' },
            { label: 'System Inactive', value: roles.filter(r => (r.status || 'Active') !== 'Active').length, icon: X, color: 'text-rose-500', bg: 'bg-rose-500/10', glow: 'bg-rose-500/20', trend: 'Paused roles' },
            { label: 'Secured Modules', value: ALL_PAGES.length, icon: Lock, color: 'text-purple-500', bg: 'bg-purple-500/10', glow: 'bg-purple-500/20', trend: 'System scope' }
          ].map((stat, i) => (
            <ZenStatCard key={i} {...stat} delay={i * 0.05} />
          ))}
        </div>
      }
    >
      <div className="space-y-6 pb-20">
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
                       {!['Admin', 'Manager', 'Client'].includes(role.name) && (
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
                     <p className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest ">
                       {role.name === 'Admin' ? 'System Access' : `Page access (${role.permissions.length})`}
                     </p>
                     <Key size={14} className="text-zen-sand opacity-30" />
                  </div>
                  {role.name === 'Admin' ? (
                    <div className="flex items-center gap-3 py-2">
                       <Shield size={16} className="text-zen-sand animate-pulse" />
                       <span className="text-sm font-serif italic text-zen-sand font-semibold">Full System Access Enabled</span>
                    </div>
                  ) : (
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
                  )}
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
        <div className="table-container w-full bg-white rounded-xl border border-gray-200/60 shadow-none overflow-hidden animate-in fade-in duration-700">
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
                      {role.name === 'Admin' ? (
                        <ZenBadge variant="leaf" className="bg-emerald-500/10 border-none text-emerald-600">Full Access</ZenBadge>
                      ) : (
                        <>
                          <ZenBadge variant="sand" className="bg-zen-cream/30 border-none">{role.permissions.length} Pages</ZenBadge>
                          <div className="flex -space-x-2">
                            {role.permissions.slice(0, 3).map((p, i) => (
                               <div key={i} className="w-6 h-6 rounded-full bg-white border border-zen-brown/15 flex items-center justify-center shadow-sm" title={ALL_PAGES.find(pg => pg.id === p)?.name}>
                                  <Lock size={10} className="text-zen-brown/20" />
                               </div>
                            ))}
                          </div>
                        </>
                      )}
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
                       {!['Admin', 'Manager', 'Client'].includes(role.name) && (
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
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="max-w-6xl"
        header={
          <div className="flex items-center justify-between gap-6 px-10 py-8 border-b border-zen-brown/5 bg-zen-cream/10">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-zen-brown text-white flex items-center justify-center shadow-lg shadow-zen-brown/20 shrink-0">
                <Shield size={28} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-2xl font-serif font-black text-zen-brown tracking-tight">
                  {editingRole ? 'Refine Access Role' : 'Establish Access Role'}
                </h3>
                <p className="text-xs font-bold text-zen-brown/30 uppercase tracking-[0.4em] mt-1">Permission Management System</p>
              </div>
            </div>
            <ZenIconButton icon={X} onClick={() => setIsModalOpen(false)} size="md" />
          </div>
        }
        footer={
          <div className="flex items-center justify-between px-10 py-6 bg-white border-t border-zen-brown/5">
            <div className="flex items-center gap-3 text-zen-brown/40 italic">
              <Info size={14} />
              <p className="text-[11px] font-medium tracking-wide">
                {editingRole ? 'Changes to core roles may affect multiple users immediately.' : 'New roles can be assigned to administrators from the registry.'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-zen-brown/50 hover:text-zen-brown hover:bg-zen-cream/50 transition-all"
              >
                Cancel
              </button>
              <ZenButton
                type="submit"
                form="role-modal-form"
                className="px-10 py-3.5 shadow-xl shadow-zen-brown/10"
              >
                {editingRole ? 'Synchronize Role' : 'Establish Role'}
              </ZenButton>
            </div>
          </div>
        }
      >
        <form id="role-modal-form" onSubmit={handleSubmit} className="px-2 py-4">
          <div className="space-y-12">
            {/* Identity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-4">
                <div className="sticky top-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-zen-sand/10 text-zen-sand flex items-center justify-center">
                      <Zap size={16} />
                    </div>
                    <h4 className="text-lg font-serif font-black text-zen-brown">Profile Definition</h4>
                  </div>
                  <p className="text-sm text-zen-brown/50 leading-relaxed max-w-xs">
                    Define the role's primary identity and its operational status within the system hierarchy.
                  </p>

                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="bg-zen-cream/30 p-4 rounded-2xl border border-zen-brown/5">
                      <p className="text-[9px] font-black text-zen-brown/20 uppercase tracking-widest">Active State</p>
                      <p className="mt-1 text-sm font-bold text-zen-brown">{formData.status}</p>
                    </div>
                    <div className="bg-zen-cream/30 p-4 rounded-2xl border border-zen-brown/5">
                      <p className="text-[9px] font-black text-zen-brown/20 uppercase tracking-widest">Visibility</p>
                      <p className="mt-1 text-sm font-bold text-zen-brown">{CORE_ROLES.includes(formData.name) ? 'Core' : 'Custom'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 bg-white p-8 rounded-[2rem] border border-zen-brown/5 shadow-sm">
                  <ZenInput
                    label="Role Name"
                    required
                    disabled={!!editingRole && ['Admin', 'Manager', 'Employee', 'Client'].includes(editingRole.name)}
                    value={formData.name}
                    onChange={(e: any) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Front desk manager"
                    variant="professional"
                  />
                  <ZenDropdown
                    label="System Status"
                    options={['Active', 'Inactive']}
                    value={formData.status}
                    onChange={(val) => setFormData({...formData, status: val as 'Active' | 'Inactive'})}
                    variant="pill"
                  />
                  <div className="sm:col-span-2">
                    <div className="flex items-start gap-4 p-5 bg-zen-brown/[0.02] rounded-2xl border border-zen-brown/5">
                      <Info size={18} className="text-zen-sand mt-0.5 shrink-0" />
                      <p className="text-xs text-zen-brown/60 leading-relaxed">
                        Core system roles such as Admin, Manager, Employee, and Client are protected. Custom roles can be tailored for specific branch operations or departmental access.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-zen-brown/10 to-transparent" />

            {/* Permissions Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-6">
              <div className="lg:col-span-4">
                <div className="sticky top-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-zen-purple/10 text-zen-purple flex items-center justify-center">
                      <Grid size={16} />
                    </div>
                    <h4 className="text-lg font-serif font-black text-zen-brown">Module Matrix</h4>
                  </div>
                  <p className="text-sm text-zen-brown/50 leading-relaxed max-w-xs">
                    Configure granular access by selecting the modules and pages this role is authorized to interact with.
                  </p>

                  <div className="mt-8 space-y-4">
                    <div className="bg-zen-purple/5 p-5 rounded-2xl border border-zen-purple/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-zen-purple/40 uppercase tracking-widest">Authorization Scope</span>
                        <ZenBadge variant="leaf" className="px-3 py-1">{formData.permissions.length}</ZenBadge>
                      </div>
                      <p className="text-xs text-zen-brown/60">Modules currently included in this role profile.</p>
                    </div>

                    <button
                      type="button"
                      onClick={toggleAllPermissions}
                      className="w-full flex items-center justify-between gap-3 rounded-2xl border border-zen-brown/10 bg-white px-5 py-4 text-zen-brown transition-all duration-300 hover:border-zen-sand/40 hover:bg-zen-cream/30 active:scale-[0.98]"
                    >
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                        {formData.permissions.length === ALL_PAGES.length ? 'Revoke All Access' : 'Grant Full Access'}
                      </span>
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-300 ${formData.permissions.length === ALL_PAGES.length ? 'border-zen-sand bg-zen-sand text-white' : 'border-zen-brown/20 text-zen-brown/20'}`}>
                        {formData.permissions.length === ALL_PAGES.length ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <Circle size={10} strokeWidth={1.5} />
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8">
                <div className="bg-white p-8 rounded-[2rem] border border-zen-brown/5 shadow-sm">
                  {editingRole?.name === 'Admin' ? (
                    <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 bg-zen-sand/5 rounded-[2rem] border border-zen-sand/10">
                      <div className="w-20 h-20 rounded-full bg-zen-sand/10 flex items-center justify-center text-zen-sand animate-pulse">
                        <Shield size={40} />
                      </div>
                      <div className="max-w-md px-8">
                        <h4 className="text-xl font-serif font-black text-zen-brown">Universal Authority</h4>
                        <p className="mt-2 text-sm text-zen-brown/50 leading-relaxed">
                          The Administrative role possesses immutable, full-spectrum access to all system modules to ensure continuity of operations.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {ALL_PAGES.map((page) => {
                        const isActive = formData.permissions.includes(page.id);
                        const isMandatory = editingRole?.name === 'Client' && ['dashboard', 'book', 'profile', 'history'].includes(page.id);

                        return (
                          <button
                            type="button"
                            key={page.id}
                            onClick={() => togglePermission(page.id)}
                            className={`group flex items-center gap-4 rounded-[1.5rem] border p-4 text-left transition-all duration-500 ${
                              isActive
                                ? 'border-zen-sand/20 bg-zen-sand/[0.03] text-zen-brown shadow-sm'
                                : 'border-zen-brown/5 bg-zen-cream/[0.15] text-zen-brown/40 hover:border-zen-sand/20 hover:bg-zen-cream/40'
                            }`}
                          >
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all duration-500 ${
                              isActive
                                ? 'border-zen-sand/20 bg-zen-sand text-white shadow-lg shadow-zen-sand/20'
                                : 'border-zen-brown/10 bg-white text-zen-brown/20'
                            }`}>
                              {isMandatory ? (
                                <Lock size={18} strokeWidth={2} />
                              ) : (
                                isActive ? <CheckCircle2 size={18} strokeWidth={2.5} /> : <Circle size={18} strokeWidth={1.5} />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold tracking-tight text-zen-brown">
                                {page.name}
                              </p>
                              <p className={`mt-1 text-[9px] font-bold uppercase tracking-[0.25em] ${
                                isActive ? 'text-zen-sand/60' : 'text-zen-brown/20'
                              }`}>
                                {isMandatory ? 'Mandatory Access' : isActive ? 'Granted Module' : 'Restricted Module'}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
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
