import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import dayjs from 'dayjs';
import { ZenStatCard } from '../../components/zen/ZenStatCard';
import { useAuth } from '../../context/AuthContext';
import {
  UserPlus, Mail, Edit2, Trash2, User,
  UserCircle, Lock, Eye, EyeOff, Sparkles, X, Calendar, Info,
  Shield, MapPin, Grid, List, Search, Zap
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { Modal } from '../../components/shared/Modal';
import { notify } from '../../components/shared/ZenNotification';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { ZenDropdown, ZenInput } from '../../components/zen/ZenInputs';
import { ZenIconButton, ZenBadge, ZenButton } from '../../components/zen/ZenButtons';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { getCachedJson, setCachedJson } from '../../utils/localCache';
import { ExportPopup, ExportColumn } from '../../components/shared/ExportPopup';

interface BranchRef {
  _id?: string;
  name?: string;
}

interface Admin {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive';
  branch?: BranchRef | string;
  isActive?: boolean;
  phone?: string;
  dob?: string;
  anniversary?: string;
  address?: string;
  notes?: string;
  preferences?: string;
  totalSpending?: number;
  visits?: number;
  profilePic?: string;
  isEmailVerified?: boolean;
  loginAttempts?: number;
  lockUntil?: string;
  createdAt: string;
}

const getAdminBranchId = (admin: Admin) => {
  if (!admin.branch) return '';
  return typeof admin.branch === 'string' ? admin.branch : admin.branch._id || '';
};

const getAdminBranchName = (admin: Admin) => {
  if (!admin.branch) return '-';
  return typeof admin.branch === 'string' ? admin.branch : admin.branch.name || '-';
};

const formatExportDate = (value?: string) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : value;
};

const formatExportDateTime = (value?: string) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm') : value;
};

const adminMatchesSearch = (admin: Admin, searchTerm: string) => {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) return true;

  return [
    admin._id,
    admin.name,
    admin.email,
    admin.role,
    admin.status,
    admin.isActive,
    getAdminBranchId(admin),
    getAdminBranchName(admin),
    admin.phone,
    admin.dob,
    admin.anniversary,
    admin.address,
    admin.notes,
    admin.preferences,
    admin.totalSpending,
    admin.visits,
    admin.profilePic,
    admin.isEmailVerified,
    admin.loginAttempts,
    admin.lockUntil,
    admin.createdAt
  ].some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch));
};

