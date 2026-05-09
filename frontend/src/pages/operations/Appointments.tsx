import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Plus, Minus, ChevronLeft, ChevronRight, Edit2, Trash2, Calendar, ChevronDown,
  Sparkles, User as UserIcon, Search, MapPin, Check, X as CloseIcon, UserCheck, History,
  AlertTriangle, Slash, CheckCircle2, Clock, BarChart3, Users
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
import { ZenStatCard } from '../../components/zen/ZenStatCard';
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
// ── Membership-Integrated Service Option ─────────────────────────────────────
// Each option carries metadata to enable auto-linking on selection
export interface ServiceOption {
  label: string;          // displayed text
  value: string;          // normalized service name (key for handleAddServiceLine)
  serviceId: string;      // the service's _id
  isMembershipCovered: boolean;
  membershipId?: string;  // if covered, which membershipId to auto-link
  membershipPlanName?: string; // display name like "Gold Membership"
  normalPrice: number;    // original price
}

interface Appointment {
  _id: string;
  client: string;
  clientId?: any;
  clientPhone?: string;
  clientEmail?: string;
  service: string;
  serviceId?: any;
  quantity?: number;
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
  completedAt?: string;
  completedByEmployeeId?: any;
  completedByName?: string;
  completedByRole?: string;
  billedInvoiceId?: any;
  billedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  addOns?: any[];
  totalQuantity?: number;
  totalDuration?: number;
  totalAmount?: number;
}

const getEntityId = (value: any) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
};

