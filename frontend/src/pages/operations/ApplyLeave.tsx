import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, ArrowLeft, Sun, User as UserIcon,
  Tag, Wind, Moon, Star, ShieldCheck,
  ChevronRight, Compass, Landmark, Heart, CalendarClock,
  Flame, Cloud
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenButton } from '../../components/zen/ZenButtons';
import { ZenInput, ZenDropdown, ZenTextarea } from '../../components/zen/ZenInputs';
import { notify } from '../../components/shared/ZenNotification';
import { useData } from '../../context/DataContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

const ApplyLeave = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
    if (user?.role === 'Admin' || user?.role === 'Manager') {
      fetchEmployees();
    } else {
      setFormData(prev => ({ ...prev, employeeId: user?._id || '', employeeName: user?.name || '' }));
    }
  }, [user]);

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
        navigate('/leave');
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

  return (
    <ZenPageLayout
      title="Apply Leave"
      hideSearch
      hideBranchSelector
      hideViewToggle
      hideAddButton
    >
      <div className="space-y-10 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-8 items-stretch px-4 lg:px-2">
          <aside className="bg-white/80 backdrop-blur-xl rounded-2xl border border-zen-brown/15 shadow-sm p-8 lg:p-10 flex flex-col relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-[0.04]">
              <Landmark size={520} className="absolute -bottom-24 -left-20 rotate-[-15deg]" />
            </div>

            <button
              onClick={() => navigate('/leave')}
              className="relative z-10 flex items-center gap-3 text-zen-brown/40 hover:text-zen-brown transition-all mb-10 group w-fit"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-[0.35em]">Registry History</span>
            </button>

            <div className="relative z-10 space-y-6 flex-1">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-zen-sand uppercase tracking-[0.45em] italic">Sacred Absence</p>
                <h1 className="text-3xl lg:text-4xl font-serif font-black leading-tight italic tracking-tighter text-zen-brown">Presence Pause</h1>
              </div>

              <div className="space-y-6 pt-6">
                {stages.map((s) => (
                  <div key={s.id} className={`flex items-start gap-4 transition-all duration-700 ${activeStage === s.id ? 'opacity-100 translate-x-2' : 'opacity-30 translate-x-0'}`}>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-700 ${activeStage === s.id ? 'bg-zen-brown border-zen-brown text-white shadow-sm' : 'border-zen-brown/10 text-zen-brown/30 bg-white'}`}>
                      <s.icon size={18} strokeWidth={1.5} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zen-brown/25">Phase 0{s.id}</p>
                      <p className="text-sm font-bold tracking-widest uppercase text-zen-brown">{s.title}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-zen-brown/10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-zen-sand/10 border border-zen-sand/20 flex items-center justify-center text-zen-sand shrink-0">
                    <Sparkles size={18} />
                  </div>
                  <p className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.2em] leading-relaxed">
                    Balance your energy for total sanctuary restoration.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <main className="bg-white/90 backdrop-blur-xl rounded-2xl border border-zen-brown/15 shadow-sm p-5 sm:p-8 lg:p-10 relative overflow-hidden min-h-[520px] sm:min-h-[720px]">
            <AnimatePresence mode="wait">
              {activeStage === 1 && (
                <motion.div
                  key="stage1"
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -10 }}
                  className="flex flex-col h-full"
                >
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="grid lg:grid-cols-2 gap-8 items-start">
                      <div className="space-y-6">
                        <div className="mb-4 space-y-3">
                          <h2 className="text-2xl sm:text-3xl font-serif font-black italic text-zen-brown">Temporal Sync</h2>
                          <div className="w-16 h-px bg-zen-sand" />
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
                          className="!text-base"
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
                          className="!text-base"
                        />
                      </div>

                      <div className="bg-zen-brown rounded-[2rem] p-8 sm:p-10 text-white relative overflow-hidden shadow-2xl shadow-zen-brown/10">
                        <div className="absolute top-0 right-0 p-6 opacity-[0.05]">
                          <Sun size={160} strokeWidth={1} />
                        </div>
                        <div className="relative z-10 flex flex-col items-center justify-center space-y-4 text-center">
                          <p className="text-[10px] font-black uppercase tracking-[0.45em] text-zen-sand">Absence Duration</p>
                          <div className="flex items-baseline gap-3">
                            <span className="text-7xl font-serif font-black italic tabular-nums">{formData.daysCount}</span>
                            <span className="text-[11px] font-black uppercase tracking-[0.35em] text-white/30">{formData.daysCount === 1 ? 'Day' : 'Days'}</span>
                          </div>
                          <div className="w-12 h-px bg-white/10" />
                          <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 leading-relaxed italic">
                            Automatically calculated based on your sanctuary calendar sync.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 flex justify-end">
                    <ZenButton
                      onClick={() => setActiveStage(2)}
                      className="px-10 py-4 bg-zen-brown text-white rounded-2xl group"
                    >
                      Identify Ambassador <ChevronRight size={18} className="ml-2 group-hover:translate-x-2 transition-transform" />
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
                  className="flex flex-col h-full"
                >
                  <div className="flex-1 flex flex-col justify-center max-w-2xl">
                    <div className="mb-10 space-y-3">
                      <h2 className="text-2xl sm:text-3xl font-serif font-black italic text-zen-brown">Identity & Purpose</h2>
                      <div className="w-16 h-px bg-zen-sand" />
                    </div>

                    <div className="space-y-6">
                      {(user?.role === 'Admin' || user?.role === 'Manager') ? (
                        <ZenDropdown
                          label="Select Ambassador"
                          value={formData.employeeName}
                          icon={UserIcon}
                          variant="pill"
                          placeholder="Who is taking this pause?"
                          options={employees
                            .filter(e => {
                              // Filter by Existing Approved Leaves
                              const hasApprovedLeave = requests.some(r =>
                                 (r.user === e._id || (r as any).employeeId === e._id) &&
                                 r.status === 'Approved' &&
                                 dayjs(formData.startDate).isBefore(dayjs(r.endDate).add(1, 'day')) &&
                                 dayjs(formData.endDate).isAfter(dayjs(r.startDate).subtract(1, 'day'))
                              );

                              if (hasApprovedLeave) return false;

                              // Filter by Existing Attendance Records (Present/Absent/etc)
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
                        <div className="bg-white p-6 rounded-2xl border border-zen-brown/10 shadow-sm flex items-center justify-between group">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-zen-brown/5 flex items-center justify-center text-zen-brown group-hover:scale-110 transition-all">
                              <ShieldCheck size={24} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-zen-brown/20 uppercase tracking-[0.35em]">Current Identity</p>
                              <p className="text-xl font-serif font-black italic text-zen-brown">{user?.name}</p>
                            </div>
                          </div>
                          <span className="text-[8px] font-black px-4 py-1.5 rounded-full bg-zen-brown text-white uppercase tracking-widest">Active Pulse</span>
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

                  <div className="pt-8 flex justify-between items-center">
                    <button onClick={() => setActiveStage(1)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.35em] text-zen-brown/60 hover:text-zen-brown transition-all group/back">
                      <ArrowLeft size={14} className="group-hover/back:-translate-x-1 transition-transform" />
                      Refine Temporal Sync
                    </button>
                    <ZenButton
                      onClick={() => {
                        if (!formData.employeeName) return notify('error', 'Unidentified', 'Please select an ambassador.');
                        if ((user?.role === 'Admin' || user?.role === 'Manager') && !formData.employeeId) {
                          return notify('error', 'Unidentified', 'Please select a valid ambassador.');
                        }
                        setActiveStage(3);
                      }}
                      className="px-10 py-4 bg-zen-brown text-white rounded-2xl group"
                    >
                      Crystalize Intent <ChevronRight size={18} className="ml-2 group-hover:translate-x-2 transition-transform" />
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
                  className="flex flex-col h-full"
                >
                  <div className="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full">
                    <div className="mb-10 space-y-3 text-center">
                      <h2 className="text-3xl sm:text-4xl font-serif font-black italic text-zen-brown">The Manifest Statement</h2>
                      <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zen-sand">Phase 03: Registry Finalization</p>
                    </div>

                    <div className="space-y-8">
                      <div className="relative group">
                        <ZenTextarea
                          required
                          hideLabel
                          placeholder="Why must you seek solace? Define the intent of this pause..."
                          value={formData.reason}
                          onChange={(e: any) => setFormData({ ...formData, reason: e.target.value })}
                          className="!bg-white !border-zen-brown/10 !rounded-[2rem] !p-6 !h-[220px] text-lg sm:text-xl font-serif italic text-zen-brown placeholder:text-zen-brown/10 shadow-none focus:!border-zen-sand transition-all"
                        />
                        <div className="absolute top-6 right-6 text-zen-brown/5 group-focus-within:text-zen-sand/20 transition-colors">
                          <Star size={40} strokeWidth={1} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 select-none">
                        {[
                          { i: Heart, l: 'Vitality' },
                          { i: Sparkles, l: 'Clarity' },
                          { i: Cloud, l: 'Serenity' },
                          { i: Flame, l: 'Passion' }
                        ].map((rit, i) => (
                          <div key={i} className="bg-white/80 backdrop-blur-md border border-zen-brown/10 px-4 py-4 rounded-2xl flex items-center gap-3 shadow-sm hover:shadow-md transition-all duration-500">
                            <rit.i size={16} className="text-zen-sand" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zen-brown/60">{rit.l}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 flex justify-between items-center">
                    <button onClick={() => setActiveStage(2)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.35em] text-zen-brown/60 hover:text-zen-brown transition-all group/back italic">
                      <ArrowLeft size={14} className="group-hover/back:-translate-x-1 transition-transform" />
                      Identify Ambassador
                    </button>
                    <ZenButton
                      onClick={handleSubmit}
                      loading={submitting}
                      className="px-12 py-4 bg-zen-brown text-white rounded-2xl shadow-xl shadow-zen-brown/10 group"
                    >
                      Dispatch Registry Manifest <ChevronRight size={18} className="ml-3" />
                    </ZenButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </ZenPageLayout>
  );
};

export default ApplyLeave;