const Admins = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [admins, setAdmins] = useState<Admin[]>(() => getCachedJson('zen_page_admins_list', []));
  const [loading, setLoading] = useState(() => getCachedJson<Admin[]>('zen_page_admins_list', []).length === 0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
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
    role: 'Admin' as 'Admin' | 'Manager',
    status: 'Active' as 'Active' | 'Inactive'
  });

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
    localStorage.setItem('zen_admin_view', viewMode);
    setPage(1);
  }, [viewMode]);

  const PAGE_LIMIT = 12;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    fetchAdmins();
  }, [page]);

  const fetchAdmins = async () => {
    try {
      if (admins.length === 0) setLoading(true);
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
      notify('error', 'Error', 'Failed to load administrative team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => setCachedJson('zen_page_admins_list', admins), [admins]);

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
        notify('success', 'Updated', `Administrator access ${newStatus === 'Active' ? 'restored' : 'suspended'}`);
        fetchAdmins();
      }
    } catch (error) {
      notify('error', 'Error', 'Toggle failed');
    }
  };

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = 'Identity Required';
    } else {
      const isDuplicate = admins.some(a =>
        a.name.toLowerCase() === formData.name.trim().toLowerCase() &&
        a._id !== editingAdmin?._id
      );
      if (isDuplicate) {
        errors.name = 'Duplicate Identity';
      }
    }
    if (!formData.email.trim()) {
      errors.email = 'Email Hub Required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid Ecosystem Address';
    }

    if (!editingAdmin) {
      if (!formData.password) {
        errors.password = 'Security Key Required';
      } else if (formData.password.length < 6) {
        errors.password = 'Key Too Fragile (min 6)';
      }

      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Keys Do Not Match';
      }
    } else if (formData.password) {
      if (formData.password.length < 6) {
        errors.password = 'Key Too Fragile (min 6)';
      }
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      notify('error', 'Validation Failure', 'Please verify the highlighted fields.');
      return false;
    }
    return true;
  };

  const handleOpenModal = (admin: Admin | null = null) => {
    setFormErrors({});
    if (admin) {
      setEditingAdmin(admin);
      setFormData({
        name: admin.name,
        email: admin.email,
        password: '',
        confirmPassword: '',
        role: (admin.role as 'Admin' | 'Manager') || 'Admin',
        status: admin.status || 'Active'
      });
    } else {
      setEditingAdmin(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'Admin',
        status: 'Active'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

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
          role: formData.role,
          ...(formData.password && { password: formData.password })
        })
      });
      if (response.ok) {
        notify('success', 'Updated', editingAdmin ? 'Admin User record updated' : 'Admin User access established');
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
    if (id === user?._id) return notify('warning', 'Protection', 'Cannot remove your own account');

    openConfirm(
      'Delete Admin User',
      'Delete this admin user? This will remove the admin user from the workspace ecosystem.',
      async () => {
        try {
          const response = await fetch(`${API_URL}/admins/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${user?.token}` }
          });
          if (response.ok) {
            notify('success', 'Purged', 'Admin User access removed from workspace');
            fetchAdmins();
          }
        } catch (error) {
          notify('error', 'Error', 'Action failed');
        }
      }
    );
  };


  const filteredAdmins = useMemo(
    () => admins.filter((admin) => adminMatchesSearch(admin, debouncedSearch)),
    [admins, debouncedSearch]
  );

  const fetchAllAdminsForExport = async (): Promise<Admin[]> => {
    if (!user?.token) return [];

    const allAdmins: Admin[] = [];
    const exportLimit = 200;
    let exportPage = 1;
    let exportTotalPages = 1;

    do {
      const response = await fetch(`${API_URL}/admins?page=${exportPage}&limit=${exportLimit}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });

      if (!response.ok) {
        throw new Error('Unable to fetch admins for export');
      }

      const payload = await response.json();
      const pageRows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      allAdmins.push(...pageRows);
      exportTotalPages = Number(payload?.pagination?.pages || 1);
      exportPage += 1;
    } while (exportPage <= exportTotalPages);

    const unique = new Map<string, Admin>();
    allAdmins.forEach((admin) => {
      if (admin?._id) unique.set(admin._id, admin);
    });

    return Array.from(unique.values()).filter((admin) => adminMatchesSearch(admin, debouncedSearch));
  };

  const adminExportColumns = useMemo<ExportColumn<Admin>[]>(
    () => [
      { header: 'Admin ID', accessor: (admin) => admin._id },
      { header: 'Name', accessor: (admin) => admin.name },
      { header: 'Email', accessor: (admin) => admin.email },
      { header: 'Role', accessor: (admin) => admin.role },
      { header: 'Status', accessor: (admin) => admin.status || 'Active' },
      { header: 'Is Active', accessor: (admin) => admin.isActive ?? admin.status === 'Active' },
      { header: 'Branch ID', accessor: (admin) => getAdminBranchId(admin) || '-' },
      { header: 'Branch', accessor: (admin) => getAdminBranchName(admin) },
      { header: 'Phone', accessor: (admin) => admin.phone || '-' },
      { header: 'DOB', accessor: (admin) => formatExportDate(admin.dob) },
      { header: 'Anniversary', accessor: (admin) => formatExportDate(admin.anniversary) },
      { header: 'Address', accessor: (admin) => admin.address || '-' },
      { header: 'Notes', accessor: (admin) => admin.notes || '-' },
      { header: 'Preferences', accessor: (admin) => admin.preferences || '-' },
      { header: 'Total Spending', accessor: (admin) => admin.totalSpending ?? 0 },
      { header: 'Visits', accessor: (admin) => admin.visits ?? 0 },
      { header: 'Profile Pic', accessor: (admin) => admin.profilePic || '-' },
      { header: 'Email Verified', accessor: (admin) => admin.isEmailVerified ?? false },
      { header: 'Login Attempts', accessor: (admin) => admin.loginAttempts ?? 0 },
      { header: 'Lock Until', accessor: (admin) => formatExportDateTime(admin.lockUntil) },
      { header: 'Created At', accessor: (admin) => formatExportDateTime(admin.createdAt) }
    ],
    []
  );

  return (
    <ZenPageLayout
      title="Admin Users"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      addButtonLabel="Recruit Admin"
      onAddClick={() => handleOpenModal()}
      hideBranchSelector
      searchActions={
        <ExportPopup<Admin>
          data={filteredAdmins}
          columns={adminExportColumns}
          fileName="admin_users"
          title="Admin Users"
          triggerLabel="Download"
          description="Choose format and export the complete admin users sheet with identity, role, branch, contact, status, security, and audit values."
          resolveData={fetchAllAdminsForExport}
        />
      }
      topContent={
        <div className="flex overflow-x-auto overflow-y-visible pt-4 pb-6 gap-6 lg:grid lg:grid-cols-4 lg:gap-8 lg:overflow-visible scrollbar-hide px-4 lg:px-2">
          {[
            { label: 'Total Admin Users', value: admins.length, icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10', glow: 'bg-blue-500/20', trend: 'Admin Registry' },
            { label: 'High Command', value: admins.filter(a => a.role === 'Admin').length, icon: Sparkles, color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', trend: 'Root access' },
            { label: 'Branch Officers', value: admins.filter(a => a.role !== 'Admin').length, icon: User, color: 'text-amber-500', bg: 'bg-amber-500/10', glow: 'bg-amber-500/20', trend: 'Localized control' },
            { label: 'Registry Era', value: dayjs().format('YYYY'), icon: Info, color: 'text-zen-sand', bg: 'bg-zen-sand/10', glow: 'bg-zen-sand/20', trend: 'Current cycle' }
          ].map((stat, i) => (
            <ZenStatCard key={i} {...stat} delay={i * 0.2} />
          ))}
        </div>
      }
    >
      <div className="space-y-6 pb-20">
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-zen-brown border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {filteredAdmins.map((admin) => (
            <div key={admin._id} className={`group relative bg-white/80 backdrop-blur-xl rounded-[1.5rem] p-8 shadow-sm border border-white transition-all duration-700 hover:shadow-zen-brown/15 hover:-translate-y-2 h-full flex flex-col justify-between overflow-hidden ${admin.status === 'Inactive' ? 'opacity-60 grayscale' : ''}`}>
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
                      className={`flex items-center gap-2.5 px-5 py-2 rounded-full border transition-all duration-500 hover:scale-110 active:scale-95 shadow-sm ${
                        admin.status === 'Active'
                          ? 'bg-zen-leaf/10 text-zen-leaf border-zen-leaf/30 shadow-zen-leaf/5'
                          : 'bg-rose-50 text-rose-500 border-rose-100'
                      }`}
                    >
                       <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${admin.status === 'Active' ? 'bg-zen-leaf' : 'bg-rose-500'}`} />
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">
                          {admin.status === 'Inactive' ? 'Suspended' : 'Operational'}
                       </span>
                    </button>

                    <div className="flex items-center gap-2 text-zen-brown/20 italic text-[10px] font-medium">
                       <Calendar size={14} strokeWidth={1.5} />
                       Created {new Date(admin.createdAt).toLocaleDateString()}
                    </div>
                 </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="w-full bg-white rounded-xl border border-gray-200/60 shadow-none overflow-hidden animate-in fade-in duration-700">
          <div className="table-container">
            <table className="w-full text-center border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th>S NO</th>
                <th>Portrait</th>
                <th>Identity</th>
                <th>Email Hub</th>
                <th>Admin</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(!filteredAdmins || filteredAdmins.length === 0) && (
                 <tr>
                    <td colSpan={7}>
                       <span className="text-[13px] font-sans text-gray-400 italic">No registry data available</span>
                    </td>
                 </tr>
              )}

              {filteredAdmins.map((admin, index) => (
                <tr key={admin._id} className={`transition-all group border-b border-black/[0.02] ${admin.status === 'Inactive' ? 'opacity-50 grayscale' : ''}`}>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <span>{((page - 1) * PAGE_LIMIT + index + 1).toString().padStart(2, '0')}</span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                     <div className="flex justify-center">
                        <div className="w-10 lg:w-12 h-10 lg:h-12 zen-pointed-surface overflow-hidden bg-zen-cream border-2 border-white shadow-lg shrink-0 group-hover:scale-110 transition-transform duration-500 flex items-center justify-center text-zen-brown/10">
                          <User size={24} />
                        </div>
                     </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <div className="flex flex-col items-center justify-center leading-none">
                      <span className="zen-table-primary">{admin.name}</span>
                      <span className="zen-table-meta mt-1">Admin User</span>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <div className="flex flex-col items-center justify-center leading-none">
                       <span className="zen-table-primary">{admin.email}</span>
                       <span className="zen-table-meta mt-1">Security Hub</span>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                     <ZenBadge variant="sand" className="text-[9px] uppercase tracking-widest">{admin.role}</ZenBadge>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <div className="flex justify-center">
                       <ZenBadge variant={admin.status === 'Active' ? 'leaf' : 'sand'} className="text-[9px] uppercase tracking-widest">
                          {admin.status === 'Inactive' ? 'Suspended' : 'Operational'}
                       </ZenBadge>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <div className="flex items-center justify-center gap-2">
                       <ZenIconButton
                         icon={Zap}
                         variant={admin.status === 'Active' ? 'leaf' : 'sand'}
                         onClick={() => toggleStatus(admin)}
                         size="md"
                       />
                       <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(admin)} size="md" />
                       <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDelete(admin._id)} size="md" />
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
          <div className="flex items-center justify-between gap-6 px-10 py-8 border-b border-zen-brown/5 bg-zen-cream/10">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-zen-brown text-white flex items-center justify-center shadow-lg shadow-zen-brown/20 shrink-0">
                <UserCircle size={28} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-2xl font-serif font-black text-zen-brown tracking-tight">
                  {editingAdmin ? 'Refine Admin User' : 'Establish Admin User'}
                </h3>
                <p className="text-xs font-bold text-zen-brown/30 uppercase tracking-[0.4em] mt-1">Registry Management System</p>
              </div>
            </div>
            <ZenIconButton icon={X} onClick={() => setIsModalOpen(false)} size="md" />
          </div>
        }
        footer={
          <div className="flex items-center justify-end w-full gap-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-zen-brown/50 hover:text-zen-brown hover:bg-zen-cream/50 transition-all whitespace-nowrap"
            >
              Cancel
            </button>
            <ZenButton
              type="submit"
              form="admin-modal-form"
              className="px-10 py-3.5 shadow-xl shadow-zen-brown/10 whitespace-nowrap"
            >
              {editingAdmin ? 'Sync Changes' : 'Confirm Access'}
            </ZenButton>
          </div>
        }
      >
        <form id="admin-modal-form" onSubmit={handleSubmit} className="px-8 py-10">
          <div className="bg-white rounded-[3rem] border border-zen-brown/10 p-12 shadow-2xl shadow-zen-brown/5 relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-zen-brown/[0.03] rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-zen-sand/[0.05] rounded-full blur-3xl" />

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              <div className="space-y-10">
                <div className="space-y-6">
                  <ZenInput
                    label="Full Name"
                    placeholder="e.g. Alexander Pierce"
                    value={formData.name}
                    onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                    variant="professional"
                    error={formErrors.name}
                  />
                  <ZenInput
                    label="Email Address"
                    icon={Mail}
                    type="email"
                    placeholder="alexander@workspace.com"
                    value={formData.email}
                    onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
                    variant="professional"
                    error={formErrors.email}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <ZenDropdown
                    label="Role Access"
                    options={['Admin', 'Manager']}
                    value={formData.role}
                    onChange={(val) => setFormData({ ...formData, role: val as 'Admin' | 'Manager' })}
                    variant="pill"
                    error={!!formErrors.role}
                  />
                  <ZenDropdown
                    label="Active Status"
                    options={['Active', 'Inactive']}
                    value={formData.status}
                    onChange={(val) => setFormData({ ...formData, status: val as 'Active' | 'Inactive' })}
                    variant="pill"
                    error={!!formErrors.status}
                  />
                </div>
              </div>

              <div className="space-y-10">
                <div className="space-y-6">
                  <ZenInput
                    label={`Security Key${editingAdmin ? ' (optional)' : ''}`}
                    icon={Lock}
                    type="password"
                    placeholder="••••••••••••"
                    value={formData.password}
                    onChange={(e: any) => setFormData({ ...formData, password: e.target.value })}
                    variant="professional"
                    error={formErrors.password}
                  />
                  {!editingAdmin && (
                    <ZenInput
                      label="Verify Key"
                      icon={Lock}
                      type="password"
                      placeholder="••••••••••••"
                      value={formData.confirmPassword}
                      onChange={(e: any) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      variant="professional"
                      error={formErrors.confirmPassword}
                    />
                  )}
                </div>

                <div className="p-6 bg-zen-brown/[0.03] rounded-3xl border border-zen-brown/5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                    <Shield className="text-zen-brown/40" size={20} />
                  </div>
                  <p className="text-[11px] leading-relaxed text-zen-brown/50 font-medium">
                    Ensure credentials meet security standards. High-level accounts maintain significant authority across the workspace ecosystem.
                  </p>
                </div>
              </div>
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

export default Admins;
