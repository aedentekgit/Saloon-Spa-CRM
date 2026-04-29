import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Info,
  Mail,
  Map as MapIcon,
  MapPin,
  Minus,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  User as UserIcon,
  UserCircle
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { ZenDatePicker, ZenDropdown, ZenInput } from '../../components/zen/ZenInputs';
import { ZenButton } from '../../components/zen/ZenButtons';
import { notify } from '../../components/shared/ZenNotification';
import { usePublicSettings } from '../../components/landing/usePublicSettings';
import { withBase } from '../../utils/assetPath';
import { useAuth } from '../../context/AuthContext';
import { getImageUrl } from '../../utils/imageUrl';

dayjs.extend(customParseFormat);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
const ANY_SPECIALIST = 'Any available specialist';
const FALLBACK_SERVICE_IMAGE = 'https://images.unsplash.com/photo-1540555700478-4be289aefcf1?q=80&w=1800&auto=format&fit=crop';

const getEntityId = (value: any) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
};

const parseTime = (time: string, date: string) => {
  if (!time) return null;

  for (const format of ['HH:mm', 'h:mm A', 'hh:mm A', 'H:mm']) {
    const parsed = dayjs(`${date} ${time}`, `YYYY-MM-DD ${format}`, true);
    if (parsed.isValid()) return parsed;
  }

  return null;
};

const formatMoney = (value: any, currency: string) => {
  const amount = Number(value || 0);
  return `${currency} ${amount.toLocaleString()}`;
};

const normalizeServiceQuantity = (value: any) => {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity < 1) return 1;
  return Math.floor(quantity);
};

