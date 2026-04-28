import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Plus, ChevronLeft, ChevronRight, Edit2, Trash2, Calendar, ChevronDown,
  Sparkles, User as UserIcon, Search, MapPin, Check, X as CloseIcon, UserCheck, History,
  AlertTriangle, Slash
} from 'lucide-react';
import { Modal } from '../../components/shared/Modal';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { notify } from '../../components/shared/ZenNotification';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { ZenButton, ZenBadge, ZenIconButton } from '../../components/zen/ZenButtons';
import { ZenAutocomplete, ZenDatePicker, ZenDropdown, ZenTextarea, useFloatingAnchor } from '../../components/zen/ZenInputs';
import { useBranches } from '../../context/BranchContext';
import { useSettings, SettingsData } from '../../context/SettingsContext';
import { getPollIntervalMs, shouldPollNow } from '../../utils/polling';
import { getCachedJson, setCachedJson } from '../../utils/localCache';
import { ExportPopup, ExportColumn } from '../../components/shared/ExportPopup';
import { motion, AnimatePresence } from 'motion/react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

const parseTime = (t: string, d: string) => {
  if (!t) return null;
  const formats = ['HH:mm', 'h:mm A', 'hh:mm A', 'H:mm'];
  for (const f of formats) {
    const p = dayjs(`${d} ${t}`, `YYYY-MM-DD ${f}`, true);
    if (p.isValid()) return p;
  }
  return null;
};
interface Appointment {
  _id: string;
  client: string;
  clientId?: any;
  clientPhone?: string;
  clientEmail?: string;
  service: string;
  serviceId?: any;
  employee: string;
  employeeId?: any;
  date: string;
  time: string;
  room?: string;
  roomId?: any;
  branch?: any;
  bookingType?: string;
  status?: string;
  cancellationReason?: string;
  createdAt?: string;
  updatedAt?: string;
  addOns?: any[];
}

const getEntityId = (value: any) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
};

