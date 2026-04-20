import React, { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { Camera, Clock, Shield, TrendingUp, Loader2, Search, User, LogIn, LogOut, Trash2, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { ZenBadge, ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { notify } from '../../components/shared/ZenNotification';
import { useSettings } from '../../context/SettingsContext';
import { ZenDropdown, ZenInput } from '../../components/zen/ZenInputs';
import { Modal } from '../../components/shared/Modal';
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
  const primaryColor = settings?.theme?.primaryColor || '#332766';
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
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(() => fetchHistory(true), 15000);
    return () => clearInterval(interval);
  }, [selectedBranch, page]);

  useEffect(() => {
    if (isAdminOrManager) fetchEmployees();
  }, [user]);

  useEffect(() => {
    const previous = document.body.style.getPropertyValue('--zen-primary');
    document.body.style.setProperty('--zen-primary', primaryColor);
    return () => {
      if (previous) {
        document.body.style.setProperty('--zen-primary', previous);
      } else {
        document.body.style.removeProperty('--zen-primary');
      }
    };
  }, [primaryColor]);

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
      if (Array.isArray(data)) setEmployees(data.filter((e: any) => e.status === 'Active'));
    } catch (e) {}
  };

  const fetchHistory = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const url = new URL(`${API_URL}/attendance`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', '12');
      if (selectedBranch && selectedBranch !== 'all') url.searchParams.append('branch', selectedBranch);

      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const resData = await response.json();
      const data = resData.data || resData;
      if (resData.pagination) setTotalPages(resData.pagination.pages);

      if (Array.isArray(data)) {
        setAttendance(data);
        const today = dayjs().format('YYYY-MM-DD');
        const myRecord = data.find((r: any) => r.date === today && (r.user === user?._id || r.employeeName === user?.name));
        setIsCheckedIn(!!(myRecord && myRecord.checkIn !== '--' && myRecord.checkOut === '--'));
      }
    } catch (error) {
      if (!silent) notify('error', 'Sync Failed', 'Could not refresh attendance registry');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      setVideoActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch (err) {
      notify('error', 'Optics Failed', 'Camera access is required for ritual verification');
      setVideoActive(false);
    }
  };

  const handleAttendance = async () => {
    const time = dayjs().format('hh:mm A');
    const date = dayjs().format('YYYY-MM-DD');
    setLoading(true);

    try {
      const body = !isCheckedIn 
        ? { date, checkIn: time, status: 'Present', employeeName: user?.name, shift: 'Full Day' }
        : { date, checkOut: time, employeeName: user?.name };

      const response = await fetch(`${API_URL}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token}` },
        body: JSON.stringify(body)
        });

      if (response.ok) {
        notify('success', 'Verified', isCheckedIn ? 'Work Cycle Concluded' : 'Ritual Presence Established');
        fetchHistory();
        if (videoRef.current?.srcObject) {
          (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
          setVideoActive(false);
        }
      }
    } catch (error) {
      notify('error', 'Link Error', 'Verification server communication failure');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      const resp = await fetch(`${API_URL}/attendance/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (resp.ok) {
        notify('info', 'Registry Cleaned', 'Attendance record removed');
        fetchHistory();
      }
    } catch (e) {}
  };

  return (
    <ZenPageLayout
      title="Ritual Presence"
      hideAddButton={!isAdminOrManager}
      onAddClick={() => setIsManualModalOpen(true)}
      addButtonLabel="Manual Entry"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      hideViewToggle
    >
      <div style={{ '--zen-primary': primaryColor } as React.CSSProperties} className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-12">

        {/* Verification Terminal */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-8">
           <div className="bg-white p-8 sm:p-12 rounded-[3rem] border border-zen-stone shadow-[0_20px_50px_rgba(0,0,0,0.04)] text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:scale-125 transition-transform duration-[3000ms]">
                <Shield size={240} />
              </div>
              
              <div className="relative z-10 mb-12">
                 <div className="flex items-center justify-center gap-2.5 mb-4">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-zen-leaf animate-pulse" />
                    <p className="text-[10px] font-black text-zen-brown/30 uppercase tracking-[0.4em]">Atomic Sync</p>
                 </div>
                 <div className="flex items-baseline justify-center gap-3">
                    <h2 className="text-5xl sm:text-7xl font-serif font-black text-zen-brown tracking-tighter">
                       {currentTime.split(' ')[0]}
                    </h2>
                    <span className="text-xl font-serif font-bold text-zen-brown/20">{currentTime.split(' ')[1]}</span>
                 </div>
                 <div className="mt-6 inline-flex items-center gap-3 px-6 py-2 bg-zen-stone/40 rounded-full border border-zen-stone">
                    <CalendarIcon size={12} className="text-zen-sand" />
                    <p className="text-[10px] font-black text-zen-brown/60 uppercase tracking-[0.2em]">{dayjs().format('dddd, MMMM D')}</p>
                 </div>
              </div>

              {/* Biometric Stage */}
              <div className="relative aspect-square rounded-[2rem] bg-zen-stone/30 border-2 border-dashed border-zen-stone/60 overflow-hidden flex flex-col items-center justify-center mb-10 group/cam transition-all duration-700 hover:border-zen-sand/40">
                 <AnimatePresence mode="wait">
                    {videoActive ? (
                       <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0">
                          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover grayscale-[0.5] brightness-125" />
                          <div className="absolute inset-0 border-[24px] border-white/5 whitespace-pre" />
                          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zen-leaf/40 shadow-[0_0_20px_rgba(34,197,94,0.4)] animate-scan-line z-20" />
                          <div className="absolute top-6 left-6 flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                             <span className="text-[9px] font-black text-white uppercase tracking-widest drop-shadow-md">Biometric Feed active</span>
                          </div>
                       </motion.div>
                    ) : (
                       <motion.div key="inactive" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-6 p-8">
                          <div className="w-24 h-24 rounded-3xl bg-white border border-zen-stone shadow-xl flex items-center justify-center text-zen-brown/5 relative group-hover/cam:scale-110 transition-transform duration-700">
                             <div className="absolute inset-0 border-2 border-dotted border-zen-sand/10 rounded-3xl animate-spin-slow" />
                             <Camera size={40} strokeWidth={1} />
                          </div>
                          <div className="space-y-2">
                             <h4 className="text-[11px] font-black text-zen-brown uppercase tracking-[0.4em]">Identity Authentication</h4>
                             <p className="text-[9px] text-zen-brown/30 font-bold uppercase tracking-widest leading-relaxed max-w-[200px] mx-auto">Optical validation required for presence registry</p>
                          </div>
                          <ZenButton variant="ghost" size="sm" onClick={startCamera} className="mt-2 text-zen-sand !border-zen-sand/20 hover:!bg-zen-sand/5">
                             Initialize Optics
                          </ZenButton>
                       </motion.div>
                    )}
                 </AnimatePresence>
              </div>

              <ZenButton 
                onClick={handleAttendance}
                disabled={loading}
                className={`w-full py-6 rounded-2xl text-lg font-serif transition-all duration-700 ${isCheckedIn ? 'bg-red-500 hover:bg-red-600 shadow-xl shadow-red-500/20' : 'bg-zen-brown hover:bg-zen-brown/90 shadow-xl'} ${loading ? 'opacity-50 cursor-wait' : ''}`}
              >
                  <span className="flex items-center justify-center gap-4">
                     {loading ? <Loader2 className="animate-spin" size={24} /> : (isCheckedIn ? <LogOut size={24} /> : <LogIn size={24} />)}
                     <span className="tracking-tight">{loading ? 'Processing Flow...' : isCheckedIn ? 'Terminate Presence' : 'Establish Presence'}</span>
                  </span>
              </ZenButton>
           </div>

           {/* Performance Insight */}
           <div className="p-10 bg-white rounded-[2.5rem] border border-zen-stone shadow-sm flex items-center justify-between group overflow-hidden">
              <div className="relative z-10">
                 <p className="text-[10px] font-black text-zen-leaf uppercase tracking-[0.4em] mb-3">Today's Pulse</p>
                 <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-serif text-zen-brown font-black tracking-tighter">{settings?.general?.currencySymbol || 'QR'} {attendance[0]?.dailyEarnings?.toLocaleString() || '0'}</p>
                    <span className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest">Est. Earnings</span>
                 </div>
              </div>
              <div className="w-16 h-16 rounded-[1.5rem] bg-zen-leaf text-white flex items-center justify-center shadow-lg shadow-zen-leaf/20 relative z-10">
                 <TrendingUp size={28} />
              </div>
           </div>
        </div>

        {/* Presence Log */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            <div className="bg-white p-8 sm:p-12 rounded-[3.5rem] border border-zen-stone shadow-sm overflow-hidden flex flex-col min-h-[600px]">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
                  <div>
                    <h3 className="text-2xl font-black text-zen-brown tracking-tight">Presence Registry</h3>
                    <p className="text-[10px] font-black text-zen-brown/30 uppercase tracking-[0.4em] mt-1.5">Historical verification log</p>
                  </div>
                  <div className="flex items-center gap-4 bg-zen-stone/30 p-1.5 rounded-2xl border border-zen-stone">
                     {[
                       { label: 'All Records', count: attendance.length },
                       { label: 'Present', count: attendance.filter(a => a.status === 'Present').length },
                     ].map(tab => (
                        <button key={tab.label} className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-zen-brown/40 hover:text-zen-brown hover:bg-white transition-all">
                           {tab.label}
                        </button>
                     ))}
                  </div>
               </div>

               <div className="flex-1 overflow-x-auto scrollbar-hide">
                  <table className="w-full text-center border-collapse min-w-[800px]">
                     <thead>
                        <tr>
                           <th className="pb-8">S No</th>
                           {isAdminOrManager && <th className="pb-8">Specialist</th>}
                           <th className="pb-8">Verification Date</th>
                           <th className="pb-8">Ritual Span</th>
                           <th className="pb-8">Value Created</th>
                           <th className="pb-8 text-center px-6">Status</th>
                        </tr>
                     </thead>
                     <tbody>
                        {(!attendance || attendance.length === 0) && (
                           <tr>
                              <td colSpan={isAdminOrManager ? 6 : 5} className="py-32 text-center text-[11px] font-sans text-gray-400">
                                <div className="flex flex-col items-center gap-6 opacity-[0.08]">
                                   <Shield size={100} strokeWidth={0.5} />
                                   <p className="italic font-serif text-2xl tracking-tight">The registry remains undisturbed.</p>
                                </div>
                              </td>
                           </tr>
                        )}

                        {attendance.map((row, index) => (
                           <tr key={row._id} className="group transition-all duration-500 border-b border-zen-stone/40 hover:bg-zen-stone/20">
                              <td className="py-6 italic opacity-20 text-[11px] font-serif">
                                {((page - 1) * 12 + index + 1).toString().padStart(2, '0')}
                              </td>
                              {isAdminOrManager && (
                                 <td className="py-6">
                                    <div className="flex flex-col items-center px-6">
                                       <span className="text-sm font-bold text-zen-brown">{row.employeeName}</span>
                                       <span className="text-[9px] font-black text-zen-brown/20 uppercase tracking-widest mt-1">{row.shift || 'Sanctuary'} Artisan</span>
                                    </div>
                                 </td>
                              )}
                              <td className="py-6">
                                 <div className="flex flex-col items-center">
                                    <span className="text-sm font-bold text-zen-brown">{dayjs(row.date).format('DD MMM, YYYY')}</span>
                                    <div className="flex items-center gap-1.5 mt-1 opacity-40">
                                       <Clock size={10} className="text-zen-sand" />
                                       <span className="text-[9px] font-black uppercase tracking-[0.1em]">{row.checkIn} — {row.checkOut}</span>
                                    </div>
                                 </div>
                              </td>
                              <td className="py-6">
                                 <div className="inline-flex items-center gap-2 px-3 py-1 bg-zen-stone rounded-full">
                                    <span className="text-xs font-serif font-bold text-zen-brown italic">{Math.floor((row.duration || 0) / 60)}h {(row.duration || 0) % 60}m</span>
                                 </div>
                              </td>
                              <td className="py-6">
                                 <div className="flex flex-col items-center">
                                    <span className="text-sm font-black text-zen-brown">
                                       {settings?.general?.currencySymbol} {row.dailyEarnings?.toLocaleString() || '0'}
                                    </span>
                                    {row.overtimeMinutes ? (
                                       <span className="text-[8px] font-black text-red-500 uppercase tracking-widest mt-1">+{Math.floor(row.overtimeMinutes/60)}h OT</span>
                                    ) : (
                                       <span className="text-[8px] font-black text-zen-brown/20 uppercase tracking-widest mt-1">Standard Ritual</span>
                                    )}
                                 </div>
                              </td>
                              <td className="py-6 px-6">
                                 <div className="flex items-center justify-center gap-4">
                                    <ZenBadge variant={row.status === 'Present' && row.checkOut !== '--' ? 'leaf' : 'sand'} className="text-[9px] font-black px-6 py-2">
                                       {row.status === 'Present' && row.checkOut !== '--' ? 'COMPLETED' : row.status.toUpperCase()}
                                    </ZenBadge>
                                    {isAdminOrManager && (
                                       <ZenIconButton icon={Trash2} variant="danger" size="sm" className="opacity-0 group-hover:opacity-100" onClick={() => handleDeleteRecord(row._id)} />
                                    )}
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>

               <div className="mt-auto pt-8">
                  <ZenPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
               </div>
            </div>
        </div>
      </div>

      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Registry Override"
        maxWidth="max-w-2xl"
        footer={(
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <ZenButton
              type="button"
              variant="secondary"
              onClick={() => setIsManualModalOpen(false)}
              className="flex-1 !rounded-[1.35rem] !py-4"
            >
              Cancel
            </ZenButton>
            <ZenButton
              type="button"
              onClick={() => { notify('success', 'Update Request Sent', 'Synchronizing registry overrides...'); setIsManualModalOpen(false); }}
              className="flex-[2] !rounded-[1.35rem] !py-4 text-white shadow-xl"
              style={{ backgroundColor: primaryColor }}
            >
              Commit Registry Change
            </ZenButton>
          </div>
        )}
      >
         <form onSubmit={(e) => e.preventDefault()} className="space-y-8 p-0">
            <div className="zen-pointed-surface bg-white/80 backdrop-blur-2xl p-6 sm:p-8 border border-zen-stone/70 shadow-sm">
               <div className="flex items-center gap-5">
                  <div
                    className="w-14 h-14 rounded-[1.25rem] border flex items-center justify-center shadow-sm"
                    style={{
                      backgroundColor: `${primaryColor}15`,
                      borderColor: `${primaryColor}25`,
                      color: primaryColor
                    }}
                  >
                     <Sparkles size={24} />
                  </div>
                  <div>
                     <h4 className="font-serif text-2xl font-black text-zen-brown">Manual Verification</h4>
                     <p className="text-[10px] font-black uppercase tracking-[0.35em] mt-1.5" style={{ color: `${primaryColor}80` }}>Direct registry modification protocol</p>
                  </div>
               </div>

               <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                     <ZenDropdown
                        label="Select Specialist"
                        options={employees.map(e => e.name)} 
                        value={employees.find(e => e._id === manualFormData.employeeId)?.name || ''} 
                        onChange={(val) => setManualFormData({...manualFormData, employeeId: employees.find(e => e.name === val)?._id || ''})}
                        icon={User}
                     />
                  </div>
                  <ZenInput label="Record Date" type="date" icon={CalendarIcon} value={manualFormData.date} onChange={(e: any) => setManualFormData({...manualFormData, date: e.target.value})} />
                  <ZenDropdown label="Presence Status" options={['Present', 'Absent', 'Half Day', 'On Leave']} value={manualFormData.status} onChange={(val) => setManualFormData({...manualFormData, status: val})} icon={Shield} />
                  <ZenInput label="Clock In" placeholder="09:00 AM" icon={LogIn} value={manualFormData.checkIn} onChange={(e: any) => setManualFormData({...manualFormData, checkIn: e.target.value})} />
                  <ZenInput label="Clock Out" placeholder="06:00 PM" icon={LogOut} value={manualFormData.checkOut} onChange={(e: any) => setManualFormData({...manualFormData, checkOut: e.target.value})} />
               </div>
            </div>
         </form>
      </Modal>
    </ZenPageLayout>
  );
};

export default Attendance;
