import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, ArrowLeft, Sun, User as UserIcon,
  Tag, Wind, Moon, Star, ShieldCheck,
  ChevronRight, Compass, Landmark, Heart, CalendarClock,
  Flame, Cloud, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ZenButton } from '../zen/ZenButtons';
import { ZenInput, ZenDropdown, ZenTextarea } from '../zen/ZenInputs';
import { notify } from '../shared/ZenNotification';
import { useData } from '../../context/DataContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

interface ApplyLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ApplyLeaveModal: React.FC<ApplyLeaveModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { leaves: requests, attendance: attendanceHistory } = useData();
  const [employees, setEmployees] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [activeStage, setActiveStage] = useState(1);

  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    type: 'Full Day',
    reason: '',
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    daysCount: 1
  });

  useEffect(() => {
    if (isOpen) {
      setActiveStage(1);
      setFormData({
        employeeId: user?._id || '',
        employeeName: user?.name || '',
        type: 'Full Day',
        reason: '',
        startDate: dayjs().format('YYYY-MM-DD'),
        endDate: dayjs().format('YYYY-MM-DD'),
        daysCount: 1
      });
      if (user?.role === 'Admin' || user?.role === 'Manager') {
        fetchEmployees();
      }
    }
  }, [isOpen, user]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_URL}/employees`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      const empList = Array.isArray(data) ? data : (data.data || []);
      setEmployees(empList.filter((e: any) => e.status === 'Active'));
    } catch (error) {
      console.error('Failed to fetch employees');
    }
  };

  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = dayjs(formData.startDate);
      const end = dayjs(formData.endDate);
      const count = end.diff(start, 'day') + 1;
      setFormData(prev => ({ ...prev, daysCount: count > 0 ? count : 1 }));
    }
  }, [formData.startDate, formData.endDate]);

  const handleSubmit = async () => {
    if (!formData.reason) {
      notify('error', 'Incomplete Ritual', 'Please define your intent for the sanctuary.');
      return;
    }
    if ((user?.role === 'Admin' || user?.role === 'Manager') && !formData.employeeName) {
      notify('error', 'Unidentified', 'Please select an ambassador.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        employeeId: (user?.role === 'Admin' || user?.role === 'Manager') ? formData.employeeId : user?._id,
        employeeName: (user?.role === 'Admin' || user?.role === 'Manager') ? formData.employeeName : user?.name
      };

      const response = await fetch(`${API_URL}/leaves`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        notify('success', 'Registry Synchronized', 'Your sanctuary pause has been logged successfully.');
        onSuccess();
        onClose();
      } else {
        const err = await response.json();
        notify('error', 'Registry Error', err.message || 'Window closed');
      }
    } catch (error) {
      notify('error', 'Frequency Lost', 'Reconnect to the sanctuary pulse.');
    } finally {
      setSubmitting(false);
    }
  };

  const stages = [
    { id: 1, title: 'Temporal Sync', icon: CalendarClock },
    { id: 2, title: 'Identification', icon: Compass },
    { id: 3, title: 'Manifestation', icon: Landmark }
  ];

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 lg:p-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zen-brown/55 backdrop-blur-md transition-all duration-300"
          />

          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 18 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 18 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-[1000px] h-auto max-h-[90vh] overflow-hidden rounded-[2rem] bg-zen-cream flex flex-col md:flex-row shadow-[0_28px_90px_-32px_rgba(45,35,30,0.55)]"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 z-50 p-2 bg-white/50 backdrop-blur-md rounded-full text-zen-brown/40 hover:text-zen-brown hover:bg-white transition-all shadow-sm"
            >
              <X size={20} />
            </button>

            {/* Sidebar */}
            <aside className="bg-white/80 backdrop-blur-xl border-b md:border-b-0 md:border-r border-zen-brown/15 p-6 md:p-8 flex flex-col relative w-full md:w-[320px] shrink-0">
              <div className="absolute inset-0 pointer-events-none opacity-[0.04]">
                <Landmark size={300} className="absolute -bottom-10 -left-10 rotate-[-15deg]" />
              </div>

              <div className="relative z-10 space-y-4 md:space-y-6 flex-1 flex flex-col justify-center">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-zen-sand uppercase tracking-[0.45em] italic">Sacred Absence</p>
                  <h2 className="text-2xl md:text-3xl font-serif font-black leading-tight italic tracking-tighter text-zen-brown">Presence Pause</h2>
                </div>

                <div className="space-y-4 md:space-y-6 pt-4 md:pt-6">
                  {stages.map((s) => (
                    <div key={s.id} className={`flex items-start gap-3 md:gap-4 transition-all duration-700 ${activeStage === s.id ? 'opacity-100 translate-x-2' : 'opacity-30 translate-x-0'}`}>
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center border transition-all duration-700 ${activeStage === s.id ? 'bg-zen-brown border-zen-brown text-white shadow-sm' : 'border-zen-brown/10 text-zen-brown/30 bg-white'}`}>
                        <s.icon size={16} strokeWidth={1.5} />
                      </div>
                      <div className="space-y-0.5 md:space-y-1">
                        <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.3em] text-zen-brown/25">Phase 0{s.id}</p>
                        <p className="text-xs md:text-sm font-bold tracking-widest uppercase text-zen-brown">{s.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <main className="bg-white/90 p-6 md:p-10 relative flex-1 min-h-[400px] flex flex-col overflow-y-auto">
              <AnimatePresence mode="wait">
                {activeStage === 1 && (
                  <motion.div
                    key="stage1"
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: -10 }}
                    className="flex flex-col flex-1"
                  >
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 items-start">
                        <div className="space-y-5">
                          <div className="mb-2 space-y-2">
                            <h3 className="text-xl md:text-2xl font-serif font-black italic text-zen-brown">Temporal Sync</h3>
                            <div className="w-12 h-px bg-zen-sand" />
                          </div>
                          <ZenInput
                            label="Commencement Cycle"
                            type="date"
                            required
                            value={formData.startDate}
                            onChange={(e: any) => {
                              const newStart = e.target.value;
                              setFormData(prev => ({
                                ...prev,
                                startDate: newStart,
                                endDate: dayjs(prev.endDate).isBefore(dayjs(newStart)) ? newStart : prev.endDate
                              }));
                            }}
                            icon={Wind}
                            variant="pill"
                          />
                          <ZenInput
                            label="Conclusion Cycle"
                            type="date"
                            required
                            value={formData.endDate}
                            minDate={formData.startDate}
                            onChange={(e: any) => setFormData({ ...formData, endDate: e.target.value })}
                            icon={Moon}
                            variant="pill"
                          />
                        </div>

                        <div className="bg-zen-brown rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden shadow-xl shadow-zen-brown/10">
                          <div className="absolute top-0 right-0 p-4 opacity-[0.05]">
                            <Sun size={120} strokeWidth={1} />
                          </div>
                          <div className="relative z-10 flex flex-col items-center justify-center space-y-3 md:space-y-4 text-center h-full">
                            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.45em] text-zen-sand">Absence Duration</p>
                            <div className="flex items-baseline gap-2">
                              <span className="text-5xl md:text-6xl font-serif font-black italic tabular-nums">{formData.daysCount}</span>
                              <span className="text-[10px] font-black uppercase tracking-[0.35em] text-white/30">{formData.daysCount === 1 ? 'Day' : 'Days'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 md:pt-8 flex justify-end mt-auto">
                      <ZenButton
                        onClick={() => setActiveStage(2)}
                        className="px-8 py-3 bg-zen-brown text-white rounded-xl group"
                      >
                        Identify Ambassador <ChevronRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                      </ZenButton>
                    </div>
                  </motion.div>
                )}

                {activeStage === 2 && (
                  <motion.div
                    key="stage2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col flex-1"
                  >
                    <div className="flex-1 flex flex-col justify-center max-w-xl">
                      <div className="mb-6 md:mb-8 space-y-2">
                        <h3 className="text-xl md:text-2xl font-serif font-black italic text-zen-brown">Identity & Purpose</h3>
                        <div className="w-12 h-px bg-zen-sand" />
                      </div>

                      <div className="space-y-5">
                        {(user?.role === 'Admin' || user?.role === 'Manager') ? (
                          <ZenDropdown
                            label="Select Ambassador"
                            value={formData.employeeName}
                            icon={UserIcon}
                            variant="pill"
                            placeholder="Who is taking this pause?"
                            options={employees
                              .filter(e => {
                                const hasApprovedLeave = requests.some(r =>
                                   (r.user === e._id || (r as any).employeeId === e._id) &&
                                   r.status === 'Approved' &&
                                   dayjs(formData.startDate).isBefore(dayjs(r.endDate).add(1, 'day')) &&
                                   dayjs(formData.endDate).isAfter(dayjs(r.startDate).subtract(1, 'day'))
                                );

                                if (hasApprovedLeave) return false;

                                const hasAttendance = attendanceHistory.some(a =>
                                   (a.user === e._id || (a as any).employeeId === e._id) &&
                                   dayjs(a.date).isAfter(dayjs(formData.startDate).subtract(1, 'day')) &&
                                   dayjs(a.date).isBefore(dayjs(formData.endDate).add(1, 'day'))
                                );

                                return !hasAttendance;
                              })
                              .map(e => e.name)
                            }
                            onChange={val => {
                              const selectedEmployee = employees.find(e => e.name === val);
                              setFormData({
                                ...formData,
                                employeeName: val,
                                employeeId: selectedEmployee?._id || ''
                              });
                            }}
                          />
                        ) : (
                          <div className="bg-white p-5 rounded-2xl border border-zen-brown/10 shadow-sm flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-zen-brown/5 flex items-center justify-center text-zen-brown group-hover:scale-110 transition-all">
                                <ShieldCheck size={20} />
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-zen-brown/20 uppercase tracking-[0.35em]">Current Identity</p>
                                <p className="text-lg font-serif font-black italic text-zen-brown">{user?.name}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <ZenDropdown
                          label="Pause Nature"
                          value={formData.type}
                          icon={Tag}
                          variant="pill"
                          options={['Full Day', 'Half Day', 'Annual Leave', 'Sick Leave', 'Casual Leave', 'Emergency Leave']}
                          onChange={val => setFormData({ ...formData, type: val })}
                        />
                      </div>
                    </div>

                    <div className="pt-6 md:pt-8 flex justify-between items-center mt-auto">
                      <button onClick={() => setActiveStage(1)} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.35em] text-zen-brown/60 hover:text-zen-brown transition-all group/back">
                        <ArrowLeft size={12} className="group-hover/back:-translate-x-1 transition-transform" />
                        Back
                      </button>
                      <ZenButton
                        onClick={() => {
                          if (!formData.employeeName) return notify('error', 'Unidentified', 'Please select an ambassador.');
                          if ((user?.role === 'Admin' || user?.role === 'Manager') && !formData.employeeId) {
                            return notify('error', 'Unidentified', 'Please select a valid ambassador.');
                          }
                          setActiveStage(3);
                        }}
                        className="px-8 py-3 bg-zen-brown text-white rounded-xl group"
                      >
                        Crystalize Intent <ChevronRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                      </ZenButton>
                    </div>
                  </motion.div>
                )}

                {activeStage === 3 && (
                  <motion.div
                    key="stage3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex flex-col flex-1"
                  >
                    <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
                      <div className="mb-6 md:mb-8 space-y-2 text-center">
                        <h3 className="text-2xl md:text-3xl font-serif font-black italic text-zen-brown">The Manifest Statement</h3>
                        <p className="text-[9px] font-black uppercase tracking-[0.35em] text-zen-sand">Phase 03: Registry Finalization</p>
                      </div>

                      <div className="space-y-6">
                        <div className="relative group">
                          <ZenTextarea
                            required
                            hideLabel
                            placeholder="Why must you seek solace? Define the intent of this pause..."
                            value={formData.reason}
                            onChange={(e: any) => setFormData({ ...formData, reason: e.target.value })}
                            className="!bg-white !border-zen-brown/10 !rounded-[1.5rem] !p-5 md:!p-6 !h-[160px] md:!h-[200px] text-base md:text-lg font-serif italic text-zen-brown placeholder:text-zen-brown/10 shadow-none focus:!border-zen-sand transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 md:pt-8 flex justify-between items-center mt-auto">
                      <button onClick={() => setActiveStage(2)} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.35em] text-zen-brown/60 hover:text-zen-brown transition-all group/back italic">
                        <ArrowLeft size={12} className="group-hover/back:-translate-x-1 transition-transform" />
                        Back
                      </button>
                      <ZenButton
                        onClick={handleSubmit}
                        loading={submitting}
                        className="px-8 py-3 bg-zen-brown text-white rounded-xl shadow-lg shadow-zen-brown/10 group"
                      >
                        Dispatch Manifest <ChevronRight size={16} className="ml-2" />
                      </ZenButton>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
