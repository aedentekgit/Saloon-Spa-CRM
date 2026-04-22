import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Sparkles, X, User as UserIcon, MapPin,
  ArrowRight, CheckCircle2, Clock, ShieldCheck,
  Briefcase, UserCircle, Phone, Mail, ChevronRight,
  Map as MapIcon, Star, Info, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import dayjs from 'dayjs';
import { ZenDropdown, ZenInput, ZenDatePicker } from '../../components/zen/ZenInputs';
import { ZenButton } from '../../components/zen/ZenButtons';
import { notify } from '../../components/shared/ZenNotification';
import { usePublicSettings } from '../../components/landing/usePublicSettings';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
const ANY_SPECIALIST = 'Any available specialist';

const BookAppointment = () => {
  const { settings } = usePublicSettings();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [branches, setBranches] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  const getServiceImage = (serviceName: string) => {
    const service = services.find(s => s.name === serviceName);
    if (!service || !service.image) return 'https://images.unsplash.com/photo-1540555700478-4be289aefcf1?q=80&w=2070&auto=format&fit=crop';
    if (service.image.startsWith('http')) return service.image;
    return `${API_URL.replace('/api', '')}/${service.image.replace(/^\.?\//, '').replace(/\\/g, '/')}`;
  };
  const [staff, setStaff] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);

  // Selection
  const [formData, setFormData] = useState({
    branch: '',
    service: '',
    employee: '',
    date: dayjs().format('YYYY-MM-DD'),
    time: '',
    room: '',
    name: '',
    email: '',
    phone: '',
    notes: ''
  });

  // Fetch Public Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [branchRes, serviceRes, staffRes, shiftRes] = await Promise.all([
          fetch(`${API_URL}/branches/public`),
          fetch(`${API_URL}/services/public`),
          fetch(`${API_URL}/employees/public`),
          fetch(`${API_URL}/shifts/public`)
        ]);

        const [bData, sData, stData, shData] = await Promise.all([
          branchRes.json(), serviceRes.json(), staffRes.json(), shiftRes.json()
        ]);

        setBranches(Array.isArray(bData) ? bData : bData.data || []);
        setServices(Array.isArray(sData) ? sData : sData.data || []);
        setStaff(Array.isArray(stData) ? stData : stData.data || []);
        setShifts(Array.isArray(shData) ? shData : shData.data || []);
      } catch (error) {
        console.error('Data fetch error:', error);
        notify('error', 'Sync Failed', 'Access denied to sanctuary database.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch Appointments
  useEffect(() => {
    if (!formData.branch || !formData.date) return;
    const fetchApts = async () => {
      try {
        const res = await fetch(`${API_URL}/appointments/public?branch=${formData.branch}&date=${formData.date}`);
        const data = await res.json();
        setAppointments(data);
      } catch (error) {
        console.error('Appointments fetch error:', error);
      }
    };
    fetchApts();
  }, [formData.branch, formData.date]);

  const filteredServices = useMemo(() => {
    return services.filter(s => !formData.branch || s.branch === formData.branch || s.branch?._id === formData.branch);
  }, [services, formData.branch]);

  const filteredStaff = useMemo(() => {
    return staff.filter(e => !formData.branch || e.branch === formData.branch || e.branch?._id === formData.branch);
  }, [staff, formData.branch]);

  const availableSlots = useMemo(() => {
    if (!formData.date || !formData.employee) return [];

    const selectedService = services.find(s => s.name === formData.service || s._id === formData.service);
    const serviceDuration = selectedService?.duration || 60;
    const now = dayjs();
    const isToday = dayjs(formData.date).isSame(now, 'day');

    // Business Hours Constraint Logic
    const dayName = dayjs(formData.date).format('dddd').toLowerCase() as keyof NonNullable<typeof settings.workingHours>;
    const dayHours = settings?.workingHours?.[dayName];
    
    if (dayHours && !dayHours.isOpen) {
       return [];
    }

    const shopOpenTimeStr = dayHours?.openTime || '09:00';
    const shopCloseTimeStr = dayHours?.closeTime || '21:00';

    const buildSlotsForEmployee = (employee: any) => {
      if (!employee?.shift) return [];
      const shift = shifts.find(s => s.name === employee.shift);
      if (!shift?.startTime || !shift?.endTime) return [];

      let start = dayjs(`${formData.date} ${shift.startTime}`, 'YYYY-MM-DD hh:mm A');
      let end = dayjs(`${formData.date} ${shift.endTime}`, 'YYYY-MM-DD hh:mm A');
      if (end.isBefore(start)) end = end.add(1, 'day');

      let shopStart = dayjs(`${formData.date} ${shopOpenTimeStr}`, 'YYYY-MM-DD HH:mm');
      let shopEnd = dayjs(`${formData.date} ${shopCloseTimeStr}`, 'YYYY-MM-DD HH:mm');
      if (shopEnd.isBefore(shopStart)) shopEnd = shopEnd.add(1, 'day');

      // Intersect shift bounds with shop operational bounds
      if (start.isBefore(shopStart)) start = shopStart;
      if (end.isAfter(shopEnd)) end = shopEnd;

      if (!end.isAfter(start)) return [];

      const employeeApts = appointments.filter(a => (a.employee === employee.name) && a.date === formData.date);
      const slots: any[] = [];
      let current = start;

      while (current.isBefore(end)) {
        const slotEnd = current.add(serviceDuration, 'minute');
        // Removed the hard break to ensure slots generate fully until shift closing time
        const isPastTime = isToday && current.isBefore(now.add(30, 'minute'));
        const isBooked = employeeApts.some(apt => {
          const aptStart = dayjs(`${apt.date} ${apt.time}`, 'YYYY-MM-DD HH:mm');
          const aptService = services.find(s => s.name === apt.service);
          const aptDuration = aptService?.duration || 60;
          const aptEnd = aptStart.add(aptDuration, 'minute');
          return (current.isBefore(aptEnd) && slotEnd.isAfter(aptStart));
        });
        slots.push({
          time: current.format('HH:mm'),
          display: current.format('hh:mm A'),
          isBooked: isBooked || isPastTime
        });
        current = current.add(30, 'minute');
      }

      return slots;
    };

    // General booking: any specialist available at that time
    if (formData.employee === ANY_SPECIALIST) {
      const merged = new Map<string, { time: string; display: string; isBooked: boolean }>();
      filteredStaff.forEach((employee) => {
        buildSlotsForEmployee(employee).forEach((slot) => {
          const existing = merged.get(slot.time);
          if (!existing) {
            merged.set(slot.time, { ...slot });
          } else {
            // If any employee is free, mark as free
            existing.isBooked = existing.isBooked && slot.isBooked;
          }
        });
      });
      return (Array.from(merged.values()) as Array<{ time: string; display: string; isBooked: boolean }>).sort(
        (a, b) => a.time.localeCompare(b.time)
      );
    }

    // Specific specialist flow
    const employee = staff.find(e => e.name === formData.employee || e._id === formData.employee);
    return buildSlotsForEmployee(employee);
  }, [formData.date, formData.employee, formData.service, staff, shifts, appointments, services]);

  const selectedServiceData = useMemo(() => {
    return services.find(s => s.name === formData.service || s._id === formData.service);
  }, [services, formData.service]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !formData.email) {
      notify('error', 'Missing Information', 'Ritual identity is incomplete.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/appointments/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setStep(4);
      } else {
        const error = await res.json();
        notify('error', 'Sync Conflict', error.message || 'Window closed');
      }
    } catch (error) {
      notify('error', 'Network Pulse Lost', 'Reconnect to sanctuary.');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { id: 1, name: 'Sanctuary' },
    { id: 2, name: 'Timing' },
    { id: 3, name: 'Identity' }
  ];

  if (loading) {
    return (
      <div className="h-screen bg-zen-cream flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 border-[2px] border-zen-sand/20 border-t-zen-sand rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-zen-brown/30">Looming Serenity...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zen-cream relative flex flex-col">

      {/* Immersive Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30 select-none">
        <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-[radial-gradient(circle_at_center,_#d4a37322,_transparent_70%)] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-[radial-gradient(circle_at_center,_#53433708,_transparent_70%)]" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex-1 flex flex-col max-w-[1000px] mx-auto w-full px-6 lg:px-12 py-8 lg:py-12">

        {/* Compact Header */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6 lg:mb-10 shrink-0">
           <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center gap-3 text-[9px] font-bold tracking-[0.4em] uppercase text-zen-brown/30">
                 <span className="w-6 h-px bg-zen-brown/20" />
                 Ritual Registry
              </div>
              <h1 className="text-4xl lg:text-5xl font-serif font-black tracking-tight text-zen-brown leading-tight">
                Secure Your <span className="italic text-zen-sand underline decoration-zen-sand/10 underline-offset-4 decoration-2">Tranquillity</span>
              </h1>
           </div>

           {/* Slim Timeline */}
           {step < 4 && (
             <div className="flex items-center gap-8 bg-white/50 backdrop-blur-xl px-10 py-5 rounded-full border border-white shadow-sm">
                {steps.map((s) => (
                  <div key={s.id} className="flex items-center gap-4 group">
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-500 text-[10px] font-bold ${
                      step === s.id ? 'bg-zen-brown text-white border-zen-brown shadow-lg ring-4 ring-zen-brown/5' :
                      step > s.id ? 'bg-zen-sand text-white border-zen-sand' : 'border-zen-brown/10 text-zen-brown/20 uppercase tracking-widest'
                    }`}>
                      {step > s.id ? <CheckCircle2 size={12} /> : <span>{s.id}</span>}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${step === s.id ? 'text-zen-brown' : 'text-zen-brown/20'}`}>{s.name}</span>
                    {s.id < 3 && <div className="w-8 h-px bg-zen-brown/10" />}
                  </div>
                ))}
             </div>
           )}
        </header>

        {/* Content Area - Viewport Fixed */}
        <main className="flex-1 min-h-0 relative">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, scale: 0.99, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.99, y: -10 }}
                className="h-full max-w-[900px] mx-auto grid lg:grid-cols-12 gap-10"
              >
                <div className="lg:col-span-12 h-full flex flex-col">
                   <div className="flex-1 bg-white/80 backdrop-blur-xl rounded-[4rem_1.35rem_4rem_1.35rem] p-10 lg:p-14 border border-zen-stone/60 shadow-2xl relative overflow-hidden flex flex-col">

                      <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                         <MapIcon size={400} strokeWidth={1} />
                      </div>

                      <div className="grid lg:grid-cols-2 gap-16 flex-1 min-h-0 relative z-10">
                           <div className="flex flex-col justify-start space-y-10">
                            <button 
                              onClick={() => window.location.href = '/'} 
                              className="flex items-center gap-4 text-[10px] font-black tracking-[0.4em] uppercase text-zen-brown/30 hover:text-zen-brown transition-all group w-fit"
                            >
                               <div className="w-10 h-10 rounded-full border border-zen-brown/5 flex items-center justify-center group-hover:bg-zen-brown group-hover:text-white transition-all shadow-sm">
                                  <ChevronRight size={16} className="rotate-180" />
                               </div>
                               Exit Registry
                            </button>

                            <div className="space-y-4">
                               <h2 className="text-4xl font-serif font-black leading-tight text-zen-brown italic">
                                  Begin the Ascendance
                               </h2>
                               <div className="flex items-center gap-4">
                                  <div className="w-full max-w-[280px]">
                                    <ZenDatePicker
                                      label="Intent Date"
                                      value={formData.date}
                                      onChange={(val) => setFormData({ ...formData, date: val, time: '' })}
                                      hideLabel
                                    />
                                  </div>
                                  <div className="h-px flex-1 bg-zen-brown/5 hidden sm:block"></div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zen-sand opacity-70">Temporal Cycle</p>
                               </div>
                            </div>

                            <div className="space-y-8">
                               <ZenDropdown
                                label="Choose Sanctuary"
                                options={branches.map(b => b.name)}
                                value={branches.find(b => b._id === formData.branch)?.name || ''}
                                onChange={(val) => {
                                  const b = branches.find(b => b.name === val);
                                  setFormData({ ...formData, branch: b?._id || '', service: '', employee: '', time: '' });
                                }}
                                placeholder="Select Branch Location"
                                variant="pill"
                                icon={MapPin}
                               />
                               <ZenDropdown
                                label="Select Ritual"
                                options={filteredServices.map(s => s.name)}
                                value={formData.service}
                                onChange={(val) => setFormData({ ...formData, service: val, employee: '', time: '' })}
                                placeholder={formData.branch ? "Select Ritual Experience" : "Choose Sanctuary First"}
                                variant="pill"
                                disabled={!formData.branch}
                                icon={Briefcase}
                               />
                            </div>

                            <div className="pt-8 border-t border-zen-brown/5 flex items-center gap-6">
                               <div className="w-12 h-12 rounded-2xl bg-zen-sand/5 border border-zen-sand/10 flex items-center justify-center text-zen-sand shadow-inner">
                                  <ShieldCheck size={24} strokeWidth={1.5} />
                                </div>
                                <p className="text-[10px] text-zen-brown/40 font-bold uppercase tracking-[0.2em] leading-relaxed max-w-sm">
                                   Expert consultation and premium amenities are <br /> included in every ritual sequence.
                                </p>
                            </div>
                         </div>

                          <div className="relative h-full min-h-0 lg:border-l lg:border-zen-gold/10">
                             <div className="h-full bg-zen-cream/30 backdrop-blur-sm flex flex-col text-zen-brown overflow-hidden">
                               {formData.service ? (
                                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col p-12 overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                                       <Sparkles size={250} strokeWidth={1} />
                                    </div>
                                    
                                    <div className="flex justify-between items-start mb-10 relative z-10">
                                       <div className="space-y-2">
                                          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zen-brown/30">Ritual Intent</p>
                                          <h3 className="text-3xl font-serif font-black leading-tight text-zen-brown italic tracking-tight">{formData.service}</h3>
                                       </div>
                                       {selectedServiceData?.image && (
                                          <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden border-4 border-zen-sand/10 shadow-2xl rotate-6 group-hover:rotate-0 transition-transform duration-700 shrink-0">
                                             <img 
                                               src={getServiceImage(formData.service)} 
                                               alt={formData.service}
                                               className="w-full h-full object-cover"
                                               onError={(e: any) => {
                                                 e.target.src = 'https://images.unsplash.com/photo-1540555700478-4be289aefcf1?q=80&w=2070&auto=format&fit=crop';
                                               }}
                                             />
                                          </div>
                                       )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-10 mb-10 relative z-10">
                                       <div className="space-y-2">
                                          <p className="text-[10px] font-bold text-zen-brown/20 tracking-[0.2em] uppercase">Duration</p>
                                          <p className="text-4xl font-serif font-black italic">{selectedServiceData?.duration || 0}<span className="text-[12px] font-bold uppercase ml-2 text-zen-brown/30 tracking-tight">Min</span></p>
                                       </div>
                                       <div className="space-y-2">
                                          <p className="text-[10px] font-bold text-zen-brown/20 tracking-[0.2em] uppercase">Investment</p>
                                          <p className="text-4xl font-serif font-black italic text-zen-sand underline decoration-zen-sand/10 underline-offset-8 decoration-2">{selectedServiceData?.price || 0}<span className="text-[12px] font-bold uppercase ml-2 text-zen-brown/30 tracking-tight">QAR</span></p>
                                       </div>
                                    </div>

                                    <div className="flex-1 min-h-0 overflow-y-auto pr-6 custom-scrollbar relative z-10 mb-8">
                                       <p className="text-xl italic font-serif text-zen-brown/60 leading-relaxed font-light">
                                          {selectedServiceData?.description || 'Curated wellness sequences designed for absolute restoration and spiritual harmony.'}
                                       </p>
                                    </div>

                                    <div className="pt-10 border-t border-zen-brown/5 mt-auto relative z-10">
                                       <ZenButton
                                        onClick={() => setStep(2)}
                                        className="w-full py-8 bg-gradient-to-br from-zen-sand to-violet-700 text-white rounded-[2rem_1rem_2rem_1rem] shadow-[0_20px_40px_-15px_rgba(139,92,246,0.5)] group transition-all duration-700 hover:scale-[1.01] border-none text-[12px] font-black uppercase tracking-[0.4em]"
                                       >
                                         Schedule Session <ChevronRight size={18} className="ml-2 group-hover:translate-x-3 transition-transform" />
                                       </ZenButton>
                                    </div>
                                 </motion.div>
                               ) : (
                                 <div className="flex-1 flex flex-col items-center justify-center p-16 text-center space-y-10 relative">
                                   <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
                                      <div className="w-[80%] h-[80%] border-4 border-zen-gold rounded-full"></div>
                                   </div>
                                   <div className="w-40 h-40 rounded-full bg-white border border-zen-gold/20 flex items-center justify-center shadow-2xl relative z-10">
                                      <Sparkles size={60} strokeWidth={1} className="text-zen-gold animate-float" />
                                   </div>
                                   <div className="space-y-4 relative z-10">
                                      <p className="text-3xl font-serif italic text-zen-brown/50 leading-tight">Select a ritual sequence</p>
                                      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zen-gold/40">to reveal its sanctuary essence</p>
                                   </div>
                                </div>
                               )}
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
               <motion.div
                 key="step2"
                 initial={{ opacity: 0, scale: 0.98, y: 10 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.98, y: -10 }}
                 className="flex-1 max-w-[900px] w-full mt-8 mx-auto"
               >
                  <div className="grid lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 flex flex-col min-h-0">
                       <div className="flex-1 bg-white/80 backdrop-blur-xl rounded-[2.5rem_1rem_2.5rem_1rem] p-8 lg:p-10 border border-zen-stone/60 shadow-2xl flex flex-col justify-start space-y-10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 p-8 opacity-[0.03] pointer-events-none">
                           <Clock size={200} strokeWidth={1} />
                        </div>
                        
                        <button 
                          onClick={() => setStep(1)} 
                          className="flex items-center gap-4 text-[10px] font-black tracking-[0.4em] uppercase text-zen-brown/30 hover:text-zen-brown transition-all group w-fit relative z-10"
                        >
                           <div className="w-10 h-10 rounded-full border border-zen-brown/5 flex items-center justify-center group-hover:bg-zen-brown group-hover:text-white transition-all shadow-sm">
                              <ChevronRight size={16} className="rotate-180" />
                           </div>
                           Return to Sanctuary
                        </button>

                        <div className="space-y-4 relative z-10">
                           <h2 className="text-4xl font-serif font-black italic text-zen-brown leading-tight">Master Selection</h2>
                           <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-zen-sand opacity-70">Synchronize Specialist Session</p>
                        </div>

                        <div className="space-y-8 relative z-10">
                           <ZenDropdown
                             label="Select High Specialist"
                             options={[ANY_SPECIALIST, ...filteredStaff.map(s => s.name)]}
                             value={formData.employee}
                             onChange={(val) => setFormData({ ...formData, employee: val, time: '' })}
                             placeholder={formData.branch ? 'Assign Professional' : 'Choose Local Sanctuary First'}
                             variant="pill"
                             icon={UserCircle}
                           />
                           
                           <div className="pt-8 border-t border-zen-brown/5">
                              <div className="flex items-center gap-4 p-4 rounded-2xl bg-zen-sand/5 border border-zen-sand/10">
                                 <Info size={16} className="text-zen-sand shrink-0" />
                                 <p className="text-[9px] font-bold uppercase tracking-widest text-zen-brown/40 leading-relaxed">
                                    Our specialists are synchronized with <br /> live sanctuary windows.
                                 </p>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="lg:col-span-8 h-full flex flex-col min-h-0">
                     <div className="flex-1 bg-white/80 backdrop-blur-xl rounded-[3rem_1rem_3rem_1rem] p-8 lg:p-12 border border-zen-stone/60 shadow-2xl flex flex-col relative overflow-hidden">
                        
                        <div className="absolute bottom-0 right-0 p-12 opacity-[0.02] pointer-events-none rotate-12">
                           <Sparkles size={300} strokeWidth={1} />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-8 mb-10 border-b border-zen-brown/5 shrink-0 gap-6 relative z-10">
                           <div className="space-y-2">
                              <h4 className="text-2xl font-serif font-black italic text-zen-brown tracking-tight">Timeline Resonance</h4>
                              <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.4em]">Live Sanctuary Registry Access</p>
                           </div>
                           {formData.employee && (
                             <div className="px-6 py-2.5 bg-zen-sand text-white rounded-full flex items-center gap-3 shadow-lg shadow-zen-sand/20">
                                <Check size={14} strokeWidth={3} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Employee Linked</span>
                             </div>
                           )}
                        </div>

                        <div className="flex-1 overflow-y-auto pr-6 custom-scrollbar relative z-10">
                           {formData.employee ? (
                             <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
                               {availableSlots.length > 0 ? availableSlots.map((slot, i) => (
                                 <button
                                   key={i}
                                   disabled={slot.isBooked}
                                   onClick={() => setFormData({ ...formData, time: slot.time })}
                                   className={`group relative overflow-hidden py-3 px-4 rounded-2xl flex flex-col items-center justify-center transition-all duration-500 border-2 ${
                                     slot.isBooked ? 'bg-zen-brown/[0.03] text-zen-brown/10 cursor-not-allowed border-transparent' :
                                     formData.time === slot.time ? 'bg-zen-brown text-white border-zen-brown shadow-2xl shadow-zen-brown/20 scale-[1.02]' :
                                     'bg-white/50 border-zen-brown/5 hover:border-zen-sand hover:bg-white hover:shadow-xl hover:-translate-y-1'
                                   }`}
                                 >
                                   {formData.time === slot.time && (
                                     <motion.div layoutId="active-slot" className="absolute inset-0 bg-gradient-to-br from-zen-brown to-black opacity-100" />
                                   )}
                                   <span className={`relative z-10 text-[13px] font-bold tracking-tight font-serif italic ${slot.isBooked ? 'line-through opacity-30' : ''}`}>{slot.display}</span>
                                   <div className={`relative z-10 w-5 h-px mt-2 transition-colors ${formData.time === slot.time ? 'bg-zen-sand' : 'bg-zen-brown/10 group-hover:bg-zen-sand'}`} />
                                 </button>
                               )) : (
                                 <div className="col-span-full py-24 flex flex-col items-center justify-center space-y-8 opacity-20">
                                    <Clock size={64} strokeWidth={0.5} />
                                    <p className="text-xl font-serif italic text-center max-w-sm leading-relaxed">No windows resonance detected for this cycle. Please adjust intent metadata.</p>
                                 </div>
                               )}
                             </div>
                           ) : (
                             <div className="h-full flex flex-col items-center justify-center opacity-[0.1] space-y-10 py-12">
                                <div className="p-12 rounded-full bg-zen-brown/[0.05] border border-zen-brown/10 backdrop-blur-md">
                                   <UserIcon size={120} strokeWidth={0.5} />
                                </div>
                                <p className="text-2xl font-serif italic text-center max-w-md uppercase tracking-[0.2em] leading-relaxed">Select a high professional <br /> to audit the temporal registry.</p>
                             </div>
                           )}
                        </div>

                        {formData.time && (
                          <div className="pt-10 shrink-0 relative z-10">
                             <ZenButton
                               onClick={() => setStep(3)}
                               className="w-full py-8 bg-gradient-to-br from-zen-sand to-violet-700 text-white rounded-[2rem_1rem_2rem_1rem] shadow-[0_20px_40px_-15px_rgba(139,92,246,0.5)] group transition-all duration-700 hover:scale-[1.01] border-none text-[12px] font-black uppercase tracking-[0.4em]"
                             >
                               Finalize Identity <ChevronRight size={18} className="ml-2 group-hover:translate-x-3 transition-transform" />
                             </ZenButton>
                          </div>
                        )}
                     </div>
                  </div>
                 </div>
               </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full max-w-[900px] mx-auto grid lg:grid-cols-12 gap-10"
              >
                 <div className="lg:col-span-12 h-full flex flex-col">
                    <div className="flex-1 bg-white rounded-[3rem] p-8 lg:p-12 border border-zen-stone/60 shadow-2xl grid lg:grid-cols-2 gap-12 relative overflow-hidden flex min-h-0">

                       <div className="flex flex-col space-y-10 overflow-y-auto pr-6 custom-scrollbar">
                          <button 
                            onClick={() => setStep(2)} 
                            className="flex items-center gap-4 text-[10px] font-black tracking-[0.4em] uppercase text-zen-brown/30 hover:text-zen-brown transition-all group w-fit"
                          >
                             <div className="w-10 h-10 rounded-full border border-zen-brown/5 flex items-center justify-center group-hover:bg-zen-brown group-hover:text-white transition-all shadow-sm">
                                <ChevronRight size={16} className="rotate-180" />
                             </div>
                             Back to Schedule
                          </button>

                          <div className="space-y-3">
                             <h2 className="text-4xl font-serif font-black leading-tight text-zen-brown italic">Registry Protocol</h2>
                             <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-zen-sand">Final Audit & Identity</p>
                          </div>

                          <div className="space-y-8">
                             <ZenInput
                               label="Guest Full Name"
                               placeholder="e.g. John Wick"
                               value={formData.name}
                               onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                               icon={UserIcon}
                               variant="professional"
                               required
                             />
                             <div className="grid grid-cols-2 gap-8">
                                <ZenInput
                                  label="Primary Phone"
                                  placeholder="+974 0000 0000"
                                  value={formData.phone}
                                  onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })}
                                  icon={Phone}
                                  variant="professional"
                               required
                                />
                                <ZenInput
                                  label="Primary Email"
                                  placeholder="ritual@zen.com"
                                  type="email"
                                  value={formData.email}
                                  onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
                                  icon={Mail}
                                  variant="professional"
                               required
                                />
                             </div>
                             <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.5em] text-zen-brown/20 italic ml-2">Harmonization Notes</label>
                                <textarea
                                 className="w-full p-8 bg-white border border-zen-brown/10 rounded-[2.5rem] outline-none focus:border-zen-sand/40 focus:ring-4 focus:ring-zen-sand/5 transition-all font-serif italic text-lg text-zen-brown h-32 resize-none line-clamp-3 shadow-sm"
                                 placeholder="Personal preferences, health notes or intentions..."
                                 value={formData.notes}
                                 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                             </div>
                          </div>
                       </div>

                       <div className="flex flex-col h-full min-h-0">
                          <div className="flex-1 bg-white/90 backdrop-blur-2xl rounded-[4rem_1.5rem_4rem_1.5rem] p-10 lg:p-12 text-zen-brown shadow-3xl flex flex-col space-y-12 relative overflow-hidden border border-zen-stone/60">
                             <div className="absolute top-0 right-0 p-12 opacity-[0.03]">
                                <Sparkles size={200} strokeWidth={1} />
                             </div>

                             <div className="space-y-8 relative z-10 flex-1">
                                <div className="space-y-2">
                                   <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zen-brown/30">Registry Summary</p>
                                   <h4 className="text-4xl font-serif font-black italic tracking-tighter">{formData.service}</h4>
                                   <p className="text-sm font-bold uppercase tracking-[0.2em] text-zen-sand flex items-center gap-2">
                                      <MapPin size={12} /> {branches.find(b => b._id === formData.branch)?.name}
                                   </p>
                                </div>

                                <div className="grid grid-cols-2 gap-10 pt-10 border-t border-zen-brown/5">
                                   <div className="space-y-2">
                                      <p className="text-[9px] font-black uppercase text-zen-brown/30 tracking-widest">Ritual Window</p>
                                      <p className="text-xl font-serif font-black italic">{dayjs(formData.date).format('MMMM D')} @ {dayjs(`${formData.date} ${formData.time}`, 'YYYY-MM-DD HH:mm').format('hh:mm A')}</p>
                                   </div>
                                   <div className="space-y-2">
                                      <p className="text-[9px] font-black uppercase text-zen-brown/30 tracking-widest">Master specialist</p>
                                      <p className="text-xl font-serif font-black italic">{formData.employee}</p>
                                   </div>
                                </div>
                             </div>

                             <div className="pt-10 border-t border-zen-brown/5 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-4 text-zen-brown/40">
                                   <ShieldCheck size={24} strokeWidth={1} />
                                   <span className="text-[9px] font-black tracking-widest uppercase leading-tight max-w-[100px]">Secured sanctuary data protocol</span>
                                </div>
                                <div className="text-right">
                                   <p className="text-[9px] font-bold uppercase tracking-widest text-zen-brown/30 mb-1">Ritual Price</p>
                                   <p className="text-3xl font-serif font-black text-zen-sand italic underline decoration-zen-sand/10 decoration-2 underline-offset-8">QAR {services.find(s => s.name === formData.service)?.price}</p>
                                </div>
                             </div>
                          </div>

                          <div className="mt-8 shrink-0 space-y-4">
                             <ZenButton
                               onClick={handleSubmit}
                               loading={submitting}
                               className="w-full py-8 bg-gradient-to-br from-zen-sand to-violet-700 text-white rounded-[2.75rem_1.35rem_2.75rem_1.35rem] shadow-[0_20px_40px_-15px_rgba(139,92,246,0.5)] text-[12px] font-black uppercase tracking-[0.4em] transition-all duration-700 hover:scale-[1.01] hover:shadow-zen-sand/40 border-none"
                             >
                               Confirm Ritual Registry <ArrowRight size={18} className="ml-4" />
                             </ZenButton>
                             <button onClick={() => setStep(2)} className="w-full text-center text-[10px] uppercase font-bold tracking-[0.4em] text-zen-brown/20 hover:text-zen-brown transition-colors">
                                Adjust Schedule Protocol
                             </button>
                          </div>
                       </div>
                    </div>
                 </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center space-y-12"
              >
                  <div className="relative">
                    <div className="w-40 h-40 rounded-full overflow-hidden mx-auto shadow-3xl border-white border-[8px] relative z-10 bg-white group ring-4 ring-zen-brown/5">
                       <img 
                         src={getServiceImage(formData.service)} 
                         alt={formData.service}
                         className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                         onError={(e: any) => {
                           e.target.src = "https://images.unsplash.com/photo-1544161515-436cefb657f8?auto=format&fit=crop&q=80&w=1000";
                         }}
                       />
                       <div className="absolute inset-0 bg-zen-brown/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <CheckCircle2 size={48} className="text-white animate-bounce-slow" strokeWidth={1} />
                       </div>
                       <div className="absolute bottom-0 right-0 w-12 h-12 bg-zen-sand rounded-full border-[4px] border-white flex items-center justify-center -mr-2 -mb-2 shadow-lg z-20">
                          <Check size={20} className="text-white" strokeWidth={3} />
                       </div>
                    </div>
                    <div className="absolute inset-0 bg-zen-sand/20 blur-3xl rounded-full animate-pulse" />
                  </div>

                 <div className="space-y-6">
                    <h2 className="text-6xl font-serif font-black tracking-tighter text-zen-brown leading-tight italic">Registry <br /> Confirmed</h2>
                    <p className="text-2xl font-serif italic text-zen-brown/40 max-w-xl mx-auto leading-relaxed">
                      Peace be with you, {formData.name.split(' ')[0]}. Your session ritual has been secured. Our concierge will be in contact shortly.
                    </p>
                 </div>

                 <div className="pt-8">
                    <button
                      onClick={() => window.location.href = '/'}
                      className="group flex flex-col items-center gap-4 mx-auto"
                    >
                      <div className="w-12 h-12 rounded-full border border-zen-brown/5 flex items-center justify-center transition-all group-hover:bg-zen-brown group-hover:text-white shadow-sm">
                         <ChevronRight size={18} className="rotate-180" />
                      </div>
                      <span className="text-[10px] font-black tracking-[0.4em] uppercase text-zen-brown/20 group-hover:text-zen-brown transition-colors">Exit Ritual Office</span>
                    </button>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Minimal Bottom Info */}
        <footer className="mt-8 pt-8 border-t border-zen-brown/5 flex flex-col md:flex-row items-center justify-between gap-6 shrink-0">
           <p className="text-[9px] font-black uppercase tracking-[0.5em] text-zen-brown/10">Zen Sanctuary Registry • v4.0 Professional • Qatar HQ</p>
           <div className="flex gap-12 opacity-20">
              <ShieldCheck size={14} />
              <MapPin size={14} />
              <Info size={14} />
           </div>
        </footer>

      </div>

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
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(83, 67, 55, 0.2);
        }
      `}</style>
    </div>
  );
};

export default BookAppointment;
