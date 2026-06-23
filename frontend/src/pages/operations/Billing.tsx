import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Smartphone,
  Wallet,
  Trash2,
  Receipt,
  Sparkles,
  Split,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  BarChart3,
  UserCheck,
  Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { BranchSelector } from '../../components/zen/BranchSelector';
import { ZenBadge, ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { ZenStatCard } from '../../components/zen/ZenStatCard';
import { ZenDropdown, ZenMasterCalendar } from '../../components/zen/ZenInputs';
import { notify } from '../../components/shared/ZenNotification';
import { useSettings } from '../../context/SettingsContext';
import { useData } from '../../context/DataContext';
import { useBranches } from '../../context/BranchContext';
import { ExportPopup, ExportColumn } from '../../components/shared/ExportPopup';

dayjs.extend(isBetween);

interface Service {
  _id: string;
  name: string;
  price: number;
  duration: number;
}

interface Membership {
  _id: string;
  status: string;
  totalSessions: number;
  remainingSessions: number;
  plan: {
    _id: string;
    name: string;
    discountType: string;
    discountValue: number;
    applicableServices: string[];
  };
}

interface Client {
  _id?: string;
  name: string;
  phone: string;
  email?: string;
  clientId?: string;
  branch?: any;
  referralCode?: string;
  referredBy?: string | { _id?: string; name?: string; clientId?: string; referralCode?: string };
  referralRewardBalance?: number;
  referralDiscountUsed?: number;
  totalReferrals?: number;
  referrals?: any[];
}

interface EmployeeRecord {
  _id?: string;
  name: string;
  status?: string;
  branch?: any;
}

interface CompletedAppointment {
  _id?: string;
  client: string;
  clientId?: any;
  service: string;
  serviceId?: any;
  quantity?: number;
  employee: string;
  employeeId?: any;
  completedByEmployeeId?: any;
  completedByName?: string;
  completedAt?: string;
  date: string;
  time: string;
  branch?: any;
  clientPhone?: string;
  clientEmail?: string;
  referralCustomer?: string;
  referralCode?: string;
  addOns?: any[];
  billedInvoiceId?: any;
  status?: string;
  serviceType?: string;
  membershipId?: any;
  bookingType?: string;
}

const getEntityId = (value: any) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
};

const normalizeToken = (value: any) => String(value || '').trim().toLowerCase();

const normalizeQuantity = (value: any) => {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity < 1) return 1;
  return Math.floor(quantity);
};

const buildDateWindow = (dateRange: any) => {
  if (!dateRange || dateRange === 'All') return { startDate: '', endDate: '' };

  const now = dayjs();
  if (typeof dateRange === 'string') {
    if (dateRange === 'Today') return { startDate: now.format('YYYY-MM-DD'), endDate: now.format('YYYY-MM-DD') };
    if (dateRange.length === 10) return { startDate: dateRange, endDate: dateRange };
  }

  if (dateRange.from || dateRange.to) {
    return {
      startDate: dateRange.from || dateRange.to || '',
      endDate: dateRange.to || dateRange.from || ''
    };
  }

  return { startDate: '', endDate: '' };
};

const buildTimeWindow = (dateRange: any) => {
  if (!dateRange || typeof dateRange !== 'object') return { startTime: '', endTime: '' };
  return {
    startTime: dateRange.fromTime || '',
    endTime: dateRange.toTime || ''
  };
};

const parseTimeToMinutes = (value?: string) => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const period = match[3]?.toUpperCase();

  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes < 0 || minutes > 59) return null;
  if (period) {
    if (hours < 1 || hours > 12) return null;
    if (period === 'AM') hours = hours === 12 ? 0 : hours;
    if (period === 'PM') hours = hours === 12 ? 12 : hours + 12;
  } else if (hours < 0 || hours > 23) {
    return null;
  }

  return hours * 60 + minutes;
};

const isWithinTimeWindow = (appointmentTime: string | undefined, startTime: string, endTime: string) => {
  if (!startTime && !endTime) return true;

  const appointmentMinutes = parseTimeToMinutes(appointmentTime);
  if (appointmentMinutes === null) return false;

  const startMinutes = startTime ? parseTimeToMinutes(startTime) : 0;
  const endMinutes = endTime ? parseTimeToMinutes(endTime) : (24 * 60 - 1);
  if (startMinutes === null || endMinutes === null) return true;

  if (startMinutes <= endMinutes) {
    return appointmentMinutes >= startMinutes && appointmentMinutes <= endMinutes;
  }

  return appointmentMinutes >= startMinutes || appointmentMinutes <= endMinutes;
};

const hasDateTimeSelection = (value: any) => {
  if (!value) return false;
  if (typeof value === 'string') return value !== 'All';
  return Boolean(value.from || value.to || value.fromTime || value.toTime);
};

