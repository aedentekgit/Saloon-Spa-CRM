import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Sparkles, X, User as UserIcon, MapPin,
  ArrowRight, CheckCircle2, Clock, ShieldCheck,
  Briefcase, UserCircle, Phone, Mail, ChevronRight,
  Map as MapIcon, Star, Info, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
import { ZenDropdown, ZenInput, ZenDatePicker } from '../../components/zen/ZenInputs';
import { ZenButton } from '../../components/zen/ZenButtons';
import { notify } from '../../components/shared/ZenNotification';
import { usePublicSettings } from '../../components/landing/usePublicSettings';
import { withBase } from '../../utils/assetPath';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
const ANY_SPECIALIST = 'Any available specialist';

const parseTime = (t: string, d: string) => {
  if (!t) return null;
  const formats = ['HH:mm', 'h:mm A', 'hh:mm A', 'H:mm'];
  for (const f of formats) {
    const p = dayjs(`${d} ${t}`, `YYYY-MM-DD ${f}`, true);
    if (p.isValid()) return p;
  }
  return null;
};

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
  const [rooms, setRooms] = useState<any[]>([]);

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
        const [branchRes, serviceRes, staffRes, shiftRes, roomRes] = await Promise.all([
          fetch(`${API_URL}/branches/public`),
          fetch(`${API_URL}/services/public`),
          fetch(`${API_URL}/employees/public`),
          fetch(`${API_URL}/shifts/public`),
          fetch(`${API_URL}/rooms/public`)
        ]);
 
        const [bData, sData, stData, shData, rData] = await Promise.all([
          branchRes.json(), serviceRes.json(), staffRes.json(), shiftRes.json(), roomRes.json()
        ]);
 
        setBranches(Array.isArray(bData) ? bData : bData.data || []);
        setServices(Array.isArray(sData) ? sData : sData.data || []);
        setStaff(Array.isArray(stData) ? stData : stData.data || []);
        setShifts(Array.isArray(shData) ? shData : shData.data || []);
        setRooms(Array.isArray(rData) ? rData : rData.data || []);
      } catch (error) {
        console.error('Data fetch error:', error);
        notify('error', 'Sync Failed', 'Access denied to booking database.');
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

    const branchRooms = rooms.filter(r => !formData.branch || r.branch === formData.branch || r.branch?._id === formData.branch);
    const roomCapacity = branchRooms.length || 999; // Default to large number if no rooms defined

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

      if (start.isBefore(shopStart)) start = shopStart;
      if (end.isAfter(shopEnd)) end = shopEnd;

      if (!end.isAfter(start)) return [];

      const slots: any[] = [];
      let current = start;

      while (current.isBefore(end)) {
        const currentRoom = rooms.find(r => r.name === formData.room);
        const currentCleaning = currentRoom?.cleaningDuration || 20;
        const totalNewOccupancy = serviceDuration + currentCleaning;
        const slotOccupancyEnd = current.add(totalNewOccupancy, 'minute');

        if (slotOccupancyEnd.isAfter(end)) break;

        const isPastTime = isToday && current.isBefore(now.add(30, 'minute'));
        
        // --- 1. SPECIALIST CONFLICT CHECK ---
        const isEmployeeBooked = appointments.some(apt => {
          const aptEmp = typeof apt.employee === 'string' ? apt.employee : apt.employee?.name;
          if (aptEmp !== employee.name) return false;

          const aptStart = parseTime(apt.time, formData.date);
          if (!aptStart) return false;
          const aptService = services.find(s => s.name === apt.service);
          const aptDuration = aptService?.duration || 60;
          
          const aptRoom = rooms.find(r => r.name === apt.room);
          const aptCleaning = aptRoom?.cleaningDuration || 0;
          const aptTotalOccupancy = aptDuration + aptCleaning;
          
          const aptEnd = aptStart.add(aptTotalOccupancy, 'minute');
          return (current.isBefore(aptEnd) && slotOccupancyEnd.isAfter(aptStart));
        });

        // --- 2. GLOBAL ROOM CAPACITY CHECK ---
        const occupiedRoomCount = appointments.filter(apt => {
          // If the appointment doesn't have a room, it doesn't consume room capacity
          if (!apt.room) return false; 
          
          const aptStart = parseTime(apt.time, formData.date);
          if (!aptStart) return false;
          const aptService = services.find(s => s.name === apt.service);
          const aptDuration = aptService?.duration || 60;
          
          const aptRoom = rooms.find(r => r.name === apt.room);
          const aptCleaning = aptRoom?.cleaningDuration || 0;
          const aptTotalOccupancy = aptDuration + aptCleaning;
          
          const aptEnd = aptStart.add(aptTotalOccupancy, 'minute');
          return (current.isBefore(aptEnd) && slotOccupancyEnd.isAfter(aptStart));
        }).length;

        const isRoomFull = occupiedRoomCount >= roomCapacity;

        slots.push({
          time: current.format('HH:mm'),
          display: current.format('hh:mm A'),
          isBooked: isEmployeeBooked || isRoomFull || isPastTime
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
  }, [formData.date, formData.employee, formData.service, staff, shifts, appointments, services, settings, filteredStaff]);

  const selectedServiceData = useMemo(() => {
    return services.find(s => s.name === formData.service || s._id === formData.service);
  }, [services, formData.service]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !formData.email) {
      notify('error', 'Missing Information', 'Guest identity is incomplete.');
      return;
    }

    // Phone Validation Logic
    const cleanPhone = formData.phone.replace(/\s+/g, '');
    const qatarRegex = /^(\+974)?\d{8}$/;
    const internationalRegex = /^\+\d{10,15}$/;
    
    const isQatar = cleanPhone.startsWith('+974') || (cleanPhone.length === 8 && !cleanPhone.startsWith('+'));
    const isValid = isQatar ? qatarRegex.test(cleanPhone) : internationalRegex.test(cleanPhone);

    if (!isValid) {
      notify('error', 'Invalid Phone', isQatar ? 'Qatar numbers must be 8 digits.' : 'Please enter a valid international number with country code.');
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
      notify('error', 'Connection Error', 'Please check your internet connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { id: 1, name: 'Service' },
    { id: 2, name: 'Time' },
    { id: 3, name: 'Details' }
  ];

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-zen-brown/10 border-t-zen-brown rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-zen-brown/40">Loading Booking System...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 relative flex flex-col overflow-hidden">

      {/* Clean Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-50 select-none bg-[#f8f9fa]">
         <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(#53433705_1px,transparent_1px)] [background-size:20px_20px]" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 h-full flex flex-col max-w-[1400px] mx-auto w-full px-6 lg:px-12 py-4 lg:py-6 overflow-hidden">



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
                    <div className="flex-1 bg-white rounded-3xl p-8 lg:p-12 border border-gray-200 shadow-xl relative overflow-hidden flex flex-col min-h-0">

                      {/* Header Inside Container */}
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10 shrink-0 relative z-20">
                         <div className="space-y-1 text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-3 text-[10px] font-bold tracking-widest uppercase text-zen-brown/40">
                               <span className="w-6 h-px bg-zen-brown/10" />
                               Online Booking
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-serif font-bold text-zen-brown">
                              Book Your Appointment
                            </h1>
                         </div>

                         <div className="flex items-center gap-6 bg-gray-50 px-8 py-3 rounded-full border border-gray-100 shadow-sm">
                            {steps.map((s) => (
                              <div key={s.id} className="flex items-center gap-3 group">
                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-300 text-[10px] font-bold ${
                                  step === s.id ? 'bg-zen-brown text-white border-zen-brown shadow-md' :
                                  step > s.id ? 'bg-zen-sand text-white border-zen-sand' : 'border-gray-200 text-gray-300 uppercase tracking-widest'
                                }`}>
                                  {step > s.id ? <CheckCircle2 size={10} /> : <span>{s.id}</span>}
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${step === s.id ? 'text-zen-brown' : 'text-gray-300'}`}>{s.name}</span>
                                {s.id < 3 && <div className="w-4 h-px bg-gray-200" />}
                              </div>
                            ))}
                         </div>
                      </div>

                      <div className="flex justify-between items-center mb-6 relative z-20">
                         <button 
                           onClick={() => window.location.href = withBase('/')} 
                           className="flex items-center gap-4 text-[9px] font-black tracking-[0.4em] uppercase text-zen-brown/30 hover:text-zen-brown transition-all group w-fit"
                         >
                            <div className="w-7 h-7 rounded-full border border-zen-brown/5 flex items-center justify-center group-hover:bg-zen-brown group-hover:text-white transition-all shadow-sm">
                               <ChevronRight size={12} className="rotate-180" />
                            </div>
                            Exit Registry
                         </button>
                      </div>

                      <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                         <MapIcon size={400} strokeWidth={1} />
                      </div>

                      <div className="grid lg:grid-cols-2 gap-16 flex-1 min-h-0 relative z-10">
                           <div className="flex flex-col justify-start space-y-10">

                            <div className="space-y-4">
                               <h2 className="text-4xl font-serif font-black leading-tight text-zen-brown italic">
                                  Begin the Ascendance
                               </h2>
                               <div className="flex items-center gap-4">
                                  <div className="w-full max-w-[280px]">
                                    <ZenDatePicker
                                      label="Select Date"
                                      value={formData.date}
                                      onChange={(val) => setFormData({ ...formData, date: val, time: '' })}
                                      hideLabel
                                    />
                                  </div>
                                  <div className="h-px flex-1 bg-zen-brown/5 hidden sm:block"></div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Appointment Date</p>
                               </div>
                            </div>

                            <div className="space-y-8">
                               <ZenDropdown
                                label="Select Location"
                                options={branches.map(b => b.name)}
                                value={branches.find(b => b._id === formData.branch)?.name || ''}
                                onChange={(val) => {
                                  const b = branches.find(b => b.name === val);
                                  setFormData({ ...formData, branch: b?._id || '', service: '', employee: '', time: '' });
                                }}
                                placeholder="Choose your preferred location"
                                variant="pill"
                                icon={MapPin}
                               />
                               <ZenDropdown
                                label="Select Service"
                                options={filteredServices.map(s => s.name)}
                                value={formData.service}
                                onChange={(val) => setFormData({ ...formData, service: val, employee: '', time: '' })}
                                placeholder={formData.branch ? "Select preferred service" : "Select location first"}
                                variant="pill"
                                disabled={!formData.branch}
                                icon={Briefcase}
                               />
                            </div>

                            <div className="pt-8 border-t border-gray-50 flex items-center gap-6">
                               <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-zen-sand shadow-sm">
                                  <ShieldCheck size={24} strokeWidth={1.5} />
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed max-w-sm">
                                   Professional consultation and premium amenities <br /> are included with every booking.
                                </p>
                            </div>
                         </div>

                          <div className="relative h-full min-h-0 lg:border-l lg:border-gray-100">
                             <div className="h-full bg-gray-50/50 flex flex-col text-zen-brown overflow-hidden">
                               {formData.service ? (
                                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col p-12 overflow-hidden relative">
                                    
                                    <div className="flex justify-between items-start mb-10 relative z-10">
                                       <div className="space-y-1">
                                          <p className="text-[10px] font-bold uppercase tracking-widest text-zen-brown/30">Service Details</p>
                                          <h3 className="text-3xl font-serif font-bold text-zen-brown">{formData.service}</h3>
                                       </div>
                                       {selectedServiceData?.image && (
                                          <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-xl rotate-3 shrink-0">
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

                                    <div className="grid grid-cols-2 gap-8 mb-10 relative z-10">
                                       <div className="space-y-1">
                                          <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Duration</p>
                                          <p className="text-4xl font-serif font-bold">{selectedServiceData?.duration || 0}<span className="text-[12px] font-bold uppercase ml-2 text-gray-300 tracking-tight">Min</span></p>
                                       </div>
                                       <div className="space-y-1">
                                          <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Price</p>
                                          <p className="text-4xl font-serif font-bold text-zen-sand">{selectedServiceData?.price || 0}<span className="text-[12px] font-bold uppercase ml-2 text-gray-300 tracking-tight">QAR</span></p>
                                       </div>
                                    </div>

                                    <div className="flex-1 min-h-0 overflow-y-auto pr-6 custom-scrollbar relative z-10 mb-8">
                                       <p className="text-lg font-serif text-zen-brown/60 leading-relaxed">
                                          {selectedServiceData?.description || 'Professional service tailored for your absolute restoration and wellness.'}
                                       </p>
                                    </div>

                                    <div className="pt-8 border-t border-gray-100 mt-auto relative z-10">
                                       <ZenButton
                                        onClick={() => setStep(2)}
                                        className="w-full py-4 bg-zen-brown text-white rounded-xl shadow-lg group transition-all duration-300 hover:bg-zen-brown/90 border-none text-xs font-bold uppercase tracking-widest"
                                       >
                                         Next Step <ChevronRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                       </ZenButton>
                                    </div>
                                 </motion.div>
                               ) : (
                                 <div className="flex-1 flex flex-col items-center justify-center p-16 text-center space-y-8 relative">
                                   <div className="w-32 h-32 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-lg relative z-10">
                                      <Briefcase size={48} strokeWidth={1} className="text-zen-sand" />
                                   </div>
                                   <div className="space-y-2 relative z-10">
                                      <p className="text-2xl font-serif font-bold text-zen-brown/50">Select a Service</p>
                                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300">Choose a service to see full details</p>
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
                 initial={{ opacity: 0, scale: 0.99, y: 10 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.99, y: -10 }}
                 className="h-full max-w-[1100px] mx-auto grid lg:grid-cols-12 gap-10"
               >
                 <div className="lg:col-span-12 h-full flex flex-col">
                    <div className="flex-1 bg-white rounded-3xl p-8 lg:p-12 border border-gray-200 shadow-xl relative overflow-hidden flex flex-col min-h-0">
                       
                       {/* Header Inside Container */}
                       <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10 shrink-0 relative z-20">
                          <div className="space-y-1 text-center md:text-left">
                             <div className="flex items-center justify-center md:justify-start gap-3 text-[10px] font-bold tracking-widest uppercase text-zen-brown/40">
                                <span className="w-6 h-px bg-zen-brown/10" />
                                Online Booking
                             </div>
                             <h1 className="text-3xl lg:text-4xl font-serif font-bold text-zen-brown">
                               Choose Your Specialist
                             </h1>
                          </div>

                          <div className="flex items-center gap-6 bg-gray-50 px-8 py-3 rounded-full border border-gray-100 shadow-sm">
                             {steps.map((s) => (
                               <div key={s.id} className="flex items-center gap-3 group">
                                 <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-300 text-[10px] font-bold ${
                                   step === s.id ? 'bg-zen-brown text-white border-zen-brown shadow-md' :
                                   step > s.id ? 'bg-zen-sand text-white border-zen-sand' : 'border-gray-200 text-gray-300 uppercase tracking-widest'
                                 }`}>
                                   {step > s.id ? <CheckCircle2 size={10} /> : <span>{s.id}</span>}
                                 </div>
                                 <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${step === s.id ? 'text-zen-brown' : 'text-gray-300'}`}>{s.name}</span>
                                 {s.id < 3 && <div className="w-4 h-px bg-gray-200" />}
                               </div>
                             ))}
                          </div>
                       </div>

                       <div className="grid lg:grid-cols-12 gap-12 flex-1 min-h-0 relative z-10">
                          {/* Specialist Selection Side */}
                          <div className="lg:col-span-4 flex flex-col justify-start space-y-10">
                             <div className="flex justify-between items-center mb-2">
                                <button 
                                  onClick={() => setStep(1)} 
                                  className="flex items-center gap-4 text-[10px] font-bold tracking-widest uppercase text-zen-brown/40 hover:text-zen-brown transition-all group w-fit"
                                >
                                   <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center group-hover:bg-zen-brown group-hover:text-white transition-all shadow-sm">
                                      <ChevronRight size={16} className="rotate-180" />
                                   </div>
                                   Return to Services
                                </button>
                             </div>

                             <div className="space-y-4">
                                <h2 className="text-3xl font-serif font-bold text-zen-brown">
                                   Specialist <span className="italic">Selection</span>
                                </h2>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zen-sand">Choose your preferred professional</p>
                             </div>

                             <div className="space-y-8">
                                <ZenDropdown
                                  label="Select Specialist"
                                  options={[ANY_SPECIALIST, ...filteredStaff.map(s => s.name)]}
                                  value={formData.employee}
                                  onChange={(val) => setFormData({ ...formData, employee: val, time: '' })}
                                  placeholder={formData.branch ? 'Choose Professional' : 'Choose Location First'}
                                  variant="pill"
                                  icon={UserCircle}
                                />
                                
                                <div className="pt-8 border-t border-gray-100">
                                   <div className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50/50 border border-gray-100">
                                      <Info size={16} className="text-zen-sand shrink-0" />
                                      <p className="text-[10px] font-bold uppercase tracking-widest text-zen-brown/40 leading-relaxed">
                                         Our specialists are available <br /> for your preferred time.
                                      </p>
                                   </div>
                                </div>
                             </div>
                          </div>

                          {/* Time Slots Side */}
                          <div className="lg:col-span-8 h-full flex flex-col min-h-0 lg:border-l lg:border-gray-100 lg:pl-12">
                             <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-gray-100 shrink-0 gap-6">
                                <div className="space-y-1">
                                   <h4 className="text-2xl font-serif font-bold text-zen-brown">Available Windows</h4>
                                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select your appointment time</p>
                                </div>
                                {formData.employee && (
                                  <div className="px-6 py-2.5 bg-zen-sand text-white rounded-full flex items-center gap-3 shadow-md">
                                     <Check size={14} strokeWidth={3} />
                                     <span className="text-[10px] font-bold uppercase tracking-widest">Linked to Specialist</span>
                                  </div>
                                )}
                             </div>

                             <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                                {formData.employee ? (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
                                    {availableSlots.length > 0 ? availableSlots.map((slot, i) => (
                                      <button
                                        key={i}
                                        disabled={slot.isBooked}
                                        onClick={() => setFormData({ ...formData, time: slot.time })}
                                        className={`group relative overflow-hidden py-4 px-4 rounded-xl flex flex-col items-center justify-center transition-all duration-300 border ${
                                          slot.isBooked ? 'bg-gray-50 text-gray-300 cursor-not-allowed border-gray-100' :
                                          formData.time === slot.time ? 'bg-zen-brown text-white border-zen-brown shadow-lg scale-[1.02]' :
                                          'bg-white border-gray-200 hover:border-zen-sand hover:shadow-md hover:-translate-y-0.5'
                                        }`}
                                      >
                                        <span className={`relative z-10 text-[13px] font-bold tracking-tight ${slot.isBooked ? 'line-through' : ''}`}>{slot.display}</span>
                                      </button>
                                    )) : (
                                      <div className="col-span-full py-24 flex flex-col items-center justify-center space-y-6 opacity-30">
                                         <Clock size={48} strokeWidth={1} />
                                         <p className="text-lg font-serif text-center max-w-sm">No availability detected for this date. Please try another day.</p>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="h-full flex flex-col items-center justify-center opacity-10 space-y-8 py-12">
                                     <div className="p-10 rounded-full bg-gray-50 border border-gray-100">
                                        <UserIcon size={80} strokeWidth={1} />
                                     </div>
                                     <p className="text-xl font-serif text-center max-w-md uppercase tracking-widest leading-relaxed">Select a specialist <br /> to view their schedule.</p>
                                  </div>
                                )}
                             </div>

                             {formData.time && (
                               <div className="pt-8 border-t border-gray-100 mt-auto">
                                  <ZenButton
                                    onClick={() => setStep(3)}
                                    className="w-full py-4 bg-zen-brown text-white rounded-xl shadow-lg transition-all duration-300 hover:bg-zen-brown/90 border-none text-xs font-bold uppercase tracking-widest"
                                  >
                                    Continue to Details <ChevronRight size={18} className="ml-2" />
                                  </ZenButton>
                               </div>
                             )}
                          </div>
                       </div>
                    </div>
                 </div>
               </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -10 }}
                className="h-full max-w-[900px] mx-auto grid lg:grid-cols-12 gap-10"
              >
                  <div className="lg:col-span-12 h-full flex flex-col">
                    <div className="flex-1 bg-white rounded-3xl p-8 lg:p-12 border border-gray-200 shadow-xl relative overflow-hidden flex flex-col min-h-0">
                       
                       {/* Header Inside Container */}
                       <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10 shrink-0 relative z-20">
                          <div className="space-y-1 text-center md:text-left">
                             <div className="flex items-center justify-center md:justify-start gap-3 text-[10px] font-bold tracking-widest uppercase text-zen-brown/40">
                                <span className="w-6 h-px bg-zen-brown/10" />
                                Online Booking
                             </div>
                             <h1 className="text-3xl lg:text-4xl font-serif font-bold text-zen-brown">
                               Enter Your Details
                             </h1>
                          </div>

                          <div className="flex items-center gap-6 bg-gray-50 px-8 py-3 rounded-full border border-gray-100 shadow-sm">
                             {steps.map((s) => (
                               <div key={s.id} className="flex items-center gap-3 group">
                                 <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-300 text-[10px] font-bold ${
                                   step === s.id ? 'bg-zen-brown text-white border-zen-brown shadow-md' :
                                   step > s.id ? 'bg-zen-sand text-white border-zen-sand' : 'border-gray-200 text-gray-300 uppercase tracking-widest'
                                 }`}>
                                   {step > s.id ? <CheckCircle2 size={10} /> : <span>{s.id}</span>}
                                 </div>
                                 <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${step === s.id ? 'text-zen-brown' : 'text-gray-300'}`}>{s.name}</span>
                                 {s.id < 3 && <div className="w-4 h-px bg-gray-200" />}
                               </div>
                             ))}
                          </div>
                       </div>

                       <div className="flex justify-between items-center mb-8 relative z-20">
                          <button 
                            onClick={() => setStep(2)} 
                            className="flex items-center gap-4 text-[10px] font-bold tracking-widest uppercase text-zen-brown/40 hover:text-zen-brown transition-all group w-fit"
                          >
                             <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center group-hover:bg-zen-brown group-hover:text-white transition-all shadow-sm">
                                <ChevronRight size={16} className="rotate-180" />
                             </div>
                             Back to Timing
                          </button>
                       </div>

                       <div className="grid lg:grid-cols-2 gap-12 flex-1 min-h-0">
                          <div className="flex flex-col space-y-10 overflow-y-auto pr-6 custom-scrollbar">
                             <div className="space-y-2">
                                <h2 className="text-3xl font-serif font-bold text-zen-brown">Guest Information</h2>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zen-sand">Please provide your contact details</p>
                             </div>

                             <div className="space-y-8">
                                <ZenInput
                                  label="Guest Full Name"
                                  placeholder="e.g. John Wick"
                                  value={formData.name}
                                  onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                                  icon={UserIcon}
                                  required
                                />
                                <div className="grid grid-cols-2 gap-8">
                                   <ZenInput
                                     label="Primary Phone"
                                     placeholder="+974 0000 0000"
                                     value={formData.phone}
                                     onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })}
                                     icon={Phone}
                                     required
                                   />
                                   <ZenInput
                                     label="Primary Email"
                                     placeholder="guest@example.com"
                                     type="email"
                                     value={formData.email}
                                     onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
                                     icon={Mail}
                                     required
                                   />
                                </div>
                                <div className="space-y-3">
                                   <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Additional Notes</label>
                                   <textarea
                                    className="w-full p-6 bg-white border border-gray-100 rounded-2xl outline-none focus:border-zen-sand transition-all font-serif text-lg text-zen-brown h-32 resize-none shadow-sm"
                                    placeholder="Any special requests or notes for your appointment..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                   />
                                </div>
                             </div>
                          </div>

                          <div className="flex flex-col h-full min-h-0">
                             <div className="flex-1 bg-white rounded-3xl p-10 lg:p-12 text-zen-brown shadow-xl flex flex-col space-y-10 relative overflow-hidden border border-gray-100">

                                <div className="space-y-8 relative z-10 flex-1">
                                    <div className="space-y-1">
                                       <p className="text-[10px] font-bold uppercase tracking-widest text-zen-brown/30">Appointment Summary</p>
                                       <h4 className="text-3xl font-serif font-bold">{formData.service}</h4>
                                       <p className="text-sm font-bold text-zen-sand flex items-center gap-2">
                                          <MapPin size={12} /> {branches.find(b => b._id === formData.branch)?.name}
                                       </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6 pt-8 border-t border-gray-50">
                                       <div className="space-y-1">
                                          <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Appointment Time</p>
                                          <div className="flex items-center gap-3 text-lg font-serif font-bold text-zen-brown">
                                             <Calendar size={16} className="text-zen-sand" />
                                             <span>{dayjs(formData.date).format('MMMM D, YYYY')} @ {dayjs(`${formData.date} ${formData.time}`, 'YYYY-MM-DD HH:mm').format('hh:mm A')}</span>
                                          </div>
                                       </div>
                                       <div className="space-y-1">
                                          <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Specialist</p>
                                          <div className="flex items-center gap-3 text-lg font-serif font-bold text-zen-brown">
                                             <UserCircle size={16} className="text-zen-sand" />
                                             <span>{formData.employee}</span>
                                          </div>
                                       </div>
                                    </div>
                                </div>

                                 <div className="pt-8 border-t border-gray-50 flex items-center justify-between shrink-0">
                                    <div className="text-right w-full">
                                       <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Total Amount</p>
                                       <p className="text-3xl font-serif font-bold text-zen-sand">QAR {services.find(s => s.name === formData.service)?.price}</p>
                                    </div>
                                 </div>
                             </div>

                             <div className="mt-8 shrink-0 space-y-4">
                                <ZenButton
                                  onClick={handleSubmit}
                                  loading={submitting}
                                  className="w-full py-4 bg-zen-brown text-white rounded-xl shadow-lg text-xs font-bold uppercase tracking-widest transition-all duration-300 hover:bg-zen-brown/90 border-none"
                                >
                                  Confirm Booking <ArrowRight size={18} className="ml-4" />
                                </ZenButton>
                                <button onClick={() => setStep(2)} className="w-full text-center text-[10px] uppercase font-bold tracking-widest text-gray-300 hover:text-zen-brown transition-colors">
                                   Change Appointment Time
                                </button>
                             </div>
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
                className="h-full flex flex-col items-center justify-center text-center space-y-10"
              >
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full overflow-hidden mx-auto shadow-2xl border-white border-[6px] relative z-10 bg-white group ring-4 ring-zen-brown/5">
                       <img 
                         src={getServiceImage(formData.service)} 
                         alt={formData.service}
                         className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                         onError={(e: any) => {
                           e.target.src = "https://images.unsplash.com/photo-1544161515-436cefb657f8?auto=format&fit=crop&q=80&w=1000";
                         }}
                       />
                       <div className="absolute inset-0 bg-zen-brown/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <CheckCircle2 size={40} className="text-white animate-bounce-slow" strokeWidth={1} />
                       </div>
                    </div>
                    <div className="absolute inset-0 bg-zen-sand/20 blur-3xl rounded-full animate-pulse" />
                  </div>

                 <div className="space-y-2">
                    <h2 className="text-4xl font-serif font-bold text-zen-brown">Booking Confirmed</h2>
                    <p className="text-lg font-serif text-zen-brown/50">Thank you, {formData.name.split(' ')[0]}. Your appointment has been scheduled.</p>
                 </div>

                 {/* Booking Receipt Card */}
                 <div className="w-full max-w-md bg-white rounded-3xl p-10 shadow-xl border border-gray-100 text-left space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-1">
                       <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Service Details</p>
                       <h3 className="text-2xl font-serif font-bold text-zen-brown">{formData.service}</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                       <div className="space-y-1">
                          <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400">Date & Time</p>
                          <div className="flex items-center gap-2 text-zen-brown font-serif font-bold">
                             <Calendar size={14} className="text-zen-sand" />
                             <span>{dayjs(formData.date).format('MMM D, YYYY')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-zen-brown font-serif font-bold">
                             <Clock size={14} className="text-zen-sand" />
                             <span>{dayjs(`${formData.date} ${formData.time}`, 'YYYY-MM-DD HH:mm').format('hh:mm A')}</span>
                          </div>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400">Specialist</p>
                          <div className="flex items-center gap-2 text-zen-brown font-serif font-bold">
                             <UserCircle size={14} className="text-zen-sand" />
                             <span>{formData.employee}</span>
                          </div>
                       </div>
                    </div>

                    <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                       <div className="space-y-1">
                          <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400">Location</p>
                          <div className="flex items-center gap-2 text-zen-brown font-serif font-bold">
                             <MapPin size={14} className="text-zen-sand" />
                             <span>{branches.find(b => b._id === formData.branch)?.name}</span>
                          </div>
                       </div>
                       <div className="text-right space-y-1">
                          <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400">Total Price</p>
                          <p className="text-2xl font-serif font-bold text-zen-sand">QAR {services.find(s => s.name === formData.service)?.price}</p>
                       </div>
                    </div>
                 </div>

                 <div className="pt-4">
                    <button
                      onClick={() => window.location.href = withBase('/')}
                      className="group flex flex-col items-center gap-4 mx-auto"
                    >
                      <div className="w-10 h-10 rounded-full border border-zen-brown/5 flex items-center justify-center transition-all group-hover:bg-zen-brown group-hover:text-white shadow-sm">
                         <ChevronRight size={16} className="rotate-180" />
                      </div>
                      <span className="text-[9px] font-black tracking-[0.4em] uppercase text-zen-brown/20 group-hover:text-zen-brown transition-colors">Return to Home</span>
                    </button>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Minimal Bottom Info */}
        <footer className="mt-8 pt-8 border-t border-zen-brown/5 flex flex-col md:flex-row items-center justify-between gap-6 shrink-0">
           <p className="text-[9px] font-black uppercase tracking-[0.5em] text-zen-brown/10">Professional Booking Registry • v4.0 • Qatar HQ</p>
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