// ── Rich Staff Dropdown ─────────────────────────────────────────────────────
const StaffDropdown = ({ staffOptions, rawStaff, rawShifts, value, onChange, error }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const floatingStyle = useFloatingAnchor(triggerRef, isOpen, 8);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        listRef.current && !listRef.current.contains(e.target as Node)
      ) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const specialists = (staffOptions || []).filter((s: string) => s !== 'None');
  const selectedMember = rawStaff?.find((e: any) => e.name === value);
  const selectedShift = rawShifts?.find((s: any) => s.name === selectedMember?.shift);

  return (
    <div className="space-y-1 group relative" ref={triggerRef}>
      <label className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest ml-1">Staff member</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-1 pb-3 bg-transparent border-b-[2px] flex items-center justify-between cursor-pointer transition-all ${
          error ? 'border-rose-400' : 'border-zen-brown/15 group-hover:border-zen-gold/40'
        }`}
      >
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            {error && (
              <div className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <span className="text-[8px] font-bold">!</span>
              </div>
            )}
            <span className={`font-serif text-lg truncate ${value && value !== 'None' ? (error ? 'text-rose-600 font-bold' : 'text-zen-brown') : 'text-zen-brown/20'}`}>
              {value && value !== 'None' ? value : 'Select specialist'}
            </span>
          </div>
          {selectedShift && (
            <span className={`text-[9px] font-bold uppercase tracking-widest -mt-0.5 ${error ? 'text-rose-400/60' : 'text-zen-brown/30'}`}>
              {selectedMember?.designation || 'Specialist'} · {selectedShift.startTime}–{selectedShift.endTime}
            </span>
          )}
        </div>
        <ChevronDown size={18} className={`flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-zen-gold' : (error ? 'text-rose-400' : 'text-zen-brown/20')}`} />
      </div>

      {isOpen && createPortal(
        <div
          ref={listRef}
          className="fixed bg-white border border-zen-brown/15 rounded-[1rem] z-[99999] shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 overflow-y-auto"
          style={{
            ...floatingStyle,
            maxHeight: 320
          }}
        >
          {/* None option */}
          <div
            onMouseDown={e => { e.preventDefault(); onChange('None'); setIsOpen(false); }}
            className={`px-5 py-3 cursor-pointer transition-colors hover:bg-zen-cream/60 border-b border-zen-brown/5 ${!value || value === 'None' ? 'bg-zen-cream/50' : ''}`}
          >
            <p className="text-sm font-medium text-zen-brown/40 font-serif">None</p>
          </div>

          {specialists.map((staffName: string) => {
            const member = rawStaff?.find((e: any) => e.name === staffName);
            const shift = rawShifts?.find((s: any) => s.name === member?.shift);
            const isSelected = value === staffName;
            return (
              <div
                key={staffName}
                onMouseDown={e => { e.preventDefault(); onChange(staffName); setIsOpen(false); }}
                className={`px-5 py-4 cursor-pointer transition-all hover:bg-zen-cream/60 border-b border-zen-brown/5 last:border-0 ${isSelected ? 'bg-zen-cream/80' : ''}`}
              >
                <p className={`text-sm font-bold font-serif ${isSelected ? 'text-zen-brown' : 'text-zen-brown/80'}`}>{staffName}</p>
                <p className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest mt-0.5">
                  {member?.designation || member?.jobTitle || 'Specialist'}
                  {shift ? ` · ${shift.startTime}–${shift.endTime}` : ''}
                </p>
              </div>
            );
          })}

          {specialists.length === 0 && (
            <div className="px-5 py-8 text-center">
              <p className="text-[10px] font-bold text-zen-brown/20 uppercase tracking-widest">No specialists available</p>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
// ────────────────────────────────────────────────────────────────────────────

const Appointments = () => {
  const { user } = useAuth();
  const { selectedBranch, branches } = useBranches();
  const { settings } = useSettings();
  const [appointments, setAppointments] = useState<Appointment[]>(() => getCachedJson('zen_page_appointments', []));
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>(() => getCachedJson('zen_page_day_appointments', []));
  const [loading, setLoading] = useState(() => getCachedJson<Appointment[]>('zen_page_appointments', []).length === 0);
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<any>({});
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

  const PAGE_LIMIT = 12;

  // Raw data from backend
  const [rawClients, setRawClients] = useState<any[]>(() => getCachedJson('zen_page_appointment_clients', []));
  const [rawServices, setRawServices] = useState<any[]>(() => getCachedJson('zen_page_appointment_services', []));
  const [rawStaff, setRawStaff] = useState<any[]>(() => getCachedJson('zen_page_appointment_staff', []));
  const [rawShifts, setRawShifts] = useState<any[]>(() => getCachedJson('zen_page_appointment_shifts', []));
  const [rawRooms, setRawRooms] = useState<any[]>(() => getCachedJson('zen_page_appointment_rooms', []));
  const [rawAttendance, setRawAttendance] = useState<any[]>(() => getCachedJson('zen_page_appointment_attendance', []));

  const [formData, setFormData] = useState({
    client: '',
    service: '',
    employee: '',
    room: '',
    time: '',
    membershipId: '',
    bookingType: 'Normal',
    date: dayjs().format('YYYY-MM-DD'),
    branch: (user as any)?.branch?._id || (user as any)?.branch || '',
    status: 'Confirmed',
    cancellationReason: '',
    addOns: [] as any[]
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
      return matchesBranch;
    });

    return ['None', ...filtered.map(s => s.name)];
  }, [rawServices, formData.branch, formData.membershipId, activeMemberships]);

  // Watch for membership changes and reset service if it's no longer valid
  useEffect(() => {
    if (formData.service && formData.service !== 'None' && !serviceOptions.includes(formData.service)) {
       setFormData(prev => ({ ...prev, service: '' }));
    }
  }, [formData.membershipId, serviceOptions]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  const appointmentRange = useMemo(() => {
    const unit = viewType.toLowerCase() as 'day' | 'week' | 'month';
    return {
      start: selectedDate.startOf(unit),
      end: selectedDate.endOf(unit)
    };
  }, [selectedDate, viewType]);

  const appointmentRangeLabel = useMemo(() => {
    if (viewType === 'Day') return selectedDate.format('DD MMM YYYY');
    if (viewType === 'Week') {
      return `${appointmentRange.start.format('DD MMM YYYY')} - ${appointmentRange.end.format('DD MMM YYYY')}`;
    }
    return selectedDate.format('MMMM YYYY');
  }, [appointmentRange, selectedDate, viewType]);

  const appointmentQueryString = (targetPage: number, targetLimit: number) => {
    const params = new URLSearchParams({
      page: targetPage.toString(),
      limit: targetLimit.toString(),
      dateFrom: appointmentRange.start.format('YYYY-MM-DD'),
      dateTo: appointmentRange.end.format('YYYY-MM-DD')
    });

    if (selectedBranch !== 'all') {
      params.set('branch', selectedBranch);
    }

    return params.toString();
  };

  const appointmentMatchesRangeAndBranch = (apt: Appointment) => {
    const date = dayjs(apt.date);
    if (!date.isValid() || !date.isSame(selectedDate, viewType.toLowerCase() as any)) return false;
    if (selectedBranch !== 'all' && getEntityId(apt.branch) !== selectedBranch) return false;
    return true;
  };

  const fetchAppointmentsForCurrentRange = async (authHeader: { Authorization: string }) => {
    const allRows: Appointment[] = [];
    const exportLimit = 200;
    let exportPage = 1;
    let exportTotalPages = 1;

    do {
      const res = await fetch(`${API_URL}/appointments?${appointmentQueryString(exportPage, exportLimit)}`, { headers: authHeader });
      const data = await res.json();
      const rows = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];

      allRows.push(...rows);
      exportTotalPages = Number(data?.pagination?.pages || 1);
      exportPage += 1;
    } while (exportPage <= exportTotalPages);

    const uniqueRows = new Map<string, Appointment>();
    allRows.forEach((apt) => {
      if (apt?._id) uniqueRows.set(apt._id, apt);
    });

    return Array.from(uniqueRows.values()).filter(appointmentMatchesRangeAndBranch);
  };

  const fetchAppointments = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const authHeader = { 'Authorization': `Bearer ${user?.token}` };
      const rows = await fetchAppointmentsForCurrentRange(authHeader);
      setAppointments(rows);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDayAppointments = async (date: string) => {
    try {
      const authHeader = { 'Authorization': `Bearer ${user?.token}` };
      const params = new URLSearchParams({ date, limit: '1000' });
      if (formData.branch) params.set('branch', formData.branch);
      const res = await fetch(`${API_URL}/appointments?${params.toString()}`, { headers: authHeader });
      const data = await res.json();
      setDayAppointments(data.data || data || []);
    } catch (error) {
      console.error('Failed to fetch day appointments:', error);
    }
  };

  useEffect(() => {
    fetchDayAppointments(formData.date);
  }, [formData.date]);

  const fetchAllData = async (silent: boolean = false) => {
    const hasVisibleData = (
      appointments.length ||
      rawClients.length ||
      rawServices.length ||
      rawStaff.length ||
      rawShifts.length ||
      rawRooms.length ||
      rawAttendance.length
    ) > 0;
    if (!silent && !hasVisibleData) setLoading(true);
    try {
      const authHeader = { 'Authorization': `Bearer ${user?.token}` };
      const appointmentRowsPromise = fetchAppointmentsForCurrentRange(authHeader);

      const [appointmentRows, clientRes, serviceRes, staffRes, shiftRes, roomRes, presenceRes] = await Promise.all([
        appointmentRowsPromise,
        fetch(`${API_URL}/clients`, { headers: authHeader }),
        fetch(`${API_URL}/services`, { headers: authHeader }),
        fetch(`${API_URL}/employees`, { headers: authHeader }),
        fetch(`${API_URL}/shifts`, { headers: authHeader }),
        fetch(`${API_URL}/rooms`, { headers: authHeader }),
        fetch(`${API_URL}/attendance`, { headers: authHeader })
      ]);

      const [clients, services, staff, shifts, rooms, presence] = await Promise.all([
        clientRes.json(), serviceRes.json(), staffRes.json(), shiftRes.json(), roomRes.json(), presenceRes.json()
      ]);

      setAppointments(appointmentRows);
      const clientsList = Array.isArray(clients) ? clients : (clients?.data || []);
      const servicesList = Array.isArray(services) ? services : (services?.data || []);
      const staffList = Array.isArray(staff) ? staff : (staff?.data || []);
      const shiftsList = Array.isArray(shifts) ? shifts : (shifts?.data || []);
      const roomsList = Array.isArray(rooms) ? rooms : (rooms?.data || []);
      const attendanceList = Array.isArray(presence) ? presence : (presence?.data || []);

      if (Array.isArray(clientsList)) setRawClients(clientsList);
      if (Array.isArray(servicesList)) setRawServices(servicesList);
      if (Array.isArray(staffList)) setRawStaff(staffList);
      if (Array.isArray(shiftsList)) setRawShifts(shiftsList);
      if (Array.isArray(roomsList)) setRawRooms(roomsList);
      if (Array.isArray(attendanceList)) setRawAttendance(attendanceList);
    } catch (error) {
      console.error('Data sync error:', error);
      if (!silent) notify('error', 'Error', 'Failed to synchronize data');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    const interval = setInterval(() => {
      if (!shouldPollNow()) return;
      fetchAllData(true);
    }, getPollIntervalMs(30000));

    return () => clearInterval(interval);
  }, [user?.token, selectedBranch, selectedDate, viewType]);

  useEffect(() => setCachedJson('zen_page_appointments', appointments), [appointments]);
  useEffect(() => setCachedJson('zen_page_day_appointments', dayAppointments), [dayAppointments]);
  useEffect(() => setCachedJson('zen_page_appointment_clients', rawClients), [rawClients]);
  useEffect(() => setCachedJson('zen_page_appointment_services', rawServices), [rawServices]);
  useEffect(() => setCachedJson('zen_page_appointment_staff', rawStaff), [rawStaff]);
  useEffect(() => setCachedJson('zen_page_appointment_shifts', rawShifts), [rawShifts]);
  useEffect(() => setCachedJson('zen_page_appointment_rooms', rawRooms), [rawRooms]);
  useEffect(() => setCachedJson('zen_page_appointment_attendance', rawAttendance), [rawAttendance]);

  const fetchData = async () => {
    await fetchAllData();
  };

  const appointmentMatchesViewer = (apt: Appointment) => {
    const role = user?.role?.toLowerCase();
    if (role === 'admin' || role === 'manager') return true;
    if (user?.role === 'Employee') return apt.employee === user.name || apt.employeeId?.name === user.name;
    if (user?.role === 'Client') {
      return apt.client === user.name || apt.clientId?.name === user.name || getEntityId(apt.clientId) === user._id;
    }
    return false;
  };

  const appointmentMatchesSearch = (apt: Appointment) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;

    return [
      apt.clientId?.name,
      apt.client,
      apt.clientPhone,
      apt.clientEmail,
      apt.serviceId?.name,
      apt.service,
      apt.employeeId?.name,
      apt.employee,
      apt.roomId?.name,
      apt.room,
      apt.branch?.name,
      apt.status,
      apt.bookingType
    ].some((value) => String(value || '').toLowerCase().includes(query));
  };

  const filterAppointmentsForCurrentView = (rows: Appointment[]) =>
    rows.filter((apt) =>
      apt &&
      appointmentMatchesRangeAndBranch(apt) &&
      appointmentMatchesSearch(apt) &&
      appointmentMatchesViewer(apt)
    );

  const filteredAppointments = useMemo(() => {
    return filterAppointmentsForCurrentView(appointments);
  }, [appointments, selectedDate, viewType, selectedBranch, searchTerm, user]);

  const visibleAppointments = useMemo(() => {
    if (viewType === 'Month') return filteredAppointments;
    const startIndex = (page - 1) * PAGE_LIMIT;
    return filteredAppointments.slice(startIndex, startIndex + PAGE_LIMIT);
  }, [filteredAppointments, page, viewType]);

  useEffect(() => {
    setPage(1);
  }, [selectedDate, selectedBranch, viewType, searchTerm]);

  useEffect(() => {
    setTotalPages(viewType === 'Month' ? 1 : Math.max(1, Math.ceil(filteredAppointments.length / PAGE_LIMIT)));
  }, [filteredAppointments.length, viewType]);

  const clientSearchOptions = useMemo(() => {
     return (rawClients || [])
       .map(c => ({
         id: c.name,
         name: c.name,
         email: c.email || c.phone || 'Registry Member'
       }));
  }, [rawClients]);

  const branchOptions = useMemo(() => {
     return ['None', ...(branches || []).map(b => b.name)];
  }, [branches]);

  const staffOptions = useMemo(() => {
    const isToday = formData.date === dayjs().format('YYYY-MM-DD');
    const isAdmin = ['admin', 'manager'].includes(user?.role?.toLowerCase() || '');

    return ['None', ...rawStaff.filter(e => {
      // 1. Branch Match
      const matchesBranch = !formData.branch || e.branch === formData.branch || e.branch?._id === formData.branch;
      if (!matchesBranch) return false;

      // 2. Admin Override: Admins see everyone in the branch
      if (isAdmin) return true;

      // 3. Availability Check (Only for Today's bookings)
      if (isToday) {
        // Attendance Check: If they signed off, they are gone
        const record = rawAttendance.find(r => r.date === formData.date && (r.user === e._id || r.employeeName === e.name));
        if (record && record.checkOut && record.checkOut !== '--') return false;

        // Shift Check: If we have a specific appointment time, check if they are working THEN
        if (e.shift && formData.time) {
          const shiftDetail = rawShifts.find(s => s.name === e.shift);
          if (shiftDetail?.startTime && shiftDetail?.endTime) {
             const aptTime = parseTime(formData.time, formData.date);
             let shiftStart = parseTime(shiftDetail.startTime, formData.date);
             let shiftEnd = parseTime(shiftDetail.endTime, formData.date);

             if (aptTime && shiftStart && shiftEnd) {
                // Handle night shifts (e.g. 10 PM to 4 AM)
                if (shiftEnd.isBefore(shiftStart)) shiftEnd = shiftEnd.add(1, 'day');

                // Buffer of 15 mins
                if (aptTime.isBefore(shiftStart.subtract(15, 'minute')) || aptTime.isAfter(shiftEnd.add(15, 'minute'))) {
                  return false;
                }
             }
          }
        }
      }

      return true;
    }).map(e => e.name)];
  }, [rawStaff, formData.branch, formData.date, formData.time, rawAttendance, rawShifts, user?.role]);

  const roomOptions = useMemo(() => {
    return ['None', ...rawRooms.filter(r => {
      const matchesBranch = !formData.branch || r.branch === formData.branch || r.branch?._id === formData.branch;
      return matchesBranch;
    }).map(r => r.name)];
  }, [rawRooms, formData.branch]);

  const availableSlots = useMemo(() => {
    if (!formData.date || !formData.employee || formData.employee === 'None') return [];

    const selectedService = rawServices.find(s => s.name === formData.service);
    const serviceDuration = selectedService?.duration || 60;

    const selectedRoom = rawRooms.find(r => r.name === formData.room);
    const roomCleaningDuration = selectedRoom?.cleaningDuration || 0;
    const totalRoomOccupancy = serviceDuration + roomCleaningDuration;

    // Business hours
    const dayName = dayjs(formData.date).format('dddd').toLowerCase() as keyof NonNullable<SettingsData['workingHours']>;
    const dayHours = settings?.workingHours?.[dayName];
    if (dayHours && !dayHours.isOpen) return [];

    const shopOpenTimeStr = dayHours?.openTime || '09:00';
    const shopCloseTimeStr = dayHours?.closeTime || '21:00';
    let shopStart = parseTime(shopOpenTimeStr, formData.date) || dayjs(`${formData.date} 09:00`, 'YYYY-MM-DD HH:mm');
    let shopEnd = parseTime(shopCloseTimeStr, formData.date) || dayjs(`${formData.date} 21:00`, 'YYYY-MM-DD HH:mm');
    if (shopEnd.isBefore(shopStart)) shopEnd = shopEnd.add(1, 'day');

    const now = dayjs();
    const isToday = dayjs(formData.date).isSame(now, 'day');

    const roomApts = dayAppointments.filter(a => {
      const rName = (a.room as any)?.name || a.room;
      return rName === formData.room;
    });

    const buildSlotsForEmployee = (emp: any) => {
      if (!emp?.shift) return [];
      const shift = rawShifts.find(s => s.name === emp.shift);
      if (!shift?.startTime || !shift?.endTime) return [];

      let start = parseTime(shift.startTime, formData.date) || dayjs(`${formData.date} 09:00`, 'YYYY-MM-DD HH:mm');
      let end = parseTime(shift.endTime, formData.date) || dayjs(`${formData.date} 21:00`, 'YYYY-MM-DD HH:mm');
      if (end.isBefore(start)) end = end.add(1, 'day');

      if (start.isBefore(shopStart)) start = shopStart;
      if (end.isAfter(shopEnd)) end = shopEnd;
      if (!end.isAfter(start)) return [];

      const employeeApts = dayAppointments.filter(a => {
        const empName = (a.employee as any)?.name || a.employee;
        return empName === emp.name;
      });

      const slots: { time: string; display: string; isBooked: boolean }[] = [];
      let current = start;

      while (current.isBefore(end)) {
        const slotEnd = current.add(serviceDuration, 'minute');
        const roomOccupancyEnd = current.add(totalRoomOccupancy, 'minute');
        const isPastTime = isToday && current.isBefore(now);

        const isTherapistBooked = employeeApts.some(apt => {
          if (editingApt && apt._id === editingApt._id) return false;
          const aptStart = parseTime(apt.time, formData.date);
          if (!aptStart) return false;
          const aptServiceName = (apt.service as any)?.name || apt.service;
          const aptService = rawServices.find(s => s.name === aptServiceName);
          const aptDuration = aptService?.duration || 60;
          const aptRoomName = (apt.room as any)?.name || apt.room;
          const aptRoom = rawRooms.find(r => r.name === aptRoomName);
          const aptCleaning = aptRoom?.cleaningDuration || 0;
          const aptEnd = aptStart.add(aptDuration + aptCleaning, 'minute');
          return current.isBefore(aptEnd) && slotEnd.isAfter(aptStart);
        });

        const isRoomBooked = formData.room && formData.room !== 'None' ? roomApts.some(apt => {
          if (editingApt && apt._id === editingApt._id) return false;
          const aptStart = parseTime(apt.time, formData.date);
          if (!aptStart) return false;
          const aptServiceName = (apt.service as any)?.name || apt.service;
          const aptService = rawServices.find(s => s.name === aptServiceName);
          const aptDuration = aptService?.duration || 60;
          const aptRoomName = (apt.room as any)?.name || apt.room;
          const aptRoom = rawRooms.find(r => r.name === aptRoomName);
          const aptRoomCleaning = aptRoom?.cleaningDuration || 0;
          const aptEnd = aptStart.add(aptDuration + aptRoomCleaning, 'minute');
          return current.isBefore(aptEnd) && roomOccupancyEnd.isAfter(aptStart);
        }) : false;

        slots.push({
          time: current.format('HH:mm'),
          display: current.format('hh:mm A'),
          isBooked: isTherapistBooked || !!isRoomBooked || isPastTime
        });
        current = current.add(30, 'minute');
      }
      return slots;
    };

    // Known specific employee
    const specificEmployee = rawStaff.find(e => e.name === formData.employee);
    if (specificEmployee) {
      return buildSlotsForEmployee(specificEmployee);
    }

    // "Any available specialist" or unrecognised value (e.g. saved from client booking form):
    // merge slots across all branch staff — a slot is free if at least one specialist is free
    const branchStaff = rawStaff.filter(e =>
      !formData.branch || e.branch === formData.branch || e.branch?._id === formData.branch
    );
    if (branchStaff.length === 0) return [];

    const merged = new Map<string, { time: string; display: string; isBooked: boolean }>();
    branchStaff.forEach(emp => {
      buildSlotsForEmployee(emp).forEach(slot => {
        const existing = merged.get(slot.time);
        if (!existing) {
          merged.set(slot.time, { ...slot });
        } else {
          existing.isBooked = existing.isBooked && slot.isBooked;
        }
      });
    });
    return Array.from(merged.values()).sort((a, b) => a.time.localeCompare(b.time));
  }, [formData.date, formData.employee, formData.service, formData.room, formData.branch, rawStaff, rawShifts, dayAppointments, rawServices, rawRooms, editingApt, settings]);

  const handleOpenModal = (apt: Appointment | null = null) => {
    if (apt) {
      setEditingApt(apt);
      setFormData({
        client: (apt.client as any)?.name || apt.client || '',
        service: (apt.service as any)?.name || apt.service || '',
        employee: (apt.employee as any)?.name || apt.employee || 'None',
        room: (apt.room as any)?.name || apt.room || '',
        time: apt.time,
        date: apt.date,
        membershipId: '',
        bookingType: 'Normal',
        branch: (apt.branch as any)?._id || apt.branch || '',
        status: apt.status || 'Confirmed',
        cancellationReason: apt.cancellationReason || '',
        addOns: apt.addOns || []
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
        branch: (user as any)?.branch?._id || (user as any)?.branch || '',
        status: 'Confirmed',
        cancellationReason: '',
        addOns: []
      });
    }
    setIsModalOpen(true);
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const errors: any = {};
    if (!formData.service || formData.service === 'None') errors.service = true;
    if (!formData.employee || formData.employee === 'None') errors.employee = true;
    if (!formData.room || formData.room === 'None') errors.room = true;
    if (!formData.time) errors.time = true;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      notify('error', 'Validation Failed', 'Please select a valid service, specialist, room and time slot.');
      return;
    }

    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
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

  const getAppointmentClientName = (apt: Appointment) => apt.clientId?.name || apt.client || 'Guest';
  const getAppointmentClientPhone = (apt: Appointment) => apt.clientId?.phone || apt.clientPhone || '-';
  const getAppointmentClientEmail = (apt: Appointment) => apt.clientId?.email || apt.clientEmail || '-';
  const getAppointmentServiceName = (apt: Appointment) => apt.serviceId?.name || apt.service || '-';
  const getAppointmentStaffName = (apt: Appointment) => apt.employeeId?.name || apt.employee || '-';
  const getAppointmentRoomName = (apt: Appointment) => apt.roomId?.name || apt.room || '-';
  const getAppointmentBranchName = (apt: Appointment) => {
    if (apt.branch?.name) return apt.branch.name;
    const branchId = getEntityId(apt.branch);
    return branches.find((branch: any) => branch._id === branchId)?.name || 'Main Branch';
  };
  const getAppointmentService = (apt: Appointment) => {
    const serviceId = getEntityId(apt.serviceId);
    return rawServices.find((service: any) =>
      (serviceId && service._id === serviceId) ||
      service.name === getAppointmentServiceName(apt)
    );
  };
  const getAppointmentDuration = (apt: Appointment) => getAppointmentService(apt)?.duration || 60;
  const getAppointmentEndTime = (apt: Appointment) => {
    const start = parseTime(apt.time, apt.date);
    return start ? start.add(getAppointmentDuration(apt), 'minute').format('HH:mm') : '-';
  };
  const formatExportDateTime = (value?: string) => value ? dayjs(value).format('DD MMM YYYY, hh:mm A') : '-';

  const fetchAllAppointmentsForExport = async () => {
    const authHeader = { 'Authorization': `Bearer ${user?.token}` };
    const rows = await fetchAppointmentsForCurrentRange(authHeader);
    return filterAppointmentsForCurrentView(rows);
  };

  const appointmentExportColumns = useMemo<ExportColumn<Appointment>[]>(
    () => [
      { header: 'Appointment ID', accessor: (apt) => apt._id },
      { header: 'Period', accessor: (apt) => `${viewType}: ${appointmentRangeLabel}` },
      { header: 'Date', accessor: (apt) => dayjs(apt.date).format('DD MMM YYYY') },
      { header: 'Day', accessor: (apt) => dayjs(apt.date).format('dddd') },
      { header: 'Start Time', accessor: (apt) => apt.time || '-' },
      { header: 'End Time', accessor: (apt) => getAppointmentEndTime(apt) },
      { header: 'Client Name', accessor: (apt) => getAppointmentClientName(apt) },
      { header: 'Client Phone', accessor: (apt) => getAppointmentClientPhone(apt) },
      { header: 'Client Email', accessor: (apt) => getAppointmentClientEmail(apt) },
      { header: 'Service', accessor: (apt) => getAppointmentServiceName(apt) },
      { header: 'Service Duration (Min)', accessor: (apt) => getAppointmentDuration(apt) },
      { header: 'Service Price (QR)', accessor: (apt) => Number(getAppointmentService(apt)?.price || 0).toLocaleString() },
      { header: 'Staff', accessor: (apt) => getAppointmentStaffName(apt) },
      { header: 'Room', accessor: (apt) => getAppointmentRoomName(apt) },
      { header: 'Branch', accessor: (apt) => getAppointmentBranchName(apt) },
      { header: 'Booking Type', accessor: (apt) => apt.bookingType || 'Normal' },
      { header: 'Status', accessor: (apt) => apt.status || 'Confirmed' },
      { header: 'Cancellation Reason', accessor: (apt) => apt.cancellationReason || '-' },
      { header: 'Created On', accessor: (apt) => formatExportDateTime(apt.createdAt) },
      { header: 'Updated On', accessor: (apt) => formatExportDateTime(apt.updatedAt) }
    ],
    [appointmentRangeLabel, branches, rawServices, viewType]
  );

  return (
    <ZenPageLayout
      title="Appointments"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      hideAddButton={!['admin', 'manager'].includes(user?.role?.toLowerCase() || '')}
      addButtonLabel="New Appointment"
      addButtonIcon={<Plus size={18} />}
      onAddClick={() => handleOpenModal()}
      searchActions={
        <ExportPopup<Appointment>
          data={filteredAppointments}
          columns={appointmentExportColumns}
          fileName={`appointments_${viewType.toLowerCase()}`}
          title={`${viewType} Appointments`}
          triggerLabel="Download"
          description={`Export every matching appointment for ${appointmentRangeLabel}, including client, staff, service, room, branch, status, and timing details.`}
          resolveData={fetchAllAppointmentsForExport}
        />
      }
    >
      <div className="contents font-sans h-[calc(100dvh-180px)] overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-10 h-full overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0 space-y-8">
           {/* Calendar Controls - Now visible in both Grid and Table view */}
            <div className="bg-white px-5 sm:px-6 py-5 rounded-[2.25rem] border border-zen-stone shadow-none flex flex-col xl:flex-row items-center justify-between gap-4 sm:gap-6 animate-in slide-in-from-top duration-700">
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
               <div className="bg-white rounded-[2.5rem] border border-zen-stone shadow-none overflow-hidden min-h-[420px] sm:min-h-[500px]">
                  {loading ? (
                     <div className="flex flex-col items-center justify-center h-[420px] sm:h-[500px]">
                        <div className="w-10 h-10 border-4 border-zen-brown border-t-transparent rounded-full animate-spin"></div>
                     </div>
                  ) : viewType === 'Month' ? (
                     <div className="p-4 sm:p-8 table-container">
                        <div className="min-w-[520px] sm:min-w-[600px] lg:min-w-full">
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
                                    const dayAppointments = filteredAppointments.filter(a => a.date === dateStr);
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
                         {visibleAppointments.map((apt) => (
                            <div key={apt._id} className="group relative bg-white border border-gray-100 p-6 sm:p-8 rounded-3xl shadow-none transition-all duration-500 hover:border-zen-sand/30 hover:shadow-lg hover:-translate-y-2 flex flex-col justify-between overflow-hidden h-full min-h-[180px] sm:min-h-[220px]">
                               <div className="absolute top-0 right-0 w-32 h-32 bg-zen-sand/5 rounded-bl-full -z-0 pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>

                               <div className="relative z-10">
                                   <div className="flex items-center justify-between mb-4 sm:mb-6 gap-4">
                                     <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-zen-cream border-2 border-white shadow-lg flex flex-col items-center justify-center shrink-0 group-hover:bg-zen-brown group-hover:text-white transition-all duration-500 text-center px-2">
                                           <p className="text-[7px] sm:text-[8px] font-bold uppercase tracking-widest opacity-40 mb-0.5">Time</p>
                                           <p className="text-[10px] sm:text-xs font-black leading-[1.1] sm:leading-tight">{apt.time || '--:--'}</p>
                                        </div>
                                         <div className="flex flex-row items-center gap-3 min-w-0">
                                            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tighter leading-none group-hover:translate-x-1 transition-transform duration-500 truncate">{apt.client}</h3>
                                            <span className="text-gray-200">|</span>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{apt.employee}</p>
                                         </div>
                                     </div>
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
                                        <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-zen-sand/5 border border-zen-sand/15 rounded-xl sm:rounded-2xl flex items-center gap-2 group-hover:bg-zen-sand/10 transition-colors duration-500">
                                           <MapPin size={12} className="text-zen-sand/60" />
                                           <span className="text-[10px] sm:text-xs font-serif font-medium text-zen-brown/70">{apt.room}</span>
                                        </div>
                                     )}
                                  </div>

                                  <div className="relative z-10 pt-4 mt-auto border-t border-zen-brown/15 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                      <p className="text-[8px] font-bold text-zen-brown/10 uppercase tracking-[0.3em]">ID: {apt._id.slice(-6).toUpperCase()}</p>
                                      <ZenBadge
                                        className="!text-[7px] !py-0.5 !px-2 uppercase tracking-widest"
                                        variant={
                                          apt.status === 'Confirmed' ? 'leaf' :
                                          apt.status === 'Completed' ? 'leaf' :
                                          apt.status === 'Pending' ? 'sand' :
                                          apt.status === 'Cancelled' ? 'danger' : 'secondary'
                                        }
                                      >
                                        {apt.status || 'Confirmed'}
                                      </ZenBadge>
                                  </div>
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
             <div className="bg-white rounded-[2.5rem] border border-zen-stone shadow-none overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="flex items-center justify-between gap-4 px-8 py-6 border-b border-zen-brown/5">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">Appointment Registry</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Digital Sanctuary Logs</p>
                  </div>
                  <ZenBadge variant="leaf" className="px-5">{filteredAppointments.length} Records</ZenBadge>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-20 bg-gray-50/80 backdrop-blur-md text-[10px] font-black uppercase tracking-[0.25em] text-zen-brown/40 border-b border-zen-brown/5">
                        <tr>
                           <th className="px-8 py-5">Ambassador</th>
                           <th className="px-8 py-5">Service Ritual</th>
                           <th className="px-8 py-5">Venue</th>
                           <th className="px-8 py-5 text-center">Timing</th>
                           <th className="px-8 py-5 text-center">Status</th>
                           <th className="px-8 py-5 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zen-brown/5">
                        {filteredAppointments.length > 0 ? visibleAppointments.map((apt: any) => (
                          <tr key={apt._id} className="group hover:bg-zen-cream/10 transition-all duration-500">
                             <td className="px-8 py-6">
                               <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-xl bg-zen-sand/10 flex items-center justify-center text-zen-sand shadow-sm">
                                   <UserIcon size={16} />
                                 </div>
                                 <div className="flex flex-col gap-0.5">
                                    <p className="text-sm font-bold text-zen-brown leading-none">{apt.client || 'Guest'}</p>
                                    <p className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[0.2em]">{apt.bookingType || 'Normal'}</p>
                                  </div>
                               </div>
                             </td>
                             <td className="px-8 py-6">
                                <div className="flex flex-col gap-0.5">
                                   <p className="text-sm font-bold text-zen-brown leading-none">{apt.service || 'Unnamed'}</p>
                                   <div className="flex items-center gap-1.5 text-zen-brown/30">
                                     <UserCheck size={9} />
                                     <span className="text-[9px] font-black uppercase tracking-[0.1em]">{apt.employee || 'Artisan'}</span>
                                   </div>
                                 </div>
                             </td>
                             <td className="px-8 py-6">
                               <div className="flex items-center gap-2">
                                 <div className="w-2.5 h-2.5 rounded-full bg-zen-sand/20" />
                                 <span className="text-xs font-bold text-zen-brown">{apt.room || 'Main Sanctuary'}</span>
                               </div>
                             </td>
                             <td className="px-8 py-6 text-center">
                                 <div className="inline-flex flex-col items-center gap-0.5 px-5 py-2 rounded-xl bg-gray-50/80 border border-zen-brown/5">
                                    <span className="text-sm font-black text-zen-brown leading-none">{apt.time || '10:00'}</span>
                                    <span className="text-[9px] font-black text-zen-brown/30 uppercase tracking-widest">{dayjs(apt.date).format('DD MMM')}</span>
                                 </div>
                             </td>
                             <td className="px-8 py-6">
                               <div className="flex justify-center">
                                 <ZenBadge
                                   variant={
                                     apt.status === 'Confirmed' ? 'leaf' :
                                     apt.status === 'Completed' ? 'leaf' :
                                     apt.status === 'Pending' ? 'sand' :
                                     apt.status === 'Cancelled' ? 'danger' : 'secondary'
                                   }
                                 >
                                   {apt.status || 'Confirmed'}
                                 </ZenBadge>
                               </div>
                             </td>
                             <td className="px-8 py-6">
                               <div className="flex items-center justify-center gap-3">
                                 <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(apt)} />
                                 <ZenIconButton icon={Trash2} variant="danger" onClick={() => {
                                   setAptToDelete(apt._id);
                                   setIsConfirmOpen(true);
                                 }} />
                               </div>
                             </td>
                          </tr>
                        )) : (
                          <tr>
                             <td colSpan={6} className="py-32">
                                <div className="flex flex-col items-center justify-center gap-4 opacity-20">
                                  <History size={64} strokeWidth={0.5} />
                                  <p className="text-lg font-serif italic">Registry is currently void of records</p>
                                </div>
                             </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
             </div>
           )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-96 space-y-6 sm:space-y-10 overflow-y-auto h-full pr-2 custom-scrollbar">
           <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/60 shadow-none hover:-translate-y-1 hover:border-zen-sand/30 transition-all duration-300">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8 tracking-tight">Daily Insight</h3>
              <div className="space-y-6 sm:space-y-8">
                  <div className="bg-gray-50/50 p-6 sm:p-8 rounded-2xl border border-gray-100 group transition-all duration-500">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 sm:mb-3">Booked Energy</p>
                    <p className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tighter">{filteredAppointments.length}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 sm:mt-2">Active Records</p>
                 </div>
              </div>
           </div>

           <div style={{ backgroundColor: 'var(--zen-primary, #332766)' }} className="p-8 rounded-3xl text-white shadow-none relative overflow-hidden group transition-all duration-300 hover:-translate-y-1">
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
   </div>

      <ZenPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

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
            <ZenIconButton icon={CloseIcon} onClick={() => setIsModalOpen(false)} size="md" />
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
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? 'Processing...' : (editingApt ? 'Save appointment' : 'Confirm appointment')}
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
                    value={branches?.find(b => b._id === formData.branch)?.name || 'None'}
                    onChange={val => {
                      const b = branches.find(b => b.name === val);
                      setFormData({ ...formData, branch: b?._id || '', employee: '', service: '', room: '', time: '' });
                    }}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-zen-brown/15 bg-zen-cream/20 p-5 flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mb-1">Assigned branch</p>
                    <p className="text-sm font-semibold text-zen-brown">{branches?.find(b => b._id === formData.branch)?.name || 'Central branch'}</p>
                  </div>
                )}
                <ZenDatePicker
                  label="Appointment date"
                  value={formData.date}
                  onChange={val => setFormData({ ...formData, date: val })}
                />
                <div className="lg:col-span-2">
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
                      allowCustom={true}
                    />
                  )}
                </div>
              </div>
            </div>

            {formData.client && activeMemberships.length > 0 && (
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
                    value={activeMemberships.find((m: any) => (m._id || m).toString() === formData.membershipId?.toString())?.plan?.name || 'None'}
                    onChange={val => {
                      const m = activeMemberships.find((m: any) => m.plan?.name === val);
                      setFormData({ ...formData, membershipId: m?._id || '', service: '', bookingType: m ? 'Membership' : 'Normal' });
                    }}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-zen-brown/15 bg-zen-cream/20 p-5">
                    <p className="text-sm font-semibold text-zen-brown">No active memberships found for this client.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Service & Room Row ─────────────────────────────────────── */}
            <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm">
              <div className="mb-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Service assignment</p>
                <h4 className="mt-1 text-lg font-semibold text-zen-brown">Select specialist &amp; room</h4>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Rich specialist dropdown */}
                <StaffDropdown
                  staffOptions={staffOptions}
                  rawStaff={rawStaff}
                  rawShifts={rawShifts}
                  value={formData.employee}
                  onChange={val => {
                    setFormData({ ...formData, employee: val, time: '' });
                    setFormErrors({ ...formErrors, employee: false });
                  }}
                  error={formErrors.employee}
                />

                <ZenDropdown
                  label="Room"
                  options={roomOptions}
                  value={formData.room || 'None'}
                  onChange={val => {
                    setFormData({ ...formData, room: val });
                    setFormErrors({ ...formErrors, room: false });
                  }}
                  error={formErrors.room}
                />
              </div>
              {formData.room && formData.room !== 'None' && (
                <p className="mt-3 text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.2em]">
                  Cleaning buffer: {rawRooms.find(r => r.name === formData.room)?.cleaningDuration || 0} min
                </p>
              )}
            </div>

            {/* ── Add-on Services ────────────────────────────────────────── */}
            <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Complementary Rituals</p>
                  <h4 className="mt-1 text-lg font-semibold text-zen-brown">Add-on services</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.2em]">
                    {(formData.service && formData.service !== 'None' ? 1 : 0) + (formData.addOns?.length || 0)} Total
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                {/* Primary Service Selection */}
                <div className="pb-6 border-b border-zen-brown/5">
                  <ZenDropdown
                    label="Primary Service Ritual"
                    options={serviceOptions}
                    value={formData.service || 'None'}
                    onChange={val => {
                      setFormData({ ...formData, service: val });
                      setFormErrors({ ...formErrors, service: false });
                    }}
                    error={formErrors.service}
                    icon={Sparkles}
                  />
                </div>
                {formData.addOns && formData.addOns.length > 0 && (
                  <div className="grid gap-3">
                    {formData.addOns.map((addon, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-zen-cream/10 border border-zen-brown/5 group hover:border-zen-brown/20 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-lg bg-zen-brown/5 flex items-center justify-center text-zen-brown/40">
                            <Sparkles size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zen-brown">{addon.service}</p>
                            <p className="text-[10px] text-zen-brown/40 font-medium">{addon.duration} min • {addon.price} QR</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, addOns: prev.addOns.filter((_, i) => i !== idx) }))}
                          className="p-2 text-zen-brown/20 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2">
                  <ZenDropdown
                    label="Add more service"
                    options={serviceOptions.filter(opt => opt !== 'None' && opt !== formData.service && !(formData.addOns || []).some(a => a.service === opt))}
                    value="Select service to add"
                    onChange={val => {
                      const s = rawServices.find(s => s.name === val);
                      if (s) {
                        setFormData(prev => ({
                          ...prev,
                          addOns: [...(prev.addOns || []), {
                            serviceId: s._id,
                            service: s.name,
                            price: s.price,
                            duration: s.duration
                          }]
                        }));
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* ── Available Windows ─────────────────────────────────────── */}
            <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Availability</p>
                  <h4 className="mt-1 text-lg font-semibold text-zen-brown">Choose a time slot</h4>
                </div>
                {availableSlots.length > 0 && (
                  <span className="text-[10px] font-bold text-zen-leaf/60 uppercase tracking-[0.2em]">
                    {availableSlots.filter(s => !s.isBooked).length} free slots
                  </span>
                )}
              </div>

              {!formData.employee || formData.employee === 'None' ? (
                <div className="py-10 rounded-2xl border border-dashed border-zen-brown/10 bg-zen-cream/20 flex flex-col items-center justify-center gap-3 text-zen-brown/20">
                  <UserIcon size={26} strokeWidth={1} />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-center px-8">Select a specialist to view availability</p>
                </div>
              ) : (!formData.room || formData.room === 'None') && !editingApt ? (
                <div className="py-10 rounded-2xl border border-dashed border-zen-brown/10 bg-zen-cream/20 flex flex-col items-center justify-center gap-3 text-zen-brown/20">
                  <MapPin size={22} strokeWidth={1} />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-center px-8">Select a room to see time slots</p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="py-10 rounded-2xl border border-dashed border-zen-brown/10 bg-zen-cream/20 flex flex-col items-center justify-center gap-3 text-zen-brown/20">
                  <Calendar size={22} strokeWidth={1} />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-center px-8">No slots available for this combination</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 gap-3 sm:gap-4">
                  <AnimatePresence mode="popLayout">
                    {availableSlots.map((slot, idx) => (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.01 }}
                        key={slot.time}
                        type="button"
                        disabled={slot.isBooked}
                        onClick={() => setFormData({ ...formData, time: slot.time })}
                        whileHover={!slot.isBooked ? { scale: 1.05 } : {}}
                        whileTap={!slot.isBooked ? { scale: 0.95 } : {}}
                        className={`py-3 px-1 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-black transition-all duration-300 border ${
                          formData.time === slot.time
                            ? 'bg-zen-brown text-white border-zen-brown shadow-lg z-10'
                            : slot.isBooked
                              ? 'bg-zen-cream/5 text-zen-brown/40 border-zen-brown/10 cursor-not-allowed line-through'
                              : 'bg-white text-zen-brown/60 border-zen-brown/25 hover:border-zen-brown hover:text-zen-brown'
                        }`}
                      >
                        {slot.display}
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
            {editingApt && ['admin', 'manager'].includes(user?.role?.toLowerCase() || '') && (
              <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-8">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Administrative protocol</p>
                    <h4 className="mt-1 text-lg font-semibold text-zen-brown">Ritual status & lifecycle</h4>
                  </div>
                  <ZenBadge variant={
                     formData.status === 'Confirmed' ? 'leaf' :
                     formData.status === 'Completed' ? 'leaf' :
                     formData.status === 'Pending' ? 'sand' :
                     formData.status === 'Cancelled' ? 'danger' : 'secondary'
                   }>
                    {formData.status}
                  </ZenBadge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { id: 'Pending', label: 'Pending Approval', sub: 'Awaiting review', icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', active: 'bg-amber-100 border-amber-300 ring-2 ring-amber-500/20' },
                    { id: 'Confirmed', label: 'Approve Ritual', sub: 'Confirmed & active', icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', active: 'bg-emerald-100 border-emerald-300 ring-2 ring-emerald-500/20' },
                    { id: 'Completed', label: 'Service Completed', sub: 'Session finished', icon: Sparkles, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', active: 'bg-indigo-100 border-indigo-300 ring-2 ring-indigo-500/20' },
                    { id: 'Cancelled', label: 'Cancel Session', sub: 'Voided record', icon: CloseIcon, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', active: 'bg-rose-100 border-rose-300 ring-2 ring-rose-500/20' }
                   ].map((s) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: s.id })}
                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 text-left ${
                          formData.status === s.id ? s.active : `${s.bg} ${s.border} hover:scale-[1.02]`
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm ${s.color}`}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${s.color}`}>{s.label}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{s.sub}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {(formData.status === 'Cancelled' || formData.status === 'Pending') && (
                  <div className="mt-8 pt-8 border-t border-zen-brown/5 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                        <AlertTriangle size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zen-brown/40">Required Justification</p>
                        <p className="text-xs font-medium text-zen-brown">Please provide a reason for this status change</p>
                      </div>
                    </div>
                    <ZenTextarea
                      label={formData.status === 'Cancelled' ? "Reason for Cancellation" : "Pending Justification"}
                      placeholder={formData.status === 'Cancelled' ? "e.g., Client requested change, Schedule conflict..." : "e.g., Awaiting payment confirmation, Staff availability check..."}
                      value={formData.cancellationReason}
                      onChange={(e: any) => setFormData({ ...formData, cancellationReason: e.target.value })}
                      className="!mt-0"
                    />
                  </div>
                )}
              </div>
            )}
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