const Billing = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useSettings();
  const { invoices, clients: rawClients, services: rawServices, employees: rawEmployees, appointments: rawAppointments, refreshData } = useData();
  const { selectedBranch, setSelectedBranch, branches } = useBranches();

  const effectiveBranchId = selectedBranch !== 'all' ? selectedBranch : getEntityId(user?.branch);
  const isInBillingBranch = (entity: any) => {
    if (!effectiveBranchId) return true;
    return getEntityId(entity?.branch) === effectiveBranchId;
  };

  const billedAppointmentIds = useMemo(() => {
    const ids = new Set<string>();
    invoices.forEach((invoice: any) => {
      (invoice.items || []).forEach((item: any) => {
        const appointmentId = getEntityId(item.appointmentId);
        if (appointmentId) ids.add(appointmentId);
      });
    });
    return ids;
  }, [invoices]);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState<string | null>(null);
  const [billingAppointmentId, setBillingAppointmentId] = useState<string>(() => searchParams.get('appointmentId') || '');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');
  const [completedAppointments, setCompletedAppointments] = useState<CompletedAppointment[]>([]);
  const [loadingCompletedAppointments, setLoadingCompletedAppointments] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [queueDateRange, setQueueDateRange] = useState<any>('All');
  const [queueEmployeeId, setQueueEmployeeId] = useState('all');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('Fixed');
  const [referralDiscount, setReferralDiscount] = useState(0);
  const [selectedReferralClientId, setSelectedReferralClientId] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState('Card');
  const [payments, setPayments] = useState<any[]>([
    { mode: 'Cash', amount: 0 },
    { mode: 'Card', amount: 0 },
    { mode: 'UPI', amount: 0 },
    { mode: 'GPay', amount: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [activeMembership, setActiveMembership] = useState<Membership | null>(null);
  const [gstRates, setGstRates] = useState<any[]>([]);
  const [selectedGSTRate, setSelectedGSTRate] = useState<any>(null);

  const [discountInput, setDiscountInput] = useState('');

  // Synchronize string input fields with numeric state values safely to avoid input cursor jumps and zero/dot typing issues
  useEffect(() => {
    const num = parseFloat(discountInput) || 0;
    if (num !== discount) {
      setDiscountInput(discount === 0 ? '' : String(discount));
    }
  }, [discount, discountInput]);

  const clients = useMemo(() => {
    // Collect client IDs and names from completed and unbilled appointments
    const completedUnbilledClientKeys = new Set<string>();

    (rawAppointments || []).forEach((apt: any) => {
      const isCompleted = apt.status === 'Completed';
      const appointmentId = getEntityId(apt);
      const isBilled = appointmentId && (billedAppointmentIds.has(appointmentId) || apt.billedInvoiceId);

      if (isCompleted && !isBilled) {
        const clientId = getEntityId(apt.clientId || apt.clientId?._id);
        if (clientId) {
          completedUnbilledClientKeys.add(clientId.toLowerCase());
        }
        const clientName = String(apt.client || '').trim().toLowerCase();
        if (clientName) {
          completedUnbilledClientKeys.add(clientName);
        }
      }
    });

    // Return active clients that have at least one completed, unbilled appointment
    // OR the currently selected client (to ensure it stays visible during editing)
    return rawClients.filter((c: any) => {
      if (selectedClient && c._id === selectedClient._id) return true;

      const isActive = c.status === 'Active';
      if (!isActive) return false;

      const hasCompleted = completedUnbilledClientKeys.has(c._id?.toLowerCase()) ||
        completedUnbilledClientKeys.has(String(c.name || '').trim().toLowerCase());
      return hasCompleted;
    });
  }, [rawClients, rawAppointments, billedAppointmentIds, selectedClient]);

  const billingAppointment = useMemo(() => {
    if (!billingAppointmentId) return null;
    return (rawAppointments || []).find((apt: any) => getEntityId(apt) === billingAppointmentId) || null;
  }, [rawAppointments, billingAppointmentId]);

  useEffect(() => {
    if (!selectedClient?._id) return;
    const freshClient = rawClients.find((client: any) => client._id === selectedClient._id);
    if (freshClient) {
      setSelectedClient(prev => prev?._id === freshClient._id ? { ...prev, ...freshClient } : prev);
    }
  }, [rawClients, selectedClient?._id]);

  const services = useMemo(() => rawServices.filter((s: any) => s.status === 'Active' && isInBillingBranch(s)), [rawServices, effectiveBranchId]);
  const branchEmployees = useMemo(() => rawEmployees.filter((e: EmployeeRecord) =>
    (!e.status || e.status === 'Active') && isInBillingBranch(e)
  ), [rawEmployees, effectiveBranchId]);

  const billableAppointments = useMemo(() => {
    return (rawAppointments || [])
      .filter((apt: CompletedAppointment) => {
        const appointmentId = getEntityId(apt);
        if (!appointmentId) return false;
        if (apt.status !== 'Completed') return false;
        if (apt.billedInvoiceId || billedAppointmentIds.has(appointmentId)) return false;
        if (effectiveBranchId && getEntityId(apt.branch) !== effectiveBranchId) return false;
        return true;
      })
      .sort((a: CompletedAppointment, b: CompletedAppointment) => {
        const aTime = dayjs(`${a.date || ''} ${a.time || '00:00'}`).valueOf();
        const bTime = dayjs(`${b.date || ''} ${b.time || '00:00'}`).valueOf();
        return bTime - aTime;
      });
  }, [rawAppointments, billedAppointmentIds, effectiveBranchId]);

  const queueDateWindow = useMemo(() => buildDateWindow(queueDateRange), [queueDateRange]);
  const queueTimeWindow = useMemo(() => buildTimeWindow(queueDateRange), [queueDateRange]);

  const getAppointmentSpecialistId = (appointment: CompletedAppointment) => (
    getEntityId(appointment.completedByEmployeeId || appointment.employeeId)
  );

  const filteredBillableAppointments = useMemo(() => {
    return billableAppointments.filter((appointment) => {
      if (queueEmployeeId !== 'all' && getAppointmentSpecialistId(appointment) !== queueEmployeeId) {
        return false;
      }

      if (queueDateWindow.startDate && queueDateWindow.endDate) {
        const appointmentDate = dayjs(appointment.date);
        if (!appointmentDate.isBetween(dayjs(queueDateWindow.startDate), dayjs(queueDateWindow.endDate), 'day', '[]')) {
          return false;
        }
      }

      return isWithinTimeWindow(appointment.time, queueTimeWindow.startTime, queueTimeWindow.endTime);
    });
  }, [billableAppointments, queueEmployeeId, queueDateWindow, queueTimeWindow]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  useEffect(() => {
    fetchGSTRates();
  }, []);

  useEffect(() => {
    if (selectedClient && !clients.some(client => client._id === selectedClient._id)) {
      setSelectedClient(null);
      setCompletedAppointments([]);
      setInvoiceItems([]);
    }
    setSelectedEmployeeId('all');
  }, [effectiveBranchId]);

  useEffect(() => {
    if (selectedEmployeeId !== 'all' && !branchEmployees.some((employee: EmployeeRecord) => employee._id === selectedEmployeeId)) {
      setSelectedEmployeeId('all');
    }
    if (queueEmployeeId !== 'all' && !branchEmployees.some((employee: EmployeeRecord) => employee._id === queueEmployeeId)) {
      setQueueEmployeeId('all');
    }
  }, [branchEmployees, selectedEmployeeId, queueEmployeeId]);

  // Cap percentage discount to 100% when entering or switching modes
  useEffect(() => {
    if (discountType === 'Percentage' && discount > 100) {
      setDiscount(100);
    }
  }, [discountType, discount]);

  useEffect(() => {
    const { clientId, invoiceId, appointmentId, branchId, employeeId } = location.state || {};
    const queryAppointmentId = searchParams.get('appointmentId') || '';
    const targetAppointmentId = appointmentId || queryAppointmentId;

    if (invoiceId) {
      // Prioritize loading the invoice first
      fetchInvoiceDetails(invoiceId);
    }

    if (targetAppointmentId) {
      setBillingAppointmentId(targetAppointmentId);
      if (branchId) setSelectedBranch(branchId);
      if (employeeId) setSelectedEmployeeId(employeeId);
    }

    if (clientId && clientId !== '-' && rawClients.length > 0) {
      const targetClient = rawClients.find((c: any) => c._id === clientId);
      if (targetClient) {
        setSelectedClient(targetClient);
        fetchCompletedAppointmentsForClient(targetClient._id);
      }
    }

    if (location.state) {
      // Clear state to avoid re-triggering on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, rawClients, searchParams]);

  useEffect(() => {
    if (!billingAppointment || selectedClient || editingInvoiceId) return;

    const appointmentClientId = getEntityId(billingAppointment.clientId);
    const targetClient = rawClients.find((c: any) =>
      (appointmentClientId && c._id === appointmentClientId) ||
      String(c.name || '').trim().toLowerCase() === String(billingAppointment.client || '').trim().toLowerCase()
    );

    if (targetClient) {
      setSelectedClient(targetClient);
    } else {
      setSelectedClient({
        _id: appointmentClientId,
        name: billingAppointment.client || billingAppointment.clientId?.name || 'Walk-in Client',
        phone: billingAppointment.clientPhone || ''
      });
    }

    const appointmentBranchId = getEntityId(billingAppointment.branch);
    const appointmentEmployeeId = getEntityId(billingAppointment.completedByEmployeeId || billingAppointment.employeeId);
    if (appointmentBranchId) setSelectedBranch(appointmentBranchId);
    if (appointmentEmployeeId) setSelectedEmployeeId(appointmentEmployeeId);
  }, [billingAppointment, rawClients, selectedClient, editingInvoiceId]);

  const fetchInvoiceDetails = async (invoiceId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/invoices/${invoiceId}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const inv = data.data || data;

        setEditingInvoiceId(inv._id);
        setOriginalInvoiceNumber(inv.invoiceNumber);
        setDiscount(inv.discount || 0);
        setReferralDiscount(inv.referralDiscountAmount || 0);
        setSelectedReferralClientId(inv.referralDiscountCode || '');
        setPaymentMode(inv.paymentMode || 'Card');

        // If client is not set yet (e.g. Walk-in), try to resolve it from the invoice
        if (!selectedClient && inv.clientId) {
          const invClientId = typeof inv.clientId === 'string' ? inv.clientId : inv.clientId._id;
          const targetClient = rawClients.find((c: any) => c._id === invClientId);
          if (targetClient) {
            setSelectedClient(targetClient);
            fetchCompletedAppointmentsForClient(targetClient._id);
          } else {
            // Fallback to name if ID not in current list
            setSelectedClient({ _id: invClientId, name: inv.clientName, phone: '' });
          }
        } else if (!selectedClient) {
          // Pure Walk-in
          setSelectedClient({ _id: '', name: inv.clientName || 'Walk-in Client', phone: '' });
        }

        if (inv.branch) {
          const bId = typeof inv.branch === 'string' ? inv.branch : inv.branch._id;
          if (bId) setSelectedBranch(bId);
        }

        if (inv.gstName && gstRates.length > 0) {
          const percentage = parseFloat(inv.gstName);
          const rate = gstRates.find(r => r.percentage === percentage);
          if (rate) setSelectedGSTRate(rate);
        }
        if (inv.paymentMode === 'Split' && Array.isArray(inv.payments)) {
          const nextPayments = payments.map(p => {
            const found = inv.payments.find((ip: any) => ip.mode === p.mode);
            return found ? { ...p, amount: found.amount } : p;
          });
          setPayments(nextPayments);
        }

        // Map items to the format expected by the state
        const mappedItems = (inv.items || []).map((item: any, idx: number) => ({
          uniqueId: Date.now() + idx, // New unique ID for local tracking
          appointmentId: item.appointmentId,
          serviceId: item.serviceId,
          _id: item.serviceId,
          name: item.name,
          price: item.price,
          originalPrice: item.originalPrice || item.price,
          serviceType: item.serviceType || 'REGULAR',
          isMembershipCovered: item.isMembershipCovered || false,
          membershipPlanName: item.membershipPlanName || '',
          duration: item.duration || 0,
          quantity: item.quantity || 1,
          specialist: item.specialist,
          specialistName: item.specialistName || 'Unassigned',
          branch: inv.branch,
          isRedeem: item.serviceType === 'MEMBERSHIP' || item.isMembershipCovered
        }));

        setInvoiceItems(mappedItems);
      }
    } catch (e) {
      notify('error', 'Load Error', 'Could not retrieve invoice details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGSTRates = async () => {
    try {
      const res = await fetch(`${API_URL}/gst`, { headers: { 'Authorization': `Bearer ${user?.token}` } });
      const data = await res.json();
      const rates = Array.isArray(data) ? data : (data?.data || []);
      if (Array.isArray(rates)) {
        setGstRates(rates);
        const active = rates.find(r => r.isActive);
        if (active) setSelectedGSTRate(active);
        else if (rates.length > 0) setSelectedGSTRate(rates[0]);
      }
    } catch (e) { }
  };

  const subtotal = useMemo(() => {
    return invoiceItems.reduce((acc, item) => acc + (item.isRedeem ? 0 : ((item.price || 0) * normalizeQuantity(item.quantity))), 0);
  }, [invoiceItems]);

  const membershipCoversService = (serviceId: string, entry: any = {}) => {
    if (entry.isMembershipCovered === true || entry.bookingType === 'Membership' || entry.serviceType === 'MEMBERSHIP') {
      return true;
    }
    if (!activeMembership) return false;
    const applicableServices = (activeMembership.plan?.applicableServices || []).map((id: any) => getEntityId(id));
    return applicableServices.length === 0 || (!!serviceId && applicableServices.includes(serviceId));
  };


  const fetchCompletedAppointmentsForClient = async (clientId: string) => {
    if (!clientId) {
      setCompletedAppointments([]);
      return;
    }

    setLoadingCompletedAppointments(true);
    try {
      const params = new URLSearchParams({
        clientId,
        status: 'Completed',
        limit: '200'
      });
      if (effectiveBranchId) params.set('branch', effectiveBranchId);

      const res = await fetch(`${API_URL}/appointments?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await res.json();
      const rows = Array.isArray(data) ? data : (data?.data || []);
      setCompletedAppointments(Array.isArray(rows) ? rows : []);
    } catch (_error) {
      setCompletedAppointments([]);
      notify('error', 'Sync Error', 'Unable to fetch completed appointment services.');
    } finally {
      setLoadingCompletedAppointments(false);
    }
  };

  const completedServiceSourceAppointments = useMemo(() => {
    const rows = [...completedAppointments];
    if (
      billingAppointment &&
      billingAppointment.status === 'Completed' &&
      !billingAppointment.billedInvoiceId &&
      !billedAppointmentIds.has(getEntityId(billingAppointment)) &&
      !rows.some((appointment) => getEntityId(appointment) === getEntityId(billingAppointment))
    ) {
      rows.unshift(billingAppointment);
    }
    return rows;
  }, [completedAppointments, billingAppointment, billedAppointmentIds]);

  const completedServiceItems = useMemo(() => {
    const serviceByName = new Map<string, any>(services.map((service: any) => [service.name, service]));
    const serviceById = new Map<string, any>(services.map((service: any) => [getEntityId(service), service]));
    const rows: any[] = [];

    const appendServiceLine = (appointment: CompletedAppointment, entry: any, index: number) => {
      const appointmentId = getEntityId(appointment);
      if (!appointmentId || billedAppointmentIds.has(appointmentId) || appointment.billedInvoiceId) return;
      if (billingAppointmentId && appointmentId !== billingAppointmentId) return;

      const serviceName = entry.service || entry.name || appointment.service;
      const serviceId = getEntityId(entry.serviceId || appointment.serviceId);
      const service = (serviceId && serviceById.get(serviceId)) || serviceByName.get(serviceName);
      const specialistId = getEntityId(appointment.completedByEmployeeId || appointment.employeeId);
      const specialistName = appointment.completedByName || appointment.employeeId?.name || appointment.employee || 'Unassigned';

      if (selectedEmployeeId !== 'all' && specialistId !== selectedEmployeeId) return;

      const isMembership = membershipCoversService(serviceId || getEntityId(service), entry);
      const originalPrice = Number(entry.price ?? service?.price ?? 0) || 0;
      const price = isMembership ? 0 : originalPrice;

      rows.push({
        uniqueId: `${appointmentId}-${index}`,
        appointmentId,
        serviceId: serviceId || service?._id || '',
        _id: serviceId || service?._id || '',
        name: service?.name || serviceName,
        price,
        originalPrice,
        serviceType: isMembership ? 'MEMBERSHIP' : 'REGULAR',
        isMembershipCovered: isMembership,
        membershipPlanName: isMembership ? activeMembership?.plan?.name || entry.membershipPlanName || '' : '',
        duration: Number(entry.duration ?? service?.duration ?? 0) || 0,
        quantity: normalizeQuantity(entry.quantity ?? appointment.quantity),
        specialist: specialistId || '',
        specialistName,
        appointmentDate: appointment.date,
        appointmentTime: appointment.time,
        branch: getEntityId(appointment.branch),
        isRedeem: isMembership
      });
    };

    completedServiceSourceAppointments.forEach((appointment) => {
      appendServiceLine(appointment, {
        service: appointment.service,
        serviceId: appointment.serviceId,
        quantity: appointment.quantity
      }, 0);

      (appointment.addOns || []).forEach((addOn, index) => {
        appendServiceLine(appointment, addOn, index + 1);
      });
    });

    return rows;
  }, [completedServiceSourceAppointments, services, billedAppointmentIds, selectedEmployeeId, activeMembership, billingAppointmentId]);

  useEffect(() => {
    if (!editingInvoiceId) {
      setInvoiceItems(completedServiceItems);
    }
  }, [completedServiceItems, editingInvoiceId]);

  const lastLoadedClientIdRef = useRef('');

  useEffect(() => {
    const clientId = selectedClient?._id;
    if (clientId && clientId.length === 24) {
      const isNewClient = clientId !== lastLoadedClientIdRef.current;
      lastLoadedClientIdRef.current = clientId;
      fetchClientMembership(clientId, isNewClient);
      fetchCompletedAppointmentsForClient(clientId);
    } else {
      if (!editingInvoiceId) {
        setActiveMembership(null);
        setDiscount(0);
        setReferralDiscount(0);
        setSelectedReferralClientId('');
        setCompletedAppointments([]);
      }
      lastLoadedClientIdRef.current = '';
    }
  }, [selectedClient?._id, effectiveBranchId, editingInvoiceId]);

  const fetchClientMembership = async (clientId: string, shouldSetDiscount = false) => {
    try {
      const res = await fetch(`${API_URL}/memberships/client/${clientId}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await res.json();
      const memberships = Array.isArray(data) ? data : (data?.data || []);
      const active = memberships.find((m: any) => m.status === 'Active');
      if (active) {
        setActiveMembership(active);
        if (shouldSetDiscount && active.plan.discountValue > 0 && !editingInvoiceId) {
          setDiscount(active.plan.discountValue);
          setDiscountType(active.plan.discountType);
        }
      } else {
        setActiveMembership(null);
        if (shouldSetDiscount && !editingInvoiceId) {
          setDiscount(0);
          setReferralDiscount(0);
          setSelectedReferralClientId('');
        }
      }
    } catch (error) {
      console.error('Failed to fetch membership');
    }
  };

  const isGstEnabled = settings?.billing?.gstEnabled;
  const gst = isGstEnabled ? (subtotal * (selectedGSTRate?.percentage || 0) / 100) : 0;
  const discountAmount = discountType === 'Percentage' ? (subtotal * discount / 100) : discount;
  const referralBalance = Number(selectedClient?.referralRewardBalance || 0);
  const currency = settings?.general.currencySymbol || 'QR';
  const hasPriorClientInvoice = useMemo(() => {
    const clientId = selectedClient?._id;
    if (!clientId || clientId.length !== 24) return false;
    return invoices.some((invoice: any) => (
      getEntityId(invoice.clientId) === clientId &&
      (!editingInvoiceId || invoice._id !== editingInvoiceId)
    ));
  }, [invoices, selectedClient?._id, editingInvoiceId]);
  const referredByLabel = useMemo(() => {
    const referrer = selectedClient?.referredBy;
    if (!referrer) return '';
    if (typeof referrer === 'string') return referrer;
    return referrer.name || referrer.referralCode || referrer.clientId || referrer._id || '';
  }, [selectedClient?.referredBy]);
  const appointmentReferralLabel = useMemo(() => {
    const rawReferral = billingAppointment?.referralCustomer || billingAppointment?.referralCode || '';
    if (!rawReferral) return '';
    const lookup = normalizeToken(rawReferral);
    const referrer = rawClients.find((client: any) => [
      client._id,
      client.clientId,
      client.referralCode,
      client.name,
      client.email,
      client.phone
    ].some(value => normalizeToken(value) === lookup));
    return referrer?.name || rawReferral;
  }, [billingAppointment?.referralCustomer, billingAppointment?.referralCode, rawClients]);
  const referralSourceLabel = referredByLabel || appointmentReferralLabel;
  const availableReferrals = useMemo(() => {
    if (!selectedClient || !Array.isArray(selectedClient.referrals)) return [];
    return selectedClient.referrals.filter((ref: any) => 
      (ref.referralDiscount > 0 && !ref.usedDate) || ref._id === selectedReferralClientId
    );
  }, [selectedClient, selectedReferralClientId]);

  const availableReferralDiscount = selectedReferralClientId ? 50 : 0;
  const referralStatusText = `${availableReferrals.length} referral reward${availableReferrals.length === 1 ? '' : 's'} available`;
  const appliedReferralDiscount = Math.min(
    Math.max(Number(referralDiscount) || 0, 0),
    availableReferralDiscount,
    Math.max(subtotal + gst - discountAmount, 0)
  );
  const total = Math.max(subtotal + gst - discountAmount - appliedReferralDiscount, 0);

  const getAppointmentBillableValue = (appointment: CompletedAppointment) => {
    const serviceByName = new Map<string, any>(services.map((service: any) => [service.name, service]));
    const serviceById = new Map<string, any>(services.map((service: any) => [getEntityId(service), service]));
    const valueForEntry = (entry: any, fallbackServiceName?: string, fallbackServiceId?: any, fallbackQuantity?: any) => {
      const serviceName = entry?.service || entry?.name || fallbackServiceName || '';
      const serviceId = getEntityId(entry?.serviceId || fallbackServiceId);
      const service = (serviceId && serviceById.get(serviceId)) || serviceByName.get(serviceName);
      const quantity = normalizeQuantity(entry?.quantity ?? fallbackQuantity);
      const price = Number(entry?.price ?? service?.price ?? 0) || 0;
      return price * quantity;
    };

    return valueForEntry(appointment, appointment.service, appointment.serviceId, appointment.quantity) +
      (appointment.addOns || []).reduce((sum, addOn) => sum + valueForEntry(addOn), 0);
  };

  const billingStats = useMemo(() => {
    const branchInvoices = invoices.filter((invoice: any) => !effectiveBranchId || getEntityId(invoice.branch) === effectiveBranchId);
    const todayInvoices = branchInvoices.filter((invoice: any) => dayjs(invoice.date).isSame(dayjs(), 'day'));
    const readyValue = filteredBillableAppointments.reduce((sum, appointment) => sum + getAppointmentBillableValue(appointment), 0);
    const collectedValue = branchInvoices.reduce((sum: number, invoice: any) => sum + (Number(invoice.total) || 0), 0);

    return {
      readyCount: filteredBillableAppointments.length,
      readyValue,
      stagedCount: invoiceItems.length,
      todayCount: todayInvoices.length,
      displayTotal: billingAppointmentId ? total : collectedValue
    };
  }, [invoices, effectiveBranchId, filteredBillableAppointments, services, invoiceItems.length, billingAppointmentId, total]);

  const billingStatCards = [
    {
      label: 'Ready Bills',
      value: billingStats.readyCount.toString(),
      icon: BarChart3,
      trend: 'Completed appointments',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      glow: 'bg-blue-500/20',
      delay: 0
    },
    {
      label: 'Queue Value',
      value: `${currency} ${billingStats.readyValue.toLocaleString()}`,
      icon: Clock,
      trend: 'Awaiting invoice',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      glow: 'bg-amber-500/20',
      delay: 0.2
    },
    {
      label: 'Staged Items',
      value: billingStats.stagedCount.toString(),
      icon: CheckCircle2,
      trend: billingAppointmentId ? 'Current invoice' : `${billingStats.todayCount} billed today`,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      glow: 'bg-purple-500/20',
      delay: 0.4
    },
    {
      label: billingAppointmentId ? 'Settlement' : 'Fulfillment',
      value: `${currency} ${billingStats.displayTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      icon: UserCheck,
      trend: billingAppointmentId ? 'Final total' : 'Collected ledger',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      glow: 'bg-emerald-500/20',
      delay: 0.6
    }
  ];

  const renderBillingStats = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 pt-2 pb-8 px-1 sm:px-2">
      {billingStatCards.map((stat) => (
        <ZenStatCard key={stat.label} {...stat} />
      ))}
    </div>
  );

  const toggleRedeem = (uniqueId: number) => {
    setInvoiceItems(invoiceItems.map(item => {
      if (item.uniqueId === uniqueId) {
        if (!activeMembership) {
          notify('warning', 'Requirement Not Met', 'Registry shows no active privilege for this ambassador');
          return item;
        }
        if (activeMembership.remainingSessions <= 0 && activeMembership.totalSessions > 0) {
          notify('error', 'Limit Exceeded', 'The current membership cycle balance is fully utilized');
          return item;
        }

        const isCurrentlyRedeeming = !item.isRedeem;

        // If they are trying to redeem, check if the service is applicable to this plan
        if (isCurrentlyRedeeming) {
          const applicableServices = (activeMembership.plan?.applicableServices || []).map((id: any) => getEntityId(id));
          const serviceId = getEntityId(item.serviceId || item._id);
          const isApplicable = applicableServices.length === 0 || applicableServices.includes(serviceId);

          if (!isApplicable) {
            notify('error', 'Service Not Included', `The service "${item.name}" is not covered by the ${activeMembership.plan.name} plan.`);
            return item;
          }
        }

        const totalRedeemedAlready = invoiceItems.filter(i => i.isRedeem && i.uniqueId !== uniqueId).length;

        if (isCurrentlyRedeeming && (totalRedeemedAlready >= activeMembership.remainingSessions)) {
          notify('error', 'Insufficient Balance', 'Cannot allocate more redemptions than registered balance');
          return item;
        }

        return { ...item, isRedeem: isCurrentlyRedeeming };
      }
      return item;
    }));
  };

  const handleRemoveItem = (uniqueId: number) => {
    setInvoiceItems(invoiceItems.filter(item => item.uniqueId !== uniqueId));
  };

  const resolveClientForAppointment = (appointment: CompletedAppointment) => {
    const appointmentClientId = getEntityId(appointment.clientId);
    return rawClients.find((client: any) =>
      (appointmentClientId && client._id === appointmentClientId) ||
      String(client.name || '').trim().toLowerCase() === String(appointment.client || '').trim().toLowerCase()
    ) || {
      _id: appointmentClientId,
      name: appointment.client || appointment.clientId?.name || 'Walk-in Client',
      phone: appointment.clientId?.phone || ''
    };
  };

  const handleStartBilling = (appointment: CompletedAppointment) => {
    const appointmentId = getEntityId(appointment);
    if (!appointmentId) return;

    const appointmentBranchId = getEntityId(appointment.branch);
    const appointmentEmployeeId = getEntityId(appointment.completedByEmployeeId || appointment.employeeId);

    setBillingAppointmentId(appointmentId);
    setSearchParams({ appointmentId });
    setEditingInvoiceId(null);
    setOriginalInvoiceNumber(null);
    setInvoiceItems([]);
    setCompletedAppointments([]);
    setDiscount(0);
    setReferralDiscount(0);
    setSelectedReferralClientId('');
    setPayments(payments.map(p => ({ ...p, amount: 0 })));
    setPaymentMode('Card');
    if (appointmentBranchId) setSelectedBranch(appointmentBranchId);
    if (appointmentEmployeeId) setSelectedEmployeeId(appointmentEmployeeId);
    setSelectedClient(resolveClientForAppointment(appointment));
  };

  const handleBackToBillingQueue = () => {
    setBillingAppointmentId('');
    setSearchParams({});
    setSelectedClient(null);
    setEditingInvoiceId(null);
    setOriginalInvoiceNumber(null);
    setCompletedAppointments([]);
    setInvoiceItems([]);
    setDiscount(0);
    setReferralDiscount(0);
    setSelectedReferralClientId('');
    setPayments(payments.map(p => ({ ...p, amount: 0 })));
    setPaymentMode('Card');
  };

  const handleConfirmPayment = async () => {
    if (!selectedClient || invoiceItems.length === 0) {
      notify('error', 'Validation Failed', 'Select a client with completed appointment services first.');
      return;
    }

    const invoiceBranch = effectiveBranchId || invoiceItems[0]?.branch;
    if (!invoiceBranch) {
      notify('error', 'Branch Required', 'Select a branch before authorizing billing.');
      return;
    }

    const hasMixedBranches = invoiceItems.some(item => item.branch && item.branch !== invoiceBranch);
    if (hasMixedBranches) {
      notify('error', 'Branch Mismatch', 'Completed services from multiple branches cannot be billed together.');
      return;
    }

    if (paymentMode === 'Split') {
      const splitTotal = payments.reduce((acc, p) => acc + p.amount, 0);
      if (Math.abs(splitTotal - total) > 0.01) {
        notify('error', 'Settlement Mismatch', `The split total (${splitTotal.toFixed(2)}) must exactly align with final total (${total.toFixed(2)})`);
        return;
      }
    }

    if (appliedReferralDiscount > 0) {
      if (!selectedClient._id || selectedClient._id.length !== 24) {
        notify('error', 'Referral Unavailable', 'Referral discount can only be applied to a registered client profile.');
        return;
      }
      if (appliedReferralDiscount > availableReferralDiscount) {
        notify('error', 'Referral Limit', 'Referral discount exceeds the available referral discount.');
        return;
      }
    }

    setLoading(true);
    const nextNumber = editingInvoiceId && originalInvoiceNumber
      ? originalInvoiceNumber
      : `INV-${dayjs().year()}-${String(invoices.length + 1).padStart(3, '0')}`;

    const newInvoice = {
      invoiceNumber: nextNumber,
      clientId: selectedClient._id || undefined,
      clientName: selectedClient.name,
      items: invoiceItems.map(i => ({
        appointmentId: i.appointmentId,
        serviceId: i.serviceId || i._id,
        name: i.name,
        price: i.price,
        originalPrice: i.originalPrice,
        serviceType: i.serviceType,
        isMembershipCovered: i.isMembershipCovered || i.isRedeem || false,
        membershipPlanName: i.membershipPlanName || undefined,
        duration: i.duration,
        quantity: normalizeQuantity(i.quantity),
        specialist: i.specialist || undefined,
        specialistName: i.specialistName
      })),
      subtotal,
      gst,
      gstName: selectedGSTRate ? `${selectedGSTRate.percentage}%` : 'Tax',
      discount: discountAmount,
      referralDiscountAmount: appliedReferralDiscount,
      referralDiscountCode: selectedReferralClientId || undefined,
      total,
      paymentMode,
      payments: paymentMode === 'Split' ? payments.filter(p => p.amount > 0) : [{ mode: paymentMode, amount: total }],
      date: dayjs().format('YYYY-MM-DD'),
      branch: invoiceBranch
    };

    try {
      const url = editingInvoiceId ? `${API_URL}/invoices/${editingInvoiceId}` : `${API_URL}/invoices`;
      const method = editingInvoiceId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(newInvoice)
      });

      if (response.ok) {
        const savedInvoice = await response.json();

        const redemptions = invoiceItems.filter(item => item.isRedeem);
        if (redemptions.length > 0 && activeMembership) {
          for (const item of redemptions) {
            await fetch(`${API_URL}/memberships/${activeMembership._id}/redeem`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user?.token}`
              },
              body: JSON.stringify({
                serviceId: item._id,
                notes: `System Settlement via Invoice ${nextNumber}`,
                branchId: newInvoice.branch
              })
            });
          }
        }

        notify('success', 'Billing Updated', editingInvoiceId ? 'Invoice has been harmonized successfully.' : 'Billing records have been synchronized successfully.');
        setSelectedClient(null);
        setEditingInvoiceId(null);
        setOriginalInvoiceNumber(null);
        setSelectedEmployeeId('all');
        setCompletedAppointments([]);
        setInvoiceItems([]);
        setDiscount(0);
        setReferralDiscount(0);
        setSelectedReferralClientId('');
        setPayments(payments.map(p => ({ ...p, amount: 0 })));
        setPaymentMode('Card');
        refreshData();
        setBillingAppointmentId('');
        setSearchParams({});
      } else {
        const errData = await response.json();
        notify('error', 'Settlement Failed', errData.message || 'The terminal encountered an internal sync error.');
      }
    } catch (error) {
      notify('error', 'Sync Error', 'The settlement sync failed. Please verify records.');
    } finally {
      setLoading(false);
    }
  };

  const billingQueueExportColumns = useMemo<ExportColumn<CompletedAppointment>[]>(
    () => [
      { header: 'Appointment ID', accessor: (appointment) => appointment._id || '-' },
      { header: 'Client', accessor: (appointment) => appointment.client || '-' },
      { header: 'Service', accessor: (appointment) => appointment.service || '-' },
      { header: 'Specialist', accessor: (appointment) => appointment.completedByName || appointment.employee || '-' },
      { header: 'Date', accessor: (appointment) => appointment.date ? dayjs(appointment.date).format('YYYY-MM-DD') : '-' },
      { header: 'Time', accessor: (appointment) => appointment.time || '-' },
      { header: 'Branch', accessor: (appointment) => branches.find(branch => branch._id === getEntityId(appointment.branch))?.name || getEntityId(appointment.branch) || '-' },
      { header: 'Booking Type', accessor: (appointment) => appointment.bookingType || 'Regular' },
      { header: 'Estimated Value', accessor: (appointment) => getAppointmentBillableValue(appointment).toFixed(2) }
    ],
    [branches, services]
  );

  const billingQueueExportFileName = useMemo(() => {
    const datePart = queueDateWindow.startDate && queueDateWindow.endDate
      ? `${queueDateWindow.startDate}_to_${queueDateWindow.endDate}`
      : 'all_dates';
    const timePart = queueTimeWindow.startTime || queueTimeWindow.endTime
      ? `${queueTimeWindow.startTime || 'start'}_to_${queueTimeWindow.endTime || 'end'}`.replace(/:/g, '')
      : 'all_times';
    return `billing_ready_appointments_${datePart}_${timePart}`;
  }, [queueDateWindow, queueTimeWindow]);

  const renderBillingQueue = (lockedMessage?: string) => {
    return (
      <ZenPageLayout
        title="Billing"
        hideSearch
        hideAddButton
        hideBranchSelector
        hideViewToggle
      >
        <div className="mx-auto max-w-[1600px] space-y-8">
          {renderBillingStats()}

          <div className="bg-white rounded-2xl border border-zen-brown/15 p-6 shadow-sm">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="mt-2 font-serif text-3xl font-bold text-zen-brown">Completed appointments</h2>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap xl:w-auto xl:justify-end">
                <ZenMasterCalendar
                  label="Date Range"
                  value={queueDateRange}
                  onChange={(value: any) => {
                    if (!hasDateTimeSelection(value)) {
                      setQueueDateRange('All');
                      return;
                    }
                    setQueueDateRange(value);
                  }}
                  selectionType="range"
                  includeTimeRange
                  variant="pill"
                  className="w-full sm:w-[230px]"
                  hideLabel
                />
                <ZenDropdown
                  label="Specialist"
                  value={queueEmployeeId}
                  onChange={setQueueEmployeeId}
                  options={[
                    { label: 'All', value: 'all' },
                    ...branchEmployees.map((employee: EmployeeRecord) => ({ label: employee.name, value: employee._id }))
                  ]}
                  variant="pill"
                  className="w-full sm:w-[180px]"
                  hideLabel
                />
                <ExportPopup<CompletedAppointment>
                  data={filteredBillableAppointments}
                  columns={billingQueueExportColumns}
                  fileName={billingQueueExportFileName}
                  title="Ready Bills"
                  triggerLabel="Download"
                  description="Export the completed appointments that match the active date, time, specialist, and branch filters."
                />
                <div className="w-full sm:w-[260px]">
                  <BranchSelector variant="pill" className="!w-full shadow-sm" />
                </div>
              </div>
            </div>
            {lockedMessage && (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-700">
                {lockedMessage}
              </div>
            )}
          </div>

          <div className="w-full bg-white rounded-xl border border-gray-200/60 shadow-none overflow-hidden">
            <div className="table-container">
              <table className="w-full text-center border-collapse min-w-[760px]">
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
                  {filteredBillableAppointments.length > 0 ? filteredBillableAppointments.map((apt: CompletedAppointment, index: number) => (
                    <tr key={apt._id} className="group">
                      <td className="px-4 lg:px-6 py-4 lg:py-6">
                        <span>{String(index + 1).padStart(2, '0')}</span>
                      </td>
                      <td className="px-4 lg:px-6 py-4 lg:py-6">
                        <div className="flex justify-center">
                          <div className="w-10 lg:w-12 h-10 lg:h-12 zen-pointed-surface overflow-hidden bg-zen-cream border-2 border-white shadow-lg shrink-0 group-hover:scale-110 transition-transform duration-500 flex items-center justify-center">
                            <span className="font-serif text-zen-brown uppercase">{(apt.client || 'C').charAt(0)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 lg:py-6">
                        <div className="flex flex-col items-center justify-center">
                          <span className="zen-table-primary">{apt.client}</span>
                          <span className="text-[9px] font-bold text-zen-sand tracking-widest mt-0.5 opacity-80">ID: {apt._id.slice(-6).toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 lg:py-6">
                        <div className="flex flex-col items-center justify-center">
                          <span className="zen-table-primary">{apt.service}</span>
                          <div className="flex items-center justify-center gap-1.5 mt-1">
                            <span className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest">
                              {branches.find(branch => branch._id === getEntityId(apt.branch))?.name || 'Selected Branch'}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-zen-brown/20" />
                            <span className="text-[8px] font-bold bg-zen-brown/[0.03] text-zen-brown/30 px-1.5 py-0.5 rounded border border-zen-brown/10 uppercase tracking-widest">
                              {apt.bookingType || 'Regular'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 lg:py-6">
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-[13px] text-zen-brown font-bold">{apt.completedByName || apt.employee}</span>
                          <span className="text-[9px] text-zen-brown/30 font-bold uppercase tracking-widest mt-0">Specialist</span>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 lg:py-6">
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-[14px] text-zen-brown font-black">{apt.time || '-'}</span>
                          <span className="text-[10px] text-zen-brown/40 font-bold uppercase tracking-widest mt-0">{dayjs(apt.date).format('DD MMM')}</span>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 lg:py-6">
                        <div className="flex justify-center">
                          <ZenBadge variant="leaf">Completed</ZenBadge>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 lg:py-6">
                        <div className="flex items-center justify-center">
                          <ZenButton
                            size="sm"
                            variant="primary"
                            icon={Receipt}
                            onClick={() => handleStartBilling(apt)}
                            className="!px-5 !py-2.5 !rounded-xl !text-[9px] !tracking-[0.18em] whitespace-nowrap"
                          >
                            Bill Now
                          </ZenButton>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} className="py-32">
                        <div className="flex flex-col items-center justify-center gap-4 opacity-25">
                          <Receipt size={64} strokeWidth={0.8} />
                          <p className="text-lg font-serif italic">No completed appointments are waiting for billing</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ZenPageLayout>
    );
  };

  if (!billingAppointmentId && !editingInvoiceId) {
    return renderBillingQueue();
  }

  if (
    billingAppointment &&
    !editingInvoiceId &&
    (billingAppointment.status !== 'Completed' || billingAppointment.billedInvoiceId || billedAppointmentIds.has(getEntityId(billingAppointment)))
  ) {
    return renderBillingQueue('That appointment is already billed or no longer ready for invoice creation.');
  }

  return (
    <ZenPageLayout
      title="Billing"
      hideSearch
      hideAddButton
      hideBranchSelector={true}
      hideViewToggle
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start max-w-[1600px] mx-auto">

        {/* Left Column: Input & Selection */}
        <div className="xl:col-span-8">
          <div className="bg-white/85 backdrop-blur-xl rounded-[2.5rem] border border-zen-brown/15 flex flex-col overflow-hidden shadow-sm">

          {billingAppointment && (
            <div className="px-5 py-5 sm:px-8 sm:py-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleBackToBillingQueue}
                  className="inline-flex w-fit items-center gap-2 rounded-xl border border-zen-brown/10 bg-white px-3.5 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-zen-brown/70 transition-all hover:border-zen-sand/40 hover:bg-zen-sand/10 hover:text-zen-brown"
                >
                  <ArrowLeft size={13} />
                  Back to billing list
                </button>
                <p className="text-[9px] font-black uppercase tracking-[0.28em] text-zen-brown/25">
                  Invoice workspace
                </p>
              </div>

              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-zen-gold/15 bg-zen-gold/10 text-zen-gold">
                    <Receipt size={22} strokeWidth={1.6} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.24em] text-zen-brown/30">Billing appointment</p>
                    <h2 className="mt-1 max-w-full truncate font-serif text-2xl font-bold leading-tight text-zen-brown sm:text-3xl">
                      {billingAppointment.client}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-zen-gold/20 bg-zen-gold/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zen-gold">
                        ID {billingAppointment._id.slice(-6).toUpperCase()}
                      </span>
                      <span className="rounded-full border border-zen-brown/10 bg-zen-cream/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zen-brown/35">
                        {invoiceItems.length} service{invoiceItems.length === 1 ? '' : 's'} staged
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[360px]">
                  <div className="flex items-center gap-3 rounded-2xl border border-zen-brown/10 bg-white/70 px-4 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zen-brown/[0.03] text-zen-brown/40">
                      <Calendar size={18} strokeWidth={1.7} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zen-brown/30">Date</p>
                      <p className="truncate text-sm font-black text-zen-brown">{dayjs(billingAppointment.date).format('DD MMM YYYY')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-zen-brown/10 bg-white/70 px-4 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zen-brown/[0.03] text-zen-brown/40">
                      <Clock size={18} strokeWidth={1.7} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zen-brown/30">Time</p>
                      <p className="truncate text-sm font-black text-zen-brown">{billingAppointment.time || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Service Registry Section */}
          <div className="flex flex-col">
            <div className="overflow-x-auto border-t border-zen-brown/10">
              <table className="w-full">
                <thead>
                  <tr className="bg-zen-brown/[0.02]">
                    <th className="px-10 py-4 text-left text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] border-b border-zen-brown/5">Reference</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] border-b border-zen-brown/5">Qty</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] border-b border-zen-brown/5">Completed By</th>
                    <th className="px-8 py-4 text-right text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] border-b border-zen-brown/5">Energy Value</th>
                    <th className="px-8 py-4 text-center text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] border-b border-zen-brown/5">Logic</th>
                    <th className="px-10 py-4 text-center text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] border-b border-zen-brown/5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zen-brown/5">
                  <AnimatePresence mode="popLayout">
                    {invoiceItems.length === 0 ? (
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <td colSpan={6} className="px-10 py-32 text-center">
                          <div className="flex flex-col items-center gap-5 opacity-30">
                            <ShoppingBag size={64} strokeWidth={1} className="text-zen-brown" />
                            <div className="space-y-1">
                              <p className="font-serif italic text-2xl text-zen-brown">
                                {selectedClient ? 'No completed services found' : 'Registry is vacant'}
                              </p>
                              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-zen-brown">
                                {selectedClient ? 'Only completed appointment services can be billed' : 'Select a client to sync completed services'}
                              </p>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    ) : (
                      invoiceItems.map((item, index) => (
                        <motion.tr
                          key={item.uniqueId}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="group hover:bg-zen-brown/[0.01] transition-all"
                        >
                          <td className="px-10 py-6">
                            <div className="flex items-center gap-5">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border text-xs font-bold transition-all duration-500 ${item.isRedeem ? 'bg-zen-sand/10 border-zen-sand/20 text-zen-sand shadow-inner shadow-zen-sand/5' : 'bg-white border-zen-brown/10 text-zen-brown/40 group-hover:border-zen-brown/30 group-hover:text-zen-brown font-black'}`}>
                                {index + 1}
                              </div>
                              <div className="flex flex-col gap-1">
                                <p className={`font-serif text-lg leading-tight transition-all duration-500 ${item.isRedeem ? 'text-zen-sand font-bold' : 'text-zen-brown font-semibold'}`}>{item.name}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-[0.2em]">{item.duration}m duration</span>
                                  {item.appointmentDate && <span className="w-1 h-1 rounded-full bg-zen-brown/20" />}
                                  {item.appointmentDate && <span className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-[0.2em]">{dayjs(item.appointmentDate).format('DD MMM')} · {item.appointmentTime}</span>}
                                  {item.isRedeem && <span className="w-1 h-1 rounded-full bg-zen-sand/40" />}
                                  {item.isRedeem && <span className="text-[9px] font-bold text-zen-sand uppercase tracking-widest animate-pulse">Privilege applied</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <span className="inline-flex min-w-10 items-center justify-center rounded-xl border border-zen-brown/10 bg-zen-cream/20 px-3 py-2 text-sm font-black text-zen-brown">
                              {normalizeQuantity(item.quantity)}
                            </span>
                          </td>
                          <td className="px-6 py-6">
                            <p className="text-xs font-bold text-zen-brown">{item.specialistName || 'Unassigned'}</p>
                            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-zen-brown/30">Completed service</p>
                          </td>
                          <td className="px-8 py-6 text-right">
                            {item.isRedeem ? (
                              <div className="space-y-1">
                                <div className="opacity-35 line-through">
                                  <p className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest mb-1">{settings?.general.currencySymbol || 'QR'}</p>
                                  <p className="font-serif text-xl font-black text-zen-brown">{((item.originalPrice || 0) * normalizeQuantity(item.quantity)).toLocaleString()}</p>
                                </div>
                                <p className="text-[9px] font-black text-zen-sand uppercase tracking-[0.2em]">Covered value</p>
                                <p className="font-serif text-lg font-black text-zen-sand">0 charged</p>
                              </div>
                            ) : (
                              <div className="transition-all duration-500 opacity-100">
                                <p className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest mb-1">{settings?.general.currencySymbol || 'QR'}</p>
                                <p className="font-serif text-2xl font-black text-zen-brown">{((item.price || 0) * normalizeQuantity(item.quantity)).toLocaleString()}</p>
                              </div>
                            )}
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex justify-center">
                              {item.serviceType === 'MEMBERSHIP' ? (
                                <div className="px-4 py-1.5 rounded-full bg-zen-sand/10 border border-zen-sand/20 flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-zen-sand animate-pulse" />
                                  <span className="text-[9px] font-black text-zen-sand uppercase tracking-[0.2em]">Membership</span>
                                </div>
                              ) : item.isRedeem ? (
                                <div className="px-4 py-1.5 rounded-full bg-zen-sand/10 border border-zen-sand/20 flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-zen-sand animate-pulse" />
                                  <span className="text-[9px] font-black text-zen-sand uppercase tracking-[0.2em]">Redemption</span>
                                </div>
                              ) : (
                                <div className="px-4 py-1.5 rounded-full bg-zen-brown/[0.03] border border-zen-brown/10">
                                  <span className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-[0.2em]">Standard</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-10 py-6">
                            <div className="flex items-center justify-center gap-3">
                              {activeMembership && activeMembership.totalSessions > 0 && (
                                <ZenIconButton
                                  onClick={() => toggleRedeem(item.uniqueId)}
                                  icon={Sparkles}
                                  variant={item.isRedeem ? 'sand' : 'outline'}
                                  className={`w-10 h-10 rounded-xl transition-all duration-500 ${item.isRedeem ? 'shadow-lg shadow-zen-sand/20' : 'hover:bg-zen-sand/5 hover:border-zen-sand/30 hover:text-zen-sand'}`}
                                />
                              )}
                              <ZenIconButton
                                onClick={() => handleRemoveItem(item.uniqueId)}
                                icon={Trash2}
                                variant="danger"
                                className="w-10 h-10 rounded-xl opacity-20 hover:opacity-100 transition-opacity"
                              />
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {invoiceItems.length > 0 && (
              <div className="p-8 bg-zen-brown/[0.01] border-t border-zen-brown/5 flex items-center justify-center">
                <p className="text-[10px] font-bold text-zen-brown/20 uppercase tracking-[0.5em]">End of registry</p>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Right Column: Settlement & Totals */}
        <div className="xl:col-span-4 space-y-6">

          {/* Summary Card */}
          <div className="rounded-[2rem] border border-zen-brown/10 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start justify-between gap-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zen-brown/35">Statement</p>
                <h3 className="mt-1 font-serif text-3xl font-bold text-zen-brown">Invoice Summary</h3>
              </div>
              <div className="rounded-2xl border border-zen-brown/10 bg-zen-cream/20 px-4 py-3 text-right">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zen-brown/30">Protocol</p>
                <p className="font-serif text-lg font-bold text-zen-brown">#{String(invoices.length + 1).padStart(4, '0')}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-zen-brown/10 bg-zen-brown/[0.015] px-4 py-3">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-zen-brown/35">Subtotal</span>
                <span className="font-serif text-xl font-black text-zen-brown">
                  {settings?.general.currencySymbol || 'QR'} {subtotal.toLocaleString()}
                </span>
              </div>

              {isGstEnabled && (
                <div className="rounded-2xl border border-zen-brown/10 bg-white px-4 py-4">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-zen-brown/35">Tax</span>
                    <span className="font-serif text-lg font-black text-zen-brown">+{gst.toFixed(2)}</span>
                  </div>
                  <ZenDropdown
                    label=""
                    hideLabel
                    options={gstRates.map(r => ({ label: `GST ${r.percentage}%`, value: r._id }))}
                    value={selectedGSTRate?._id || ''}
                    onChange={(val) => setSelectedGSTRate(gstRates.find(r => r._id === val))}
                  />
                </div>
              )}

              <div className="rounded-2xl border border-zen-brown/10 bg-white px-4 py-4">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-zen-brown/35">Adjustment</span>
                  <span className="text-sm font-bold text-rose-500">{discountAmount > 0 ? `-${discountAmount.toFixed(2)}` : '0.00'}</span>
                </div>
                
                {/* Segmented control for premium selection of Fixed vs Percent */}
                <div className="flex bg-stone-100/90 p-1 rounded-[14px] border border-stone-200/60 mb-3 w-full">
                  <button
                    type="button"
                    onClick={() => setDiscountType('Fixed')}
                    className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-widest rounded-[10px] border border-transparent transition-all duration-200 ${
                      discountType === 'Fixed'
                        ? 'bg-zen-sand text-white shadow-sm font-black'
                        : 'text-zen-brown/50 hover:text-zen-brown hover:bg-stone-50/50'
                    }`}
                  >
                    Fixed ({currency})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('Percentage')}
                    className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-widest rounded-[10px] border border-transparent transition-all duration-200 ${
                      discountType === 'Percentage'
                        ? 'bg-zen-sand text-white shadow-sm font-black'
                        : 'text-zen-brown/50 hover:text-zen-brown hover:bg-stone-50/50'
                    }`}
                  >
                    Percent (%)
                  </button>
                </div>

                <div className="relative flex items-center">
                  <span className="absolute left-4 text-[9px] font-black uppercase tracking-widest text-zen-brown/30">
                    {discountType === 'Percentage' ? 'Rate' : 'Amount'}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={discountType === 'Percentage' ? 100 : undefined}
                    placeholder="0.00"
                    className="w-full h-[52px] rounded-[1.15rem] border border-zen-brown/10 bg-zen-cream/20 pl-20 pr-4 text-right font-serif text-xl font-black text-zen-brown outline-none transition-all focus:border-zen-gold/40 focus:bg-white"
                    value={discountInput}
                    onChange={(e) => {
                      const rawVal = e.target.value;
                      setDiscountInput(rawVal);
                      const val = parseFloat(rawVal) || 0;
                      if (discountType === 'Percentage') {
                        setDiscount(Math.min(100, Math.max(0, val)));
                      } else {
                        setDiscount(Math.max(0, val));
                      }
                    }}
                  />
                </div>
              </div>

              {availableReferrals.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-zen-brown/15 bg-zen-cream/5 p-4 opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zen-brown/10 bg-zen-brown/5 text-zen-brown/40">
                      <Gift size={16} strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zen-brown/40">Referral Reward</p>
                      <p className="text-xs font-semibold text-zen-brown/50 mt-0.5">
                        {selectedClient?.referralCode ? `Code: ${selectedClient.referralCode}` : 'No referral code linked'} · 0 rewards available
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-[1.5rem] border border-dashed border-zen-gold/30 bg-gradient-to-br from-zen-gold/[0.04] via-white to-zen-gold/[0.02] p-5 shadow-sm transition-all duration-300">
                  {/* Ticket Notches */}
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-r border-dashed border-zen-gold/30 z-10" />
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-l border-dashed border-zen-gold/30 z-10" />

                  {/* Header info */}
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zen-gold/10 text-zen-gold">
                        <Gift size={16} strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zen-gold">Referral Reward</p>
                          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-600">
                            Active
                          </span>
                        </div>
                        <p className="truncate text-xs font-black text-zen-brown mt-0.5">{referralStatusText}</p>
                      </div>
                    </div>
                  </div>

                  {/* Input select dropdown */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <ZenDropdown
                        label="Select"
                        hideLabel
                        placeholder="No Referral Discount"
                        value={selectedReferralClientId}
                        onChange={(val) => {
                          setSelectedReferralClientId(val);
                          setReferralDiscount(val ? 50 : 0);
                        }}
                        options={[
                          { label: 'No Referral Discount', value: '' },
                          ...availableReferrals.map((ref: any) => ({
                            label: `Referral from ${ref.name} (50.00 ${currency})`,
                            value: ref._id
                          }))
                        ]}
                      />
                    </div>
                  </div>

                  {/* Divider line */}
                  <div className="my-4 border-t border-dashed border-zen-gold/20" />

                  {/* Summary row */}
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-emerald-600 font-bold uppercase tracking-wider text-[9px]">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Deduction Applied
                    </div>
                    <p className="font-serif text-base font-black text-emerald-600">
                      -{currency} {appliedReferralDiscount.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-5 rounded-[1.6rem] border border-zen-brown/10 bg-zen-brown/[0.025] px-5 py-5">
                <div className="flex items-end justify-between gap-5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zen-brown/35">Total Settlement</p>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-zen-brown/45">Final authorization</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zen-brown/30">{settings?.general.currencySymbol || 'QR'}</p>
                    <p className="font-serif text-5xl font-black tracking-tighter text-zen-brown">
                      {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Mode Selection */}
          <div className="bg-white/40 backdrop-blur-md rounded-[2rem] border border-zen-brown/10 p-6 space-y-6 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-zen-gold" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-zen-brown/30">Engagement Logic</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { name: 'Cash', icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                { name: 'Card', icon: CreditCard, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200' },
                { name: 'UPI', icon: Smartphone, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
                { name: 'Split', icon: Split, color: 'text-zen-gold', bg: 'bg-zen-gold/5', border: 'border-zen-gold/20' }
              ].map((mode) => (
                <button
                  key={mode.name}
                  onClick={() => setPaymentMode(mode.name)}
                  className={`relative group flex flex-col items-center justify-center gap-4 p-5 rounded-3xl border transition-all duration-700 ${paymentMode === mode.name
                    ? 'bg-white border-zen-gold shadow-xl ring-1 ring-zen-gold/10 scale-[1.02]'
                    : 'bg-transparent border-zen-brown/5 hover:border-zen-brown/20'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-700 ${paymentMode === mode.name
                    ? 'bg-zen-gold text-white scale-110 shadow-lg shadow-zen-gold/20'
                    : `${mode.bg} ${mode.border} ${mode.color} group-hover:scale-110 shadow-sm`}`}>
                    <mode.icon size={18} strokeWidth={1.5} />
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-[0.2em] transition-colors ${paymentMode === mode.name ? 'text-zen-brown' : 'text-zen-brown/40'}`}>{mode.name}</span>

                  {paymentMode === mode.name && (
                    <motion.div
                      layoutId="active-indicator"
                      className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-zen-gold shadow-md shadow-zen-gold/50"
                    />
                  )}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {paymentMode === 'Split' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4 pt-4"
                >
                  {payments.map((p, idx) => (
                    <div key={p.mode} className="flex items-center gap-4 p-5 bg-white rounded-[1.8rem] border border-zen-brown/10 shadow-sm group/split">
                      <div className="w-10 h-10 rounded-xl bg-zen-brown/[0.02] flex items-center justify-center text-[10px] font-black text-zen-brown/30 group-hover/split:text-zen-gold transition-colors">
                        {p.mode[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-bold text-zen-brown/20 uppercase tracking-widest mb-0.5">{p.mode}</p>
                        <div className="relative">
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] font-black text-zen-brown/20">{settings?.general.currencySymbol || 'QR'}</span>
                          <input
                            type="number"
                            className="w-full bg-transparent border-none text-right font-serif font-black text-xl text-zen-brown outline-none pr-2"
                            value={p.amount || ''}
                            onChange={(e) => {
                              const newPayments = [...payments];
                              newPayments[idx].amount = parseFloat(e.target.value) || 0;
                              setPayments(newPayments);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className={`p-6 rounded-[1.8rem] border-2 flex items-center justify-between transition-colors duration-500 ${Math.abs(payments.reduce((acc, p) => acc + p.amount, 0) - total) < 0.01 ? 'bg-zen-leaf/5 border-zen-leaf/20 text-zen-leaf' : 'bg-rose-50 border-rose-100 text-rose-500'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 ${Math.abs(payments.reduce((acc, p) => acc + p.amount, 0) - total) < 0.01 ? 'border-zen-leaf text-zen-leaf' : 'border-rose-300 text-rose-400'}`}>
                        {Math.abs(payments.reduce((acc, p) => acc + p.amount, 0) - total) < 0.01 ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Balance Status</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[10px] font-bold opacity-30">{settings?.general.currencySymbol || 'QR'}</span>
                      <span className="font-serif text-xl font-black">{payments.reduce((acc, p) => acc + p.amount, 0).toLocaleString()}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <ZenButton
              className={`w-full py-6 rounded-3xl text-[10px] uppercase tracking-[0.4em] font-black shadow-xl transition-all duration-700 relative overflow-hidden group/btn ${loading ? 'opacity-80' : 'hover:scale-[1.01] active:scale-[0.98]'}`}
              onClick={handleConfirmPayment}
              disabled={loading || !selectedClient || invoiceItems.length === 0}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
              {loading ? (
                <div className="flex items-center gap-4">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="relative z-10">Synchronizing Settlement...</span>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <span className="relative z-10">Authorize Terminal Protocol</span>
                  <ArrowRight size={20} className="relative z-10 group-hover/btn:translate-x-2 transition-transform duration-500" />
                </div>
              )}
            </ZenButton>
          </div>

        </div>
      </div>
    </ZenPageLayout>
  );
};

export default Billing;
