import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Plus, ChevronLeft, ChevronRight, Edit2, Trash2, Calendar, 
  Sparkles, X, User as UserIcon, Search, MapPin
} from 'lucide-react';
import { Modal } from '../../components/shared/Modal';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { notify } from '../../components/shared/ZenNotification';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { ZenButton, ZenBadge, ZenIconButton } from '../../components/zen/ZenButtons';
import { ZenAutocomplete, ZenDatePicker, ZenDropdown } from '../../components/zen/ZenInputs';
import { useBranches } from '../../context/BranchContext';
import { useSettings } from '../../context/SettingsContext';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

interface Appointment {
  _id: string;
  client: string;
  service: string;
  employee: string;
  date: string;
  time: string;
  room?: string;
  branch?: any;
}

const Appointments = () => {
  const { user } = useAuth();
  const { selectedBranch, branches } = useBranches();
  const { settings } = useSettings();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [aptToDelete, setAptToDelete] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [viewType, setViewType] = useState<'Day' | 'Week' | 'Month'>('Day');
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('zen_appointment_view') as 'grid' | 'table') || 'grid';
  });

  // Raw data from backend
  const [rawClients, setRawClients] = useState<any[]>([]);
  const [rawServices, setRawServices] = useState<any[]>([]);
  const [rawStaff, setRawStaff] = useState<any[]>([]);
  const [rawShifts, setRawShifts] = useState<any[]>([]);
  const [rawRooms, setRawRooms] = useState<any[]>([]);
  const [rawAttendance, setRawAttendance] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    client: '',
    service: '',
    employee: '',
    room: '',
    time: '',
    membershipId: '',
    bookingType: 'Normal',
    date: dayjs().format('YYYY-MM-DD'),
    branch: (user as any)?.branch?._id || (user as any)?.branch || ''
  });

  const activeMemberships = useMemo(() => {
    if (!formData.client || formData.client === 'None') return [];
    const client = rawClients.find(c => c.name === formData.client);
    return (client?.memberships || []).filter((m: any) => m.status === 'Active' && m.remainingSessions > 0);
  }, [formData.client, rawClients]);

  const serviceOptions = useMemo(() => {
    // If a membership is selected, show EXACTLY its covered services
    if (formData.membershipId) {
      const selectedMembership = activeMemberships.find((m: any) => 
        (m._id || m).toString() === formData.membershipId.toString()
      );
      
      const apps = selectedMembership?.plan?.applicableServices || [];
      if (apps.length > 0) {
        // Extract IDs regardless of whether apps is populated or just an array of IDs
        const appIds = apps.map((s: any) => (s._id || s).toString());
        
        // Find matching services from rawServices to get their names
        const matched = rawServices.filter(s => appIds.includes(s._id.toString()));
        if (matched.length > 0) {
          return ['None', ...matched.map(s => s.name)];
        }
      }
    }

    // Default: Show all active services for the current branch
    let filtered = rawServices.filter(s => {
      const matchesBranch = !formData.branch || s.branch === formData.branch || s.branch?._id === formData.branch;
      return s.status === 'Active' && matchesBranch;
    });

    return ['None', ...filtered.map(s => s.name)];
  }, [rawServices, formData.branch, formData.membershipId, activeMemberships]);

  // Watch for membership changes and reset service if it's no longer valid
  useEffect(() => {
    if (formData.service && formData.service !== 'None' && !serviceOptions.includes(formData.service)) {
       setFormData(prev => ({ ...prev, service: '' }));
    }
  }, [formData.membershipId, serviceOptions]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [page]);

  useEffect(() => {
    localStorage.setItem('zen_appointment_view', viewMode);
    setPage(1);
  }, [viewMode]);

  const PAGE_LIMIT = 12;

  const fetchAppointments = async () => {
    try {
      const authHeader = { 'Authorization': `Bearer ${user?.token}` };
      const res = await fetch(`${API_URL}/appointments?page=${page}&limit=${PAGE_LIMIT}`, { headers: authHeader });
      const data = await res.json();
      if (data.data) {
        setAppointments(data.data);
        setTotalPages(data.pagination.pages);
      } else if (Array.isArray(data)) {
        setAppointments(data);
        setTotalPages(1);
      }
    } catch (error) {
       console.error('Appointments fetch error:', error);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const authHeader = { 'Authorization': `Bearer ${user?.token}` };
      
      const [aptRes, clientRes, serviceRes, staffRes, shiftRes, roomRes, presenceRes] = await Promise.all([
        fetch(`${API_URL}/appointments?page=${page}&limit=${PAGE_LIMIT}`, { headers: authHeader }),
        fetch(`${API_URL}/clients`, { headers: authHeader }),
        fetch(`${API_URL}/services`, { headers: authHeader }),
        fetch(`${API_URL}/employees`, { headers: authHeader }),
        fetch(`${API_URL}/shifts`, { headers: authHeader }),
        fetch(`${API_URL}/rooms`, { headers: authHeader }),
        fetch(`${API_URL}/attendance`, { headers: authHeader })
      ]);

      const [aptsData, clients, services, staff, shifts, rooms, presence] = await Promise.all([
        aptRes.json(), clientRes.json(), serviceRes.json(), staffRes.json(), shiftRes.json(), roomRes.json(), presenceRes.json()
      ]);

      if (aptsData.data) {
        setAppointments(aptsData.data);
        setTotalPages(aptsData.pagination.pages);
      } else if (Array.isArray(aptsData)) {
        setAppointments(aptsData);
        setTotalPages(1);
      }
      if (Array.isArray(clients)) setRawClients(clients);
      if (Array.isArray(services)) setRawServices(services);
      if (Array.isArray(staff)) setRawStaff(staff);
      if (Array.isArray(shifts)) setRawShifts(shifts);
      if (Array.isArray(rooms)) setRawRooms(rooms);
      if (Array.isArray(presence)) setRawAttendance(presence);
    } catch (error) {
      console.error('Data sync error:', error);
      notify('error', 'Error', 'Failed to synchronize data');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    await fetchAllData();
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      if (!apt) return false;
      
      const matchesDate = apt.date ? dayjs(apt.date).isSame(selectedDate, viewType.toLowerCase() as any) : false;
      const matchesSearch = (apt.client || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (apt.service || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesDate || !matchesSearch) return false;
      if (user?.role === 'Admin' || user?.role === 'Manager') return true;
      if (user?.role === 'Employee') return apt.employee === user.name;
      if (user?.role === 'Client') return apt.client === user.name;
      return false;
    });
  }, [appointments, selectedDate, viewType, searchTerm, user]);

  const clientSearchOptions = useMemo(() => {
     return rawClients
       .filter(c => c.status === 'Active')
       .map(c => ({
         id: c.name,
         name: c.name,
         email: c.email || c.phone || 'Registry Member'
       }));
  }, [rawClients]);

  const branchOptions = useMemo(() => {
    return ['None', ...branches.filter(b => b.isActive).map(b => b.name)];
  }, [branches]);

  const staffOptions = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD');
    const now = dayjs();

    return ['None', ...rawStaff.filter(e => {
      const matchesBranch = !formData.branch || e.branch === formData.branch || e.branch?._id === formData.branch;
      if (e.status !== 'Active' || !matchesBranch) return false;

      // Filter: Shift Over / Sign-off / Logout (Only if booking for today)
      if (formData.date === today) {
        // 1. Shift Over check
        if (e.shift) {
          const shiftDetail = rawShifts.find(s => s.name === e.shift);
          if (shiftDetail && shiftDetail.endTime) {
            const shiftEnd = dayjs(`${today} ${shiftDetail.endTime}`, 'YYYY-MM-DD hh:mm A');
            if (now.isAfter(shiftEnd.add(15, 'minute'))) return false; // 15min grace period
          }
        }

        // 2. Attendance / Sign-off check
        const record = rawAttendance.find(r => r.date === today && (r.user === e._id || r.employeeName === e.name));
        if (record) {
          // If they have checked out (even if manually entered), they are off duty
          if (record.checkOut && record.checkOut !== '--') return false;
        } else {
          // Optional: If they haven't clocked in yet, they might not be available
          // But we'll allow it unless the user specifically wants to hide non-clocked specialists
        }
      }

      return true;
    }).map(e => e.name)];
  }, [rawStaff, formData.branch, formData.date, rawAttendance, rawShifts]);

  const roomOptions = useMemo(() => {
    return ['None', ...rawRooms.filter(r => {
      const matchesBranch = !formData.branch || r.branch === formData.branch || r.branch?._id === formData.branch;
      return r.isActive && matchesBranch;
    }).map(r => r.name)];
  }, [rawRooms, formData.branch]);

  const availableSlots = useMemo(() => {
    if (!formData.date || !formData.employee || formData.employee === 'None' || !formData.room || formData.room === 'None') return [];
    
    const employee = rawStaff.find(e => e.name === formData.employee);
    if (!employee || !employee.shift) return [];
    
    const shift = rawShifts.find(s => s.name === employee.shift);
    if (!shift || !shift.startTime || !shift.endTime) return [];
    
    let start = dayjs(`${formData.date} ${shift.startTime}`, 'YYYY-MM-DD hh:mm A');
    let end = dayjs(`${formData.date} ${shift.endTime}`, 'YYYY-MM-DD hh:mm A');
    
    if (end.isBefore(start)) end = end.add(1, 'day');

    const selectedService = rawServices.find(s => s.name === formData.service);
    const serviceDuration = selectedService?.duration || 60;

    const selectedRoom = rawRooms.find(r => r.name === formData.room);
    const roomCleaningDuration = selectedRoom?.cleaningDuration || 0;
    const totalRoomOccupancy = serviceDuration + roomCleaningDuration;

    const slots = [];
    let current = start;
    
    const employeeApts = appointments.filter(a => a.employee === formData.employee && a.date === formData.date);
    const roomApts = appointments.filter(a => a.room === formData.room && a.date === formData.date);

    const now = dayjs();
    const isToday = dayjs(formData.date).isSame(now, 'day');

    while (current.isBefore(end)) {
      const slotEnd = current.add(serviceDuration, 'minute');
      const roomOccupancyEnd = current.add(totalRoomOccupancy, 'minute');
      
      if (slotEnd.isAfter(end)) break;
      
      // Check Past Time
      const isPastTime = isToday && current.isBefore(now);

      // Check Therapist Availability
      const isTherapistBooked = employeeApts.some(apt => {
        if (editingApt && apt._id === editingApt._id) return false;
        const aptStart = dayjs(`${apt.date} ${apt.time}`, 'YYYY-MM-DD HH:mm');
        const aptService = rawServices.find(s => s.name === apt.service);
        const aptDuration = aptService?.duration || 60;
        const aptEnd = aptStart.add(aptDuration, 'minute');
        return (current.isBefore(aptEnd) && slotEnd.isAfter(aptStart));
      });

      // Check Room Availability
      const isRoomBooked = roomApts.some(apt => {
        if (editingApt && apt._id === editingApt._id) return false;
        const aptStart = dayjs(`${apt.date} ${apt.time}`, 'YYYY-MM-DD HH:mm');
        const aptService = rawServices.find(s => s.name === apt.service);
        const aptDuration = aptService?.duration || 60;
        
        const aptRoom = rawRooms.find(r => r.name === apt.room);
        const aptRoomCleaning = aptRoom?.cleaningDuration || 0;
        const aptTotalOccupancy = aptDuration + aptRoomCleaning;
        
        const aptEnd = aptStart.add(aptTotalOccupancy, 'minute');
        return (current.isBefore(aptEnd) && roomOccupancyEnd.isAfter(aptStart));
      });
      
      slots.push({
        time: current.format('HH:mm'),
        display: current.format('hh:mm A'),
        isBooked: isTherapistBooked || isRoomBooked || isPastTime
      });
      
      current = current.add(30, 'minute');
    }
    
    return slots;
  }, [formData.date, formData.employee, formData.service, formData.room, rawStaff, rawShifts, appointments, rawServices, rawRooms, editingApt]);

  const handleOpenModal = (apt: Appointment | null = null) => {
    if (apt) {
      setEditingApt(apt);
      setFormData({
        client: apt.client,
        service: apt.service,
        employee: apt.employee,
        room: apt.room || '',
        time: apt.time,
        date: apt.date,
        membershipId: '',
        bookingType: 'Normal',
        branch: apt.branch?._id || apt.branch || ''
      });
    } else {
      setEditingApt(null);
      setFormData({
        client: user?.role === 'Client' ? user.name : '',
        service: '',
        employee: '',
        room: '',
        time: '',
        membershipId: '',
        bookingType: 'Normal',
        date: selectedDate.format('YYYY-MM-DD'),
        branch: (user as any)?.branch?._id || (user as any)?.branch || ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingApt ? `${API_URL}/appointments/${editingApt._id}` : `${API_URL}/appointments`;
      const method = editingApt ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}` 
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        notify('success', 'Acknowledged', editingApt ? 'Session updated' : 'New session scheduled');
        setIsModalOpen(false);
        fetchData();
      } else {
        const error = await response.json();
        notify('error', 'Error', error.message || 'Action failed');
      }
    } catch (error) {
      notify('error', 'Error', 'Connection failed');
    }
  };

  const executeDelete = async () => {
    if (!aptToDelete) return;
    try {
      const response = await fetch(`${API_URL}/appointments/${aptToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (response.ok) {
        notify('success', 'Removed', 'Appointment archived');
        setIsConfirmOpen(false);
        fetchData();
      }
    } catch (error) {
      notify('error', 'Error', 'Action failed');
    }
  };

  const handlePrev = () => setSelectedDate(prev => prev.subtract(1, viewType.toLowerCase() as any));
  const handleNext = () => setSelectedDate(prev => prev.add(1, viewType.toLowerCase() as any));

  const getDateDisplay = () => {
    if (viewType === 'Day') return selectedDate.isSame(dayjs(), 'day') ? `Today, ${selectedDate.format('MMMM D')}` : selectedDate.format('MMMM D, YYYY');
    if (viewType === 'Week') return `${selectedDate.startOf('week').format('MMM D')} - ${selectedDate.endOf('week').format('MMM D, YYYY')}`;
    return selectedDate.format('MMMM YYYY');
  };

  return (
    <ZenPageLayout
      title="Appointments"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      addButtonLabel={user?.role === 'Client' ? "Book Ritual" : "New Appointment"}
      addButtonIcon={<Plus size={18} />}
      onAddClick={() => handleOpenModal()}
    >
      <div style={{ '--theme-primary': settings?.theme?.primaryColor || '#8B5CF6' } as React.CSSProperties} className="contents font-sans">
        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 space-y-8">
           {/* Calendar Controls - Now visible in both Grid and Table view */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col xl:flex-row items-center justify-between gap-4 sm:gap-6 animate-in slide-in-from-top duration-700">
               <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full xl:w-auto">
                  <div className="flex items-center gap-2 sm:gap-3 bg-gray-50/50 p-1.5 sm:p-2 rounded-[1.25rem] w-full xl:w-auto justify-between sm:justify-start">
                     <ZenIconButton icon={ChevronLeft} onClick={handlePrev} className="!w-9 !h-9 sm:!w-10 sm:!h-10" />
                     <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight sm:min-w-[150px] text-center px-2 sm:px-4">{getDateDisplay()}</h2>
                     <ZenIconButton icon={ChevronRight} onClick={handleNext} className="!w-9 !h-9 sm:!w-10 sm:!h-10" />
                  </div>
               </div>
               <div className="flex bg-gray-50/50 rounded-[1.25rem] p-1.5 w-full xl:w-auto border border-gray-100">
                  {(['Day', 'Week', 'Month'] as const).map(type => (
                     <button 
                       key={type}
                       onClick={() => setViewType(type)}
                       className={`flex-1 xl:flex-none px-4 sm:px-8 py-2.5 sm:py-3 transition-all duration-500 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest rounded-[1rem] ${
                         viewType === type ? 'bg-white text-gray-900 shadow-md scale-105' : 'text-gray-400 hover:text-gray-900'
                       }`}
                     >
                       {type}
                     </button>
                  ))}
               </div>
            </div>

           {viewMode === 'grid' ? (
             <>

               {/* Calendar View Area */}
               <div className="bg-white rounded-3xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden min-h-[500px]">
                  {loading ? (
                     <div className="flex flex-col items-center justify-center h-[500px]">
                        <div className="w-10 h-10 border-4 border-zen-brown border-t-transparent rounded-full animate-spin"></div>
                     </div>
                  ) : viewType === 'Month' ? (
                     <div className="p-4 sm:p-8 overflow-x-auto custom-scrollbar">
                        <div className="min-w-[600px] lg:min-w-full">
                           <div className="grid grid-cols-7 mb-6">
                              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, i) => (
                                 <div key={i} className="text-center text-[9px] font-bold text-zen-brown/20 uppercase tracking-[0.4em]">{day}</div>
                              ))}
                           </div>
                           <div className="grid grid-cols-7 gap-1 sm:gap-3">
                              {(() => {
                                 const startOfMonth = selectedDate.startOf('month');
                                 const endOfMonth = selectedDate.endOf('month');
                                 const startDay = startOfMonth.day();
                                 const totalDays = endOfMonth.date();
                                 const days = [];

                                 for (let i = 0; i < startDay; i++) days.push(<div key={`empty-${i}`} className="bg-zen-cream/5 min-h-[60px] sm:min-h-[100px] rounded-xl sm:rounded-[1.5rem] opacity-20" />);

                                 for (let d = 1; d <= totalDays; d++) {
                                    const dateStr = startOfMonth.date(d).format('YYYY-MM-DD');
                                    const dayAppointments = appointments.filter(a => a.date === dateStr);
                                    const isToday = dayjs().isSame(startOfMonth.date(d), 'day');

                                    days.push(
                                       <div 
                                         key={d} 
                                         className={`relative min-h-[60px] sm:min-h-[100px] p-2 sm:p-4 rounded-xl sm:rounded-[1.5rem] transition-all duration-500 cursor-pointer group hover:bg-white hover:shadow-sm hover:-translate-y-1 ${isToday ? 'bg-zen-brown text-white shadow-xl' : 'bg-white/60 border border-zen-brown/15'}`}
                                         onClick={() => {
                                            setSelectedDate(startOfMonth.date(d));
                                            setViewType('Day');
                                         }}
                                       >
                                         <div className="flex justify-between items-start mb-1 sm:mb-2">
                                            <span className="text-[10px] sm:text-sm font-bold opacity-80">{d}</span>
                                            {dayAppointments.length > 0 && <span className={`text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isToday ? 'bg-white/20' : 'bg-zen-brown/5 text-zen-brown/40'}`}>{dayAppointments.length}</span>}
                                         </div>
                                         <div className="hidden sm:block space-y-1">
                                            {dayAppointments.slice(0, 2).map(a => (
                                               <div key={a._id} className={`text-[7px] p-1 rounded-lg truncate font-bold ${isToday ? 'bg-white/10' : 'bg-zen-leaf/10 text-zen-brown'}`}>{a.client}</div>
                                            ))}
                                         </div>
                                         {dayAppointments.length > 0 && (
                                            <div className="sm:hidden absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
                                               {dayAppointments.slice(0, 3).map((_, i) => (
                                                  <div key={i} className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-zen-sand'}`} />
                                               ))}
                                            </div>
                                         )}
                                       </div>
                                    );
                                 }
                                 return days;
                              })()}
                           </div>
                        </div>
                     </div>
                  ) : (
                     <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 animate-in fade-in zoom-in duration-1000 pb-20 sm:pb-8">
                        {filteredAppointments.map((apt) => (
                           <div key={apt._id} className="group relative bg-white border border-gray-100 p-6 sm:p-8 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all duration-500 hover:border-[color:var(--theme-primary)] hover:shadow-lg hover:-translate-y-2 flex flex-col justify-between overflow-hidden h-full min-h-[180px] sm:min-h-[220px]">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-zen-sand/5 rounded-bl-full -z-0 pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>
                              
                              <div className="relative z-10">
                                  <div className="flex items-center justify-between mb-4 sm:mb-6 gap-4">
                                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                       <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-zen-cream border-2 border-white shadow-lg flex flex-col items-center justify-center shrink-0 group-hover:bg-zen-brown group-hover:text-white transition-all duration-500 text-center px-2">
                                          <p className="text-[7px] sm:text-[8px] font-bold uppercase tracking-widest opacity-40 mb-0.5">Time</p>
                                          <p className="text-[10px] sm:text-xs font-black leading-[1.1] sm:leading-tight">{apt.time || '--:--'}</p>
                                       </div>
                                       <div className="min-w-0">
                                          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tighter leading-none group-hover:translate-x-1 transition-transform duration-500 truncate">{apt.client}</h3>
                                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 truncate">{apt.employee}</p>
                                       </div>
                                    </div>
                                    <div className="flex gap-1.5 sm:gap-2 shrink-0">
                                       <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(apt)} className="!w-9 !h-9 sm:!w-10 sm:!h-10" />
                                       <ZenIconButton icon={Trash2} variant="danger" onClick={() => {
                                          setAptToDelete(apt._id);
                                          setIsConfirmOpen(true);
                                       }} className="!w-9 !h-9 sm:!w-10 sm:!h-10" />
                                    </div>
                                 </div>

                                 <div className="flex flex-wrap gap-2 mb-4">
                                    <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-zen-leaf/5 border border-zen-leaf/10 rounded-xl sm:rounded-2xl flex items-center gap-2 group-hover:bg-zen-leaf/10 transition-colors duration-500">
                                       <Sparkles size={12} className="text-zen-leaf" />
                                       <span className="text-[10px] sm:text-xs font-serif font-medium text-zen-brown/70">{apt.service}</span>
                                    </div>
                                    {apt.room && (
                                       <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-50/50 border border-indigo-100 rounded-xl sm:rounded-2xl flex items-center gap-2 group-hover:bg-indigo-50 transition-colors duration-500">
                                          <MapPin size={12} className="text-indigo-400" />
                                          <span className="text-[10px] sm:text-xs font-serif font-medium text-zen-brown/70">{apt.room}</span>
                                       </div>
                                    )}
                                 </div>
                              </div>

                              <div className="relative z-10 pt-4 mt-auto border-t border-zen-brown/15 flex items-center justify-between">
                                 <p className="text-[8px] font-bold text-zen-brown/10 uppercase tracking-[0.3em]">ID: {apt._id.slice(-6).toUpperCase()}</p>
                                 <span className="text-[8px] sm:text-[9px] font-bold text-zen-leaf/40 uppercase tracking-widest">{dayjs(apt.date).format('MMM DD')}</span>
                              </div>
                           </div>
                        ))}
                        {filteredAppointments.length === 0 && (
                           <div className="col-span-full flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] text-zen-brown/20 space-y-4">
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-zen-brown/25 flex items-center justify-center">
                                 <Calendar size={28} strokeWidth={1} />
                              </div>
                              <p className="text-xs sm:text-sm font-serif italic text-center px-10">The registry is currently silent for this timeframe</p>
                           </div>
                        )}
                     </div>
                  )}
               </div>
             </>
           ) : (
             /* Table View Area */
            <div className="table-container w-full bg-white rounded-3xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden overflow-x-auto">
               <table className="w-full text-center border-collapse min-w-[800px]">
                 <thead>
                   <tr className="border-b border-gray-100">
                     <th className="px-6 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center whitespace-nowrap">S NO</th>
                     <th className="px-6 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Identity</th>
                     <th className="px-6 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Service</th>
                     <th className="px-6 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Workspace</th>
                     <th className="px-6 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Time Index</th>
                     <th className="px-6 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="">
                    {(!filteredAppointments || filteredAppointments.length === 0) && (

                       <tr>
                          <td colSpan={12} className="px-6 py-16 text-center text-[13px] text-gray-400 bg-gray-50/30">No registry data available</td>
                       </tr>

                    )}

                    {filteredAppointments.map((apt, idx) => (
                       <tr key={apt._id} className="hover:bg-gray-50/50 transition-all group">
                         <td className="px-6 py-6 text-gray-400 font-bold">{((page - 1) * PAGE_LIMIT + idx + 1).toString().padStart(2, '0')}</td>
                         <td className="px-10 py-5">
                           <div className="flex flex-col items-center">
                             <span className="zen-table-primary">{apt.client}</span>
                             <span className="zen-table-meta">{apt.employee}</span>
                           </div>
                         </td>
                         <td className="px-6 py-6">
                           <ZenBadge variant="leaf">{apt.service}</ZenBadge>
                         </td>
                         <td className="px-6 py-6 text-gray-400 font-medium text-[13px]">
                           {apt.room || 'General Area'}
                         </td>
                         <td className="px-6 py-6">
                           <div className="flex flex-col items-center">
                             <span className="text-[13px] font-bold text-gray-900">{dayjs(apt.date).format('MMM DD, YYYY')}</span>
                             <span className="text-[10px] text-gray-400 uppercase tracking-widest">{apt.time}</span>
                           </div>
                         </td>
                         <td className="px-6 py-6">
                           <div className="flex items-center justify-center gap-3 transition-all">
                             <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(apt)} />
                             <ZenIconButton icon={Trash2} variant="danger" onClick={() => {
                               setAptToDelete(apt._id);
                               setIsConfirmOpen(true);
                             }} />
                           </div>
                         </td>
                       </tr>
                     ))}
                 </tbody>
               </table>
               {appointments.length === 0 && (
                 <div className="p-20 text-center">
                   <p className="text-sm font-serif italic text-zen-brown/20">Registry is currently void of records</p>
                 </div>
               )}
             </div>
           )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-96 space-y-6 sm:space-y-10">
           <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:border-[color:var(--theme-primary)] transition-all duration-300">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8 tracking-tight">Daily Insight</h3>
              <div className="space-y-6 sm:space-y-8">
                  <div className="bg-gray-50/50 p-6 sm:p-8 rounded-2xl border border-gray-100 group transition-all duration-500">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 sm:mb-3">Booked Energy</p>
                    <p className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tighter">{filteredAppointments.filter(a => a.date && dayjs(a.date).isSame(dayjs(), 'day')).length}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 sm:mt-2">Active Records</p>
                 </div>
              </div>
           </div>

           <div style={{ backgroundColor: 'var(--theme-primary)' }} className="p-8 rounded-3xl text-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group transition-all duration-300 hover:-translate-y-1">
              <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-125 transition-transform duration-1000">
                 <Sparkles size={150} />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8 tracking-tight relative z-10">Overview</h3>
              <div className="space-y-6 sm:space-y-8 relative z-10">
                 <div>
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 sm:mb-3">Registry Volume</p>
                    <p className="text-2xl sm:text-3xl font-bold tracking-tighter">{filteredAppointments.length}</p>
                    <div className="w-full h-1 bg-white/5 rounded-full mt-3 sm:mt-4 overflow-hidden">
                       <div className="h-full bg-zen-sand w-2/3 rounded-full" />
                    </div>
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 sm:mb-3">Ambassadors</p>
                    <p className="text-2xl sm:text-3xl font-bold tracking-tighter">{staffOptions.length - 1}</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <ZenPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Appointment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="max-w-5xl"
        header={
          <div className="flex items-start justify-between gap-6 px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-start gap-4 sm:gap-5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-zen-brown text-white flex items-center justify-center shadow-sm shrink-0">
                <Calendar size={24} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Appointment record</p>
                <h3 className="mt-1 text-xl sm:text-2xl font-semibold text-zen-brown truncate">
                  {editingApt ? 'Edit appointment' : 'New appointment'}
                </h3>
                <p className="mt-2 text-sm text-zen-brown/60 max-w-2xl">
                  Schedule a visit, assign staff and room, and confirm the service time.
                </p>
              </div>
            </div>
            <ZenIconButton icon={X} onClick={() => setIsModalOpen(false)} size="md" />
          </div>
        }
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-xs text-zen-brown/40">
              {editingApt
                ? 'Changes are applied as soon as you save the appointment.'
                : 'The booking will appear in the calendar after confirmation.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <ZenButton
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </ZenButton>
              <ZenButton
                type="submit"
                form="appointment-modal-form"
                className="w-full sm:w-auto"
              >
                {editingApt ? 'Save appointment' : 'Confirm appointment'}
              </ZenButton>
            </div>
          </div>
        }
      >
         <form id="appointment-modal-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Booking details</p>
                  <h4 className="mt-1 text-lg font-semibold text-zen-brown">Client, branch, and date</h4>
                </div>
                <ZenBadge variant="secondary">{viewType}</ZenBadge>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                {user?.role === 'Admin' ? (
                  <ZenDropdown
                    label="Branch"
                    options={branchOptions}
                    value={branches.find(b => b._id === formData.branch)?.name || 'None'}
                    onChange={val => {
                      const b = branches.find(b => b.name === val);
                      setFormData({ ...formData, branch: b?._id || '', employee: '', service: '', room: '', time: '' });
                    }}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-zen-brown/15 bg-zen-cream/20 p-5 flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mb-1">Assigned branch</p>
                    <p className="text-sm font-semibold text-zen-brown">{branches.find(b => b._id === formData.branch)?.name || 'Central branch'}</p>
                  </div>
                )}
                <ZenDatePicker
                  label="Appointment date"
                  value={formData.date}
                  onChange={val => setFormData({ ...formData, date: val })}
                />
                {user?.role === 'Client' ? (
                  <div className="rounded-2xl border border-dashed border-zen-brown/15 bg-zen-cream/20 p-5 flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mb-1">Ritual for</p>
                    <p className="text-sm font-semibold text-zen-brown">{user.name}</p>
                  </div>
                ) : (
                  <ZenAutocomplete
                    label="Client"
                    placeholder="Search by name or email"
                    options={clientSearchOptions}
                    subtextKey="email"
                    value={formData.client}
                    onChange={(val: any) => setFormData({ ...formData, client: val, membershipId: '', bookingType: 'Normal' })}
                    icon={Search}
                  />
                )}
                {formData.client && activeMemberships.length > 0 ? (
                  <ZenDropdown
                    label="Booking type"
                    options={['Normal', 'Membership']}
                    value={formData.bookingType || 'Normal'}
                    onChange={val => setFormData({ ...formData, bookingType: val, membershipId: val === 'Normal' ? '' : formData.membershipId, service: val === 'Normal' ? '' : formData.service })}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-zen-brown/15 bg-zen-cream/20 p-5 flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mb-1">Booking type</p>
                    <p className="text-sm font-semibold text-zen-brown">Select a client to continue</p>
                  </div>
                )}
              </div>
            </div>

            {formData.client && formData.bookingType === 'Membership' && (
              <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Membership usage</p>
                    <h4 className="mt-1 text-lg font-semibold text-zen-brown">Apply a membership benefit</h4>
                  </div>
                  {activeMemberships.length > 0 && (
                    <ZenBadge variant="sand">{activeMemberships.length} active</ZenBadge>
                  )}
                </div>

                {activeMemberships.length > 0 ? (
                  <ZenDropdown
                    label="Membership plan"
                    options={['None', ...activeMemberships.map((m: any) => m.plan?.name || 'Plan')]}
                    value={activeMemberships.find((m: any) => m._id === formData.membershipId)?.plan?.name || 'None'}
                    onChange={val => {
                      const m = activeMemberships.find((m: any) => m.plan?.name === val);
                      setFormData({ ...formData, membershipId: m?._id || '', service: '' });
                    }}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-zen-brown/15 bg-zen-cream/20 p-5">
                    <p className="text-sm font-semibold text-zen-brown">No active memberships found for this client.</p>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Service assignment</p>
                  <h4 className="mt-1 text-lg font-semibold text-zen-brown">Select service, staff, room, and time</h4>
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-end">
                  {formData.employee && formData.employee !== 'None' && (
                    <span className="text-[10px] font-bold text-zen-leaf/60 uppercase tracking-[0.2em]">
                      {rawShifts.find(s => s.name === rawStaff.find(e => e.name === formData.employee)?.shift)?.startTime} - {rawShifts.find(s => s.name === rawStaff.find(e => e.name === formData.employee)?.shift)?.endTime}
                    </span>
                  )}
                  {formData.room && formData.room !== 'None' && (
                    <span className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.2em]">
                      Cleaning: {rawRooms.find(r => r.name === formData.room)?.cleaningDuration || 0}m
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <ZenDropdown label="Service" options={serviceOptions} value={formData.service || 'None'} onChange={val => setFormData({ ...formData, service: val })} />
                <ZenDropdown label="Staff member" options={staffOptions} value={formData.employee || 'None'} onChange={val => setFormData({ ...formData, employee: val })} />
                <ZenDropdown label="Room" options={roomOptions} value={formData.room || 'None'} onChange={val => setFormData({ ...formData, room: val })} />
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Availability</p>
                  <h4 className="mt-1 text-lg font-semibold text-zen-brown">Choose a time slot</h4>
                </div>
                <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.25em]">
                  {availableSlots.length} slots available
                </p>
              </div>

              <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 gap-3 sm:gap-4">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={slot.isBooked}
                    onClick={() => setFormData({ ...formData, time: slot.time })}
                    className={`py-3 px-1 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-black transition-all duration-300 border ${
                      formData.time === slot.time
                        ? 'bg-zen-brown text-white border-zen-brown shadow-lg scale-105'
                        : slot.isBooked
                          ? 'bg-zen-cream/10 text-zen-brown/10 border-zen-brown/15 cursor-not-allowed line-through'
                          : 'bg-white text-zen-brown/60 border-zen-brown/25 hover:border-zen-brown hover:text-zen-brown'
                    }`}
                  >
                    {slot.display}
                  </button>
                ))}
                {availableSlots.length === 0 && (
                  <div className="col-span-full py-10 bg-zen-cream/20 rounded-[1.5rem] border border-dashed border-zen-brown/15 flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zen-brown/5 flex items-center justify-center text-zen-brown/20">
                      <Calendar size={18} />
                    </div>
                    <p className="text-[10px] font-bold text-zen-brown/25 uppercase tracking-[0.3em] text-center px-10 leading-relaxed">
                      {(!formData.employee || formData.employee === 'None' || !formData.room || formData.room === 'None')
                        ? 'Select staff and room to reveal available time slots.'
                        : 'No time slots are available for this combination.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
         </form>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Archive Session?"
        message="Are you sure you want to remove this record from the registry?"
        confirmText="Archive"
        cancelText="Preserve"
      />
    </ZenPageLayout>
  );
};

export default Appointments;
