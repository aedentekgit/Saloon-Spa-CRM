import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Edit2, Shield, Calendar, MapPin } from 'lucide-react';
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
        notify('success', 'Success', editingShift ? 'Shift refined' : 'New shift sequence established');
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
       message: 'Are you sure you want to remove this shift sequence from the sanctuary records?',
       type: 'danger',
       onConfirm: async () => {
          try {
             const response = await fetch(`${API_URL}/shifts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user?.token}` }
             });
             if (response.ok) {
                notify('success', 'Removed', 'Shift sequence archived');
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
        notify('success', 'Refined', `Shift ${newStatus}`);
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
      title="Shift Architecture"
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
                className={`bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-zen-brown/15 shadow-sm group relative overflow-hidden ${shift.status === 'Inactive' ? 'opacity-60 saturate-0' : ''}`}
              >
                 <div className="absolute top-0 right-0 p-6 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                    <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(shift)} className="bg-white/80" />
                    <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDelete(shift._id)} className="bg-white/80" />
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
              <p className="font-serif italic text-lg">No shift sequences established in this sanctuary</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-sm overflow-hidden border border-zen-brown/15">
           <table className="w-full text-center border-collapse">
              <thead>
                 <tr className="bg-zen-brown border-b border-zen-brown/15">
                    <th className="px-8 py-8 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center whitespace-nowrap">S NO</th>
                    <th className="px-8 py-8 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Shift Identity</th>
                    <th className="px-8 py-8 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Interval</th>
                    <th className="px-8 py-8 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Duration</th>
                    <th className="px-8 py-8 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Status</th>
                    <th className="px-8 py-8 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-zen-brown/15">
                 {filteredShifts.map((shift, idx) => (
                    <tr key={shift._id} className={`hover:bg-zen-cream/5 transition-all group ${shift.status === 'Inactive' ? 'opacity-60 saturate-0' : ''}`}>
                       <td className="px-8 py-8 text-zen-brown/40 font-serif">{((page - 1) * 12 + idx + 1).toString().padStart(2, '0')}</td>
                       <td className="px-8 py-8">
                          <div className="flex items-center justify-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-zen-cream/50 flex items-center justify-center text-zen-brown shadow-inner">
                                <Clock size={18} />
                             </div>
                             <div className="text-left">
                                <p className="font-serif font-bold text-zen-brown text-lg">{shift.name}</p>
                                {shift.branch && <p className="text-[8px] font-bold text-zen-brown/30 uppercase tracking-widest">{shift.branch.name}</p>}
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-8 font-serif font-bold text-zen-brown">{shift.startTime} - {shift.endTime}</td>
                       <td className="px-8 py-8 text-sm font-serif italic text-zen-brown/60">{shift.durationHours} Hours</td>
                       <td className="px-8 py-8">
                          <button onClick={() => toggleStatus(shift)}>
                             <ZenBadge variant={shift.status === 'Active' ? 'leaf' : 'inactive'}>{shift.status === 'Inactive' ? 'Deactive' : 'Active'}</ZenBadge>
                          </button>
                       </td>
                       <td className="px-8 py-8">
                          <div className="flex items-center justify-center gap-3 transition-all">
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingShift ? 'Refine Shift' : 'Configure New Shift'} maxWidth="max-w-2xl">
         <form onSubmit={handleSubmit} className="p-8 space-y-8">
            <div className="bg-zen-cream/30 p-8 rounded-[2.5rem] border border-zen-brown/15 space-y-8">
               <ZenInput 
                 label="Shift Identity" 
                 placeholder="e.g. Morning Zen" 
                 icon={Shield} 
                 value={formData.name} 
                 onChange={(e: any) => setFormData({...formData, name: e.target.value})} 
               />

               <div className="grid grid-cols-2 gap-8">
                  <ZenInput 
                    label="Activation Time" 
                    placeholder="09:00 AM" 
                    icon={Clock} 
                    value={formData.startTime} 
                    onChange={(e: any) => setFormData({...formData, startTime: e.target.value})} 
                  />
                  <ZenInput 
                    label="Conclusion Time" 
                    placeholder="06:00 PM" 
                    icon={Clock} 
                    value={formData.endTime} 
                    onChange={(e: any) => setFormData({...formData, endTime: e.target.value})} 
                  />
               </div>

               <ZenInput 
                 label="Temporal Span (Hours)" 
                 type="number" 
                 icon={Calendar} 
                 value={formData.durationHours} 
                 onChange={(e: any) => setFormData({...formData, durationHours: parseFloat(e.target.value)})} 
               />
            </div>

            <div className="flex gap-4">
               <ZenButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Discard</ZenButton>
               <ZenButton type="submit" disabled={isSubmitting} className="flex-[2]">
                  {isSubmitting ? 'Synchronizing...' : (editingShift ? 'Finalize Logic' : 'Establish Cycle')}
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

export default Shifts;
