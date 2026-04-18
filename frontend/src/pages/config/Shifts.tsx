import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Edit2, Shield, Calendar, MapPin, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { ZenBadge, ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { notify } from '../../components/shared/ZenNotification';
import { ZenDropdown, ZenInput } from '../../components/zen/ZenInputs';
import { Modal } from '../../components/shared/Modal';
import { useBranches } from '../../context/BranchContext';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';

interface Shift {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  branch?: any;
  status: string;
}

const Shifts = () => {
  const { user } = useAuth();
  const { selectedBranch } = useBranches();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    localStorage.setItem('zen_shift_view', viewMode);
  }, [viewMode]);

  useEffect(() => {
    fetchShifts();
  }, [selectedBranch, page]);

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
      const url = new URL(`${API_URL}/shifts`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', '12');
      if (selectedBranch && selectedBranch !== 'all') {
        url.searchParams.append('branch', selectedBranch);
      }
      const response = await fetch(url.toString(), {
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
          branch: formData.branch || selectedBranch !== 'all' ? selectedBranch : undefined
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
        branch: shift.branch?._id || shift.branch || '',
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

  const filteredShifts = shifts.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ZenPageLayout
      title="Shift Schedule"
      onAddClick={() => handleOpenModal()}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      addButtonLabel="Configure Shift"
    >
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
                             {shift.branch.name || 'Universal'}
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
        <div className="w-full bg-white rounded-xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden overflow-x-auto custom-scrollbar animate-in fade-in duration-700">
           <table className="w-full text-center border-collapse min-w-[800px]">
              <thead>
                 <tr className="bg-slate-50 border-y border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                    <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">S No</th>
                    <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Shift Identity</th>
                    <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Interval</th>
                    <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Duration</th>
                    <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Actions</th>
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
                         {((page - 1) * 12 + idx + 1).toString().padStart(2, '0')}
                       </td>
                       <td>
                          <div className="flex flex-col items-center">
                             <span className="zen-table-primary">{shift.name}</span>
                             {shift.branch && <span className="zen-table-meta">{shift.branch.name}</span>}
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="max-w-4xl"
        header={
          <div className="flex items-start justify-between gap-6 px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-start gap-4 sm:gap-5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-zen-brown text-white flex items-center justify-center shadow-sm shrink-0">
                <Clock size={24} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Shift record</p>
                <h3 className="mt-1 text-xl sm:text-2xl font-semibold text-zen-brown truncate">
                  {editingShift ? 'Edit shift' : 'New shift'}
                </h3>
                <p className="mt-2 text-sm text-zen-brown/60 max-w-2xl">
                  Define the working window, duration, and status for a branch shift.
                </p>
              </div>
            </div>
            <ZenIconButton icon={X} onClick={() => setIsModalOpen(false)} size="md" />
          </div>
        }
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-xs text-zen-brown/40">
              {editingShift
                ? 'Changes update the shift schedule once saved.'
                : 'New shift timings will be available for appointments immediately after creation.'}
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
                form="shift-modal-form"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? 'Saving...' : editingShift ? 'Save shift' : 'Create shift'}
              </ZenButton>
            </div>
          </div>
        }
      >
         <form id="shift-modal-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Shift details</p>
                    <h4 className="mt-1 text-lg font-semibold text-zen-brown">Identity and status</h4>
                  </div>
                  <ZenBadge variant="secondary">
                    {selectedBranch === 'all' ? 'All branches' : 'Current branch'}
                  </ZenBadge>
                </div>

                <div className="space-y-5">
                  <ZenInput
                    label="Shift name"
                    placeholder="e.g. Morning shift"
                    icon={Shield}
                    value={formData.name}
                    onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <ZenDropdown
                    label="Status"
                    options={['Active', 'Inactive']}
                    value={formData.status}
                    onChange={(val) => setFormData({ ...formData, status: val })}
                  />
                  <div className="rounded-2xl border border-zen-brown/10 bg-zen-cream/20 px-4 py-4 text-sm text-zen-brown/60">
                    This shift follows the current branch context selected in the CRM.
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm">
                <div className="mb-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Working hours</p>
                  <h4 className="mt-1 text-lg font-semibold text-zen-brown">Time range and duration</h4>
                  <p className="mt-2 text-sm text-zen-brown/55">
                    Duration recalculates from the start and end times.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <ZenInput
                    label="Start time"
                    placeholder="09:00 AM"
                    icon={Clock}
                    value={formData.startTime}
                    onChange={(e: any) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                  <ZenInput
                    label="End time"
                    placeholder="06:00 PM"
                    icon={Clock}
                    value={formData.endTime}
                    onChange={(e: any) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>

                <div className="mt-5">
                  <ZenInput
                    label="Duration (hours)"
                    type="number"
                    icon={Calendar}
                    value={formData.durationHours}
                    onChange={(e: any) => setFormData({ ...formData, durationHours: parseFloat(e.target.value) })}
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