const BookAppointment = () => {
  const { user } = useAuth();
  const { settings } = usePublicSettings();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  const [formData, setFormData] = useState<any>({
    branch: getEntityId((user as any)?.branch),
    serviceId: '',
    service: '',
    quantity: 1,
    addOns: [],
    employee: '',
    date: dayjs().format('YYYY-MM-DD'),
    time: '',
    room: '',
    name: user?.name || '',
    email: user?.email || '',
    phone: (user as any)?.phone || '',
    notes: ''
  });

  const currency = settings?.general?.currencySymbol || 'QR';
  const userBranchId = getEntityId((user as any)?.branch);
  const isAdminUser = user?.role === 'Admin';
  const branchIsLocked = Boolean(user && !isAdminUser);

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

        const [branchData, serviceData, staffData, shiftData, roomData] = await Promise.all([
          branchRes.json(),
          serviceRes.json(),
          staffRes.json(),
          shiftRes.json(),
          roomRes.json()
        ]);

        setBranches(Array.isArray(branchData) ? branchData : branchData?.data || []);
        setServices(Array.isArray(serviceData) ? serviceData : serviceData?.data || []);
        setStaff(Array.isArray(staffData) ? staffData : staffData?.data || []);
        setShifts(Array.isArray(shiftData) ? shiftData : shiftData?.data || []);
        setRooms(Array.isArray(roomData) ? roomData : roomData?.data || []);
      } catch (error) {
        console.error('Data fetch error:', error);
        notify('error', 'Sync Failed', 'Booking data could not be loaded.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!formData.branch || !formData.date) return;

    const fetchAppointments = async () => {
      try {
        const res = await fetch(`${API_URL}/appointments/public?branch=${formData.branch}&date=${formData.date}`);
        const data = await res.json();
        setAppointments(Array.isArray(data) ? data : data?.data || []);
      } catch (error) {
        console.error('Appointments fetch error:', error);
      }
    };

    fetchAppointments();
  }, [formData.branch, formData.date]);

  useEffect(() => {
    if (user && !isAdminUser && userBranchId && formData.branch !== userBranchId) {
      setFormData(prev => ({
        ...prev,
        branch: userBranchId,
        serviceId: '',
        service: '',
        quantity: 1,
        addOns: [],
        employee: '',
        room: '',
        time: ''
      }));
    }
  }, [formData.branch, isAdminUser, user, userBranchId]);

  const selectedBranch = useMemo(
    () => branches.find(branch => getEntityId(branch) === formData.branch),
    [branches, formData.branch]
  );

  const visibleBranches = useMemo(() => {
    if (user && !isAdminUser && userBranchId) {
      return branches.filter(branch => getEntityId(branch) === userBranchId);
    }

    return branches;
  }, [branches, isAdminUser, user, userBranchId]);

  const isInSelectedBranch = (entity: any) => (
    Boolean(formData.branch) && getEntityId(entity?.branch) === formData.branch
  );

  const filteredServices = useMemo(
    () => services.filter(service => isInSelectedBranch(service) && (!service.status || service.status === 'Active')),
    [services, formData.branch]
  );

  const filteredStaff = useMemo(
    () => staff.filter(employee => isInSelectedBranch(employee) && (!employee.status || employee.status === 'Active')),
    [staff, formData.branch]
  );

  const branchRooms = useMemo(
    () => rooms.filter(room => isInSelectedBranch(room) && room.isActive !== false),
    [rooms, formData.branch]
  );

  const selectedService = useMemo(
    () => services.find(service => (
      getEntityId(service?.branch) === formData.branch &&
      (service.name === formData.service || service._id === formData.service)
    )),
    [services, formData.branch, formData.service]
  );

  const selectedSpecialist = useMemo(
    () => staff.find(employee => (
      getEntityId(employee?.branch) === formData.branch &&
      (employee.name === formData.employee || employee._id === formData.employee)
    )),
    [staff, formData.branch, formData.employee]
  );

  const getServiceImage = (serviceName: string) => {
    const service = services.find(item => item.name === serviceName && getEntityId(item?.branch) === formData.branch);
    if (!service?.image) return FALLBACK_SERVICE_IMAGE;
    return getImageUrl(service.image);
  };

  const serviceCatalog = useMemo(() => {
    const byName = new Map<string, any>();
    const byId = new Map<string, any>();

    filteredServices.forEach(service => {
      if (service?.name) byName.set(service.name, service);
      const serviceId = getEntityId(service);
      if (serviceId) byId.set(serviceId, service);
    });

    return { byName, byId };
  }, [filteredServices]);

  const serviceLineItems = useMemo(() => {
    const lines: any[] = [];

    const appendLine = (entry: any, isPrimary: boolean, addOnIndex: number | null = null) => {
      const serviceName = entry?.service || entry?.name || '';
      if (!serviceName) return;

      const serviceId = getEntityId(entry?.serviceId);
      const catalogItem = (serviceId && serviceCatalog.byId.get(serviceId)) || serviceCatalog.byName.get(serviceName);
      const quantity = normalizeServiceQuantity(entry?.quantity);
      const price = Number(entry?.price ?? catalogItem?.price ?? 0) || 0;
      const duration = Number(entry?.duration ?? catalogItem?.duration ?? 0) || 0;

      lines.push({
        key: isPrimary ? 'primary-service' : `addon-${addOnIndex}`,
        serviceId: serviceId || catalogItem?._id || '',
        service: catalogItem?.name || serviceName,
        quantity,
        price,
        duration,
        lineTotal: price * quantity,
        lineDuration: duration * quantity,
        isPrimary,
        addOnIndex
      });
    };

    appendLine({
      serviceId: formData.serviceId,
      service: formData.service,
      quantity: formData.quantity
    }, true);

    (formData.addOns || []).forEach((addOn: any, index: number) => appendLine(addOn, false, index));

    return lines;
  }, [formData.addOns, formData.quantity, formData.service, formData.serviceId, serviceCatalog]);

  const serviceTotals = useMemo(() => serviceLineItems.reduce((totals, item) => ({
    quantity: totals.quantity + item.quantity,
    duration: totals.duration + item.lineDuration,
    amount: totals.amount + item.lineTotal
  }), { quantity: 0, duration: 0, amount: 0 }), [serviceLineItems]);

  const servicePickerOptions = useMemo(
    () => filteredServices.map(service => service.name).filter(Boolean),
    [filteredServices]
  );

  const handleAddServiceLine = (serviceName: string) => {
    if (!serviceName) return;
    const service = serviceCatalog.byName.get(serviceName);

    setFormData((prev: any) => {
      if (prev.service === serviceName) {
        return {
          ...prev,
          quantity: normalizeServiceQuantity(prev.quantity) + 1,
          time: ''
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
          time: ''
        };
      }

      if (!prev.service) {
        return {
          ...prev,
          serviceId: service?._id || '',
          service: service?.name || serviceName,
          quantity: 1,
          time: ''
        };
      }

      return {
        ...prev,
        addOns: [
          ...addOns,
          {
            serviceId: service?._id || '',
            service: service?.name || serviceName,
            price: Number(service?.price || 0),
            duration: Number(service?.duration || 0),
            quantity: 1
          }
        ],
        time: ''
      };
    });
  };

  const handleUpdateServiceQuantity = (line: any, nextQuantity: number) => {
    const quantity = normalizeServiceQuantity(nextQuantity);

    setFormData((prev: any) => {
      if (line.isPrimary) {
        return { ...prev, quantity, time: '' };
      }

      return {
        ...prev,
        addOns: (prev.addOns || []).map((addOn: any, index: number) => index === line.addOnIndex
          ? { ...addOn, quantity }
          : addOn),
        time: ''
      };
    });
  };

  const handleRemoveServiceLine = (line: any) => {
    setFormData((prev: any) => {
      const addOns = prev.addOns || [];

      if (line.isPrimary) {
        const [promoted, ...remainingAddOns] = addOns;
        if (promoted) {
          return {
            ...prev,
            service: promoted.service || '',
            serviceId: promoted.serviceId || '',
            quantity: normalizeServiceQuantity(promoted.quantity),
            addOns: remainingAddOns,
            time: ''
          };
        }

        return {
          ...prev,
          service: '',
          serviceId: '',
          quantity: 1,
          addOns: [],
          employee: '',
          room: '',
          time: ''
        };
      }

      return {
        ...prev,
        addOns: addOns.filter((_: any, index: number) => index !== line.addOnIndex),
        time: ''
      };
    });
  };

  const availableSlots = useMemo(() => {
    if (!formData.branch || !formData.date || !formData.service || !formData.employee) return [];

    const serviceDuration = serviceTotals.duration || selectedService?.duration || 60;
    const now = dayjs();
    const isToday = dayjs(formData.date).isSame(now, 'day');
    const dayName = dayjs(formData.date).format('dddd').toLowerCase() as keyof NonNullable<typeof settings.workingHours>;
    const dayHours = settings?.workingHours?.[dayName];

    if (dayHours && !dayHours.isOpen) return [];

    const shopOpenTimeStr = dayHours?.openTime || '09:00';
    const shopCloseTimeStr = dayHours?.closeTime || '21:00';
    const roomCapacity = branchRooms.length || 999;

    const buildSlotsForEmployee = (employee: any) => {
      if (!employee?.shift) return [];

      const shift = shifts.find(item => item.name === employee.shift);
      if (!shift?.startTime || !shift?.endTime) return [];

      let start = parseTime(shift.startTime, formData.date) || dayjs(`${formData.date} 09:00`, 'YYYY-MM-DD HH:mm');
      let end = parseTime(shift.endTime, formData.date) || dayjs(`${formData.date} 21:00`, 'YYYY-MM-DD HH:mm');
      if (end.isBefore(start)) end = end.add(1, 'day');

      let shopStart = parseTime(shopOpenTimeStr, formData.date) || dayjs(`${formData.date} 09:00`, 'YYYY-MM-DD HH:mm');
      let shopEnd = parseTime(shopCloseTimeStr, formData.date) || dayjs(`${formData.date} 21:00`, 'YYYY-MM-DD HH:mm');
      if (shopEnd.isBefore(shopStart)) shopEnd = shopEnd.add(1, 'day');

      if (start.isBefore(shopStart)) start = shopStart;
      if (end.isAfter(shopEnd)) end = shopEnd;
      if (!end.isAfter(start)) return [];

      const slots: any[] = [];
      let current = start;

      while (current.isBefore(end)) {
        const selectedRoom = branchRooms.find(room => room.name === formData.room);
        const cleaningDuration = selectedRoom?.cleaningDuration || 20;
        const totalNewOccupancy = serviceDuration + cleaningDuration;
        const slotOccupancyEnd = current.add(totalNewOccupancy, 'minute');

        if (slotOccupancyEnd.isAfter(end)) break;

        const isPastTime = isToday && current.isBefore(now.add(30, 'minute'));
        const isEmployeeBooked = appointments.some(appointment => {
          const appointmentEmployee = typeof appointment.employee === 'string'
            ? appointment.employee
            : appointment.employee?.name;
          if (appointmentEmployee !== employee.name) return false;

          const appointmentStart = parseTime(appointment.time, formData.date);
          if (!appointmentStart) return false;

          const appointmentService = services.find(service => service.name === appointment.service);
          const appointmentDuration = Number(appointment.totalDuration || appointmentService?.duration || 60);
          const appointmentRoom = branchRooms.find(room => room.name === appointment.room);
          const appointmentCleaning = appointmentRoom?.cleaningDuration || 0;
          const appointmentEnd = appointmentStart.add(appointmentDuration + appointmentCleaning, 'minute');

          return current.isBefore(appointmentEnd) && slotOccupancyEnd.isAfter(appointmentStart);
        });

        const isSelectedRoomBooked = Boolean(formData.room) && appointments.some(appointment => {
          if (appointment.room !== formData.room) return false;

          const appointmentStart = parseTime(appointment.time, formData.date);
          if (!appointmentStart) return false;

          const appointmentService = services.find(service => service.name === appointment.service);
          const appointmentDuration = Number(appointment.totalDuration || appointmentService?.duration || 60);
          const appointmentRoom = branchRooms.find(room => room.name === appointment.room);
          const appointmentCleaning = appointmentRoom?.cleaningDuration || 0;
          const appointmentEnd = appointmentStart.add(appointmentDuration + appointmentCleaning, 'minute');

          return current.isBefore(appointmentEnd) && slotOccupancyEnd.isAfter(appointmentStart);
        });

        const occupiedRoomCount = appointments.filter(appointment => {
          if (!appointment.room) return false;

          const appointmentStart = parseTime(appointment.time, formData.date);
          if (!appointmentStart) return false;

          const appointmentService = services.find(service => service.name === appointment.service);
          const appointmentDuration = Number(appointment.totalDuration || appointmentService?.duration || 60);
          const appointmentRoom = branchRooms.find(room => room.name === appointment.room);
          const appointmentCleaning = appointmentRoom?.cleaningDuration || 0;
          const appointmentEnd = appointmentStart.add(appointmentDuration + appointmentCleaning, 'minute');

          return current.isBefore(appointmentEnd) && slotOccupancyEnd.isAfter(appointmentStart);
        }).length;

        const isRoomUnavailable = formData.room
          ? isSelectedRoomBooked
          : occupiedRoomCount >= roomCapacity;

        slots.push({
          time: current.format('HH:mm'),
          display: current.format('hh:mm A'),
          isBooked: isEmployeeBooked || isRoomUnavailable || isPastTime
        });

        current = current.add(30, 'minute');
      }

      return slots;
    };

    if (formData.employee === ANY_SPECIALIST) {
      const merged = new Map<string, { time: string; display: string; isBooked: boolean }>();

      filteredStaff.forEach(employee => {
        buildSlotsForEmployee(employee).forEach(slot => {
          const existing = merged.get(slot.time);
          if (!existing) {
            merged.set(slot.time, { ...slot });
          } else {
            existing.isBooked = existing.isBooked && slot.isBooked;
          }
        });
      });

      return Array.from(merged.values()).sort((a, b) => a.time.localeCompare(b.time));
    }

    return buildSlotsForEmployee(selectedSpecialist);
  }, [
    appointments,
    branchRooms,
    filteredStaff,
    formData.branch,
    formData.date,
    formData.employee,
    formData.room,
    formData.service,
    selectedService,
    selectedSpecialist,
    serviceTotals.duration,
    services,
    settings,
    shifts
  ]);

  const steps = [
    { id: 1, name: 'Service' },
    { id: 2, name: 'Time' },
    { id: 3, name: 'Details' }
  ];

  const canContinueService = Boolean(formData.branch && serviceLineItems.length > 0 && formData.date);
  const canContinueTime = Boolean(formData.employee && formData.time);

  const resetAfterBranchChange = (branchId: string) => {
    setFormData(prev => ({
      ...prev,
      branch: branchId,
      serviceId: '',
      service: '',
      quantity: 1,
      addOns: [],
      employee: '',
      room: '',
      time: ''
    }));
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!formData.branch || !formData.service || !formData.employee || !formData.time) {
      notify('error', 'Missing Information', 'Please complete the booking selection.');
      return;
    }

    if (!formData.name || !formData.phone || !formData.email) {
      notify('error', 'Missing Information', 'Contact details are incomplete.');
      return;
    }

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
      const endpoint = user ? `${API_URL}/appointments` : `${API_URL}/appointments/guest`;
      const headers: any = { 'Content-Type': 'application/json' };
      if (user?.token) headers.Authorization = `Bearer ${user.token}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          totalQuantity: serviceTotals.quantity,
          totalDuration: serviceTotals.duration,
          totalAmount: serviceTotals.amount,
          client: formData.name,
          clientEmail: formData.email,
          clientPhone: formData.phone,
          clientId: user?._id
        })
      });

      if (res.ok) {
        setStep(4);
      } else {
        const error = await res.json();
        notify('error', 'Booking Conflict', error.message || 'The selected window is no longer available.');
      }
    } catch (error) {
      notify('error', 'Connection Error', 'Please check your internet connection.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-zen-brown/10 border-t-zen-brown rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-zen-brown/40">Loading Booking System...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] relative flex flex-col">
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-[radial-gradient(circle,rgba(139,92,246,0.08)_0%,transparent_70%)] blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] bg-[radial-gradient(circle,rgba(197,163,88,0.05)_0%,transparent_70%)] blur-[100px]" />
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(#2B244003_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>

      <div className="relative z-10 flex flex-col max-w-[1440px] mx-auto w-full px-4 sm:px-8 lg:px-16 py-12 lg:py-20">
        <main className="flex-1 min-h-0 relative">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, scale: 0.99, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.99, y: -10 }}
                className="min-h-[850px] max-w-[1200px] mx-auto grid lg:grid-cols-12 gap-10"
              >
                <div className="lg:col-span-12 h-full flex flex-col">
                  <div className="flex-1 bg-white rounded-[3rem] p-6 lg:p-12 border border-zen-stone shadow-[0_32px_64px_-16px_rgba(43,36,64,0.08)] relative overflow-hidden flex flex-col min-h-0">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-8 shrink-0 relative z-20">
                      <div className="space-y-2 text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-4 text-[10px] font-black tracking-[0.4em] uppercase text-zen-sand">
                          <span className="w-8 h-[2px] bg-zen-sand/20" />
                          Experience Restoration
                        </div>
                        <h1 className="text-3xl lg:text-5xl font-serif font-black text-zen-brown tracking-tighter leading-none">
                          Sanctuary <span className="italic font-normal text-zen-gold">Booking</span>
                        </h1>
                      </div>

                      <div className="flex items-center gap-4 bg-zen-cream/50 p-2 rounded-2xl border border-zen-stone/40">
                        {steps.map(stepItem => (
                          <div key={stepItem.id} className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500 text-xs font-black ${step === stepItem.id ? 'bg-zen-brown text-white shadow-xl shadow-zen-brown/20' :
                                step > stepItem.id ? 'bg-zen-sand text-white' : 'bg-white border border-zen-stone text-zen-brown/20'
                              }`}>
                              {step > stepItem.id ? <Check size={14} strokeWidth={3} /> : <span>{stepItem.id}</span>}
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] hidden sm:block ${step === stepItem.id ? 'text-zen-brown' : 'text-zen-brown/20'}`}>{stepItem.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-6 relative z-20">
                      <button
                        type="button"
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

                    <div className="flex-1 min-h-0 relative z-20 grid lg:grid-cols-12 gap-12 overflow-hidden">
                      {/* Left Column: Selections */}
                      <div className="lg:col-span-7 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto pr-6 custom-scrollbar -mr-4 space-y-10 pb-8">
                          <div className="grid sm:grid-cols-2 gap-8 lg:gap-10">
                            {/* Date Section */}
                            <div className="space-y-6">
                              <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-zen-sand">Ritual Date</p>
                                <h2 className="text-3xl font-serif font-black leading-tight text-zen-brown tracking-tighter">
                                  Choose Your <span className="italic font-normal text-zen-gold">Moment</span>
                                </h2>
                              </div>
                              <div className="flex items-center gap-4 bg-zen-cream/30 p-1 rounded-2xl border border-zen-stone/40">
                                <div className="flex-1">
                                  <ZenDatePicker
                                    label="Select Date"
                                    value={formData.date}
                                    onChange={(value: string) => setFormData({ ...formData, date: value, time: '' })}
                                    hideLabel
                                    variant="pill"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Location Section */}
                            <div className="space-y-6">
                               <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-zen-sand">Sanctuary Details</p>
                                <h2 className="text-3xl font-serif font-black leading-tight text-zen-brown tracking-tighter">
                                  Location & <span className="italic font-normal text-zen-gold">Services</span>
                                </h2>
                              </div>
                              <div className="space-y-4">
                                <ZenDropdown
                                  label="Select Location"
                                  options={visibleBranches.map(branch => branch.name)}
                                  value={selectedBranch?.name || ''}
                                  onChange={(value) => {
                                    const branch = visibleBranches.find(item => item.name === value);
                                    resetAfterBranchChange(getEntityId(branch));
                                  }}
                                  placeholder={branchIsLocked ? 'Assigned branch' : 'Choose location'}
                                  variant="pill"
                                  icon={MapPin}
                                  disabled={branchIsLocked}
                                />
                                <ZenDropdown
                                  label="Add Service"
                                  options={servicePickerOptions}
                                  value=""
                                  onChange={handleAddServiceLine}
                                  placeholder={formData.branch ? 'Select service' : 'Select location first'}
                                  variant="pill"
                                  disabled={!formData.branch}
                                  icon={Sparkles}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Services List */}
                          {serviceLineItems.length > 0 && (
                            <div className="overflow-hidden rounded-[2.5rem] border border-zen-stone bg-white shadow-[0_10px_40px_rgba(43,36,64,0.03)] transition-all">
                              <div className="flex items-center justify-between gap-4 border-b border-zen-stone bg-zen-cream/60 px-8 py-5">
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zen-brown/50">Services selection</p>
                                <div className="px-3 py-1 bg-white border border-zen-stone rounded-full">
                                  <p className="text-[9px] font-black uppercase tracking-[0.1em] text-zen-brown">{serviceTotals.quantity} Qty</p>
                                </div>
                              </div>
                              <div className="max-h-[350px] divide-y divide-zen-stone overflow-y-auto custom-scrollbar">
                                {serviceLineItems.map(item => (
                                  <div key={item.key} className="grid gap-4 px-8 py-6 hover:bg-zen-cream/10 transition-colors group">
                                    <div className="flex min-w-0 items-start justify-between gap-4">
                                      <div className="min-w-0">
                                        <p className="truncate font-serif text-xl font-black text-zen-brown tracking-tight group-hover:text-zen-gold transition-colors">{item.service}</p>
                                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-zen-sand">
                                          {currency} {item.price.toLocaleString()} — {item.duration} MIN
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveServiceLine(item)}
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zen-brown/15 transition-all hover:bg-rose-50 hover:text-rose-500 hover:scale-110"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                      <div className="flex h-11 items-center rounded-xl border border-zen-stone bg-zen-cream px-3 shadow-inner">
                                        <button
                                          type="button"
                                          disabled={item.quantity <= 1}
                                          onClick={() => handleUpdateServiceQuantity(item, item.quantity - 1)}
                                          className="flex h-8 w-8 items-center justify-center rounded-lg text-zen-brown/40 transition-colors hover:bg-white hover:text-zen-brown disabled:cursor-not-allowed disabled:opacity-30 shadow-sm"
                                        >
                                          <Minus size={14} />
                                        </button>
                                        <input
                                          type="number"
                                          min={1}
                                          value={item.quantity}
                                          onChange={event => handleUpdateServiceQuantity(item, Number(event.target.value))}
                                          className="h-8 w-12 bg-transparent text-center text-base font-black text-zen-brown outline-none"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateServiceQuantity(item, item.quantity + 1)}
                                          className="flex h-8 w-8 items-center justify-center rounded-lg text-zen-brown/40 transition-colors hover:bg-white hover:text-zen-brown shadow-sm"
                                        >
                                          <Plus size={14} />
                                        </button>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs font-bold text-zen-brown/40 mb-1">{item.lineDuration} min</p>
                                        <p className="font-serif text-lg font-black text-zen-gold tracking-tighter">{currency} {item.lineTotal.toLocaleString()}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="grid grid-cols-2 gap-4 bg-zen-cream/40 px-8 py-6 border-t border-zen-stone">
                                <div className="space-y-1">
                                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zen-brown/40">Total Duration</p>
                                  <p className="text-xl font-black text-zen-brown tracking-tighter">{serviceTotals.duration} <span className="text-[11px] font-bold uppercase opacity-30">Min</span></p>
                                </div>
                                <div className="text-right space-y-1">
                                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zen-brown/40">Total Investment</p>
                                  <p className="font-serif text-2xl font-black text-zen-brown tracking-tighter">{currency} {serviceTotals.amount.toLocaleString()}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Banner Footer */}
                        <div className="py-6 border-t border-zen-stone flex items-center gap-4 shrink-0 mt-auto min-h-[90px]">
                          <div className="w-10 h-10 rounded-xl bg-zen-cream border border-zen-stone flex items-center justify-center text-zen-sand shadow-sm shrink-0">
                            <ShieldCheck size={20} strokeWidth={1.5} />
                          </div>
                          <p className="text-[9px] text-zen-brown/40 font-bold uppercase tracking-widest leading-relaxed max-w-sm">
                            Professional consultation and premium amenities <br className="hidden sm:block" /> are included with every booking.
                          </p>
                        </div>
                      </div>

                      {/* Right Column: Summary Card */}
                      <div className="lg:col-span-5 h-full relative">
                        <div className="h-full bg-zen-cream/40 rounded-[3rem] border border-zen-stone flex flex-col text-zen-brown overflow-hidden shadow-[inset_0_2px_10px_rgba(43,36,64,0.02)]">
                          {formData.service ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col p-8 lg:p-12 overflow-hidden relative">
                              <div className="flex justify-between items-start mb-10 relative z-10">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-zen-sand">
                                    <Sparkles size={12} />
                                    Selection Overview
                                  </div>
                                  <h3 className="text-3xl lg:text-4xl font-serif font-black text-zen-brown tracking-tighter leading-[1.1]">
                                    {serviceLineItems.length > 1 ? (
                                      <span className="animate-text-shine">{serviceLineItems.length} Services Selected</span>
                                    ) : formData.service}
                                  </h3>
                                </div>
                                {selectedService?.image && (
                                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white shadow-xl rotate-3 shrink-0">
                                    <img
                                      src={getServiceImage(formData.service)}
                                      alt={formData.service}
                                      className="w-full h-full object-cover"
                                      onError={(event: any) => { event.target.src = FALLBACK_SERVICE_IMAGE; }}
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                                <div className="bg-white/80 backdrop-blur-md p-5 rounded-[1.5rem] border border-zen-stone shadow-sm">
                                  <p className="text-[9px] font-black text-zen-brown/30 tracking-[0.3em] uppercase mb-1">Time Required</p>
                                  <p className="text-4xl font-serif font-black text-zen-brown">{serviceTotals.duration || 0}<span className="text-[12px] font-black uppercase ml-1.5 text-zen-sand">MIN</span></p>
                                </div>
                                <div className="bg-white/80 backdrop-blur-md p-5 rounded-[1.5rem] border border-zen-stone shadow-sm">
                                  <p className="text-[9px] font-black text-zen-brown/30 tracking-[0.3em] uppercase mb-1">Ritual Value</p>
                                  <p className="text-4xl font-serif font-black text-zen-gold">{serviceTotals.amount || 0}<span className="text-[12px] font-black uppercase ml-1.5 text-zen-gold/40">{currency}</span></p>
                                </div>
                              </div>

                              <div className="flex-1 min-h-0 overflow-y-auto pr-4 custom-scrollbar relative z-10 mb-8">
                                <p className="text-lg font-serif text-zen-brown/70 leading-relaxed italic border-l-2 border-zen-gold/20 pl-6">
                                  {selectedService?.description || 'Professional service tailored for your absolute restoration and wellness.'}
                                </p>
                                {serviceLineItems.length > 1 && (
                                  <div className="mt-8 space-y-3">
                                    {serviceLineItems.map(item => (
                                      <div key={item.key} className="flex items-center justify-between gap-4 rounded-xl bg-white/40 px-5 py-4 border border-white/60 shadow-sm group hover:border-zen-sand/40 transition-all">
                                        <span className="min-w-0 truncate font-serif text-sm font-black text-zen-brown group-hover:text-zen-gold transition-colors">{item.service} <span className="text-zen-sand text-[10px] italic ml-1">x{item.quantity}</span></span>
                                        <span className="shrink-0 font-serif font-black text-zen-gold text-sm">{currency} {item.lineTotal.toLocaleString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="pt-8 mt-auto relative z-10 min-h-[90px] flex items-end">
                                <ZenButton
                                  onClick={() => setStep(2)}
                                  disabled={!canContinueService}
                                  className="w-full py-5 bg-zen-brown text-white rounded-2xl shadow-2xl shadow-zen-brown/30 group transition-all duration-500 hover:scale-[1.02] border-none text-[11px] font-black uppercase tracking-[0.3em] overflow-hidden relative"
                                >
                                  <span className="relative z-10 flex items-center justify-center">
                                    Proceed to Specialist <ChevronRight size={18} className="ml-3 group-hover:translate-x-2 transition-transform duration-500" />
                                  </span>
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                </ZenButton>
                              </div>
                            </motion.div>
                          ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8 relative">
                               <div className="relative group cursor-default">
                                  <div className="absolute inset-0 bg-zen-gold/10 blur-3xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white border border-zen-stone/40 flex items-center justify-center shadow-[0_20px_50px_rgba(43,36,64,0.05)] relative z-10 transform group-hover:scale-105 transition-transform duration-700">
                                    <Briefcase size={40} strokeWidth={1} className="text-zen-gold/60" />
                                  </div>
                               </div>
                              <div className="space-y-3 relative z-10">
                                <p className="text-xl sm:text-2xl font-serif font-black text-zen-brown tracking-tighter uppercase opacity-30">Select a <span className="italic font-normal">Service</span></p>
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-zen-brown/20 max-w-[200px] mx-auto leading-relaxed">Choose a service to see full details</p>
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
                className="max-w-[1200px] mx-auto grid lg:grid-cols-12 gap-10"
              >
                <div className="lg:col-span-12 h-full flex flex-col">
                  <div className="flex-1 bg-white rounded-[3rem] p-8 lg:p-14 border border-zen-stone shadow-[0_32px_64px_-16px_rgba(43,36,64,0.08)] relative overflow-hidden flex flex-col min-h-0">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-8 mb-12 shrink-0 relative z-20">
                      <div className="space-y-2 text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-4 text-[10px] font-black tracking-[0.4em] uppercase text-zen-sand">
                          <span className="w-8 h-[2px] bg-zen-sand/20" />
                          Curate Your Experience
                        </div>
                        <h1 className="text-4xl lg:text-6xl font-serif font-black text-zen-brown tracking-tighter leading-none">
                          Specialist <span className="italic font-normal text-zen-gold">Selection</span>
                        </h1>
                      </div>

                      <div className="flex items-center gap-4 bg-zen-cream/50 p-2 rounded-2xl border border-zen-stone/40">
                        {steps.map(stepItem => (
                          <div key={stepItem.id} className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500 text-xs font-black ${step === stepItem.id ? 'bg-zen-brown text-white shadow-xl shadow-zen-brown/20' :
                                step > stepItem.id ? 'bg-zen-sand text-white' : 'bg-white border border-zen-stone text-zen-brown/20'
                              }`}>
                              {step > stepItem.id ? <Check size={14} strokeWidth={3} /> : <span>{stepItem.id}</span>}
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] hidden sm:block ${step === stepItem.id ? 'text-zen-brown' : 'text-zen-brown/20'}`}>{stepItem.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid lg:grid-cols-12 gap-12 flex-1 min-h-0 relative z-10">
                      <div className="lg:col-span-4 flex flex-col justify-start space-y-10">
                        <div className="flex justify-between items-center mb-2">
                          <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="flex items-center gap-4 text-[10px] font-bold tracking-widest uppercase text-zen-brown/60 hover:text-zen-brown transition-all group w-fit"
                          >
                            <div className="w-10 h-10 rounded-full border border-zen-stone flex items-center justify-center group-hover:bg-zen-brown group-hover:text-white transition-all shadow-sm">
                              <ChevronRight size={16} className="rotate-180" />
                            </div>
                            Return to Services
                          </button>
                        </div>

                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zen-sand">Expert Hands</p>
                          <h2 className="text-5xl font-serif font-black leading-tight text-zen-brown tracking-tighter">
                            Your Preferred <span className="italic font-normal text-zen-gold">Artisan</span>
                          </h2>
                        </div>

                        <div className="space-y-8">
                          <ZenDropdown
                            label="Select Specialist"
                            options={[ANY_SPECIALIST, ...filteredStaff.map(employee => employee.name)]}
                            value={formData.employee}
                            onChange={(value) => setFormData({ ...formData, employee: value, time: '' })}
                            placeholder={formData.branch ? 'Choose Professional' : 'Choose Location First'}
                            variant="pill"
                            icon={UserCircle}
                            disabled={!formData.branch}
                          />

                          {branchRooms.length > 0 && (
                            <ZenDropdown
                              label="Room Preference"
                              options={[{ label: 'Auto assign', value: '' }, ...branchRooms.map(room => ({ label: room.name, value: room.name }))]}
                              value={formData.room}
                              onChange={(value) => setFormData({ ...formData, room: value, time: '' })}
                              placeholder="Auto assign"
                              variant="pill"
                              icon={Briefcase}
                            />
                          )}

                          <div className="pt-8 border-t border-zen-stone">
                            <div className="flex items-center gap-4 p-5 rounded-2xl bg-zen-cream/50 border border-zen-stone">
                              <Info size={16} className="text-zen-sand shrink-0" />
                              <p className="text-[10px] font-bold uppercase tracking-widest text-zen-brown/60 leading-relaxed">
                                Our specialists are available <br /> for your preferred time.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="lg:col-span-8 flex flex-col min-h-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-zen-stone/40 shrink-0 gap-6">
                          <div className="space-y-1">
                            <h4 className="text-3xl font-serif font-black text-zen-brown tracking-tighter">Available Windows</h4>
                            <p className="text-[10px] font-black text-zen-sand uppercase tracking-[0.2em]">Select your appointment time</p>
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
                              {availableSlots.length > 0 ? availableSlots.map(slot => <button
                                key={slot.time}
                                type="button"
                                disabled={slot.isBooked}
                                onClick={() => setFormData({ ...formData, time: slot.time })}
                                className={`group relative overflow-hidden py-5 px-4 rounded-[1.5rem] flex flex-col items-center justify-center transition-all duration-500 border-2 ${slot.isBooked ? 'bg-zen-cream/30 text-zen-brown/10 cursor-not-allowed border-transparent' :
                                    formData.time === slot.time ? 'bg-zen-brown text-white border-zen-brown shadow-[0_20px_40px_-10px_rgba(43,36,64,0.3)] scale-[1.05] z-10' :
                                      'bg-white border-zen-stone/40 text-zen-brown font-black hover:border-zen-sand hover:shadow-xl hover:-translate-y-1'
                                  }`}
                              >
                                <span className={`relative z-10 text-[14px] tracking-tight ${slot.isBooked ? 'line-through' : ''}`}>{slot.display}</span>
                                {formData.time === slot.time && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-zen-gold animate-pulse" />}
                              </button>
                              ) : (
                                <div className="col-span-full py-24 flex flex-col items-center justify-center space-y-6 opacity-30">
                                  <Clock size={48} strokeWidth={1} />
                                  <p className="text-lg font-serif text-center max-w-sm">No availability detected for this date. Please try another day.</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-10 space-y-8 py-12">
                              <div className="p-10 rounded-full bg-zen-cream border border-zen-stone">
                                <UserIcon size={80} strokeWidth={1} />
                              </div>
                              <p className="text-xl font-serif text-center max-w-md uppercase tracking-widest leading-relaxed">Select a specialist <br /> to view their schedule.</p>
                            </div>
                          )}
                        </div>

                        {formData.time && (
                          <div className="pt-8 border-t border-zen-stone/40 mt-auto">
                            <ZenButton
                              onClick={() => setStep(3)}
                              disabled={!canContinueTime}
                              className="w-full py-5 bg-zen-sand text-white rounded-2xl shadow-2xl shadow-zen-sand/20 transition-all duration-500 hover:scale-[1.02] border-none text-[11px] font-black uppercase tracking-[0.3em] group relative overflow-hidden"
                            >
                              <span className="relative z-10 flex items-center justify-center">
                                Finalize Details <ArrowRight size={18} className="ml-3 group-hover:translate-x-2 transition-transform duration-500" />
                              </span>
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
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
                className="max-w-[1200px] mx-auto grid lg:grid-cols-12 gap-10"
              >
                <div className="lg:col-span-12 h-full flex flex-col">
                  <div className="flex-1 bg-white rounded-[3rem] p-8 lg:p-14 border border-zen-stone shadow-[0_32px_64px_-16px_rgba(43,36,64,0.08)] relative overflow-hidden flex flex-col min-h-0">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-8 mb-12 shrink-0 relative z-20">
                      <div className="space-y-2 text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-4 text-[10px] font-black tracking-[0.4em] uppercase text-zen-sand">
                          <span className="w-8 h-[2px] bg-zen-sand/20" />
                          Secure Your Ritual
                        </div>
                        <h1 className="text-4xl lg:text-6xl font-serif font-black text-zen-brown tracking-tighter leading-none">
                          Guest <span className="italic font-normal text-zen-gold">Registration</span>
                        </h1>
                      </div>

                      <div className="flex items-center gap-4 bg-zen-cream/50 p-2 rounded-2xl border border-zen-stone/40">
                        {steps.map(stepItem => (
                          <div key={stepItem.id} className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500 text-xs font-black ${step === stepItem.id ? 'bg-zen-brown text-white shadow-xl shadow-zen-brown/20' :
                                step > stepItem.id ? 'bg-zen-sand text-white' : 'bg-white border border-zen-stone text-zen-brown/20'
                              }`}>
                              {step > stepItem.id ? <Check size={14} strokeWidth={3} /> : <span>{stepItem.id}</span>}
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] hidden sm:block ${step === stepItem.id ? 'text-zen-brown' : 'text-zen-brown/20'}`}>{stepItem.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-8 relative z-20">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="flex items-center gap-4 text-[10px] font-bold tracking-widest uppercase text-zen-brown/60 hover:text-zen-brown transition-all group w-fit"
                      >
                        <div className="w-10 h-10 rounded-full border border-zen-stone flex items-center justify-center group-hover:bg-zen-brown group-hover:text-white transition-all shadow-sm">
                          <ChevronRight size={16} className="rotate-180" />
                        </div>
                        Back to Timing
                      </button>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12 flex-1 min-h-0">
                      <div className="flex flex-col space-y-10 overflow-y-auto pr-6 custom-scrollbar">
                        <div className="space-y-2">
                          <h2 className="text-5xl font-serif font-black text-zen-brown tracking-tighter">Guest <span className="italic font-normal text-zen-gold">Registry</span></h2>
                          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zen-sand">Please provide your contact details</p>
                        </div>

                        <div className="space-y-8">
                          <ZenInput
                            label="Guest Full Name"
                            placeholder="e.g. John Wick"
                            value={formData.name}
                            onChange={(event: any) => setFormData({ ...formData, name: event.target.value })}
                            icon={UserIcon}
                            required
                          />
                          <div className="grid grid-cols-2 gap-8">
                            <ZenInput
                              label="Primary Phone"
                              placeholder="+974 0000 0000"
                              value={formData.phone}
                              onChange={(event: any) => setFormData({ ...formData, phone: event.target.value })}
                              icon={Phone}
                              required
                            />
                            <ZenInput
                              label="Primary Email"
                              placeholder="guest@example.com"
                              type="email"
                              value={formData.email}
                              onChange={(event: any) => setFormData({ ...formData, email: event.target.value })}
                              icon={Mail}
                              required
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zen-brown/50 ml-1">Additional Notes</label>
                            <textarea
                              className="w-full p-6 bg-white border border-zen-stone rounded-2xl outline-none focus:border-zen-sand transition-all font-serif text-lg text-zen-brown h-32 resize-none shadow-sm"
                              placeholder="Any special requests or notes for your appointment..."
                              value={formData.notes}
                              onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col h-full min-h-0">
                        <div className="flex-1 bg-zen-cream/40 rounded-[2.5rem] p-10 lg:p-12 text-zen-brown shadow-inner flex flex-col space-y-10 relative overflow-hidden border border-zen-stone/60">
                          <div className="space-y-8 relative z-10 flex-1">
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zen-sand">Appointment Summary</p>
                              <h4 className="text-4xl lg:text-5xl font-serif font-black text-zen-brown tracking-tighter leading-tight">
                                {serviceLineItems.length > 1 ? <span className="animate-text-shine">{serviceLineItems.length} Services</span> : formData.service}
                              </h4>
                              <p className="text-sm font-black text-zen-gold flex items-center gap-2">
                                <MapPin size={12} /> {selectedBranch?.name}
                              </p>
                            </div>

                            <div className="grid grid-cols-1 gap-6 pt-8 border-t border-zen-stone/40">
                              <div className="space-y-2">
                                <p className="text-[9px] font-black uppercase text-zen-brown/30 tracking-[0.3em]">Appointment Time</p>
                                <div className="flex items-center gap-4 text-xl font-serif font-black text-zen-brown">
                                  <div className="p-3 rounded-2xl bg-white shadow-sm border border-zen-stone/40 text-zen-sand">
                                    <Calendar size={20} />
                                  </div>
                                  <span> {dayjs(formData.date).format('MMMM D, YYYY')} @ {dayjs(`${formData.date} ${formData.time}`, 'YYYY-MM-DD HH:mm').format('hh:mm A')}</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <p className="text-[9px] font-black uppercase text-zen-brown/30 tracking-[0.3em]">Specialist</p>
                                <div className="flex items-center gap-4 text-xl font-serif font-black text-zen-brown">
                                  <div className="p-3 rounded-2xl bg-white shadow-sm border border-zen-stone/40 text-zen-sand">
                                    <UserCircle size={20} />
                                  </div>
                                  <span>{formData.employee}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="pt-8 border-t border-zen-stone/40 flex items-center justify-between shrink-0">
                            <div className="text-right w-full">
                              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-zen-brown/30 mb-2">Total Amount</p>
                              <p className="text-6xl font-serif font-black text-zen-gold tracking-tighter">{formatMoney(serviceTotals.amount, currency)}</p>
                              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.3em] text-zen-brown/20 italic">
                                {serviceTotals.quantity} qty / {serviceTotals.duration} min
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-8 shrink-0 space-y-4">
                          <ZenButton
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full py-5 bg-zen-brown text-white rounded-2xl shadow-2xl shadow-zen-brown/30 group transition-all duration-500 hover:scale-[1.02] border-none text-[11px] font-black uppercase tracking-[0.3em] overflow-hidden relative"
                          >
                            <span className="relative z-10 flex items-center justify-center">
                              {submitting ? 'Authenticating...' : 'Confirm Sanctuary Booking'} <ArrowRight size={18} className="ml-4 group-hover:translate-x-2 transition-transform duration-500" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                          </ZenButton>
                          <button onClick={() => setStep(2)} className="w-full text-center text-[10px] uppercase font-black tracking-[0.4em] text-zen-brown/20 hover:text-zen-brown transition-colors">
                            Refine Appointment Time
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
                className="min-h-[600px] flex flex-col items-center justify-center text-center space-y-10"
              >
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden mx-auto shadow-2xl border-white border-[6px] relative z-10 bg-white group ring-4 ring-zen-brown/5">
                    <img
                      src={getServiceImage(formData.service)}
                      alt={formData.service}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                      onError={(event: any) => { event.target.src = FALLBACK_SERVICE_IMAGE; }}
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

                <div className="w-full max-w-md bg-white rounded-3xl p-10 shadow-xl border border-zen-stone text-left space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zen-brown/40">Service Details</p>
                    <h3 className="text-2xl font-serif font-bold text-zen-brown">
                      {serviceLineItems.length > 1 ? `${serviceLineItems.length} Services` : formData.service}
                    </h3>
                    {serviceLineItems.length > 1 && (
                      <div className="mt-4 space-y-2">
                        {serviceLineItems.map(item => (
                          <div key={item.key} className="flex items-center justify-between gap-3 text-xs font-bold text-zen-brown/55">
                            <span className="min-w-0 truncate">{item.service} x{item.quantity}</span>
                            <span className="shrink-0">{currency} {item.lineTotal.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1">
                      <p className="text-[8px] font-bold uppercase tracking-widest text-zen-brown/40">Date & Time</p>
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
                      <p className="text-[8px] font-bold uppercase tracking-widest text-zen-brown/40">Specialist</p>
                      <div className="flex items-center gap-2 text-zen-brown font-serif font-bold">
                        <UserCircle size={14} className="text-zen-sand" />
                        <span>{formData.employee}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-zen-stone flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[8px] font-bold uppercase tracking-widest text-zen-brown/40">Location</p>
                      <div className="flex items-center gap-2 text-zen-brown font-serif font-bold">
                        <MapPin size={14} className="text-zen-sand" />
                        <span>{selectedBranch?.name}</span>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[8px] font-bold uppercase tracking-widest text-zen-brown/40">Total Price</p>
                      <p className="text-2xl font-serif font-bold text-zen-sand">{formatMoney(serviceTotals.amount, currency)}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => window.location.href = user ? withBase('/dashboard') : withBase('/')}
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

        <footer className="mt-8 pt-8 border-t border-zen-brown/10 flex flex-col md:flex-row items-center justify-between gap-6 shrink-0">
          <p className="text-[9px] font-black uppercase tracking-[0.5em] text-zen-brown/30">Professional Booking Registry * v4.0 * Qatar HQ</p>
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
