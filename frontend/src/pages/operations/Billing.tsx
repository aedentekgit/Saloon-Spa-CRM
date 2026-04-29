import React, { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import {
  CreditCard,
  Smartphone,
  Wallet,
  Trash2,
  Receipt,
  Zap,
  Sparkles,
  Search,
  Crown,
  Split,
  User,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { BranchSelector } from '../../components/zen/BranchSelector';
import { ZenBadge, ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { ZenDropdown, ZenAutocomplete } from '../../components/zen/ZenInputs';
import { notify } from '../../components/shared/ZenNotification';
import { useSettings } from '../../context/SettingsContext';
import { useData } from '../../context/DataContext';
import { useBranches } from '../../context/BranchContext';

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
  _id: string;
  name: string;
  phone: string;
  branch?: any;
}

interface EmployeeRecord {
  _id: string;
  name: string;
  status?: string;
  branch?: any;
}

interface CompletedAppointment {
  _id: string;
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
  addOns?: any[];
  billedInvoiceId?: any;
}

const getEntityId = (value: any) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
};

const normalizeQuantity = (value: any) => {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity < 1) return 1;
  return Math.floor(quantity);
};

const Billing = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { invoices, clients: rawClients, services: rawServices, employees: rawEmployees, refreshData } = useData();
  const { selectedBranch, branches } = useBranches();

  const effectiveBranchId = selectedBranch !== 'all' ? selectedBranch : getEntityId(user?.branch);
  const isInBillingBranch = (entity: any) => {
    if (!effectiveBranchId) return true;
    return getEntityId(entity?.branch) === effectiveBranchId;
  };

  const clients = useMemo(() => rawClients.filter((c: any) => c.status === 'Active' && isInBillingBranch(c)), [rawClients, effectiveBranchId]);
  const services = useMemo(() => rawServices.filter((s: any) => s.status === 'Active' && isInBillingBranch(s)), [rawServices, effectiveBranchId]);
  const branchEmployees = useMemo(() => rawEmployees.filter((e: EmployeeRecord) =>
    (!e.status || e.status === 'Active') && isInBillingBranch(e)
  ), [rawEmployees, effectiveBranchId]);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');
  const [completedAppointments, setCompletedAppointments] = useState<CompletedAppointment[]>([]);
  const [loadingCompletedAppointments, setLoadingCompletedAppointments] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('Fixed');
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
  }, [branchEmployees, selectedEmployeeId]);

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
    } catch (e) {}
  };

  const subtotal = useMemo(() => {
    return invoiceItems.reduce((acc, item) => acc + (item.isRedeem ? 0 : ((item.price || 0) * normalizeQuantity(item.quantity))), 0);
  }, [invoiceItems]);

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

  const completedServiceItems = useMemo(() => {
    const serviceByName = new Map<string, any>(services.map((service: any) => [service.name, service]));
    const serviceById = new Map<string, any>(services.map((service: any) => [getEntityId(service), service]));
    const rows: any[] = [];

    const appendServiceLine = (appointment: CompletedAppointment, entry: any, index: number) => {
      const appointmentId = getEntityId(appointment);
      if (!appointmentId || billedAppointmentIds.has(appointmentId) || appointment.billedInvoiceId) return;

      const serviceName = entry.service || entry.name || appointment.service;
      const serviceId = getEntityId(entry.serviceId || appointment.serviceId);
      const service = (serviceId && serviceById.get(serviceId)) || serviceByName.get(serviceName);
      const specialistId = getEntityId(appointment.completedByEmployeeId || appointment.employeeId);
      const specialistName = appointment.completedByName || appointment.employeeId?.name || appointment.employee || 'Unassigned';

      if (selectedEmployeeId !== 'all' && specialistId !== selectedEmployeeId) return;

      rows.push({
        uniqueId: `${appointmentId}-${index}`,
        appointmentId,
        serviceId: serviceId || service?._id || '',
        _id: serviceId || service?._id || '',
        name: service?.name || serviceName,
        price: Number(entry.price ?? service?.price ?? 0) || 0,
        duration: Number(entry.duration ?? service?.duration ?? 0) || 0,
        quantity: normalizeQuantity(entry.quantity ?? appointment.quantity),
        specialist: specialistId || '',
        specialistName,
        appointmentDate: appointment.date,
        appointmentTime: appointment.time,
        branch: getEntityId(appointment.branch),
        isRedeem: false
      });
    };

    completedAppointments.forEach((appointment) => {
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
  }, [completedAppointments, services, billedAppointmentIds, selectedEmployeeId]);

  useEffect(() => {
    setInvoiceItems(completedServiceItems);
  }, [completedServiceItems]);

  useEffect(() => {
    if (selectedClient?._id && selectedClient._id.length === 24) {
      fetchClientMembership(selectedClient._id);
      fetchCompletedAppointmentsForClient(selectedClient._id);
    } else {
      setActiveMembership(null);
      setDiscount(0);
      setCompletedAppointments([]);
    }
  }, [selectedClient, effectiveBranchId]);

  const fetchClientMembership = async (clientId: string) => {
    try {
      const res = await fetch(`${API_URL}/memberships/client/${clientId}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await res.json();
      const memberships = Array.isArray(data) ? data : (data?.data || []);
      const active = memberships.find((m: any) => m.status === 'Active');
      if (active) {
        setActiveMembership(active);
        if (active.plan.discountValue > 0) {
          setDiscount(active.plan.discountValue);
          setDiscountType(active.plan.discountType);
        }
      } else {
        setActiveMembership(null);
        setDiscount(0);
      }
    } catch (error) {
      console.error('Failed to fetch membership');
    }
  };

  const isGstEnabled = settings?.billing?.gstEnabled;
  const gst = isGstEnabled ? (subtotal * (selectedGSTRate?.percentage || 0) / 100) : 0;
  const discountAmount = discountType === 'Percentage' ? (subtotal * discount / 100) : discount;
  const total = subtotal + gst - discountAmount;

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

    setLoading(true);
    const nextNumber = `INV-${dayjs().year()}-${String(invoices.length + 1).padStart(3, '0')}`;

    const newInvoice = {
      invoiceNumber: nextNumber,
      clientId: selectedClient._id || undefined,
      clientName: selectedClient.name,
      items: invoiceItems.map(i => ({
        appointmentId: i.appointmentId,
        serviceId: i.serviceId || i._id,
        name: i.name,
        price: i.price,
        duration: i.duration,
        quantity: normalizeQuantity(i.quantity),
        specialist: i.specialist || undefined,
        specialistName: i.specialistName
      })),
      subtotal,
      gst,
      gstName: selectedGSTRate ? `${selectedGSTRate.percentage}%` : 'Tax',
      discount,
      total,
      paymentMode,
      payments: paymentMode === 'Split' ? payments.filter(p => p.amount > 0) : [{ mode: paymentMode, amount: total }],
      date: dayjs().format('YYYY-MM-DD'),
      branch: invoiceBranch
    };

    try {
      const response = await fetch(`${API_URL}/invoices`, {
        method: 'POST',
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

        notify('success', 'Billing Updated', 'Billing records have been synchronized successfully.');
        setSelectedClient(null);
        setSelectedEmployeeId('all');
        setCompletedAppointments([]);
        setInvoiceItems([]);
        setDiscount(0);
        setPayments(payments.map(p => ({ ...p, amount: 0 })));
        setPaymentMode('Card');
        refreshData();
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

  return (
    <ZenPageLayout
      title="Billing Terminal"
      hideSearch
      hideAddButton
      hideBranchSelector={true}
      hideViewToggle
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start max-w-[1600px] mx-auto">

        {/* Left Column: Input & Selection */}
        <div className="xl:col-span-8 space-y-6">

          {/* Ambassador Selection Section */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-zen-brown/15 p-10 relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-zen-sand/10 rounded-full blur-3xl transition-transform duration-1000 group-hover:scale-150" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-zen-brown/5 flex items-center justify-center text-zen-brown/40">
                    <User size={22} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-zen-brown/30">Ambassador Selection</h3>
                    <p className="text-xs text-zen-brown/20 mt-0.5">Link a profile to initiate settlement protocol</p>
                  </div>
                </div>

                <div className="relative group/input">
                  <ZenAutocomplete
                    label=""
                    hideLabel
                    placeholder="Search by name or contact identifier..."
                    options={clients.map(c => ({ id: c._id, name: c.name, subtext: c.phone }))}
                    value={selectedClient?._id || selectedClient?.name || ''}
                    onChange={(val) => {
                      if (!val || val === 'None') {
                        setSelectedClient(null);
                        return;
                      }
                      const client = clients.find(c => c._id === val || c.name === val);
                      if (client) {
                        setSelectedClient(client);
                      } else {
                        setSelectedClient({ _id: '', name: val, phone: '' });
                      }
                    }}
                    allowCustom
                    className="w-full"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none">
                    <Search size={18} className="text-zen-brown/20" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-stretch md:items-end gap-3 min-w-[280px]">
                <BranchSelector variant="pill" className="!w-full shadow-sm" />
                <ZenDropdown
                  label=""
                  hideLabel
                  variant="pill"
                  options={[
                    { label: 'All completed staff', value: 'all' },
                    ...branchEmployees.map((employee: EmployeeRecord) => ({ label: employee.name, value: employee._id }))
                  ]}
                  value={selectedEmployeeId}
                  onChange={setSelectedEmployeeId}
                />
                <AnimatePresence mode="wait">
                  {selectedClient && (
                    <motion.div
                      initial={{ opacity: 0, x: 20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 20, scale: 0.95 }}
                      className="flex items-center gap-5 bg-white/50 backdrop-blur-md pl-6 pr-8 py-5 rounded-[2rem] border border-zen-brown/10 shadow-sm w-full"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-white border border-zen-brown/10 flex items-center justify-center text-zen-gold shadow-sm shrink-0">
                        {activeMembership ? <Crown size={28} strokeWidth={1.5} /> : <User size={28} strokeWidth={1.5} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-zen-brown/20 uppercase tracking-[0.2em] mb-1">Active Profile</p>
                        <p className="font-serif text-xl font-bold text-zen-brown truncate">{selectedClient.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-1 h-1 rounded-full bg-zen-gold/40" />
                          <p className="text-[9px] font-bold text-zen-brown/40 uppercase tracking-widest">
                            {branches.find(b => b._id === selectedBranch)?.name || 'All Branches'}
                          </p>
                        </div>
                        {selectedClient.phone && <p className="text-[10px] font-bold text-zen-gold uppercase tracking-widest mt-1">{selectedClient.phone}</p>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {activeMembership && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-10 p-8 bg-gradient-to-br from-zen-sand/[0.08] to-transparent rounded-[2.5rem] border border-zen-sand/20 flex flex-col md:flex-row items-center justify-between gap-8"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-zen-sand shadow-lg shadow-zen-sand/10">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-zen-sand uppercase tracking-[0.3em]">Privilege Tier Unlocked</h4>
                    <p className="font-serif text-lg font-bold text-zen-brown">{activeMembership.plan.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-10">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-zen-brown/20 uppercase tracking-widest mb-1">Node Balance</p>
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-lg font-bold text-zen-brown">{activeMembership.remainingSessions}</span>
                      <span className="text-[10px] font-bold text-zen-brown/30 uppercase">/ {activeMembership.totalSessions}</span>
                    </div>
                  </div>
                  <div className="h-10 w-[1px] bg-zen-sand/20" />
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-zen-brown/20 uppercase tracking-widest mb-1">Entitlement</p>
                    <p className="text-sm font-bold text-zen-leaf flex items-center gap-1.5 justify-end">
                      <Zap size={14} className="fill-current" />
                      {activeMembership.plan.discountValue > 0 ? (
                        `${activeMembership.plan.discountValue}${activeMembership.plan.discountType === 'Percentage' ? '%' : ` ${settings?.general.currencySymbol || 'QR'}`} Deduction`
                      ) : (
                        'Direct Allocation'
                      )}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Service Registry Section */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-zen-brown/15 flex flex-col overflow-hidden">
            <div className="px-10 py-8 border-b border-zen-brown/10 flex flex-col sm:flex-row items-center justify-between gap-6 bg-zen-brown/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-zen-leaf/5 flex items-center justify-center text-zen-leaf">
                  <ShoppingBag size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-zen-brown/30 leading-none">Active Registry</h3>
                  <p className="text-[10px] text-zen-brown/20 mt-1 uppercase tracking-widest">
                    {loadingCompletedAppointments ? 'Syncing completed services' : `${invoiceItems.length} completed services staged`}
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-72">
                <div className="rounded-[1.35rem] border border-zen-brown/10 bg-white px-5 py-3 text-right">
                  <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zen-brown/25">Source</p>
                  <p className="text-sm font-serif font-bold text-zen-brown">
                    Completed appointments
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
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
                      invoiceItems.map((item) => (
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
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 ${item.isRedeem ? 'bg-zen-sand/10 border-zen-sand/20 text-zen-sand shadow-inner shadow-zen-sand/5' : 'bg-white border-zen-brown/10 text-zen-brown/20 group-hover:border-zen-brown/30 group-hover:text-zen-brown/40'}`}>
                                {item.isRedeem ? <Sparkles size={20} /> : <Zap size={18} strokeWidth={1.5} />}
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
                             <div className={`transition-all duration-500 ${item.isRedeem ? 'opacity-30 scale-95 origin-right line-through blur-[0.5px]' : 'opacity-100'}`}>
                               <p className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest mb-1">{settings?.general.currencySymbol || 'QR'}</p>
                               <p className="font-serif text-2xl font-black text-zen-brown">{((item.price || 0) * normalizeQuantity(item.quantity)).toLocaleString()}</p>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex justify-center">
                              {item.isRedeem ? (
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

        {/* Right Column: Settlement & Totals */}
        <div className="xl:col-span-4 space-y-6">

          {/* Summary Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-zen-brown/15 shadow-2xl p-10 relative overflow-hidden group">
            <div className="absolute -top-10 -left-10 p-12 opacity-[0.02] group-hover:rotate-12 group-hover:scale-110 transition-all duration-1000 pointer-events-none">
              <Receipt size={280} />
            </div>

            <div className="relative z-10 space-y-10">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-serif text-3xl font-bold text-zen-brown">Statement</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-zen-gold" />
                    <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.4em]">Digital Ledger v2.0</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-zen-brown/20 uppercase tracking-widest">Protocol ID</p>
                  <p className="font-serif text-base font-bold text-zen-brown/40">#{String(invoices.length + 1).padStart(4, '0')}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center px-2">
                  <span className="text-[11px] font-bold text-zen-brown/30 uppercase tracking-widest">Base Exchange</span>
                  <div className="flex items-baseline gap-1.5 text-zen-brown">
                    <span className="text-xs font-bold opacity-30">{settings?.general.currencySymbol || 'QR'}</span>
                    <span className="font-serif text-2xl font-black">{subtotal.toLocaleString()}</span>
                  </div>
                </div>

                {isGstEnabled && (
                  <div className="p-6 bg-zen-brown/[0.02] rounded-[1.8rem] border border-zen-brown/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white border border-zen-brown/5 flex items-center justify-center text-[10px] font-bold text-zen-gold shadow-sm">%</div>
                        <span className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.2em]">Tax Protocol</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-zen-brown/20 uppercase tracking-widest block mb-0.5">Applied</span>
                        <span className="font-serif text-lg font-bold text-zen-brown">+{gst.toFixed(2)}</span>
                      </div>
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

                <div className="flex flex-col gap-4 px-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-zen-brown/30 uppercase tracking-widest">Adjustments</span>
                      <div className="w-28">
                        <ZenDropdown
                          label=""
                          hideLabel
                          options={[
                            { label: 'Fixed', value: 'Fixed' },
                            { label: 'Relational', value: 'Percentage' }
                          ]}
                          value={discountType}
                          onChange={(val) => setDiscountType(val)}
                        />
                      </div>
                    </div>
                    <div className="text-right min-w-[100px]">
                      {discountAmount > 0 && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">-{discountAmount.toFixed(2)}</p>}
                      <div className="relative group/adjust">
                        <input
                          type="number"
                          placeholder="0.00"
                          className="w-full bg-transparent border-b-2 border-zen-brown/10 focus:border-zen-gold text-right font-serif text-2xl font-black text-zen-brown outline-none pb-2 transition-all"
                          value={discount || ''}
                          onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-10 border-t border-zen-brown/5 mt-10">
                  <div className="relative overflow-hidden p-8 bg-zen-brown text-white rounded-[2.5rem] shadow-2xl group/total">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl transition-transform duration-700 group-hover/total:scale-150" />

                    <div className="relative z-10 flex items-center justify-between">
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40 mb-1.5">Total Settlement</h4>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-zen-gold animate-pulse" />
                          <p className="text-[11px] font-bold text-zen-sand uppercase tracking-widest">Final Authorization</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-baseline justify-end gap-2">
                          <p className="text-sm font-bold text-white/30 leading-none mb-1">{settings?.general.currencySymbol || 'QR'}</p>
                          <p className="text-5xl font-serif font-black tracking-tighter text-white">
                            {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
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
                { name: 'Cash', icon: Wallet, color: 'text-emerald-500' },
                { name: 'Card', icon: CreditCard, color: 'text-sky-500' },
                { name: 'UPI', icon: Smartphone, color: 'text-violet-500' },
                { name: 'Split', icon: Split, color: 'text-zen-gold' }
              ].map((mode) => (
                <button
                  key={mode.name}
                  onClick={() => setPaymentMode(mode.name)}
                  className={`relative group flex flex-col items-center justify-center gap-4 p-5 rounded-3xl border transition-all duration-700 ${paymentMode === mode.name
                    ? 'bg-white border-zen-gold shadow-xl ring-1 ring-zen-gold/10 scale-[1.02]'
                    : 'bg-transparent border-zen-brown/5 hover:border-zen-brown/20 text-zen-brown/30 hover:text-zen-brown/60'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-700 ${paymentMode === mode.name ? 'bg-zen-gold text-white scale-110 shadow-lg shadow-zen-gold/20' : 'bg-white border border-zen-brown/10 group-hover:scale-110 shadow-sm'}`}>
                    <mode.icon size={18} strokeWidth={1.5} />
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-[0.2em] transition-colors ${paymentMode === mode.name ? 'text-zen-brown' : 'text-inherit'}`}>{mode.name}</span>

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