const normalizeServiceQuantity = (value: any) => {
  const qty = Number(value);
  if (!Number.isFinite(qty) || qty < 1) return 1;
  return Math.floor(qty);
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
    <div className="group relative" ref={triggerRef}>
      <label className="mb-2 block h-3 text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest ml-1">Staff member</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[58px] px-1 pb-3 bg-transparent border-b-[2px] flex items-end justify-between cursor-pointer transition-all ${
          error ? 'border-rose-400' : 'border-zen-brown/15 group-hover:border-zen-gold/40'
        }`}
      >
        <div className="flex min-h-[40px] min-w-0 flex-col justify-end">
          <div className="flex items-center gap-2">
            {error && (
              <div className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <span className="text-[8px] font-bold">!</span>
              </div>
            )}
            <span className={`font-serif text-base sm:text-lg leading-6 truncate ${value && value !== 'None' ? (error ? 'text-rose-600 font-bold' : 'text-zen-brown') : 'text-zen-brown/20'}`}>
              {value && value !== 'None' ? value : 'Select specialist'}
            </span>
          </div>
          <span className={`mt-0.5 h-3 text-[9px] font-bold uppercase tracking-widest leading-3 ${error ? 'text-rose-400/60' : 'text-zen-brown/30'} ${selectedShift ? '' : 'invisible'}`}>
            {selectedMember?.designation || 'Specialist'} · {selectedShift?.startTime || '00:00'}–{selectedShift?.endTime || '00:00'}
          </span>
        </div>
        <ChevronDown size={18} className={`mb-5 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-zen-gold' : (error ? 'text-rose-400' : 'text-zen-brown/20')}`} />
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

const RoomAssignmentDropdown = ({ roomOptions, value, onChange, error }: any) => {
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

  const safeOptions = Array.isArray(roomOptions) ? roomOptions : [];
  const displayValue = value || 'None';

  return (
    <div className="group relative" ref={triggerRef}>
      <label className="mb-2 block h-3 text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest ml-1">Room</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[58px] px-1 pb-3 bg-transparent border-b-[2px] flex items-end justify-between cursor-pointer transition-all ${
          error ? 'border-rose-400' : 'border-zen-brown/15 group-hover:border-zen-gold/40'
        }`}
      >
        <div className="flex min-h-[40px] min-w-0 flex-col justify-end">
          <div className="flex items-center gap-2">
            {error && (
              <div className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <span className="text-[8px] font-bold">!</span>
              </div>
            )}
            <span className={`font-serif text-base sm:text-lg leading-6 truncate ${displayValue && displayValue !== 'None' ? (error ? 'text-rose-600 font-bold' : 'text-zen-brown') : 'text-zen-brown'}`}>
              {displayValue}
            </span>
          </div>
          <span className="mt-0.5 h-3 text-[9px] font-bold uppercase tracking-widest leading-3 text-zen-brown/30 invisible">
            Treatment room
          </span>
        </div>
        <ChevronDown size={18} className={`mb-5 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-zen-gold' : (error ? 'text-rose-400' : 'text-zen-brown/20')}`} />
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
          {safeOptions.map((roomName: string) => {
            const isSelected = displayValue === roomName;
            return (
              <div
                key={roomName}
                onMouseDown={e => { e.preventDefault(); onChange(roomName); setIsOpen(false); }}
                className={`px-5 py-4 cursor-pointer transition-all hover:bg-zen-cream/60 border-b border-zen-brown/5 last:border-0 ${isSelected ? 'bg-zen-cream/80' : ''}`}
              >
                <p className={`text-sm font-bold font-serif ${isSelected ? 'text-zen-brown' : 'text-zen-brown/80'}`}>{roomName}</p>
              </div>
            );
          })}
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
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [aptToDelete, setAptToDelete] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [viewType, setViewType] = useState<'Day' | 'Week' | 'Month'>('Day');
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);


  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<any>({});
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

  const PAGE_LIMIT = 12;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

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
    serviceId: '',
    membershipPlanName: '',
    quantity: 1,
    employee: '',
    room: '',
    time: '',
    membershipId: '',
    bookingType: 'Normal',
    date: dayjs().format('YYYY-MM-DD'),
    branch: (user as any)?.branch?._id || (user as any)?.branch || '',
    status: 'Confirmed',
    cancellationReason: '',
    addOns: [] as any[],
    totalQuantity: 0,
    totalDuration: 0,
    totalAmount: 0
  });

  const activeMemberships = useMemo(() => {
    if (!formData.client || formData.client === 'None') return [];
    let client = rawClients.find(c => c.name === formData.client);
    if (!client && user?.role === 'Client' && user.name === formData.client) {
      client = user;
    }
    return (client?.memberships || []).filter((m: any) => m.status === 'Active' && m.remainingSessions > 0);
  }, [formData.client, rawClients, user]);

  const selectedFormBranchId = getEntityId(formData.branch);
  const isInSelectedFormBranch = (entity: any) => {
    if (!selectedFormBranchId) return false;
    return getEntityId(entity?.branch) === selectedFormBranchId;
  };

  // Build enhanced service options that carry membership linkage metadata
  const serviceOptions = useMemo((): ServiceOption[] => {
    if (!selectedFormBranchId) return [];

    const options: ServiceOption[] = [];

    rawServices.forEach((s: any) => {
      const isBranchActive = isInSelectedFormBranch(s) && (!s.status || s.status === 'Active');
      if (!isBranchActive) return;

      // Determine if this service is covered by any active membership
      const coveringMembership = activeMemberships.find((membership: any) => {
        const applicableIds = (membership.plan?.applicableServices || []).map((id: any) => getEntityId(id));
        // Empty applicableServices = all services covered
        return applicableIds.length === 0 || applicableIds.includes(getEntityId(s._id));
      });

      const isCovered = !!coveringMembership;
      const planName = coveringMembership?.plan?.name || '';
      const memId = coveringMembership?._id || '';

      options.push({
        serviceId: getEntityId(s._id),
        label: isCovered
          ? `${s.name} — ${planName}`
          : s.name,
        value: s.name,
        isMembershipCovered: isCovered,
        membershipId: isCovered ? memId : undefined,
        membershipPlanName: isCovered ? planName : undefined,
        normalPrice: Number(s.price || 0)
      });
    });

    // Sort: membership-covered services first, then normal services, both alphabetically
    options.sort((a, b) => {
      if (a.isMembershipCovered !== b.isMembershipCovered) {
        return a.isMembershipCovered ? -1 : 1;
      }
      return a.label.localeCompare(b.label);
    });

    return options;
  }, [rawServices, selectedFormBranchId, activeMemberships]);

  const servicePickerOptions = useMemo(() => serviceOptions.map(o => ({
    label: o.label,
    value: o.serviceId || o.value
  })), [serviceOptions]);

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
  }, [formData.date, formData.branch]);

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

  const isAppointmentAssignedToCurrentUser = (apt?: Appointment | null) => {
    if (!apt || user?.role !== 'Employee') return false;
    const employeeId = getEntityId(apt.employeeId);
    return (
      (employeeId && employeeId === user._id) ||
      String(apt.employee || '').trim().toLowerCase() === String(user.name || '').trim().toLowerCase() ||
      String(apt.employeeId?.name || '').trim().toLowerCase() === String(user.name || '').trim().toLowerCase()
    );
  };

  const canManageAppointmentStatus = (apt?: Appointment | null) => {
    const role = user?.role?.toLowerCase();
    if (role === 'admin' || role === 'manager') return true;
    return role === 'employee' && isAppointmentAssignedToCurrentUser(apt);
  };

  const appointmentMatchesSearch = (apt: Appointment) => {
    const query = debouncedSearch.trim().toLowerCase();
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
  }, [appointments, selectedDate, viewType, selectedBranch, debouncedSearch, user]);

  const stats = useMemo(() => {
    const total = filteredAppointments.length;
    const completed = filteredAppointments.filter(a => a.status === 'Completed').length;
    const confirmed = filteredAppointments.filter(a => a.status === 'Confirmed').length;
    const pending = filteredAppointments.filter(a => a.status === 'Pending').length;
    const cancelled = filteredAppointments.filter(a => a.status === 'Cancelled').length;

    return { total, completed, confirmed, pending, cancelled };
  }, [filteredAppointments]);

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

  const isAdminOrManager = ['admin', 'manager'].includes(user?.role?.toLowerCase() || '');

  const staffOptions = useMemo(() => {
    if (!selectedFormBranchId) return ['None'];

    const isToday = formData.date === dayjs().format('YYYY-MM-DD');

    return ['None', ...rawStaff.filter(e => {
      // 1. Branch Match
      if (!isInSelectedFormBranch(e)) return false;
      if (e.status && e.status !== 'Active') return false;

      // 2. Admin/Manager sees everyone in the branch (no availability filter)
      if (isAdminOrManager) return true;

      // 3. Availability Check (Only for Today's bookings, non-admin)
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
  }, [rawStaff, selectedFormBranchId, formData.date, formData.time, rawAttendance, rawShifts, user?.role]);

  const roomOptions = useMemo(() => {
    if (!selectedFormBranchId) return ['None'];

    return ['None', ...rawRooms.filter(r => {
      return isInSelectedFormBranch(r) && r.isActive !== false;
    }).map(r => r.name)];
  }, [rawRooms, selectedFormBranchId]);

  const serviceCatalog = useMemo(() => {
    const byName = new Map<string, any>();
    const byId = new Map<string, any>();
    rawServices.filter((service: any) => isInSelectedFormBranch(service) && (!service.status || service.status === 'Active')).forEach((service: any) => {
      if (service?.name) byName.set(service.name, service);
      const serviceId = getEntityId(service);
      if (serviceId) byId.set(serviceId, service);
    });
    return { byName, byId };
  }, [rawServices, selectedFormBranchId]);

  const serviceLineItems = useMemo(() => {
    const lines: any[] = [];

    const appendLine = (entry: any, isPrimary: boolean, addOnIndex: number | null = null) => {
      const serviceName = entry?.service || entry?.name || '';
      if (!serviceName || serviceName === 'None') return;

      const serviceId = getEntityId(entry?.serviceId);
      const cleanServiceName = serviceName.replace(/\s\(Used \d+ times\)$/, '').split(' — ')[0].trim();
      const catalogItem = (serviceId && serviceCatalog.byId.get(serviceId)) || serviceCatalog.byName.get(cleanServiceName);
      const quantity = normalizeServiceQuantity(entry?.quantity);
      const coveredOption = serviceOptions.find((option) =>
        (serviceId && option.serviceId === serviceId) ||
        option.value === cleanServiceName ||
        option.label === serviceName
      );
      const isMembershipCovered = entry?.isMembershipCovered === true || coveredOption?.isMembershipCovered === true;
      const price = isMembershipCovered ? 0 : (Number(entry?.price ?? catalogItem?.price ?? 0) || 0);
      const duration = Number(entry?.duration ?? catalogItem?.duration ?? 0) || 0;

      lines.push({
        key: isPrimary ? 'primary-service' : `addon-${addOnIndex}`,
        serviceId: serviceId || catalogItem?._id || '',
        service: catalogItem?.name || cleanServiceName,
        quantity,
        price,
        duration,
        lineTotal: price * quantity,
        lineDuration: duration * quantity,
        isPrimary,
        addOnIndex,
        isMembershipCovered,
        membershipPlanName: entry?.membershipPlanName || coveredOption?.membershipPlanName || ''
      });
    };

    appendLine({
      serviceId: formData.serviceId,
      service: formData.service,
      quantity: formData.quantity,
      isMembershipCovered: formData.bookingType === 'Membership',
      membershipPlanName: (formData as any).membershipPlanName || ''
    }, true);

    (formData.addOns || []).forEach((addOn: any, index: number) => appendLine(addOn, false, index));

    return lines;
  }, [formData.service, formData.serviceId, formData.quantity, formData.addOns, formData.bookingType, serviceCatalog, serviceOptions]);

  const serviceTotals = useMemo(() => {
    return serviceLineItems.reduce((totals, item) => ({
      quantity: totals.quantity + item.quantity,
      duration: totals.duration + item.lineDuration,
      amount: totals.amount + item.lineTotal
    }), { quantity: 0, duration: 0, amount: 0 });
  }, [serviceLineItems]);

  const currencySymbol = settings?.general?.currencySymbol || 'QR';

  const handleAddServiceLine = (serviceOption: ServiceOption | string) => {
    // Support both plain service name strings (back-compat) and ServiceOption objects
    let option: ServiceOption | undefined;
    let serviceName: string;

    if (typeof serviceOption === 'string') {
      option = serviceOptions.find(o =>
        o.label === serviceOption ||
        o.value === serviceOption ||
        o.serviceId === serviceOption
      );
      serviceName = option?.value || serviceOption;
    } else {
      option = serviceOption;
      serviceName = option.label;
    }

    if (!serviceName || serviceName === 'None') return;
    const cleanServiceName = serviceName.replace(/\s\(Used \d+ times\)$/, '').split(' — ')[0].trim();
    const service = serviceCatalog.byName.get(cleanServiceName);

    // Auto-link membership if this is a covered service
    const autoMembershipId = option?.isMembershipCovered ? (option.membershipId || '') : '';
    const autoBookingType = option?.isMembershipCovered ? 'Membership' : 'Normal';

    setFormData(prev => {
      if (prev.service === serviceName) {
        return {
          ...prev,
          quantity: normalizeServiceQuantity(prev.quantity) + 1,
          time: editingApt ? prev.time : ''
        };
      }

      const addOns = prev.addOns || [];
      const existingAddOnIndex = addOns.findIndex((addOn: any) => addOn.service === serviceName);
      if (existingAddOnIndex >= 0) {
        return {
          ...prev,
          addOns: addOns.map((addOn: any, index: number) => index === existingAddOnIndex
            ? { ...addOn, quantity: normalizeServiceQuantity(addOn.quantity) + 1 }
            : addOn),
          time: editingApt ? prev.time : ''
        };
      }

      if (!prev.service || prev.service === 'None') {
        return {
          ...prev,
          service: service?.name || cleanServiceName,
          serviceId: option?.serviceId || service?._id || '',
          membershipId: autoMembershipId || prev.membershipId,
          membershipPlanName: option?.membershipPlanName || '',
          bookingType: autoBookingType || prev.bookingType,
          quantity: 1,
          time: editingApt ? prev.time : ''
        };
      }

      return {
        ...prev,
        addOns: [
          ...addOns,
          {
            serviceId: option?.serviceId || service?._id || '',
            service: service?.name || cleanServiceName,
            price: option?.isMembershipCovered ? 0 : Number(service?.price || 0),
            duration: Number(service?.duration || 0),
            quantity: 1,
            isMembershipCovered: option?.isMembershipCovered || false,
            membershipPlanName: option?.membershipPlanName || '',
            membershipId: autoMembershipId || undefined,
            bookingType: autoBookingType || 'Normal'
          }
        ],
        time: editingApt ? prev.time : ''
      };
    });
    setFormErrors((prev: any) => ({ ...prev, service: false }));
  };

  const handleUpdateServiceQuantity = (line: any, nextQuantity: number) => {
    const quantity = normalizeServiceQuantity(nextQuantity);

    setFormData(prev => {
      if (line.isPrimary) {
        return { ...prev, quantity, time: editingApt ? prev.time : '' };
      }

      return {
        ...prev,
        addOns: (prev.addOns || []).map((addOn: any, index: number) => index === line.addOnIndex
          ? { ...addOn, quantity }
          : addOn),
        time: editingApt ? prev.time : ''
      };
    });
  };

  const handleRemoveServiceLine = (line: any) => {
    setFormData(prev => {
      const addOns = prev.addOns || [];

      if (line.isPrimary) {
        const [promoted, ...remainingAddOns] = addOns;
        if (promoted) {
          return {
            ...prev,
            service: promoted.service || '',
            serviceId: promoted.serviceId || '',
            membershipPlanName: promoted.membershipPlanName || '',
            membershipId: promoted.membershipId || prev.membershipId,
            bookingType: promoted.isMembershipCovered || promoted.bookingType === 'Membership' ? 'Membership' : 'Normal',
            quantity: normalizeServiceQuantity(promoted.quantity),
            addOns: remainingAddOns,
            time: editingApt ? prev.time : ''
          };
        }

        return {
          ...prev,
          service: '',
          serviceId: '',
          membershipPlanName: '',
          quantity: 1,
          addOns: [],
          time: editingApt ? prev.time : ''
        };
      }

      return {
        ...prev,
        addOns: addOns.filter((_: any, index: number) => index !== line.addOnIndex),
        time: editingApt ? prev.time : ''
      };
    });
  };

  const availableSlots = useMemo(() => {
    if (!formData.date || !formData.employee || formData.employee === 'None') return [];

    const serviceDuration = serviceTotals.duration || 60;

    const selectedRoom = rawRooms.find(r => r.name === formData.room && isInSelectedFormBranch(r));
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
      return rName === formData.room && (!selectedFormBranchId || getEntityId(a.branch) === selectedFormBranchId);
    });

    const getScheduledAppointmentDuration = (appointment: Appointment) => {
      const primaryServiceName = (appointment.service as any)?.name || appointment.service;
      const primaryService = rawServices.find(s => s.name === primaryServiceName || getEntityId(s) === getEntityId(appointment.serviceId));
      const primaryDuration = (primaryService?.duration || 60) * normalizeServiceQuantity(appointment.quantity);
      const addOnDuration = (appointment.addOns || []).reduce((total: number, addOn: any) => {
        const addOnService = rawServices.find(s => s.name === addOn.service || getEntityId(s) === getEntityId(addOn.serviceId));
        const duration = Number(addOn.duration ?? addOnService?.duration ?? 0) || 0;
        return total + (duration * normalizeServiceQuantity(addOn.quantity));
      }, 0);
      return primaryDuration + addOnDuration;
    };

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
          const aptDuration = getScheduledAppointmentDuration(apt);
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
          const aptDuration = getScheduledAppointmentDuration(apt);
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
    const specificEmployee = rawStaff.find(e => e.name === formData.employee && isInSelectedFormBranch(e));
    if (specificEmployee) {
      return buildSlotsForEmployee(specificEmployee);
    }

    // "Any available specialist" or unrecognised value (e.g. saved from client booking form):
    // merge slots across all branch staff — a slot is free if at least one specialist is free
    const branchStaff = rawStaff.filter(e =>
      isInSelectedFormBranch(e)
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
  }, [formData.date, formData.employee, formData.room, formData.branch, serviceTotals.duration, rawStaff, rawShifts, dayAppointments, rawServices, rawRooms, editingApt, settings]);

  const handleOpenModal = (apt: Appointment | null = null) => {
    if (apt) {
      setEditingApt(apt);
      setFormData({
        client: (apt.client as any)?.name || apt.client || '',
        service: (apt.service as any)?.name || apt.service || '',
        serviceId: getEntityId(apt.serviceId),
        quantity: normalizeServiceQuantity(apt.quantity),
        employee: (apt.employee as any)?.name || apt.employee || 'None',
        room: (apt.room as any)?.name || apt.room || '',
        time: apt.time,
        date: apt.date,
        membershipId: getEntityId((apt as any).membershipId) || '',
        bookingType: (apt as any).bookingType || ((apt as any).serviceType === 'MEMBERSHIP' ? 'Membership' : 'Normal'),
        branch: (apt.branch as any)?._id || apt.branch || '',
        status: apt.status || 'Confirmed',
        cancellationReason: apt.cancellationReason || '',
        addOns: (apt.addOns || []).map((addOn: any) => ({
          ...addOn,
          quantity: normalizeServiceQuantity(addOn.quantity),
          isMembershipCovered: addOn.isMembershipCovered || (addOn as any).bookingType === 'Membership' || addOn.price === 0
        })),
        totalQuantity: apt.totalQuantity || 0,
        totalDuration: apt.totalDuration || 0,
        totalAmount: apt.totalAmount || 0
      });
    } else {
      setEditingApt(null);
      setFormData({
        client: user?.role === 'Client' ? user.name : '',
        service: '',
        serviceId: '',
        membershipPlanName: '',
        quantity: 1,
        employee: '',
        room: '',
        time: '',
        membershipId: '',
        bookingType: 'Normal',
        date: selectedDate.format('YYYY-MM-DD'),
        branch: (user as any)?.branch?._id || (user as any)?.branch || '',
        status: 'Confirmed',
        cancellationReason: '',
        addOns: [],
        totalQuantity: 0,
        totalDuration: 0,
        totalAmount: 0
      });
    }
    setIsModalOpen(true);
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const errors: any = {};
    if (!selectedFormBranchId) errors.branch = true;
    if (!formData.client || formData.client === 'None') errors.client = true;
    if (serviceLineItems.length === 0) errors.service = true;
    if (!formData.employee || formData.employee === 'None') errors.employee = true;
    if (!formData.room || formData.room === 'None') errors.room = true;
    if (!formData.time) errors.time = true;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      
      const missingFields = [];
      if (errors.branch) missingFields.push('Branch');
      if (errors.client) missingFields.push('Client');
      if (errors.service) missingFields.push('Services');
      if (errors.employee) missingFields.push('Specialist');
      if (errors.room) missingFields.push('Room');
      if (errors.time) missingFields.push('Time Slot');

      notify('error', 'Validation Failed', `Please complete the ritual details: ${missingFields.join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const primaryService = serviceLineItems[0];
      const selectedClient = rawClients.find((client: any) => client.name === formData.client && isInSelectedFormBranch(client));
      const selectedEmployee = rawStaff.find((employee: any) => employee.name === formData.employee && isInSelectedFormBranch(employee));
      const selectedRoom = rawRooms.find((room: any) => room.name === formData.room && isInSelectedFormBranch(room));
      const payload = {
        ...formData,
        branch: selectedFormBranchId,
        client: user?.role === 'Client' ? (user.name || formData.client) : formData.client.trim(),
        clientId: user?.role === 'Client' ? user._id : (selectedClient?._id || undefined),
        clientPhone: user?.role === 'Client' ? (user as any).phone : (selectedClient?.phone || undefined),
        clientEmail: user?.role === 'Client' ? user.email : (selectedClient?.email || undefined),
        service: primaryService.service,
        serviceId: primaryService.serviceId || undefined,
        employeeId: selectedEmployee?._id || undefined,
        roomId: selectedRoom?._id || undefined,
        membershipId: (formData.membershipId && formData.membershipId !== 'None') ? formData.membershipId : undefined,
        bookingType: formData.bookingType,
        quantity: primaryService.quantity,
        addOns: serviceLineItems.slice(1).map(item => ({
          serviceId: item.serviceId || undefined,
          service: item.service,
          price: item.price,
          duration: item.duration,
          quantity: item.quantity,
          isMembershipCovered: item.isMembershipCovered || false,
          membershipPlanName: item.membershipPlanName || undefined
        })),
        totalQuantity: serviceTotals.quantity,
        totalDuration: serviceTotals.duration,
        totalAmount: serviceTotals.amount
      };
      const url = editingApt ? `${API_URL}/appointments/${editingApt._id}` : `${API_URL}/appointments`;
      const method = editingApt ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(payload)
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
        notify('success', 'Acknowledged', 'Record removed');
        fetchData();
      } else {
        notify('error', 'Action failed', 'Deletion protocol rejected');
      }
    } catch (error) {
      notify('error', 'Error', 'Connection failed');
    } finally {
      setIsConfirmOpen(false);
      setAptToDelete(null);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setStatusLoading(id);
    try {
      const response = await fetch(`${API_URL}/appointments/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        notify('success', 'Status Updated', `Appointment marked as ${newStatus}`);
        fetchData();
      } else {
        const error = await response.json();
        notify('error', 'Update Failed', error.message || 'The terminal rejected the status transition.');
      }
    } catch (error) {
      notify('error', 'Sync Error', 'Communication with the sanctuary server failed.');
    } finally {
      setStatusLoading(null);
    }
  };

  const handleAppointmentStatusChange = async (status: string) => {
    if (!editingApt) {
      setFormData(prev => ({ ...prev, status }));
      return;
    }

    if (!canManageAppointmentStatus(editingApt)) {
      notify('error', 'Access Denied', 'You cannot update this appointment status.');
      return;
    }

    setFormData(prev => ({ ...prev, status }));
    setStatusLoading(status);

    try {
      const response = await fetch(`${API_URL}/appointments/${editingApt._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          status,
          cancellationReason: formData.cancellationReason
        })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        notify('error', 'Status Update Failed', payload?.message || 'Unable to update appointment status.');
        setFormData(prev => ({ ...prev, status: editingApt.status || 'Confirmed' }));
        return;
      }

      const updatedAppointment = payload as Appointment;
      setEditingApt(updatedAppointment);
      setFormData(prev => ({
        ...prev,
        status: updatedAppointment.status || status,
        cancellationReason: updatedAppointment.cancellationReason || prev.cancellationReason
      }));
      setAppointments(prev => prev.map(apt => apt._id === updatedAppointment._id ? { ...apt, ...updatedAppointment } : apt));
      setDayAppointments(prev => prev.map(apt => apt._id === updatedAppointment._id ? { ...apt, ...updatedAppointment } : apt));
      notify('success', 'Status Updated', status === 'Completed' ? 'Service marked as completed.' : 'Appointment status updated.');
      fetchData();
    } catch (_error) {
      notify('error', 'Connection Failed', 'Unable to update appointment status.');
      setFormData(prev => ({ ...prev, status: editingApt.status || 'Confirmed' }));
    } finally {
      setStatusLoading(null);
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
      hideViewToggle={true}
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
      topContent={
        <>
          {/* View Type Tabs */}
          <div className="mb-8 bg-white/80 backdrop-blur-xl p-2.5 rounded-2xl border border-zen-brown/15 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 overflow-x-auto scrollbar-none whitespace-nowrap px-4 py-3">
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto scrollbar-none">
              {(['Day', 'Week', 'Month'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setViewType(type)}
                  className={`py-2 px-4 sm:px-6 rounded-xl flex items-center gap-3 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.22em] relative transition-all duration-500 ${viewType === type ? 'bg-zen-brown text-white shadow-md' : 'text-zen-brown/35 hover:text-zen-brown hover:bg-white/50'}`}
                >
                  <Calendar size={14} className="sm:w-4 sm:h-4" strokeWidth={viewType === type ? 2.5 : 2} />
                  {type}
                </button>
              ))}
            </div>

            {/* Date Navigator */}
            <div className="flex items-center gap-3 bg-zen-cream/50 p-1.5 rounded-2xl border border-zen-brown/5 w-full sm:w-auto justify-between sm:justify-start">
               <ZenIconButton icon={ChevronLeft} onClick={handlePrev} className="!w-9 !h-9 sm:!w-10 sm:!h-10 hover:bg-white" />
               <h2 className="text-[11px] sm:text-xs font-black text-zen-brown uppercase tracking-[0.2em] min-w-[140px] text-center px-4">{getDateDisplay()}</h2>
               <ZenIconButton icon={ChevronRight} onClick={handleNext} className="!w-9 !h-9 sm:!w-10 sm:!h-10 hover:bg-white" />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 pt-2 pb-8 px-1 sm:px-2">
            {[
              { label: 'Total Volume', value: stats.total.toString(), icon: BarChart3, trend: `${viewType} perspective`, color: 'text-blue-500', bg: 'bg-blue-500/10', glow: 'bg-blue-500/20', delay: 0 },
              { label: 'Confirmed', value: stats.confirmed.toString(), icon: CheckCircle2, trend: 'Guaranteed slots', color: 'text-purple-500', bg: 'bg-purple-500/10', glow: 'bg-purple-500/20', delay: 0.2 },
              { label: 'In Queue', value: stats.pending.toString(), icon: Clock, trend: 'Awaiting confirmation', color: 'text-amber-500', bg: 'bg-amber-500/10', glow: 'bg-amber-500/20', delay: 0.4 },
              { label: 'Fulfillment', value: stats.completed.toString(), icon: UserCheck, trend: 'Services delivered', color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', delay: 0.6 }
            ].map((stat, i) => (
              <ZenStatCard key={i} {...stat} />
            ))}
          </div>
        </>
      }
    >
      <div className="font-sans min-h-0 flex-1 space-y-8">



           {viewType === 'Month' ? (
             /* Calendar Month View Area */
             <div className="bg-white rounded-[2.5rem] border border-zen-stone shadow-none overflow-hidden min-h-[420px] sm:min-h-[500px] animate-in fade-in duration-700">
               {loading ? (
                  <div className="flex flex-col items-center justify-center h-[420px] sm:h-[500px]">
                     <div className="w-10 h-10 border-4 border-zen-brown border-t-transparent rounded-full animate-spin"></div>
                  </div>
               ) : (
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
               )}
             </div>
           ) : (
             /* Table View Area */
             <div className="w-full bg-white rounded-xl border border-gray-200/60 shadow-none overflow-hidden animate-in fade-in duration-700">
               <div className="table-container">
                 <table className="w-full text-center border-collapse min-w-[680px] sm:min-w-[800px]">
                   <thead>
                     <tr>
                       <th>S No</th>
                       <th>Portrait</th>
                       <th>Client Identity</th>
                       <th>Ritual Details</th>
                       <th>Artisan</th>
                       <th>Timing</th>
                       <th>Status</th>
                       <th>Actions</th>
                     </tr>
                   </thead>
                   <tbody>
                     {visibleAppointments.length > 0 ? visibleAppointments.map((apt: any, index: number) => (
                       <tr key={apt._id} className="group">
                         {/* S NO */}
                         <td className="px-4 lg:px-6 py-4 lg:py-6">
                            <span>{((page - 1) * PAGE_LIMIT + index + 1).toString().padStart(2, '0')}</span>
                         </td>
                         
                         {/* PORTRAIT */}
                         <td className="px-4 lg:px-6 py-4 lg:py-6">
                            <div className="flex justify-center">
                              <div className="w-10 lg:w-12 h-10 lg:h-12 zen-pointed-surface overflow-hidden bg-zen-cream border-2 border-white shadow-lg shrink-0 group-hover:scale-110 transition-transform duration-500 flex items-center justify-center">
                                 <span className="font-serif text-zen-brown uppercase">{apt.client?.charAt(0)}</span>
                              </div>
                            </div>
                         </td>

                         {/* CLIENT IDENTITY */}
                         <td className="px-4 lg:px-6 py-4 lg:py-6">
                            <div className="flex flex-col items-center justify-center">
                              <span className="zen-table-primary">{apt.client}</span>
                              <span className="text-[9px] font-bold text-zen-sand tracking-widest mt-0.5 opacity-80">ID: {apt._id.slice(-6).toUpperCase()}</span>
                            </div>
                         </td>

                         {/* RITUAL DETAILS */}
                         <td className="px-4 lg:px-6 py-4 lg:py-6">
                            <div className="flex flex-col items-center justify-center">
                              <span className="zen-table-primary">{apt.service}</span>
                              <div className="flex items-center justify-center gap-1.5 mt-1">
                                <span className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest">{apt.room || 'Main Sanctuary'}</span>
                                {apt.serviceType === 'MEMBERSHIP' ? (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-zen-sand/40" />
                                    <span className="text-[8px] font-black bg-zen-sand/10 text-zen-sand px-1.5 py-0.5 rounded border border-zen-sand/20 uppercase tracking-widest">MEMBERSHIP</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-zen-brown/20" />
                                    <span className="text-[8px] font-bold bg-zen-brown/[0.03] text-zen-brown/30 px-1.5 py-0.5 rounded border border-zen-brown/10 uppercase tracking-widest">REGULAR</span>
                                  </>
                                )}
                              </div>
                            </div>
                         </td>

                         {/* ARTISAN */}
                         <td className="px-4 lg:px-6 py-4 lg:py-6">
                            <div className="flex flex-col items-center justify-center">
                              <span className="text-[13px] text-zen-brown font-bold">{apt.employee}</span>
                              <span className="text-[9px] text-zen-brown/30 font-bold uppercase tracking-widest mt-0">Specialist</span>
                            </div>
                         </td>

                         {/* TIMING */}
                         <td className="px-4 lg:px-6 py-4 lg:py-6">
                            <div className="flex flex-col items-center justify-center">
                              <span className="text-[14px] text-zen-brown font-black">{apt.time || '10:00'}</span>
                              <span className="text-[10px] text-zen-brown/40 font-bold uppercase tracking-widest mt-0">{dayjs(apt.date).format('DD MMM')}</span>
                            </div>
                         </td>

                         {/* STATUS */}
                         <td className="px-4 lg:px-6 py-4 lg:py-6">
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

                         {/* ACTIONS */}
                         <td className="px-4 lg:px-6 py-4 lg:py-6">
                            <div className="flex items-center justify-center gap-2 lg:gap-3">
                               {apt.status !== 'Completed' && apt.status !== 'Cancelled' && canManageAppointmentStatus(apt) && (
                                 <ZenIconButton 
                                   icon={Check} 
                                   variant="leaf" 
                                   onClick={() => handleUpdateStatus(apt._id, 'Completed')} 
                                   size="md"
                                   disabled={statusLoading === apt._id}
                                 />
                               )}
                               {canManageAppointmentStatus(apt) && (
                                 <ZenIconButton 
                                   icon={Edit2} 
                                   variant="sky"
                                   onClick={() => handleOpenModal(apt)} 
                                   size="md" 
                                   disabled={statusLoading === apt._id}
                                 />
                               )}

                               {(user?.role === 'Admin' || user?.role === 'Manager') && (
                                 <ZenIconButton 
                                   icon={Trash2} 
                                   variant="danger" 
                                   onClick={() => {
                                     setAptToDelete(apt._id);
                                     setIsConfirmOpen(true);
                                   }} 
                                   size="md" 
                                   disabled={statusLoading === apt._id}
                                 />
                               )}
                            </div>
                         </td>
                       </tr>
                     )) : (
                       <tr>
                          <td colSpan={8} className="py-32">
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


           {viewType !== 'Month' && <ZenPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
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
            <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white shadow-sm flex flex-col divide-y divide-zen-brown/5">
              <div className="p-6 sm:p-8">
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
                      error={formErrors.branch}
                      onChange={val => {
                        const b = branches.find(b => b.name === val);
                        setFormData({
                          ...formData,
                          branch: b?._id || '',
                          employee: '',
                          service: '',
                          serviceId: '',
                          membershipPlanName: '',
                          quantity: 1,
                          addOns: [],
                          room: '',
                          time: ''
                        });
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
                        onChange={(val: any) => setFormData({
                          ...formData,
                          client: val,
                          membershipId: '',
                          bookingType: 'Normal',
                          service: '',
                          serviceId: '',
                          membershipPlanName: '',
                          quantity: 1,
                          addOns: [],
                          time: ''
                        })}
                        icon={Search}
                        allowCustom={true}
                      />
                    )}
                  </div>
                </div>
              </div>

              {formData.client && activeMemberships.length > 0 && (
                <div className="p-6 sm:p-8 border-t border-zen-brown/5">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Membership status</p>
                      <h4 className="mt-1 text-lg font-semibold text-zen-brown">Active memberships</h4>
                    </div>
                    <ZenBadge variant="sand">{activeMemberships.length} active</ZenBadge>
                  </div>
                  <div className="space-y-3">
                    {activeMemberships.map((m: any) => (
                      <div key={m._id} className="p-4 rounded-xl border border-zen-sand/20 bg-zen-sand/5 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-zen-brown">{m.plan?.name || 'Membership Plan'}</span>
                          <span className="text-[10px] font-black text-zen-sand uppercase tracking-wider">
                            {m.remainingSessions} sessions left
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-zen-sand uppercase tracking-wider">Validity</span>
                          <span className="text-xs text-zen-brown/70">
                            {dayjs(m.startDate).format('DD MMM YYYY')} – {dayjs(m.endDate).format('DD MMM YYYY')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[10px] text-zen-brown/40 leading-relaxed">
                    Membership-covered services appear in the service list with pricing automatically set to ₹0.
                  </p>
                </div>
              )}

              {editingApt && user?.role === 'Employee' && (
                <div className="p-6 sm:p-8">
                  <div className="rounded-2xl border border-dashed border-zen-brown/15 bg-zen-cream/20 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white border border-zen-brown/10 flex items-center justify-center shrink-0 shadow-sm">
                      <UserCheck size={20} className="text-zen-brown/40" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zen-brown">Appointment details are view-only</p>
                      <p className="text-xs text-zen-brown/60 mt-0.5">Contact an administrator if you need to modify this booking.</p>
                    </div>
                  </div>
                </div>
              )}
              {/* ── Service & Room Row ─────────────────────────────────────── */}
              <div className={`p-6 sm:p-8 ${editingApt && user?.role === 'Employee' ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="mb-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Service assignment</p>
                  <h4 className="mt-1 text-lg font-semibold text-zen-brown">Select specialist &amp; room</h4>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  {/* Rich specialist dropdown */}
                  <div className={editingApt && user?.role === 'Employee' ? 'pointer-events-none' : ''}>
                    <StaffDropdown
                      staffOptions={staffOptions}
                      rawStaff={rawStaff}
                      rawShifts={rawShifts}
                      value={formData.employee}
                      onChange={val => {
                        if (editingApt && user?.role === 'Employee') return;
                        setFormData({ ...formData, employee: val, time: '' });
                        setFormErrors({ ...formErrors, employee: false });
                      }}
                      error={formErrors.employee}
                    />
                  </div>

                  <div className={editingApt && user?.role === 'Employee' ? 'pointer-events-none' : ''}>
                    <RoomAssignmentDropdown
                      roomOptions={roomOptions}
                      value={formData.room || 'None'}
                      onChange={val => {
                        if (editingApt && user?.role === 'Employee') return;
                        setFormData({ ...formData, room: val });
                        setFormErrors({ ...formErrors, room: false });
                      }}
                      error={formErrors.room}
                    />
                  </div>
                </div>
                {formData.room && formData.room !== 'None' && (
                  <p className="mt-3 text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.2em]">
                    Cleaning buffer: {rawRooms.find(r => r.name === formData.room)?.cleaningDuration || 0} min
                  </p>
                )}
              </div>
            </div>

            {/* ── Appointment Services ───────────────────────────────────── */}
            <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Appointment services</p>
                  <h4 className="mt-1 text-lg font-semibold text-zen-brown">Services list</h4>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.2em]">{serviceTotals.quantity} Qty</p>
                  <p className="mt-1 font-serif text-lg font-bold text-zen-brown">
                    {currencySymbol} {serviceTotals.amount.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <>
                    <div>
                      <ZenDropdown
                        label="Service"
                        placeholder="Select service"
                        options={servicePickerOptions}
                        value=""
                        onChange={handleAddServiceLine}
                        error={formErrors.service && serviceLineItems.length === 0}
                        icon={Sparkles}
                      />
                    </div>

                    {serviceLineItems.length === 0 ? (
                      <div className={`rounded-2xl border border-dashed p-8 text-center transition-colors ${
                        formErrors.service ? 'border-rose-300 bg-rose-50/50 text-rose-500' : 'border-zen-brown/10 bg-zen-cream/20 text-zen-brown/30'
                      }`}>
                        <Sparkles size={24} className="mx-auto mb-3" strokeWidth={1.3} />
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em]">Select at least one service</p>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-2xl border border-zen-brown/10 bg-white">
                        <div className="hidden md:grid grid-cols-[1fr_8rem_7rem_8rem_3.5rem] items-center gap-4 bg-zen-brown/[0.02] px-5 py-3 border-b border-zen-brown/5">
                          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-zen-brown/30">Service</span>
                          <span className="text-center text-[9px] font-bold uppercase tracking-[0.25em] text-zen-brown/30">Qty</span>
                          <span className="text-right text-[9px] font-bold uppercase tracking-[0.25em] text-zen-brown/30">Duration</span>
                          <span className="text-right text-[9px] font-bold uppercase tracking-[0.25em] text-zen-brown/30">Total</span>
                          <span />
                        </div>

                        <div className="divide-y divide-zen-brown/5">
                          {serviceLineItems.map((item) => (
                            <div key={item.key} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_8rem_7rem_8rem_3.5rem] md:items-center">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zen-brown/40 ${item.isMembershipCovered ? 'bg-zen-sand/10' : 'bg-zen-brown/[0.04]'}`}>
                                  <Sparkles size={15} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="truncate font-serif text-sm font-bold text-zen-brown">{item.service}</p>
                                    {item.isMembershipCovered && (
                                      <span className="max-w-full truncate text-[8px] font-black bg-zen-sand/10 text-zen-sand px-1.5 py-0.5 rounded border border-zen-sand/20 uppercase tracking-widest">
                                        Membership{item.membershipPlanName ? `: ${item.membershipPlanName}` : ''}
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-0.5 text-[10px] font-semibold text-zen-brown/35">
                                    {item.isMembershipCovered ? (
                                      <span className="text-zen-sand font-bold">
                                        Covered{item.membershipPlanName ? ` by ${item.membershipPlanName}` : ''}
                                      </span>
                                    ) : (
                                      <>{currencySymbol} {item.price.toLocaleString()} / {item.duration || 0} min</>
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="flex h-10 items-center justify-between rounded-xl border border-zen-brown/10 bg-zen-cream/20 px-2">
                                <button
                                  type="button"
                                  disabled={item.quantity <= 1}
                                  onClick={() => handleUpdateServiceQuantity(item, item.quantity - 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-zen-brown/40 transition-colors hover:bg-white hover:text-zen-brown disabled:cursor-not-allowed disabled:opacity-30"
                                  aria-label={`Decrease ${item.service} quantity`}
                                >
                                  <Minus size={14} />
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={event => handleUpdateServiceQuantity(item, Number(event.target.value))}
                                  className="h-8 w-10 bg-transparent text-center text-sm font-bold text-zen-brown outline-none"
                                  aria-label={`${item.service} quantity`}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateServiceQuantity(item, item.quantity + 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-zen-brown/40 transition-colors hover:bg-white hover:text-zen-brown"
                                  aria-label={`Increase ${item.service} quantity`}
                                >
                                  <Plus size={14} />
                                </button>
                              </div>

                              <div className="flex items-center justify-between md:block md:text-right">
                                <span className="md:hidden text-[9px] font-bold uppercase tracking-[0.2em] text-zen-brown/30">Duration</span>
                                <p className="text-sm font-bold text-zen-brown">{item.lineDuration} min</p>
                              </div>

                              <div className="flex items-center justify-between md:block md:text-right">
                                <span className="md:hidden text-[9px] font-bold uppercase tracking-[0.2em] text-zen-brown/30">Total</span>
                                <p className="font-serif text-base font-bold text-zen-brown">
                                  {currencySymbol} {item.lineTotal.toLocaleString()}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveServiceLine(item)}
                                className="flex h-10 w-full items-center justify-center rounded-xl border border-transparent text-zen-brown/25 transition-colors hover:border-rose-100 hover:bg-rose-50 hover:text-rose-500 md:w-10"
                                aria-label={`Remove ${item.service}`}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="grid gap-3 bg-zen-cream/20 px-5 py-4 sm:grid-cols-3">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zen-brown/30">Total Qty</p>
                            <p className="mt-1 text-sm font-bold text-zen-brown">{serviceTotals.quantity}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zen-brown/30">Total Duration</p>
                            <p className="mt-1 text-sm font-bold text-zen-brown">{serviceTotals.duration} min</p>
                          </div>
                          <div className="sm:text-right">
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zen-brown/30">Estimated Amount</p>
                            <p className="mt-1 font-serif text-lg font-bold text-zen-brown">
                              {currencySymbol} {serviceTotals.amount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
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
            {editingApt && canManageAppointmentStatus(editingApt) && (
              <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-8">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Administrative protocol</p>
                    <h4 className="mt-1 text-lg font-semibold text-zen-brown">
                      {user?.role === 'Employee' ? 'Service completion' : 'Ritual status & lifecycle'}
                    </h4>
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
                   ].filter((s) => ['admin', 'manager'].includes(user?.role?.toLowerCase() || '') || s.id === 'Completed').map((s) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={statusLoading !== null}
                        onClick={() => handleAppointmentStatusChange(s.id)}
                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 text-left disabled:cursor-not-allowed disabled:opacity-70 ${
                          formData.status === s.id ? s.active : `${s.bg} ${s.border} hover:scale-[1.02]`
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm ${s.color}`}>
                          {statusLoading === s.id ? (
                            <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                          ) : (
                            <Icon size={20} />
                          )}
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${s.color}`}>{s.label}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{s.sub}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {formData.status === 'Completed' && (editingApt.completedByName || formData.employee) && (
                  <div className="mt-6 rounded-2xl border border-zen-brown/10 bg-zen-cream/20 px-5 py-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zen-brown/30">Completed by</p>
                    <p className="mt-1 text-sm font-semibold text-zen-brown">{editingApt.completedByName || formData.employee}</p>
                  </div>
                )}

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
