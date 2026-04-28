import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Plus, Trash2, Edit2, Shield, Calendar, MapPin, X, Search, Grid, List, Sparkles, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { ZenBadge, ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { notify } from '../../components/shared/ZenNotification';
import { ZenDropdown, ZenInput, ZenTimePicker } from '../../components/zen/ZenInputs';
import { Modal } from '../../components/shared/Modal';
import { useBranches } from '../../context/BranchContext';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { ZenStatCard } from '../../components/zen/ZenStatCard';
import { ExportPopup, ExportColumn } from '../../components/shared/ExportPopup';

interface Shift {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  branch?: { _id?: string; name?: string } | string;
  status: string;
  createdAt?: string;
}

const getShiftBranchId = (shift: Shift) => {
  if (!shift.branch) return '';
  return typeof shift.branch === 'string' ? shift.branch : shift.branch._id || '';
};

const getShiftBranchName = (shift: Shift) => {
  if (!shift.branch) return 'Universal';
  return typeof shift.branch === 'string' ? shift.branch : shift.branch.name || 'Universal';
};

const formatExportDateTime = (value?: string) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm') : value;
};

const Shifts = () => {
  const { user } = useAuth();
  const { branches, selectedBranch, setSelectedBranch } = useBranches();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('zen_shift_view') as 'grid' | 'table') || 'grid';
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    startTime: '09:00 AM',
    endTime: '06:00 PM',
    durationHours: 8,
    branch: '',
    status: 'Active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
  const PAGE_LIMIT = 12;

  useEffect(() => {
    localStorage.setItem('zen_shift_view', viewMode);
    setPage(1);
  }, [viewMode]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [selectedBranch, debouncedSearch]);

  useEffect(() => {
    fetchShifts();
  }, [selectedBranch, page, debouncedSearch, user?.token]);

  useEffect(() => {
    const calculateDuration = () => {
      try {
        const start = dayjs(formData.startTime, 'hh:mm A');
        const end = dayjs(formData.endTime, 'hh:mm A');

        if (start.isValid() && end.isValid()) {
          let diff = end.diff(start, 'hour', true);
          // Handle overnight shifts (e.g., 09:00 PM to 06:00 AM)
          if (diff <= 0) diff += 24;

          setFormData(prev => ({ ...prev, durationHours: Math.round(diff * 100) / 100 }));
        }
      } catch (e) {
        // Silently fail if format is being typed
      }
    };
    calculateDuration();
  }, [formData.startTime, formData.endTime]);

  const fetchShifts = async () => {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: PAGE_LIMIT.toString(),
        search: debouncedSearch
      });
      if (selectedBranch && selectedBranch !== 'all') {
        queryParams.append('branch', selectedBranch);
      }
      const response = await fetch(`${API_URL.replace(/\/$/, '')}/shifts?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      if (data.data) {
        setShifts(data.data);
        setTotalPages(data.pagination?.pages || 1);
      } else if (Array.isArray(data)) {
        setShifts(data);
        setTotalPages(1);
      }
    } catch (error) {
      notify('error', 'Error', 'Failed to retrieve shifts');
      setTotalPages(1);
    }
  };

  const fetchAllShiftsForExport = async (): Promise<Shift[]> => {
    const allShifts: Shift[] = [];
    const exportLimit = 200;
    let exportPage = 1;
    let exportTotalPages = 1;

    do {
      const queryParams = new URLSearchParams({
        page: exportPage.toString(),
        limit: exportLimit.toString(),
        search: debouncedSearch
      });
      if (selectedBranch && selectedBranch !== 'all') {
        queryParams.append('branch', selectedBranch);
      }

      const response = await fetch(`${API_URL.replace(/\/$/, '')}/shifts?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });

      if (!response.ok) {
        throw new Error('Unable to fetch shifts for export');
      }

      const payload = await response.json();
      const pageRows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      allShifts.push(...pageRows);
      exportTotalPages = Number(payload?.pagination?.pages || 1);
      exportPage += 1;
    } while (exportPage <= exportTotalPages);

    const unique = new Map<string, Shift>();
    allShifts.forEach((shift) => {
      if (shift?._id) {
        unique.set(shift._id, shift);
      }
    });

    return Array.from(unique.values());
  };

  const shiftExportColumns = useMemo<ExportColumn<Shift>[]>(
    () => [
      { header: 'Shift ID', accessor: (shift) => shift._id },
      { header: 'Shift Name', accessor: (shift) => shift.name },
      { header: 'Branch ID', accessor: (shift) => getShiftBranchId(shift) || '-' },
      { header: 'Branch', accessor: (shift) => getShiftBranchName(shift) },
      { header: 'Start Time', accessor: (shift) => shift.startTime },
      { header: 'End Time', accessor: (shift) => shift.endTime },
      { header: 'Interval', accessor: (shift) => `${shift.startTime} - ${shift.endTime}` },
      { header: 'Duration (Hours)', accessor: (shift) => shift.durationHours },
      { header: 'Status', accessor: (shift) => shift.status || 'Active' },
      { header: 'Created At', accessor: (shift) => formatExportDateTime(shift.createdAt) }
    ],
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingShift ? `${API_URL}/shifts/${editingShift._id}` : `${API_URL}/shifts`;
      const method = editingShift ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          ...formData,
          branch: formData.branch && formData.branch !== 'all' ? formData.branch : (selectedBranch !== 'all' ? selectedBranch : undefined)
        })
      });

      if (response.ok) {
        notify('success', 'Shift saved', editingShift ? 'Shift updated.' : 'New shift created.');
        setIsModalOpen(false);
        fetchShifts();
      }
    } catch (error) {
      notify('error', 'Error', 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmState({
       isOpen: true,
       title: 'Archive Shift Pattern',
       message: 'Are you sure you want to delete this shift? This action will remove it from the schedule.',
       type: 'danger',
       onConfirm: async () => {
          try {
             const response = await fetch(`${API_URL}/shifts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user?.token}` }
             });
             if (response.ok) {
                notify('success', 'Shift deleted', 'Shift removed from the schedule.');
                fetchShifts();
             }
          } catch (error) {
             notify('error', 'Error', 'Failed to archive shift');
          }
       }
    });
  };

  const toggleStatus = async (shift: Shift) => {
    const newStatus = shift.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const response = await fetch(`${API_URL}/shifts/${shift._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        notify('success', 'Shift updated', `Shift ${newStatus}`);
        fetchShifts();
      }
    } catch (error) {
      notify('error', 'Error', 'Toggle failed');
    }
  };

  const handleOpenModal = (shift: Shift | null = null) => {
    if (shift) {
      setEditingShift(shift);
      setFormData({
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        durationHours: shift.durationHours,
        branch: getShiftBranchId(shift),
        status: shift.status || 'Active'
      });
    } else {
      setEditingShift(null);
      setFormData({
        name: '',
        startTime: '09:00 AM',
        endTime: '06:00 PM',
        durationHours: 8,
        branch: selectedBranch === 'all' ? '' : selectedBranch,
        status: 'Active'
      });
    }
    setIsModalOpen(true);
  };

  const filteredShifts = shifts;

  return (
    <ZenPageLayout
      title="Shifts"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      searchActions={
        <ExportPopup<Shift>
          data={filteredShifts}
          columns={shiftExportColumns}
          fileName="shifts"
          title="Shifts"
          triggerLabel="Download"
          description="Choose format and export the complete shift list with branch, timing, duration, and status details."
          resolveData={fetchAllShiftsForExport}
        />
      }
      addButtonLabel="New Shift"
      onAddClick={() => handleOpenModal()}
      topContent={
        <div className="flex overflow-x-auto overflow-y-visible pt-4 pb-6 gap-6 lg:grid lg:grid-cols-4 lg:gap-8 lg:overflow-visible scrollbar-hide px-4 lg:px-2">
          {[
            { label: 'Total Shifts', value: shifts.length, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-600/10', glow: 'bg-yellow-600/20', trend: 'Pattern count' },
            { label: 'Active Patterns', value: shifts.filter(s => s.status === 'Active').length, icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', trend: 'Live schedules' },
            { label: 'System Inactive', value: shifts.filter(s => s.status !== 'Active').length, icon: X, color: 'text-rose-500', bg: 'bg-rose-500/10', glow: 'bg-rose-500/20', trend: 'Offline patterns' },
            { label: 'Avg. Duration', value: `${shifts.length > 0 ? (shifts.reduce((acc, s) => acc + s.durationHours, 0) / shifts.length).toFixed(1) : 0}h`, icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-500/10', glow: 'bg-purple-500/20', trend: 'Cycle average' }
          ].map((stat, i) => (
            <ZenStatCard key={i} {...stat} delay={i * 0.05} />
          ))}
        </div>
      }
    >
      <div className="space-y-6 pb-20">

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {filteredShifts.map((shift) => (
              <motion.div
                key={shift._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-white/80 backdrop-blur-xl p-8 rounded-2xl border border-zen-brown/15 shadow-sm group relative overflow-hidden ${shift.status === 'Inactive' ? 'opacity-60 saturate-0' : ''}`}
              >
                 <div className="absolute -right-6 -bottom-6 opacity-[0.03] text-zen-brown group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-1000">
                    <Clock size={150} />
                 </div>
                 <div className="absolute top-0 right-0 p-6 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 z-20">
                    <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(shift)} className="bg-white/80 shadow-sm" />
                    <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDelete(shift._id)} className="bg-white/80 shadow-sm" />
                 </div>

                 <div className="flex items-center gap-6 mb-8">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-zen-cream/50 flex items-center justify-center text-zen-brown shadow-inner">
                       <Clock size={28} strokeWidth={1.5} />
                    </div>
                    <div>
                       <h3 className="text-xl font-serif font-bold text-zen-brown tracking-tight">{shift.name}</h3>
                       <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.4em] mt-1">{shift.durationHours} Hours Cycle</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-zen-cream/20 rounded-2xl border border-zen-brown/15">
                       <div className="flex items-center gap-3">
                          <Calendar size={14} className="text-zen-brown/30" />
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Interval</span>
                       </div>
                       <span className="font-serif font-bold text-zen-brown">{shift.startTime} - {shift.endTime}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                       {shift.branch ? (
                          <div className="flex items-center gap-2 text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest pl-2">
                             <MapPin size={12} />
                             {getShiftBranchName(shift)}
                          </div>
                       ) : <div />}
                       <button onClick={() => toggleStatus(shift)}>
                          <ZenBadge variant={shift.status === 'Active' ? 'leaf' : 'inactive'}>{shift.status === 'Inactive' ? 'Deactive' : 'Active'}</ZenBadge>
                       </button>
                    </div>
                 </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredShifts.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-40 text-zen-brown/20 space-y-4">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-zen-brown/25 flex items-center justify-center">
                <Clock size={40} strokeWidth={1} />
              </div>
              <p className="font-serif italic text-lg">No shifts have been created yet.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="table-container w-full bg-white rounded-xl border border-gray-200/60 shadow-none overflow-hidden animate-in fade-in duration-700">
           <table className="w-full text-center border-collapse min-w-[800px]">
              <thead>
                 <tr>
                    <th>S No</th>
                    <th>Shift Identity</th>
                    <th>Interval</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Actions</th>
                 </tr>
              </thead>
              <tbody>
                 {(!filteredShifts || filteredShifts.length === 0) && (
                    <tr>
                       <td colSpan={6} className="px-6 py-16 text-center text-[13px] font-sans text-gray-400 bg-gray-50/30">No records available.</td>
                    </tr>
                 )}

                 {filteredShifts.map((shift, idx) => (
                    <tr key={shift._id} className={`transition-all group ${shift.status === 'Inactive' ? 'opacity-60 saturate-0' : ''}`}>
                       <td className="text-center italic opacity-40">
                         {((page - 1) * PAGE_LIMIT + idx + 1).toString().padStart(2, '0')}
                       </td>
                       <td>
                          <div className="flex flex-col items-center">
                             <span className="zen-table-primary">{shift.name}</span>
                             {shift.branch && <span className="zen-table-meta">{getShiftBranchName(shift)}</span>}
                          </div>
                       </td>
                       <td>
                          <div className="flex items-center justify-center gap-2 text-[10px] text-zen-brown/40 font-black uppercase tracking-widest">
                             {shift.startTime} - {shift.endTime}
                          </div>
                       </td>
                       <td className="text-sm font-serif italic text-zen-brown/60">
                          {shift.durationHours} Hours
                       </td>
                       <td>
                          <button onClick={() => toggleStatus(shift)} className="hover:scale-105 transition-transform">
                             <ZenBadge variant={shift.status === 'Active' ? 'leaf' : 'inactive'}>{shift.status === 'Inactive' ? 'Deactive' : 'Active'}</ZenBadge>
                          </button>
                       </td>
                       <td>
                          <div className="flex items-center justify-center gap-3">
                             <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(shift)} />
                             <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDelete(shift._id)} />
                          </div>
                       </td>
                    </tr>
                 ))}
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
        title={editingShift ? 'Edit shift' : 'New shift'}
        subtitle="Define the working window, duration, and status for a branch shift."
        headerIcon={Clock}
        footer={
          <div className="flex items-center justify-between gap-8 px-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zen-brown/25 whitespace-nowrap">
              {editingShift
                ? 'Changes update the shift schedule once saved.'
                : 'Available for appointments immediately after creation.'}
            </p>
            <div className="flex items-center gap-4 shrink-0">
              <ZenButton
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto px-8"
              >
                Cancel
              </ZenButton>
              <ZenButton
                type="submit"
                form="shift-modal-form"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 bg-zen-brown text-white shadow-xl shadow-zen-brown/10"
              >
                {isSubmitting ? 'Saving...' : editingShift ? 'Save shift' : 'Create shift'}
              </ZenButton>
            </div>
          </div>
        }
      >
         <form id="shift-modal-form" onSubmit={handleSubmit} className="space-y-10 py-2">
            {/* Identity Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 px-1">
                <div className="w-8 h-8 rounded-lg bg-zen-brown/5 flex items-center justify-center text-zen-brown/40">
                  <Shield size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zen-brown uppercase tracking-widest">General Identity</h4>
                  <p className="text-[10px] text-zen-brown/30 font-medium uppercase tracking-[0.2em] mt-0.5">Define shift name and current status</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-zen-cream/10 p-8 rounded-[2rem] border border-zen-brown/5">
                <ZenInput
                  label="Shift Name"
                  placeholder="e.g. Morning Shift"
                  value={formData.name}
                  onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                />
                <ZenDropdown
                  label="Operational Status"
                  options={['Active', 'Inactive']}
                  value={formData.status}
                  onChange={(val) => setFormData({ ...formData, status: val })}
                />
              </div>
            </div>

            {/* Timing Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 px-1">
                <div className="w-8 h-8 rounded-lg bg-zen-brown/5 flex items-center justify-center text-zen-brown/40">
                  <Clock size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zen-brown uppercase tracking-widest">Time Schedule</h4>
                  <p className="text-[10px] text-zen-brown/30 font-medium uppercase tracking-[0.2em] mt-0.5">Configure working hours and duration</p>
                </div>
              </div>

              <div className="bg-zen-cream/10 p-10 rounded-[2.5rem] border border-zen-brown/5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <ZenTimePicker
                    label="Start Time"
                    value={formData.startTime}
                    variant="pill"
                    onChange={(val: string) => setFormData({ ...formData, startTime: val })}
                  />
                  <ZenTimePicker
                    label="End Time"
                    value={formData.endTime}
                    variant="pill"
                    onChange={(val: string) => setFormData({ ...formData, endTime: val })}
                  />
                  <ZenInput
                    label="Calculated Duration"
                    type="number"
                    icon={Zap}
                    disabled
                    value={formData.durationHours}
                    className="bg-zen-brown/[0.02]"
                  />
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
         type={confirmState.type}
      />
    </ZenPageLayout>
  );
};

export default Shifts;
