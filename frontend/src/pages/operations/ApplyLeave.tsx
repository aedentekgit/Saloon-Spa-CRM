import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CalendarDays, Sparkles, X, ArrowLeft, Sun, User as UserIcon, 
  Tag, AlertCircle, Calendar, Clock, Wind, Moon, Star, ShieldCheck,
  ChevronRight, MapPin, Coffee, Compass, Landmark, Heart, CalendarClock,
  Zap, Flame, Leaf, Cloud
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ZenButton } from '../../components/zen/ZenButtons';
import { ZenInput, ZenDropdown, ZenTextarea } from '../../components/zen/ZenInputs';
import { notify } from '../../components/shared/ZenNotification';
import { useBranches } from '../../context/BranchContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

const ApplyLeave = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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
    { id: 1, title: 'Identification', icon: Compass },
    { id: 2, title: 'Synchronization', icon: CalendarClock },
    { id: 3, title: 'Manifestation', icon: Landmark }
  ];

  return (
    <div className="h-full bg-zen-cream text-zen-brown font-sans selection:bg-zen-sand/20 relative flex flex-col items-center justify-center p-4">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.5]">
        <div className="absolute -top-1/4 -right-1/4 w-[80vw] h-[80vw] bg-[radial-gradient(circle_at_center,_#C5A05911,_transparent_70%)] animate-pulse" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[60vw] h-[60vw] bg-[radial-gradient(circle_at_center,_#2D2D2D08,_transparent_70%)]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl aspect-[16/9] lg:max-h-[85vh] bg-white rounded-[4rem] shadow-[0_100px_200px_-50px_rgba(45,45,45,0.12)] border border-zen-stone overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Interactive Guidance Column */}
        <aside className="w-full md:w-[320px] lg:w-[380px] bg-zen-brown text-white p-10 lg:p-14 flex flex-col relative shrink-0">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none">
            <Landmark size={600} className="absolute -bottom-20 -left-20 rotate-[-15deg]" />
          </div>

          <div className="relative z-10 flex flex-col h-full">
            <button 
              onClick={() => navigate('/leave')}
              className="flex items-center gap-3 text-white/40 hover:text-zen-sand transition-all mb-12 group w-fit"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Registry History</span>
            </button>

            <div className="space-y-6 flex-1">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-zen-sand uppercase tracking-[0.5em] italic">Sacred Absence</p>
                <h1 className="text-4xl lg:text-5xl font-serif font-black leading-tight italic tracking-tighter">Presence<br />Pause</h1>
              </div>

              <div className="space-y-10 pt-12">
                 {stages.map((s) => (
                   <div key={s.id} className={`flex items-start gap-5 transition-all duration-700 ${activeStage === s.id ? 'opacity-100 translate-x-4' : 'opacity-20 translate-x-0'}`}>
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-700 ${activeStage === s.id ? 'bg-zen-sand border-zen-sand shadow-lg shadow-zen-sand/20' : 'border-white/10 text-white'}`}>
                        <s.icon size={18} strokeWidth={1.5} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zen-sand/60">Phase 0{s.id}</p>
                        <p className="text-sm font-bold tracking-widest uppercase">{s.title}</p>
                      </div>
                   </div>
                 ))}
              </div>
            </div>

            <div className="pt-10 border-t border-white/5 space-y-6">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-zen-sand/10 border border-zen-sand/20 flex items-center justify-center text-zen-sand">
                    <Sparkles size={18} />
                  </div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] leading-relaxed">
                    Balance your energy <br /> for total sanctuary restoration.
                  </p>
               </div>
            </div>
          </div>
        </aside>

        {/* Right Form Engine */}
        <main className="flex-1 flex flex-col p-10 lg:p-16 relative bg-white">

           
           <AnimatePresence mode="wait">
             {activeStage === 1 && (
               <motion.div 
                 key="stage1"
                 initial={{ opacity: 0, scale: 0.98, y: 10 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.98, y: -10 }}
                 className="flex-1 flex flex-col"
               >
                 <div className="flex-1 flex flex-col justify-center max-w-2xl">
                    <div className="mb-12 space-y-4">
                       <h2 className="text-3xl font-serif font-black italic text-[#534337]">Identity & Purpose</h2>
                       <div className="w-16 h-px bg-[#d4a373]" />
                    </div>

                    <div className="space-y-10">
                       {(user?.role === 'Admin' || user?.role === 'Manager') ? (
                         <ZenDropdown
                           label="Select Ambassador"
                           value={formData.employeeName}
                           icon={UserIcon}
                           variant="pill"
                           placeholder="Who is taking this pause?"
                           options={employees.map(e => e.name)}
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
                         <div className="bg-white p-8 rounded-[2rem] border border-[#534337]/5 shadow-sm flex items-center justify-between group">
                            <div className="flex items-center gap-6">
                               <div className="w-14 h-14 rounded-2xl bg-[#534337]/5 flex items-center justify-center text-[#534337] group-hover:scale-110 transition-all">
                                  <ShieldCheck size={24} />
                               </div>
                               <div>
                                  <p className="text-[10px] font-black text-[#534337]/20 uppercase tracking-[0.4em]">Current Identity</p>
                                  <p className="text-2xl font-serif font-black italic">{user?.name}</p>
                               </div>
                            </div>
                            <span className="text-[8px] font-black px-4 py-1.5 rounded-full bg-[#534337] text-white uppercase tracking-widest">Active Pulse</span>
                         </div>
                       )}

                       <ZenDropdown
                         label="Pause Nature"
                         value={formData.type}
                         icon={Tag}
                         variant="pill"
                         options={['Full Day', 'Half Day', 'Annual Leave', 'Sick Leave', 'Casual Leave', 'Emergency Leave']}
                         onChange={val => setFormData({...formData, type: val})}
                       />
                    </div>
                 </div>

                 <div className="pt-10 flex justify-end">
                    <ZenButton 
                      onClick={() => {
                        if (!formData.employeeName) return notify('error', 'Unidentified', 'Please select an ambassador.');
                        if ((user?.role === 'Admin' || user?.role === 'Manager') && !formData.employeeId) {
                          return notify('error', 'Unidentified', 'Please select a valid ambassador.');
                        }
                        setActiveStage(2);
                      }}
                      className="px-12 py-6 bg-[#534337] text-white rounded-[2rem] group"
                    >
                      Define Temporal Window <ChevronRight size={18} className="ml-2 group-hover:translate-x-2 transition-transform" />
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
                 className="flex-1 flex flex-col"
               >
                 <div className="flex-1 flex flex-col justify-center">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                       <div className="space-y-10">
                          <div className="mb-4 space-y-4">
                             <h2 className="text-3xl font-serif font-black italic text-[#534337]">Temporal Sync</h2>
                             <div className="w-16 h-px bg-[#d4a373]" />
                          </div>
                          <ZenInput
                            label="Commencement Cycle"
                            type="date"
                            required
                            value={formData.startDate}
                            onChange={(e: any) => setFormData({...formData, startDate: e.target.value})}
                            icon={Wind}
                            variant="pill"
                            className="!text-lg"
                          />
                          <ZenInput
                            label="Conclusion Cycle"
                            type="date"
                            required
                            value={formData.endDate}
                            onChange={(e: any) => setFormData({...formData, endDate: e.target.value})}
                            icon={Moon}
                            variant="pill"
                            className="!text-lg"
                          />
                       </div>

                       <div className="bg-[#534337] rounded-[3.5rem] p-12 text-white relative overflow-hidden group shadow-2xl">
                          <div className="absolute top-0 right-0 p-8 opacity-[0.05]">
                             <Sun size={200} strokeWidth={1} />
                          </div>
                          <div className="relative z-10 flex flex-col items-center justify-center space-y-4 text-center">
                             <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#d4a373]">Absence Duration</p>
                             <div className="flex items-baseline gap-4">
                                <span className="text-8xl font-serif font-black italic tabular-nums">{formData.daysCount}</span>
                                <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white/30">{formData.daysCount === 1 ? 'Day' : 'Days'}</span>
                             </div>
                             <div className="w-12 h-[1px] bg-white/10" />
                             <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 leading-relaxed italic">
                                Automatically calculated based <br /> on your sanctuary calendar sync.
                             </p>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="pt-10 flex justify-between items-center">
                    <button onClick={() => setActiveStage(1)} className="text-[10px] font-black uppercase tracking-[0.4em] text-[#534337]/30 hover:text-[#534337] transition-all">Refine Identity</button>
                    <ZenButton 
                      onClick={() => setActiveStage(3)}
                      className="px-14 py-6 bg-[#534337] text-white rounded-[2rem] group"
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
                 className="flex-1 flex flex-col"
               >
                 <div className="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full">
                    <div className="mb-12 space-y-4 text-center">
                       <h2 className="text-4xl font-serif font-black italic text-[#534337]">The Manifest Statement</h2>
                       <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#d4a373]">Phase 03: Registry Finalization</p>
                    </div>

                    <div className="space-y-12">
                       <div className="relative group">
                          <ZenTextarea
                            required
                            hideLabel
                            placeholder="Why must you seek solace? Define the intent of this pause..."
                            value={formData.reason}
                            onChange={(e: any) => setFormData({...formData, reason: e.target.value})}
                            className="!bg-white !border-[#534337]/10 !rounded-[2.5rem] !p-10 !h-[240px] text-xl font-serif italic text-[#534337] placeholder:text-[#534337]/10 shadow-[0_30px_60px_-20px_rgba(83,67,55,0.05)] focus:!border-[#d4a373] transition-all"
                          />
                          <div className="absolute top-8 right-8 text-[#534337]/5 group-focus-within:text-[#d4a373]/20 transition-colors">
                             <Star size={48} strokeWidth={1} />
                          </div>
                       </div>

                       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 opacity-50 select-none">
                          {[
                            { i: Heart, l: 'Vitality' },
                            { i: Sparkles, l: 'Clarity' },
                            { i: Cloud, l: 'Serenity' },
                            { i: Flame, l: 'Passion' }
                          ].map((rit, i) => (
                            <div key={i} className="bg-white border border-[#534337]/5 px-6 py-4 rounded-[1.5rem] flex items-center gap-4">
                               <rit.i size={14} className="text-[#534337]" />
                               <span className="text-[9px] font-black uppercase tracking-widest">{rit.l}</span>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>

                 <div className="pt-10 flex justify-between items-center">
                    <button onClick={() => setActiveStage(2)} className="text-[10px] font-black uppercase tracking-[0.4em] text-[#534337]/30 hover:text-[#534337] transition-all italic">Refine Temporal Sync</button>
                    <ZenButton 
                      onClick={handleSubmit}
                      loading={submitting}
                      className="px-16 py-7 bg-[#534337] text-white rounded-[2.5rem] shadow-2xl shadow-[#534337]/20 group"
                    >
                      Dispatch Registry Manifest <ChevronRight size={18} className="ml-3" />
                    </ZenButton>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>

           {/* Immersive Overlay info */}
           <div className="absolute top-10 right-10 flex items-center gap-8 pointer-events-none opacity-[0.2]">
              <div className="text-right">
                 <p className="text-[9px] font-black uppercase tracking-[0.3em]">Sanctuary Node</p>
                 <p className="text-xs font-serif font-bold italic">v4.0 Protocol</p>
              </div>
              <div className="w-[1px] h-10 bg-[#534337]/20" />
              <ShieldCheck size={28} strokeWidth={1} />
           </div>

        </main>
      </div>

      {/* Global Scrollbar Suppression */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(83, 67, 55, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default ApplyLeave;
