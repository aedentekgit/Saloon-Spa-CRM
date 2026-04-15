import React, { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { Camera, Clock, Shield, TrendingUp, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { ZenBadge, ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { notify } from '../../components/shared/ZenNotification';
import { useSettings } from '../../context/SettingsContext';
import { ZenDropdown, ZenInput } from '../../components/zen/ZenInputs';
import { Modal } from '../../components/shared/Modal';
import { Plus, Calendar as CalendarIcon, User as UserIcon, LogIn, LogOut, Trash2 } from 'lucide-react';
import { useBranches } from '../../context/BranchContext';

interface AttendanceRecord {
  _id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
  employeeName: string;
  duration?: number;
  overtimeMinutes?: number;
  dailyEarnings?: number;
  shift?: string;
}

const Attendance = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { selectedBranch } = useBranches();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [videoActive, setVideoActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [manualFormData, setManualFormData] = useState({
    employeeId: '',
    date: dayjs().format('YYYY-MM-DD'),
    checkIn: '09:00 AM',
    checkOut: '06:00 PM',
    status: 'Present'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Manager';
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchHistory();
  }, [selectedBranch, page]);

  useEffect(() => {
    if (user?.role === 'Admin' || user?.role === 'Manager') {
      fetchEmployees();
    }
  }, [user]);

  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(dayjs().format('hh:mm:ss A')), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_URL}/employees`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setEmployees(data.filter((e: any) => e.status === 'Active'));
      }
    } catch (e) {}
  };

  const fetchHistory = async () => {
    try {
      const url = new URL(`${API_URL}/attendance`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', '12');
      
      if (selectedBranch && selectedBranch !== 'all') {
        url.searchParams.append('branch', selectedBranch);
      }

      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${user?.token || ''}` }
      });
      const resData = await response.json();
      
      const data = resData.data || resData;
      if (resData.pagination) {
        setTotalPages(resData.pagination.pages);
      } else {
        setTotalPages(1);
      }

      if (Array.isArray(data)) {
        const sortedData = data.sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix());
        setAttendance(sortedData);
        const today = dayjs().format('YYYY-MM-DD');
        const myTodayRecord = sortedData.find((r: any) => r.date === today && (r.user === user?._id || r.employeeName === user?.name));
        if (myTodayRecord && myTodayRecord.checkIn !== '--' && myTodayRecord.checkOut === '--') {
          setIsCheckedIn(true);
        } else {
          setIsCheckedIn(false);
        }
      } else {
        setAttendance([]);
      }
    } catch (error) {
      notify('error', 'Error', 'Failed to retrieve history');
      setAttendance([]);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualFormData.employeeId) return notify('error', 'Selection', 'Please select a specialist');
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/attendance`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}` 
        },
        body: JSON.stringify({
          ...manualFormData,
          targetUserId: manualFormData.employeeId
        })
      });

      if (response.ok) {
        notify('success', 'Registry Updated', 'Attendance record processed successfully');
        setIsManualModalOpen(false);
        fetchHistory();
      }
    } catch (error) {
      notify('error', 'Error', 'Failed to update registry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/attendance/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (response.ok) {
        notify('success', 'Registry Cleaned', 'Attendance record removed');
        fetchHistory();
      }
    } catch (e) {
      notify('error', 'Error', 'Failed to remove record');
    }
  };


  const startCamera = async () => {
    try {
      setVideoActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Use a brief timeout to ensure the video element is in the DOM
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      notify('error', 'Security', 'Camera access denied');
      setVideoActive(false);
    }
  };

  const timeToMinutesStr = (timeStr: string) => {
    if (!timeStr || timeStr === '--') return 0;
    try {
      const parts = timeStr.trim().split(/\s+/);
      const timePart = parts[0];
      const modifier = parts[1] ? parts[1].toUpperCase() : '';
      
      let [hours, minutes] = timePart.split(':').map(n => parseInt(n));
      if (hours === 12) {
        hours = modifier === 'AM' ? 0 : 12;
      } else if (modifier === 'PM') {
        hours += 12;
      }
      return (hours * 60) + minutes;
    } catch (e) { return 0; }
  };

  const calculatePreview = () => {
    const emp = employees.find(e => e._id === manualFormData.employeeId);
    if (!emp || !manualFormData.checkIn || !manualFormData.checkOut) return null;

    const start = timeToMinutesStr(manualFormData.checkIn);
    const end = timeToMinutesStr(manualFormData.checkOut);
    if (end <= start) return null;

    const duration = end - start;
    const shiftMinutes = (emp.payroll?.shiftHours || 8) * 60;
    const otMinutes = Math.max(0, duration - shiftMinutes);
    
    let earnings = 0;
    if (emp.payroll?.type === 'Monthly') {
      const dailyBase = (emp.salary || 0) / 30;
      earnings = dailyBase + (otMinutes / 60) * (emp.payroll?.otRate || 0);
    } else {
      const regMin = Math.min(duration, shiftMinutes);
      earnings = (regMin / 60) * (emp.payroll?.baseAmount || 0) + (otMinutes / 60) * (emp.payroll?.otRate || 0);
    }

    return {
      duration: Math.round(duration / 60 * 10) / 10,
      ot: Math.round(otMinutes / 60 * 10) / 10,
      earnings: Math.round(earnings)
    };
  };

  const preview = calculatePreview();

  const handleAttendance = async () => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const date = dayjs().format('YYYY-MM-DD');

    setLoading(true);
    
    const getPosition = () => {
       return new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
             enableHighAccuracy: true,
             timeout: 5001,
             maximumAge: 0
          });
       });
    };

    try {
      let coords = { latitude: null as any, longitude: null as any };
      
      try {
         const position = await getPosition();
         coords.latitude = position.coords.latitude;
         coords.longitude = position.coords.longitude;
      } catch (geoError) {
         console.warn("Geographical verify skipped or denied", geoError);
      }

      const body = !isCheckedIn 
        ? { date, checkIn: time, status: 'Present', employeeName: user?.name, shift: 'Full Day', ...coords }
        : { date, checkOut: time, employeeName: user?.name, ...coords };

      const response = await fetch(`${API_URL}/attendance`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}` 
        },
        body: JSON.stringify(body)
      });

      const resData = await response.json();

      if (response.ok) {
        notify('success', 'Verified', isCheckedIn ? 'Cycle Concluded' : 'Digital Presence established');
        fetchHistory();
      } else {
        notify('error', 'Access Denied', resData.message || 'Verification protocol failed');
      }
    } catch (error) {
      notify('error', 'Link Error', 'Verification communication failure');
    } finally {
      setLoading(false);
    }
  };

  const filteredAttendance = attendance.filter(record => 
    (record.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (record.date || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (record.status || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDuration = (mins?: number) => {
    if (!mins) return '0h';
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return `${hrs}h ${m}m`;
  };

  return (
    <ZenPageLayout
      title="Presence Terminal"
      hideAddButton={user?.role !== 'Admin' && user?.role !== 'Manager'}
      onAddClick={user?.role === 'Admin' || user?.role === 'Manager' ? () => setIsManualModalOpen(true) : undefined}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
    >
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
        <div className="w-full lg:w-[450px] space-y-6 sm:space-y-8 h-fit lg:sticky lg:top-8">
           <div className="bg-white/90 backdrop-blur-2xl p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[4rem] border border-zen-brown/15 shadow-sm text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:scale-150 transition-transform duration-[2000ms] ease-out">
                 <Shield size={200} />
              </div>
              
              <div className="mb-8 sm:mb-12 relative">
                 <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
                    <span className="flex h-2 w-2 rounded-full bg-zen-leaf animate-pulse" />
                    <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.5em]">Synchronized Time</p>
                 </div>
                 <div className="flex items-baseline justify-center gap-2 sm:gap-3">
                    <h2 className="text-4xl sm:text-6xl font-serif font-bold text-zen-brown tracking-tighter">
                       {currentTime.split(' ')[0]}
                    </h2>
                    <span className="text-lg sm:text-xl font-serif font-bold text-zen-brown/40">{currentTime.split(' ')[1]}</span>
                 </div>
                 <div className="mt-4 inline-flex items-center gap-3 px-6 py-2 bg-zen-cream/30 rounded-full border border-zen-brown/15">
                    <CalendarIcon size={12} className="text-zen-sand" />
                    <p className="text-[10px] font-bold text-zen-brown/60 uppercase tracking-widest">{dayjs().format('dddd, MMMM D')}</p>
                 </div>
              </div>
              
              <div className="relative aspect-square rounded-[2rem] sm:rounded-[3.5rem] bg-zen-brown/5 border-2 border-dashed border-zen-brown/25 overflow-hidden flex flex-col items-center justify-center mb-6 sm:mb-10 group/cam transition-all duration-700 hover:border-zen-sand/30">
                 <AnimatePresence mode="wait">
                    {videoActive ? (
                       <motion.div 
                         key="active"
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         className="relative w-full h-full"
                       >
                          <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            className="w-full h-full object-cover grayscale-[0.3] brightness-110" 
                          />
                          <div className="absolute inset-0 border-[10px] sm:border-[20px] border-white/10" />
                          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zen-leaf/50 shadow-[0_0_15px_rgba(34,197,94,0.5)] animate-scan-line z-20" />
                       </motion.div>
                    ) : (
                       <motion.div 
                         key="inactive"
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         className="flex flex-col items-center gap-4 sm:gap-6"
                       >
                          <div className="w-20 sm:w-28 h-20 sm:h-28 rounded-full bg-white flex items-center justify-center text-zen-brown/10 shadow-xl relative group-hover/cam:scale-110 transition-transform duration-700">
                             <div className="absolute inset-0 border-2 border-dashed border-zen-sand/20 rounded-full animate-spin-slow" />
                             <Camera size={32} className="sm:w-11 sm:h-11" strokeWidth={1} />
                          </div>
                          <div className="space-y-1 sm:space-y-2">
                             <p className="text-[10px] sm:text-[11px] font-bold text-zen-brown uppercase tracking-[0.4em]">Initialize Authentication</p>
                             <p className="text-[8px] sm:text-[9px] text-zen-brown/40 font-medium px-8 sm:px-12 leading-relaxed uppercase tracking-widest text-center">Digital presence requires biometric confirmation</p>
                          </div>
                          <button 
                            onClick={startCamera} 
                            className="text-[10px] font-bold text-zen-sand border-b border-zen-sand/20 pb-0.5 sm:pb-1 hover:border-zen-sand transition-all tracking-[0.2em] mt-1 sm:mt-2 uppercase"
                          >
                             Activate Optics
                          </button>
                       </motion.div>
                    )}
                 </AnimatePresence>
              </div>

              <ZenButton 
                onClick={handleAttendance}
                disabled={loading}
                className={`w-full py-5 sm:py-6 rounded-[1.5rem] sm:rounded-[2rem] text-base sm:text-lg font-serif transition-all duration-700 ${isCheckedIn ? 'bg-[#FF6B6B] hover:bg-[#FF5252] shadow-sm shadow-red-500/20' : 'bg-zen-brown hover:bg-zen-brown/90 shadow-sm'} ${loading ? 'opacity-50 cursor-wait' : ''}`}
              >
                  <span className="flex items-center justify-center gap-3 sm:gap-4">
                     {loading ? <Loader2 className="animate-spin sm:w-6 sm:h-6" size={20} /> : (isCheckedIn ? <LogOut size={20} className="sm:w-6 sm:h-6" /> : <LogIn size={20} className="sm:w-6 sm:h-6" />)}
                     <span className="tracking-tight">{loading ? 'Processing Flow...' : isCheckedIn ? 'Terminate Presence' : 'Establish Presence'}</span>
                  </span>
              </ZenButton>
           </div>

           <AnimatePresence>
            {attendance.length > 0 && attendance[0].dailyEarnings !== undefined && (
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="p-6 sm:p-10 bg-white/60 backdrop-blur-xl rounded-[2.5rem] sm:rounded-[3rem] border border-zen-brown/15 shadow-xl shadow-zen-brown/15 flex items-center justify-between group overflow-hidden"
               >
                  <div className="relative z-10">
                     <p className="text-[10px] font-bold text-zen-leaf uppercase tracking-[0.3em] mb-2 sm:mb-3">Daily Energy Exchange</p>
                     <p className="text-3xl sm:text-4xl font-serif text-zen-brown font-bold tracking-tighter">{settings?.general?.currencySymbol || 'QR'} {attendance[0].dailyEarnings.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-[1.2rem] sm:rounded-[1.5rem] bg-zen-leaf text-white flex items-center justify-center shadow-lg shadow-zen-leaf/20 relative z-10">
                     <TrendingUp size={24} className="sm:w-7 sm:h-7" />
                  </div>
                  <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-zen-leaf/5 rounded-full blur-3xl pointer-events-none" />
               </motion.div>
            )}
           </AnimatePresence>
        </div>

        <div className="flex-1 space-y-6 sm:space-y-8">
           <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] sm:rounded-[4rem] border border-zen-brown/15 overflow-hidden shadow-sm min-h-[500px] sm:min-h-[700px] flex flex-col">
              <div className="px-12 py-12 border-b border-zen-brown/15 flex justify-between items-center bg-white/40">
                 <div>
                    <h3 className="text-2xl font-serif font-bold text-zen-brown tracking-tight">Financial Sequence</h3>
                    <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.4em] mt-2">Historical Presence & Earnings Registry</p>
                 </div>
              </div>

              <div className="overflow-x-auto flex-1 p-8">
                 <table className="w-full text-left border-separate border-spacing-y-4">
                    <thead>
                       <tr className="text-zen-brown/30 text-[9px] uppercase tracking-[0.3em] italic">
                          {isAdminOrManager && <th className="px-8 pb-4">Specialist</th>}
                          <th className="px-8 pb-4">Registry Node</th>
                          <th className="px-8 pb-4">Span</th>
                          <th className="px-8 pb-4">Overtime</th>
                          <th className="px-8 pb-4">Resonance</th>
                          <th className="px-8 pb-4 text-right">Status</th>
                       </tr>
                    </thead>
                    <tbody>
                       {filteredAttendance.map((row) => (
                          <tr key={row._id} className="group transition-all duration-500">
                             {isAdminOrManager && (
                                <td className="px-8 py-7 bg-white group-hover:bg-zen-cream/30 rounded-l-[2rem] border-y border-l border-zen-brown/15 transition-colors">
                                   <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-full bg-zen-brown/5 flex items-center justify-center text-zen-brown/20 font-serif font-bold shadow-inner">
                                         {row.employeeName.charAt(0)}
                                      </div>
                                      <span className="font-serif text-lg text-zen-brown font-bold tracking-tight">{row.employeeName}</span>
                                   </div>
                                </td>
                             )}
                             <td className={`px-8 py-7 bg-white group-hover:bg-zen-cream/30 border-y border-zen-brown/15 transition-colors ${!isAdminOrManager ? 'rounded-l-[2rem] border-l' : ''}`}>
                                <div className="flex flex-col">
                                   <span className="font-serif text-lg text-zen-brown font-bold tracking-tight">{dayjs(row.date).format('MMM DD, YYYY')}</span>
                                   <div className="flex items-center gap-2 mt-1">
                                      <Clock size={10} className="text-zen-sand" />
                                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{row.checkIn} — {row.checkOut}</span>
                                   </div>
                                </div>
                             </td>
                             <td className="px-8 py-7 bg-white group-hover:bg-zen-cream/30 border-y border-zen-brown/15 transition-colors">
                                <span className="font-serif text-sm text-zen-brown/60 italic font-medium">{formatDuration(row.duration)}</span>
                             </td>
                             <td className="px-8 py-7 bg-white group-hover:bg-zen-cream/30 border-y border-zen-brown/15 transition-colors">
                                {row.overtimeMinutes ? (
                                   <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-400/5 rounded-full border border-red-400/10">
                                      <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{formatDuration(row.overtimeMinutes)}</span>
                                   </div>
                                ) : (
                                   <span className="text-zen-brown/10 text-xs">—</span>
                                )}
                             </td>
                             <td className="px-8 py-7 bg-white group-hover:bg-zen-cream/30 border-y border-zen-brown/15 transition-colors">
                                {row.dailyEarnings !== undefined ? (
                                   <span className="font-serif font-bold text-zen-brown text-lg">{settings?.general?.currencySymbol} {row.dailyEarnings.toLocaleString()}</span>
                                ) : (
                                   <span className="text-zen-brown/10">—</span>
                                )}
                             </td>
                             <td className="px-8 py-7 bg-white group-hover:bg-zen-cream/30 rounded-r-[2rem] border-y border-r border-zen-brown/15 transition-colors text-right">
                                <div className="flex items-center justify-end gap-6">
                                   <ZenBadge variant={row.status === 'Present' ? 'leaf' : 'sand'} className="font-bold tracking-widest px-4 py-1.5 rounded-xl">
                                      {row.status === 'Present' && row.checkOut !== '--' ? 'COMPLETE' : row.status.toUpperCase()}
                                   </ZenBadge>
                                   {isAdminOrManager && (
                                      <ZenIconButton 
                                         icon={Trash2} 
                                         variant="danger" 
                                         className="opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100" 
                                         onClick={() => handleDeleteRecord(row._id)} 
                                      />
                                   )}
                                </div>
                             </td>
                          </tr>
                       ))}
                       {filteredAttendance.length === 0 && (
                          <tr>
                             <td colSpan={isAdminOrManager ? 6 : 5} className="py-32 text-center">
                                <div className="flex flex-col items-center gap-4 opacity-10">
                                   <Shield size={80} strokeWidth={0.5} />
                                   <p className="italic font-serif text-xl">The registry is silent for this timeframe</p>
                                </div>
                             </td>
                          </tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      </div>

      <ZenPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} title="Manual Presence Registry" maxWidth="max-w-2xl">
         <form onSubmit={handleManualSubmit} className="space-y-8 p-6">
            <div className="p-8 bg-zen-cream/30 rounded-[2.5rem] border border-zen-brown/15">
               <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-zen-brown/30 shadow-inner">
                     <Plus size={20} />
                  </div>
                  <div>
                     <h4 className="font-serif text-xl text-zen-brown">Registry Override</h4>
                     <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest mt-1">Manual Attendance Entry</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-8">
                  <div className="col-span-2">
                     <ZenDropdown 
                        label="Specialist Selection" 
                        options={employees.map(e => e.name)} 
                        value={employees.find(e => e._id === manualFormData.employeeId)?.name || ''} 
                        onChange={(val) => setManualFormData({...manualFormData, employeeId: employees.find(e => e.name === val)?._id || ''})}
                        icon={UserIcon}
                     />
                     {manualFormData.employeeId && (() => {
                        const emp = employees.find(e => e._id === manualFormData.employeeId);
                        if (!emp) return null;
                        return (
                           <div className="mt-4 p-4 bg-white/40 rounded-2xl border border-zen-brown/15 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-zen-brown text-white flex items-center justify-center">
                                    <TrendingUp size={14} />
                                 </div>
                                 <div>
                                    <p className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest">Payroll Mode</p>
                                    <p className="text-xs font-serif text-zen-brown font-bold">{emp.payroll?.type || 'Monthly'}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest">Base Rate</p>
                                 <p className="text-xs font-serif text-zen-brown font-bold">{settings?.general?.currencySymbol} {emp.payroll?.baseAmount || emp.salary}</p>
                              </div>
                              <div className="text-right">
                                 <p className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest">Shift</p>
                                 <p className="text-xs font-serif text-zen-brown font-bold">{emp.payroll?.shiftHours || 8}h</p>
                              </div>
                           </div>
                        );
                     })()}
                  </div>

                  <ZenInput 
                     label="Node Date" 
                     type="date" 
                     icon={CalendarIcon} 
                     value={manualFormData.date} 
                     onChange={(e: any) => setManualFormData({...manualFormData, date: e.target.value})} 
                  />

                  <ZenDropdown 
                     label="Presence Status" 
                     options={['Present', 'Absent', 'Half Day']} 
                     value={manualFormData.status} 
                     onChange={(val) => setManualFormData({...manualFormData, status: val})}
                     icon={Shield}
                  />

                  <ZenInput 
                     label="Clock-In Amplitude" 
                     placeholder="09:00 AM" 
                     icon={LogIn} 
                     value={manualFormData.checkIn} 
                     onChange={(e: any) => setManualFormData({...manualFormData, checkIn: e.target.value})} 
                  />

                  <ZenInput 
                     label="Clock-Out Amplitude" 
                     placeholder="06:00 PM" 
                     icon={LogOut} 
                     value={manualFormData.checkOut} 
                     onChange={(e: any) => setManualFormData({...manualFormData, checkOut: e.target.value})} 
                  />
               </div>
            </div>

            {preview && (
              <div className="p-8 bg-zen-leaf/5 rounded-[2.5rem] border border-zen-leaf/10 animate-in fade-in zoom-in-95 duration-500">
                 <div className="flex items-center justify-between">
                    <div>
                       <h5 className="text-[10px] font-bold text-zen-leaf uppercase tracking-widest">Calculated Resonance</h5>
                       <p className="font-serif italic text-zen-brown/60 text-sm mt-2">
                          Shift span of <span className="text-zen-brown font-bold not-italic">{preview.duration}h</span> with <span className="text-red-400 font-bold not-italic">{preview.ot}h</span> of overtime.
                       </p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-bold text-zen-brown/20 uppercase tracking-widest">Est. Earnings</p>
                       <p className="text-2xl font-serif font-bold text-zen-brown leading-none mt-1">{settings?.general?.currencySymbol} {preview.earnings}</p>
                    </div>
                 </div>
              </div>
            )}

            <div className="flex gap-4">
               <ZenButton type="button" variant="secondary" onClick={() => setIsManualModalOpen(false)} className="flex-1">Discard</ZenButton>
               <ZenButton type="submit" disabled={isSubmitting} className="flex-[2]">
                  {isSubmitting ? 'Synchronizing...' : 'Establish Record'}
               </ZenButton>
            </div>
         </form>
      </Modal>
    </ZenPageLayout>
  );
};

export default Attendance;
