import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { 
  Fingerprint, MapPin, ShieldCheck, Clock, History, 
  Sparkles, Zap, ArrowRight, CheckCircle2, AlertCircle,
  Activity, Calendar, UserCheck, Timer, Award, Landmark,
  ChevronLeft, ChevronRight, LayoutGrid, CalendarDays
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notify } from '../../components/shared/ZenNotification';
import { motion, AnimatePresence } from 'motion/react';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenStatCard } from '../../components/zen/ZenStatCard';
import { ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { ZenBadge } from '../../components/zen/ZenButtons';
import { Modal } from '../../components/shared/Modal';
import { ZenInput, ZenDropdown, ZenMonthPicker } from '../../components/zen/ZenInputs';
import { Send, FileText } from 'lucide-react';

interface RequestItem {
  _id: string;
  type: string;
  status: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  reason: string;
  createdAt: string;
  category: 'Leave' | 'Permission';
}

const StaffAttendance: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [punchLoading, setPunchLoading] = useState(false);
  const [myHistory, setMyHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({
    visitsToday: 0,
    weeklyTotal: 0,
    avgStay: '0h 0m',
    zenPoints: 0
  });
  const [viewMode, setViewMode] = useState<'portal' | 'calendar'>('portal');
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [employeeProfile, setEmployeeProfile] = useState<any>(null);
  const [assignedShift, setAssignedShift] = useState<any>(null);
  const [monthAttendance, setMonthAttendance] = useState<any[]>([]);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [myRequests, setMyRequests] = useState<RequestItem[]>([]);

  const [leaveData, setLeaveData] = useState({
    type: 'Sick Leave',
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    reason: ''
  });

  const [permissionData, setPermissionData] = useState({
    type: 'Late Entry',
    date: dayjs().format('YYYY-MM-DD'),
    time: dayjs().format('hh:mm A'),
    reason: ''
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchMyHistory(true), 
        fetchProfileAndShift(),
        fetchMyRequests()
      ]);
      setLoading(false);
    };
    init();
  }, []);

  const fetchMyRequests = async () => {
    try {
      const [leavesRes, permsRes] = await Promise.all([
        fetch(`${API_URL}/leaves`, { headers: { 'Authorization': `Bearer ${user?.token}` } }),
        fetch(`${API_URL}/permissions`, { headers: { 'Authorization': `Bearer ${user?.token}` } })
      ]);
      
      const leavesData = await leavesRes.json();
      const permsData = await permsRes.json();
      
      const combined = [
        ...(leavesData.data || leavesData).map((l: any) => ({ ...l, type: l.type, category: 'Leave' })),
        ...(permsData.data || permsData).map((p: any) => ({ ...p, type: p.type, category: 'Permission' }))
      ].sort((a, b) => dayjs(b.createdAt).diff(dayjs(a.createdAt)));
      
      setMyRequests(combined.slice(0, 5));
    } catch (err) {
      console.error('Request fetch failure', err);
    }
  };

  useEffect(() => {
    if (viewMode === 'calendar') {
      fetchMonthAttendance();
    }
  }, [viewMode, currentMonth]);

  const fetchMyHistory = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await fetch(`${API_URL}/attendance?limit=5`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const resData = await response.json();
      const data = resData.data || resData;

      if (Array.isArray(data)) {
        setMyHistory(data);
        const today = data.filter((a: any) => dayjs(a.date).isSame(dayjs(), 'day'));
        setStats({
          visitsToday: today.length,
          weeklyTotal: data.length,
          avgStay: '8h 12m',
          zenPoints: 450 + (data.length * 10)
        });
      }
    } catch (error) {
      if (!silent) notify('error', 'Sync Failed', 'Could not fetch history.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchProfileAndShift = async () => {
    try {
      // 1. Fetch employee profile to get assigned shift name
      const empRes = await fetch(`${API_URL}/employees?search=${user?.email}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const empData = await empRes.json();
      const profile = Array.isArray(empData.data) ? empData.data[0] : (empData[0] || null);
      
      if (profile) {
        setEmployeeProfile(profile);
        
        // 2. Fetch shift details if available
        if (profile.shift) {
          const shiftRes = await fetch(`${API_URL}/shifts`, {
            headers: { 'Authorization': `Bearer ${user?.token}` }
          });
          const shiftData = await shiftRes.json();
          const shifts = shiftData.data || shiftData;
          const matched = shifts.find((s: any) => s.name === profile.shift);
          setAssignedShift(matched);
        }
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
    }
  };

  const fetchMonthAttendance = async () => {
    try {
      const start = currentMonth.startOf('month').format('YYYY-MM-DD');
      const end = currentMonth.endOf('month').format('YYYY-MM-DD');
      
      const response = await fetch(`${API_URL}/attendance?startDate=${start}&endDate=${end}&limit=100`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const resData = await response.json();
      setMonthAttendance(resData.data || resData || []);
    } catch (error) {
      notify('error', 'History Error', 'Failed to synchronize monthly logs.');
    }
  };

  const todayRecord = myHistory.find(a => 
    dayjs(a.date).isSame(dayjs(), 'day') && 
    (a.user?._id === user?._id || a.user === user?._id)
  );

  const isCheckedOut = !!todayRecord && todayRecord.checkOut && todayRecord.checkOut !== '--';
  const isCheckedIn = !!todayRecord && todayRecord.checkIn && todayRecord.checkIn !== '--' && !isCheckedOut;

  const isTooEarly = (() => {
    if (loading || isCheckedIn || isCheckedOut || !assignedShift || !assignedShift.startTime) return false;
    
    try {
      const startTimeStr = assignedShift.startTime.trim(); // e.g. "12:20 AM"
      const match = startTimeStr.match(/^(\d+):(\d+)\s+(AM|PM)$/i);
      if (!match) return false;

      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const modifier = match[3].toUpperCase();

      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;

      const now = dayjs();
      const shiftStart = now.clone().hour(hours).minute(minutes).second(0).millisecond(0);
      
      // Allow check-in 5 mins before
      return now.isBefore(shiftStart.subtract(5, 'minute'));
    } catch (e) {
      return false;
    }
  })();

  const handleDigitalPunch = async () => {
    if (punchLoading) return;
    setPunchLoading(true);
    notify('info', 'Presence Verification', 'Acquiring sanctuary coordinates...');

    const performPunch = async (latitude?: number, longitude?: number) => {
      try {
        const payload = {
          date: dayjs().format('YYYY-MM-DD'),
          time: dayjs().format('hh:mm A'),
          latitude,
          longitude
        };

        const endpoint = isCheckedIn ? '/attendance/check-out' : '/attendance/check-in';
        const response = await fetch(`${API_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
          notify('success', isCheckedIn ? 'Ritual Concluded' : 'Ritual Commenced', 
            isCheckedIn ? 'You have successfully punched out.' : 'Your presence has been logged.');
          fetchMyHistory(true);
        } else {
          notify('error', 'Presence Denied', data.message || 'The sanctuary boundary rejected your verification.');
        }
      } catch (error) {
        notify('error', 'Sync Failure', 'Connection failed.');
      } finally {
        setPunchLoading(false);
      }
    };

    if (!navigator.geolocation) return performPunch();

    navigator.geolocation.getCurrentPosition(
      (position) => performPunch(position.coords.latitude, position.coords.longitude),
      () => performPunch(),
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const handleLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestLoading(true);
    try {
      const response = await fetch(`${API_URL}/leaves`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(leaveData)
      });
      if (response.ok) {
        notify('success', 'Leave Requested', 'Your ritual absence has been queued for approval.');
        setIsLeaveModalOpen(false);
        setLeaveData({ type: 'Sick Leave', startDate: dayjs().format('YYYY-MM-DD'), endDate: dayjs().format('YYYY-MM-DD'), reason: '' });
      } else {
        const error = await response.json();
        notify('error', 'Request Denied', error.message || 'Failed to submit leave.');
      }
    } catch (err) {
      notify('error', 'Link Failure', 'Could not transmit request to headquarters.');
    } finally {
      setRequestLoading(false);
    }
  };

  const handlePermissionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestLoading(true);
    try {
      const response = await fetch(`${API_URL}/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(permissionData)
      });
      if (response.ok) {
        notify('success', 'Permission Requested', 'Your schedule adjustment has been queued for approval.');
        setIsPermissionModalOpen(false);
        setPermissionData({ type: 'Late Entry', date: dayjs().format('YYYY-MM-DD'), time: dayjs().format('hh:mm A'), reason: '' });
      } else {
        const error = await response.json();
        notify('error', 'Request Denied', error.message || 'Failed to submit permission.');
      }
    } catch (err) {
      notify('error', 'Link Failure', 'Could not transmit request to headquarters.');
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <ZenPageLayout 
      hideSearch 
      hideBranchSelector 
      hideViewToggle
      topContent={
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6 px-2">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-zen-brown/5">
                <Landmark className="text-zen-brown/40" size={20} />
              </div>
              <span className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.25em]">Sanctuary Presence</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-light text-zen-brown tracking-tight">
              Presence <span className="font-serif italic text-zen-gold">Sanctuary</span>
            </h1>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-1 bg-white/80 backdrop-blur-xl p-1 rounded-2xl border border-white shadow-sm w-full sm:w-auto justify-center">
              <button
                onClick={() => setViewMode('portal')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  viewMode === 'portal' ? 'bg-zen-brown text-white shadow-md' : 'text-zen-brown/40 hover:bg-white'
                }`}
              >
                <LayoutGrid size={14} />
                Portal
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  viewMode === 'calendar' ? 'bg-zen-brown text-white shadow-md' : 'text-zen-brown/40 hover:bg-white'
                }`}
              >
                <CalendarDays size={14} />
                Insights
              </button>
            </div>

            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xl p-2 rounded-2xl border border-white shadow-sm w-full sm:w-auto">
              <div className="flex-1 px-3 py-1 text-center sm:text-right border-r border-zen-brown/10">
                <div className="text-[8px] font-bold text-zen-brown/30 uppercase tracking-widest mb-1">Local Time</div>
                <div className="text-sm font-serif font-black text-zen-brown leading-none">{dayjs().format('hh:mm A')}</div>
              </div>
              <div className="flex-1 px-3 py-1 text-center sm:text-left">
                <div className="text-[8px] font-bold text-zen-brown/30 uppercase tracking-widest mb-1">Staff Account</div>
                <div className="text-sm font-bold text-zen-brown leading-none truncate max-w-[80px] sm:max-w-none">{user?.name}</div>
              </div>
            </div>
          </motion.div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative px-2">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-zen-gold/5 blur-[100px] rounded-full -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-zen-sand/5 blur-[120px] rounded-full -z-10" />

        <div className="lg:col-span-8 space-y-8">
          {viewMode === 'portal' ? (
            <>
              {/* Main Action Stage */}
              <motion.div 
                key="portal-stage"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`relative overflow-hidden p-8 md:p-12 rounded-[3rem] border border-white shadow-2xl transition-all duration-1000 group ${
                  isCheckedIn 
                    ? 'bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/30' 
                    : 'bg-gradient-to-br from-zen-gold/5 via-white to-zen-gold/10'
                }`}
              >
                {/* Grain Overlay */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                
                <AnimatePresence>
                  {!isCheckedIn && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {[1, 2, 3].map((i) => (
                        <motion.div 
                          key={i} 
                          animate={{ scale: [1, 1.5, 2], opacity: [0.2, 0.05, 0] }} 
                          transition={{ duration: 4, repeat: Infinity, delay: i * 1.2 }} 
                          className="absolute w-64 h-64 border border-zen-gold/20 rounded-full" 
                        />
                      ))}
                    </div>
                  )}
                </AnimatePresence>

                <div className="relative z-10 flex flex-col items-center text-center">
                  <motion.div 
                    animate={isCheckedIn ? {} : { y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className={`w-32 h-32 rounded-full mb-10 flex items-center justify-center bg-white shadow-2xl border-4 transition-all duration-700 relative ${
                      isCheckedIn ? 'text-emerald-500 border-emerald-100' : 'text-zen-gold border-zen-gold/20'
                    }`}
                  >
                    {/* Outer Ring */}
                    <div className={`absolute inset-[-10px] rounded-full border border-dashed animate-spin-slow ${isCheckedIn ? 'border-emerald-200' : 'border-zen-gold/30'}`} />
                    
                    <AnimatePresence mode="wait">
                      {isCheckedIn ? (
                        <motion.div key="check" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 180 }} transition={{ type: "spring", stiffness: 200 }}>
                          <ShieldCheck size={56} strokeWidth={1.5} />
                        </motion.div>
                      ) : (
                        <motion.div key="finger" initial={{ scale: 0, rotate: 180 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: -180 }} className="relative">
                          <Fingerprint size={56} strokeWidth={1.5} />
                          <motion.div 
                            animate={{ opacity: [0, 1, 0], y: [-20, 20, -20] }} 
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 bg-gradient-to-b from-transparent via-zen-gold/20 to-transparent w-full h-[2px] top-1/2"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  <h2 className="text-4xl md:text-5xl font-serif font-black text-zen-brown mb-4 tracking-tight">
                    {isCheckedIn ? 'Ritual Active' : 'Begin Your Ritual'}
                  </h2>
                  <p className="text-zen-brown/50 text-sm max-w-[340px] mb-12 font-medium leading-relaxed">
                    {isCheckedOut 
                      ? "Your ritual for today has concluded. Peace be with you."
                      : isTooEarly 
                        ? `Check-in for ${assignedShift?.name} starts at ${dayjs(`${dayjs().format('YYYY-MM-DD')} ${assignedShift?.startTime}`, 'YYYY-MM-DD hh:mm A').subtract(5, 'minute').format('hh:mm A')}.`
                        : isCheckedIn 
                          ? `Authenticated since ${todayRecord.checkIn}. Your energy is synchronized with the sanctuary.` 
                          : 'Establish your presence by verifying your spatial coordinates within the sanctuary boundaries.'}
                  </p>

                  <AnimatePresence mode="wait">
                    {isCheckedOut || isTooEarly ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-zen-brown/5 border border-zen-brown/10 px-8 py-4 rounded-2xl flex items-center gap-3"
                      >
                        {isCheckedOut ? <CheckCircle2 className="text-emerald-500" size={20} /> : <Clock className="text-zen-gold" size={20} />}
                        <span className="text-xs font-bold text-zen-brown uppercase tracking-widest">
                          {isCheckedOut ? 'Attendance Completed' : 'Awaiting Shift Window'}
                        </span>
                      </motion.div>
                    ) : (
                      <ZenButton
                        onClick={handleDigitalPunch}
                        disabled={punchLoading}
                        variant={isCheckedIn ? 'secondary' : 'primary'}
                        className={`h-16 px-12 text-sm !rounded-full shadow-xl transition-all duration-500 group overflow-hidden ${isCheckedIn ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-zen-brown/5' : ''}`}
                      >
                        <div className="relative z-10 flex items-center gap-4">
                          {punchLoading ? <Zap className="animate-spin" size={20} /> : (isCheckedIn ? <Clock size={20} /> : <Fingerprint size={20} />)}
                          <span>
                            {punchLoading ? 'Verifying Coordinates...' : 
                             isCheckedIn ? 'Ritual Check Out' : 'Ritual Check In'}
                          </span>
                          <ArrowRight className="group-hover:translate-x-1 transition-transform" size={16} />
                        </div>
                        {!isCheckedIn && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        )}
                      </ZenButton>
                    )}
                  </AnimatePresence>

                  <div className="mt-12 flex items-center justify-center gap-8 md:gap-12">
                    <div className="flex flex-col items-center gap-2 group cursor-help">
                      <div className={`p-3 rounded-xl transition-colors ${isCheckedIn ? 'bg-emerald-50 text-emerald-500' : 'bg-zen-brown/5 text-zen-brown/20'}`}>
                        <MapPin size={18} />
                      </div>
                      <span className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-[0.2em]">Geofence</span>
                    </div>
                    <div className="w-[1px] h-8 bg-zen-brown/10" />
                    <div className="flex flex-col items-center gap-2 group cursor-help">
                      <div className="p-3 rounded-xl bg-zen-brown/5 text-zen-brown/20 group-hover:text-zen-sand transition-colors">
                        <Activity size={18} />
                      </div>
                      <span className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-[0.2em]">Live Sync</span>
                    </div>
                    <div className="w-[1px] h-8 bg-zen-brown/10" />
                    <div className="flex flex-col items-center gap-2 group cursor-help">
                      <div className="p-3 rounded-xl bg-zen-brown/5 text-zen-brown/20 group-hover:text-zen-gold transition-colors">
                        <ShieldCheck size={18} />
                      </div>
                      <span className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-[0.2em]">Secure</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                <ZenStatCard 
                  label="Visits Today" 
                  value={stats.visitsToday} 
                  icon={UserCheck} 
                  color="text-emerald-500" 
                  bg="bg-emerald-50" 
                  glow="bg-emerald-200" 
                  delay={0.1}
                />
                <ZenStatCard 
                  label="Weekly Rituals" 
                  value={stats.weeklyTotal} 
                  icon={Calendar} 
                  color="text-zen-sand" 
                  bg="bg-zen-sand/5" 
                  glow="bg-zen-sand/20" 
                  delay={0.2}
                />
                <ZenStatCard 
                  label="Active Duration" 
                  value={stats.avgStay} 
                  icon={Timer} 
                  color="text-amber-500" 
                  bg="bg-amber-50" 
                  glow="bg-amber-200" 
                  delay={0.3}
                  trend="+12% quality"
                />
                <ZenStatCard 
                  label="Zen Mastery" 
                  value={stats.zenPoints} 
                  icon={Award} 
                  color="text-zen-gold" 
                  bg="bg-zen-gold/5" 
                  glow="bg-zen-gold/20" 
                  delay={0.4}
                  trend="Gold Status"
                />
              </div>
            </>
          ) : (
            <motion.div 
              key="calendar-view"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/60 backdrop-blur-2xl rounded-[2rem] md:rounded-[3rem] border border-white p-4 md:p-8 shadow-xl"
            >
              <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                <div className="text-center sm:text-left">
                  <h3 className="text-xl md:text-2xl font-serif font-black text-zen-brown tracking-tight">Monthly Insights</h3>
                  <p className="text-[8px] md:text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em]">Temporal Presence Registry</p>
                </div>
                <ZenMonthPicker
                  label="Select Month"
                  value={currentMonth.format('YYYY-MM')}
                  onChange={(val: string) => setCurrentMonth(dayjs(val + '-01'))}
                  variant="pill"
                  hideLabel
                  className="w-[180px]"
                />
              </div>

              <div className="grid grid-cols-7 gap-1 md:gap-4">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                  <div key={day} className="text-center py-2 text-[8px] md:text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest">{day}</div>
                ))}

                {(() => {
                  const daysInMonth = currentMonth.daysInMonth();
                  const startDay = currentMonth.startOf('month').day();
                  // Derive shift name: prefer assignedShift, fallback to any record in month that has a shift
                  const effectiveShiftName = assignedShift?.name ||
                    monthAttendance.find((r: any) => r.shift && r.shift !== 'None')?.shift || null;
                  const days = [];

                  // Empty slots before first day
                  for (let i = 0; i < startDay; i++) {
                    days.push(<div key={`empty-${i}`} className="h-16 md:h-32 rounded-[0.75rem] md:rounded-[1.5rem] bg-zen-brown/[0.02]" />);
                  }

                  // Day slots
                  for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = currentMonth.date(d).format('YYYY-MM-DD');
                    const record = monthAttendance.find(r => r.date === dateStr);
                    const isToday = currentMonth.date(d).isSame(dayjs(), 'day');
                    
                    days.push(
                      <div 
                        key={d} 
                        className={`h-24 md:h-32 p-2 md:p-3 rounded-[0.75rem] md:rounded-[1.5rem] border transition-all duration-500 relative group overflow-hidden ${
                          isToday 
                            ? 'bg-zen-gold/5 border-zen-gold/30 shadow-lg shadow-zen-gold/5' 
                            : 'bg-white/40 border-zen-brown/5 hover:border-zen-gold/20 hover:bg-white hover:shadow-xl'
                        }`}
                      >
                        <span className={`text-[10px] md:text-[11px] font-serif font-black ${isToday ? 'text-zen-gold' : 'text-zen-brown/30 group-hover:text-zen-brown'}`}>{d}</span>
                        
                        {record ? (
                          <div className="mt-1 md:mt-2 space-y-1 md:space-y-1.5">
                            <div className="flex items-center gap-1 md:gap-1.5">
                              <div className={`w-1 md:w-1.5 h-1 md:h-1.5 rounded-full ${
                                record.status === 'Present' ? 'bg-emerald-400' : 'bg-red-400'
                              }`} />
                              <span className="text-[7px] md:text-[9px] font-bold text-zen-brown uppercase tracking-widest leading-none truncate">{record.status}</span>
                            </div>
                            
                            <div className="flex flex-col gap-0.5 md:gap-1">
                              <div className="flex items-center gap-1 md:gap-1.5 text-[7px] md:text-[9px] font-medium text-zen-brown/50">
                                <Clock size={8} className="md:hidden text-zen-brown/20" />
                                <Clock size={10} className="hidden md:block text-zen-brown/20" />
                                <span className="truncate">{record.checkIn}–{record.checkOut || '...'}</span>
                              </div>
                              {(() => {
                                const shiftLabel = (record.shift && record.shift !== 'None')
                                  ? record.shift
                                  : assignedShift?.name;
                                return shiftLabel ? (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-violet-500/10 border border-violet-400/20 text-[6px] md:text-[8px] font-black text-violet-600 uppercase tracking-wider truncate max-w-full">
                                      <Zap size={7} className="shrink-0 fill-violet-500 text-violet-500" />
                                      {shiftLabel}
                                    </span>
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        ) : (
                          effectiveShiftName && (
                            <div className="absolute bottom-2 md:bottom-2.5 left-2 md:left-2.5 right-2 md:right-2.5">
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-violet-500/10 border border-violet-400/20 text-[6px] md:text-[7px] font-black text-violet-400 uppercase tracking-wider truncate max-w-full">
                                <Zap size={6} className="shrink-0" />
                                {effectiveShiftName}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    );
                  }
                  return days;
                })()}
              </div>

              {assignedShift && (
                <div className="mt-6 md:mt-10 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] bg-zen-brown/5 border border-zen-brown/5 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                   <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                     <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white flex items-center justify-center text-zen-gold shadow-sm">
                        <Timer size={20} className="md:hidden" />
                        <Timer size={24} className="hidden md:block" />
                     </div>
                     <div>
                       <h4 className="text-xs md:text-sm font-serif font-black text-zen-brown">Default Protocol</h4>
                       <p className="text-[8px] md:text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.2em]">{assignedShift.name}</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-6 md:gap-8 justify-center w-full md:w-auto">
                     <div className="text-center">
                        <p className="text-[8px] md:text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest mb-1">Start</p>
                        <p className="text-sm md:text-lg font-serif font-black text-zen-brown">{assignedShift.startTime}</p>
                     </div>
                     <div className="w-[1px] h-8 md:h-10 bg-zen-brown/10" />
                     <div className="text-center">
                        <p className="text-[8px] md:text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest mb-1">End</p>
                        <p className="text-sm md:text-lg font-serif font-black text-zen-brown">{assignedShift.endTime}</p>
                     </div>
                   </div>
                   <ZenBadge variant="leaf" className="w-full md:w-auto">Active Profile</ZenBadge>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* History Sidebar */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ delay: 0.3 }} 
          className="lg:col-span-4 h-full"
        >
          <div className="bg-white/60 backdrop-blur-2xl rounded-[3rem] border border-white p-8 shadow-xl flex flex-col h-full sticky top-8 overflow-hidden min-h-[600px]">
            {/* Grain */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            
            <div className="flex items-center justify-between mb-10 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zen-brown/5 flex items-center justify-center">
                  <History size={18} className="text-zen-brown/40" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-zen-brown tracking-tight">Recent Rituals</h3>
                  <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest">History Log</p>
                </div>
              </div>
              <Sparkles className="text-zen-gold/40 animate-pulse" size={20} />
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <div key={i} className="h-20 bg-zen-brown/5 rounded-[1.5rem] animate-pulse" />
                ))
              ) : myHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-zen-brown/5 flex items-center justify-center mb-4">
                    <Activity size={24} className="text-zen-brown/20" />
                  </div>
                  <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-zen-brown/30">No Sanctuary History</p>
                </div>
              ) : (
                myHistory.slice(0, 5).map((record, idx) => (
                  <motion.div 
                    key={record._id} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.4 + idx * 0.05 }} 
                    className="group bg-white hover:bg-zen-cream/50 transition-all p-5 rounded-[1.5rem] border border-zen-stone/50 hover:border-zen-gold/20 hover:shadow-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                        record.status === 'Present' ? 'bg-emerald-50 text-emerald-500 shadow-sm shadow-emerald-500/10' : 'bg-red-50 text-red-500'
                      }`}>
                        {record.status === 'Present' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                      </div>
                      <div>
                        <div className="text-xs font-black text-zen-brown flex items-center gap-2">
                          {dayjs(record.date).format('MMM DD, YYYY')}
                          {idx === 0 && dayjs(record.date).isSame(dayjs(), 'day') && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          )}
                        </div>
                        <div className="text-[10px] text-zen-brown/40 font-bold uppercase tracking-widest mt-1">
                          {record.checkIn} <span className="mx-1 text-zen-brown/10">|</span> {record.checkOut || 'Active'}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="text-zen-brown/10 group-hover:text-zen-gold group-hover:translate-x-1 transition-all" size={14} />
                  </motion.div>
                ))
              )}
            </div>

            {/* Administrative Actions */}
            <div className="mt-8 pt-8 border-t border-zen-brown/10 relative z-10">
              <h3 className="font-serif font-black text-zen-brown tracking-tight mb-6 px-1 flex items-center justify-between">
                <span>Administrative Rituals</span>
                {myRequests.length > 0 && <span className="text-[8px] font-bold text-zen-gold bg-zen-gold/10 px-2 py-1 rounded-full uppercase tracking-tighter">Live Status</span>}
              </h3>
              
              {/* Active Requests List */}
              {myRequests.length > 0 && (
                <div className="space-y-3 mb-8">
                  {myRequests.map((req) => (
                    <div key={req._id} className="flex items-center justify-between p-3 rounded-2xl bg-white border border-zen-brown/5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          req.category === 'Leave' ? 'bg-zen-sand/10 text-zen-sand' : 'bg-zen-gold/10 text-zen-gold'
                        }`}>
                          {req.category === 'Leave' ? <FileText size={14} /> : <Zap size={14} />}
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-zen-brown tracking-tight">{req.type}</p>
                          <p className="text-[8px] font-bold text-zen-brown/30 uppercase tracking-widest">{req.startDate || req.date}</p>
                        </div>
                      </div>
                      <ZenBadge variant={
                        req.status === 'Approved' ? 'success' : 
                        req.status === 'Rejected' ? 'error' : 'warning'
                      } className="scale-75 origin-right">
                        {req.status}
                      </ZenBadge>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setIsLeaveModalOpen(true)}
                  className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-zen-sand/5 border border-zen-sand/20 hover:bg-zen-sand/10 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-zen-sand shadow-sm group-hover:scale-110 transition-transform">
                    <FileText size={18} />
                  </div>
                  <span className="text-[10px] font-bold text-zen-brown/60 uppercase tracking-widest text-center leading-tight">Request Leave</span>
                </button>
                <button 
                  onClick={() => setIsPermissionModalOpen(true)}
                  className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-zen-gold/5 border border-zen-gold/20 hover:bg-zen-gold/10 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-zen-gold shadow-sm group-hover:scale-110 transition-transform">
                    <Zap size={18} />
                  </div>
                  <span className="text-[10px] font-bold text-zen-brown/60 uppercase tracking-widest text-center leading-tight">Late/Early Entry</span>
                </button>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-zen-brown/5 relative z-10">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="flex flex-col gap-4 p-5 bg-gradient-to-br from-zen-gold/10 to-zen-gold/5 rounded-[1.5rem] border border-zen-gold/20 relative overflow-hidden"
              >
                <div className="absolute top-[-20px] right-[-20px] w-20 h-20 bg-white/40 blur-2xl rounded-full" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zen-gold/20 flex items-center justify-center text-zen-gold shadow-sm"><Sparkles size={16} /></div>
                  <h4 className="text-[10px] font-black text-zen-gold uppercase tracking-[0.2em]">Master Insight</h4>
                </div>
                <p className="text-[11px] font-medium text-zen-brown/70 leading-relaxed italic">
                  "True presence is not just being here, but being here entirely."
                </p>
                <p className="text-[9px] font-bold text-zen-gold/60 uppercase tracking-widest text-right">
                  Zen Master Goal: 20 Rituals
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Leave Request Modal */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        maxWidth="max-w-xl"
        title="Ritual Absence Request"
        subtitle="Administrative Absence Protocol"
        headerIcon={FileText}
        footer={
          <div className="flex gap-4 w-full">
            <ZenButton variant="secondary" className="flex-1" onClick={() => setIsLeaveModalOpen(false)} type="button">Cancel</ZenButton>
            <ZenButton className="flex-1" type="submit" form="leave-form" disabled={requestLoading}>
              {requestLoading ? 'Transmitting...' : 'Submit Request'}
            </ZenButton>
          </div>
        }
      >
        <form id="leave-form" onSubmit={handleLeaveRequest} className="space-y-6">
          <ZenDropdown
            label="Type of Absence"
            options={['Sick Leave', 'Casual Leave', 'Vacation', 'Emergency']}
            value={leaveData.type}
            onChange={(val) => setLeaveData({ ...leaveData, type: val })}
          />
          <div className="grid grid-cols-2 gap-4">
            <ZenInput
              label="Start Date"
              type="date"
              value={leaveData.startDate}
              onChange={(e: any) => setLeaveData({ ...leaveData, startDate: e.target.value })}
            />
            <ZenInput
              label="End Date"
              type="date"
              value={leaveData.endDate}
              onChange={(e: any) => setLeaveData({ ...leaveData, endDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-zen-brown/40 uppercase tracking-widest ml-1">Reason for Absence</label>
            <textarea 
              className="w-full h-32 bg-zen-brown/[0.03] border border-zen-brown/10 rounded-2xl p-4 text-sm text-zen-brown focus:outline-none focus:border-zen-sand/40 transition-colors resize-none font-medium"
              placeholder="Explain the nature of your temporal absence..."
              value={leaveData.reason}
              onChange={(e) => setLeaveData({ ...leaveData, reason: e.target.value })}
              required
            />
          </div>
        </form>
      </Modal>

      {/* Permission Request Modal */}
      <Modal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
        maxWidth="max-w-xl"
        title="Schedule Adjustment"
        subtitle="Temporal Presence Exception"
        headerIcon={Zap}
        footer={
          <div className="flex gap-4 w-full">
            <ZenButton variant="secondary" className="flex-1" onClick={() => setIsPermissionModalOpen(false)} type="button">Cancel</ZenButton>
            <ZenButton className="flex-1" type="submit" form="permission-form" disabled={requestLoading}>
              {requestLoading ? 'Transmitting...' : 'Submit Request'}
            </ZenButton>
          </div>
        }
      >
        <form id="permission-form" onSubmit={handlePermissionRequest} className="space-y-6">
          <ZenDropdown
            label="Adjustment Type"
            options={['Late Entry', 'Early Exit', 'Short Break']}
            value={permissionData.type}
            onChange={(val) => setPermissionData({ ...permissionData, type: val })}
          />
          <div className="grid grid-cols-2 gap-4">
            <ZenInput
              label="Effective Date"
              type="date"
              value={permissionData.date}
              onChange={(e: any) => setPermissionData({ ...permissionData, date: e.target.value })}
            />
            <ZenInput
              label="Effective Time"
              type="text"
              placeholder="e.g. 10:30 AM"
              value={permissionData.time}
              onChange={(e: any) => setPermissionData({ ...permissionData, time: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-zen-brown/40 uppercase tracking-widest ml-1">Adjustment Reason</label>
            <textarea 
              className="w-full h-32 bg-zen-brown/[0.03] border border-zen-brown/10 rounded-2xl p-4 text-sm text-zen-brown focus:outline-none focus:border-zen-gold/40 transition-colors resize-none font-medium"
              placeholder="Explain why your presence requires adjustment..."
              value={permissionData.reason}
              onChange={(e) => setPermissionData({ ...permissionData, reason: e.target.value })}
              required
            />
          </div>
        </form>
      </Modal>
    </ZenPageLayout>
  );
};

export default StaffAttendance;
