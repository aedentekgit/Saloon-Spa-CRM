import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, ChevronLeft, ChevronRight, Edit2, Trash2, Calendar, 
  Sparkles, X, User as UserIcon, Search, MapPin, 
  ArrowRight, CheckCircle2, Clock, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import dayjs from 'dayjs';
import { ZenDropdown, ZenInput, ZenDatePicker } from '../../components/zen/ZenInputs';
import { ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { notify } from '../../components/shared/ZenNotification';
import { useSettings } from '../../context/SettingsContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

const BookAppointment = () => {
  const { settings } = useSettings();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [branches, setBranches] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
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
        notify('error', 'Error', 'Failed to load booking data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch Appointments for availability check when date/branch changes
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

  // Options
  const filteredServices = useMemo(() => {
    return services.filter(s => !formData.branch || s.branch === formData.branch || s.branch?._id === formData.branch);
  }, [services, formData.branch]);

  const filteredStaff = useMemo(() => {
    return staff.filter(e => {
      const matchesBranch = !formData.branch || e.branch === formData.branch || e.branch?._id === formData.branch;
      return matchesBranch;
    });
  }, [staff, formData.branch]);

  const availableSlots = useMemo(() => {
    if (!formData.date || !formData.employee || formData.employee === 'None') return [];
    
    const employee = staff.find(e => e.name === formData.employee || e._id === formData.employee);
    if (!employee || !employee.shift) return [];
    
    const shift = shifts.find(s => s.name === employee.shift);
    if (!shift || !shift.startTime || !shift.endTime) return [];
    
    let start = dayjs(`${formData.date} ${shift.startTime}`, 'YYYY-MM-DD hh:mm A');
    let end = dayjs(`${formData.date} ${shift.endTime}`, 'YYYY-MM-DD hh:mm A');
    
    if (end.isBefore(start)) end = end.add(1, 'day');

    const selectedService = services.find(s => s.name === formData.service || s._id === formData.service);
    const serviceDuration = selectedService?.duration || 60;

    const slots = [];
    let current = start;
    
    const employeeApts = appointments.filter(a => (a.employee === formData.employee || a.employee === employee.name) && a.date === formData.date);

    const now = dayjs();
    const isToday = dayjs(formData.date).isSame(now, 'day');

    while (current.isBefore(end)) {
      const slotEnd = current.add(serviceDuration, 'minute');
      if (slotEnd.isAfter(end)) break;
      
      const isPastTime = isToday && current.isBefore(now.add(30, 'minute')); // Minimum 30 min advance booking

      const isTherapistBooked = employeeApts.some(apt => {
        const aptStart = dayjs(`${apt.date} ${apt.time}`, 'YYYY-MM-DD HH:mm');
        const aptService = services.find(s => s.name === apt.service);
        const aptDuration = aptService?.duration || 60;
        const aptEnd = aptStart.add(aptDuration, 'minute');
        return (current.isBefore(aptEnd) && slotEnd.isAfter(aptStart));
      });
      
      slots.push({
        time: current.format('HH:mm'),
        display: current.format('hh:mm A'),
        isBooked: isTherapistBooked || isPastTime
      });
      
      current = current.add(30, 'minute');
    }
    
    return slots;
  }, [formData.date, formData.employee, formData.service, staff, shifts, appointments, services]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !formData.email) {
      notify('error', 'Incomplete', 'Please fill in your contact details');
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
        window.scrollTo(0, 0);
      } else {
        const error = await res.json();
        notify('error', 'Booking Failed', error.message || 'Something went wrong');
      }
    } catch (error) {
      notify('error', 'Error', 'Connection failed');
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && (!formData.branch || !formData.service)) {
      notify('error', 'Selection Required', 'Please select a branch and a service');
      return;
    }
    if (step === 2 && (!formData.employee || !formData.time)) {
      notify('error', 'Selection Required', 'Please select a specialist and a time slot');
      return;
    }
    setStep(prev => prev + 1);
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
    window.scrollTo(0, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zen-cream flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-zen-brown border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zen-cream font-sans text-zen-brown py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-top duration-1000">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-zen-brown/30 mb-4 font-sans">Professional Wellness Registry</p>
          <h1 className="text-4xl sm:text-6xl font-serif font-black tracking-tighter text-zen-brown mb-6">Book Your Ritual</h1>
          <p className="text-sm sm:text-lg text-zen-brown/60 max-w-2xl mx-auto font-serif italic">
            Experience the sanctuary of Zen. Reserved for you.
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-zen-brown/5 overflow-hidden">
          
          {/* Progress Bar */}
          {step < 4 && (
            <div className="flex border-b border-zen-brown/5">
              {[1, 2, 3].map((s) => (
                <div 
                  key={s}
                  className={`flex-1 py-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 ${
                    step === s ? 'bg-zen-brown text-white' : 
                    step > s ? 'bg-zen-leaf/10 text-zen-leaf' : 'text-zen-brown/20'
                  }`}
                >
                  Step {s}
                </div>
              ))}
            </div>
          )}

          <div className="p-8 sm:p-12">
            <AnimatePresence mode="wait">
              
              {/* Step 1: Branch & Service */}
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-10"
                >
                  <div className="grid gap-10 md:grid-cols-2">
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-2xl font-serif font-black mb-2">Location & Ritual</h3>
                        <p className="text-sm text-zen-brown/40">Choose your preferred branch and the service you desire.</p>
                      </div>

                      <ZenDropdown 
                        label="Preferred Sanctuary (Branch)"
                        options={branches.map(b => b.name)}
                        value={branches.find(b => b._id === formData.branch)?.name || ''}
                        onChange={(val) => {
                          const b = branches.find(b => b.name === val);
                          setFormData({ ...formData, branch: b?._id || '', service: '', employee: '', time: '' });
                        }}
                        placeholder="Select Branch"
                        variant="pill"
                        icon={MapPin}
                      />

                      <ZenDropdown 
                        label="Ritual of Choice (Service)"
                        options={filteredServices.map(s => s.name)}
                        value={formData.service}
                        onChange={(val) => setFormData({ ...formData, service: val, employee: '', time: '' })}
                        placeholder={formData.branch ? "Select Service" : "Choose Branch First"}
                        variant="pill"
                        disabled={!formData.branch}
                        icon={Sparkles}
                      />
                    </div>

                    <div className="bg-zen-cream/30 rounded-3xl p-8 flex flex-col justify-center border border-zen-brown/5">
                      {formData.service ? (
                        <div className="animate-in fade-in zoom-in duration-500">
                          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zen-brown/30 mb-2">Selected Insight</p>
                          <h4 className="text-2xl font-serif font-black text-zen-brown mb-4">{formData.service}</h4>
                          <div className="flex items-center gap-6 text-sm text-zen-brown/60">
                             <div className="flex items-center gap-2">
                               <Clock size={16} />
                               <span>{services.find(s => s.name === formData.service)?.duration || 0} mins</span>
                             </div>
                             <div className="flex items-center gap-2">
                               <span className="font-bold">QAR {services.find(s => s.name === formData.service)?.price || 0}</span>
                             </div>
                          </div>
                          <p className="mt-6 text-sm italic font-serif leading-relaxed text-zen-brown/50">
                            {services.find(s => s.name === formData.service)?.description || 'A curated ritual designed for your complete restoration.'}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center space-y-4 text-zen-brown/20 py-10">
                          <div className="w-16 h-16 rounded-full border-2 border-dashed border-zen-brown/10 flex items-center justify-center mx-auto">
                            <Sparkles size={24} />
                          </div>
                          <p className="text-sm italic font-serif">Your ritual selection will appear here</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-6">
                    <ZenButton 
                      onClick={nextStep}
                      className="group"
                    >
                      Continue to Specialist <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </ZenButton>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Specialist & Slot */}
              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-10"
                >
                  <div className="grid gap-12 md:grid-cols-2">
                    <div className="space-y-8">
                       <div>
                        <h3 className="text-2xl font-serif font-black mb-2">Timing & Specialist</h3>
                        <p className="text-sm text-zen-brown/40">Select your preferred date, Specialist and available slot.</p>
                      </div>

                      <ZenDatePicker 
                        label="Preferred Date"
                        value={formData.date}
                        onChange={(val) => setFormData({ ...formData, date: val, time: '' })}
                      />

                      <ZenDropdown
                        label="Specialist Registry"
                        options={filteredStaff.map(s => s.name)}
                        value={formData.employee}
                        onChange={(val) => setFormData({ ...formData, employee: val, time: '' })}
                        placeholder={formData.branch ? 'Select Specialist' : 'Choose Branch First'}
                        variant="pill"
                        icon={UserIcon}
                        disabled={!formData.branch}
                      />
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <label className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest ml-1">Available Windows</label>
                         {formData.employee && (
                           <span className="text-[9px] font-black text-zen-leaf uppercase tracking-widest bg-zen-leaf/10 px-2 py-1 rounded-full">Live Registry</span>
                         )}
                      </div>

                      {formData.employee ? (
                        <div className="grid grid-cols-3 gap-3">
                          {availableSlots.length > 0 ? availableSlots.map((slot, i) => (
                            <button
                              key={i}
                              disabled={slot.isBooked}
                              onClick={() => setFormData({ ...formData, time: slot.time })}
                              className={`py-4 rounded-xl text-center text-xs font-bold tracking-tighter transition-all duration-300 ${
                                slot.isBooked ? 'bg-zen-cream/20 text-zen-brown/10 cursor-not-allowed border border-transparent' :
                                formData.time === slot.time ? 'bg-zen-brown text-white border-zen-brown shadow-md scale-105' :
                                'bg-white text-zen-brown border border-zen-brown/10 hover:border-zen-brown hover:bg-zen-cream/5'
                              }`}
                            >
                              {slot.display}
                            </button>
                          )) : (
                            <div className="col-span-3 py-16 text-center bg-zen-cream/10 rounded-3xl border border-dashed border-zen-brown/10">
                               <p className="text-sm italic font-serif text-zen-brown/30">No available slots for this date</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-20 text-center bg-zen-cream/10 rounded-3xl border border-dashed border-zen-brown/10 space-y-4">
                           <div className="w-12 h-12 rounded-full border border-zen-brown/10 flex items-center justify-center mx-auto text-zen-brown/20 rotate-12">
                             <Clock size={20} />
                           </div>
                           <p className="text-sm italic font-serif text-zen-brown/30">Select a specialist to view availability</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between pt-6">
                    <ZenButton variant="secondary" onClick={prevStep}>
                      Back to Ritual
                    </ZenButton>
                    <ZenButton 
                      onClick={nextStep}
                      className="group"
                    >
                      Personal Details <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </ZenButton>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Contact Info */}
              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="max-w-2xl mx-auto space-y-10"
                >
                  <div className="text-center">
                    <h3 className="text-2xl font-serif font-black mb-2">Guest Registry</h3>
                    <p className="text-sm text-zen-brown/40">We need a few details to finalize your reservation.</p>
                  </div>

                  <div className="space-y-6">
                    <ZenInput 
                      label="Full Identity (Name)"
                      placeholder="e.g. Abdullah Ahmed"
                      value={formData.name}
                      onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                      icon={UserIcon}
                    />
                    <div className="grid gap-6 md:grid-cols-2">
                       <ZenInput 
                        label="Electronic Mail (Email)"
                        placeholder="your@email.com"
                        type="email"
                        value={formData.email}
                        onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
                        icon={Search}
                      />
                      <ZenInput 
                        label="Tele-Contact (Phone)"
                        placeholder="+974 0000 0000"
                        value={formData.phone}
                        onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })}
                        icon={MapPin}
                      />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest ml-1">Special Requests (Notes)</label>
                       <textarea 
                         className="w-full p-4 bg-white border border-zen-brown/10 rounded-2xl outline-none focus:border-zen-brown transition-all font-serif italic text-sm text-zen-brown h-24 resize-none"
                         placeholder="Any specific requirements or preferences..."
                         value={formData.notes}
                         onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                       />
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-zen-leaf/5 border border-zen-leaf/10 rounded-3xl p-8 space-y-4">
                     <p className="text-[10px] font-bold uppercase tracking-widest text-zen-leaf mb-2">Booking Summary</p>
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <p className="text-lg font-serif font-black text-zen-brown">{formData.service}</p>
                          <p className="text-xs text-zen-brown/60">{branches.find(b => b._id === formData.branch)?.name}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-sm font-bold text-zen-brown">{dayjs(formData.date).format('MMMM D, YYYY')}</p>
                          <p className="text-xs text-zen-brown/60">at {formData.time}</p>
                        </div>
                     </div>
                  </div>

                  <div className="flex justify-between pt-6">
                    <ZenButton variant="secondary" onClick={prevStep}>
                      Previous Step
                    </ZenButton>
                    <ZenButton 
                      onClick={handleSubmit}
                      loading={submitting}
                      className="group bg-zen-brown hover:bg-zen-leaf transition-colors"
                    >
                      Confirm Reservation <CheckCircle2 size={18} className="ml-2 group-hover:scale-110 transition-transform" />
                    </ZenButton>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Success */}
              {step === 4 && (
                <motion.div 
                  key="step4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 space-y-8"
                >
                  <div className="w-24 h-24 bg-zen-leaf rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce duration-1000">
                    <CheckCircle2 size={48} className="text-white" />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-4xl font-serif font-black text-zen-brown">Reservation Acknowledged</h2>
                    <p className="text-lg text-zen-brown/60 font-serif italic max-w-lg mx-auto">
                      Peace be upon you, {formData.name.split(' ')[0]}. Your ritual at Zen has been reserved. A confirmation email will be sent shortly.
                    </p>
                  </div>
                  <div className="pt-8">
                     <div className="bg-zen-cream/30 border border-zen-brown/5 rounded-3xl p-8 inline-block text-left max-w-sm w-full">
                        <div className="flex items-start gap-4">
                           <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-zen-brown/40 shrink-0">
                              <Info size={18} />
                           </div>
                           <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-zen-brown/30 mb-1">Status</p>
                              <p className="text-sm font-bold text-zen-brown">Pending Approval</p>
                              <p className="text-[11px] text-zen-brown/40 mt-1 leading-relaxed">Our manager will verify the details and you'll receive a final confirmation via phone/email.</p>
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="pt-10">
                    <ZenButton variant="secondary" onClick={() => window.location.href = '/'}>
                      Return to Home
                    </ZenButton>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* Footer Note */}
        {step < 4 && (
          <p className="mt-10 text-center text-[10px] uppercase tracking-widest text-zen-brown/20 font-bold">
            Zen Sanctuary & Spa • Registered in Qatar • Pure Serenity
          </p>
        )}
      </div>
    </div>
  );
};

export default BookAppointment;
