import React, { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import { 
  Printer, 
  Share2, 
  CreditCard, 
  Smartphone, 
  Wallet, 
  Plus, 
  Trash2, 
  Receipt, 
  Zap, 
  Sparkles,
  Search,
  ChevronRight,
  Crown,
  Split,
  ChevronDown,
  User,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenBadge, ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { ZenInput, ZenDropdown, ZenAutocomplete } from '../../components/zen/ZenInputs';
import { notify } from '../../components/shared/ZenNotification';
import { useSettings } from '../../context/SettingsContext';
import { useData } from '../../context/DataContext';

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
}

const Billing = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { invoices, clients: rawClients, services: rawServices, refreshData } = useData();
  
  const clients = useMemo(() => rawClients.filter((c: any) => c.status === 'Active'), [rawClients]);
  const services = useMemo(() => rawServices.filter((s: any) => s.status === 'Active'), [rawServices]);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
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
    return invoiceItems.reduce((acc, item) => acc + (item.isRedeem ? 0 : (item.price || 0)), 0);
  }, [invoiceItems]);

  useEffect(() => {
    if (selectedClient?._id && selectedClient._id.length === 24) {
      fetchClientMembership(selectedClient._id);
    } else {
      setActiveMembership(null);
      setDiscount(0);
    }
  }, [selectedClient]);

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

  const handleAddService = (serviceName: string) => {
    const service = services.find(s => s.name === serviceName);
    if (service) {
      setInvoiceItems([...invoiceItems, { ...service, uniqueId: Date.now(), isRedeem: false }]);
    }
  };

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
      notify('error', 'Validation Failed', 'Selection of an ambassador and services is required.');
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
      items: invoiceItems.map(i => ({ name: i.name, price: i.price, duration: i.duration })),
      subtotal,
      gst,
      gstName: selectedGSTRate ? `${selectedGSTRate.percentage}%` : 'Tax',
      discount,
      total,
      paymentMode,
      payments: paymentMode === 'Split' ? payments.filter(p => p.amount > 0) : [{ mode: paymentMode, amount: total }],
      date: dayjs().format('YYYY-MM-DD')
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
                    branchId: user?.branch || undefined
                 })
              });
           }
        }

        notify('success', 'Billing Updated', 'Billing records have been synchronized successfully.');
        setSelectedClient(null);
        setInvoiceItems([]);
        setDiscount(0);
        setPayments(payments.map(p => ({ ...p, amount: 0 })));
        setPaymentMode('Card');
        refreshData();
      }
    } catch (error) {
      notify('error', 'Sync Error', 'The settlement sync failed. Please verify records.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ZenPageLayout
      title="Intelligent Billing Terminal"
      hideSearch
      hideAddButton
      hideBranchSelector
      hideViewToggle
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Input & Selection */}
        <div className="xl:col-span-8 space-y-8">
          
          {/* Client & Status Section */}
          <div className="zen-pointed-surface bg-white border border-black/5 p-8 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div className="flex-1 w-full max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-zen-sand/10 flex items-center justify-center text-zen-sand">
                    <User size={16} />
                  </div>
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-black/40">Ambassador Selection</h3>
                </div>
                <ZenAutocomplete 
                  label=""
                  hideLabel
                  placeholder="Identify Recipient..."
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
              </div>

              {selectedClient && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="zen-pointed-surface flex items-center gap-4 bg-gray-50 p-4 rounded-3xl border border-black/5 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white border border-black/5 flex items-center justify-center text-zen-sand shadow-sm">
                    {activeMembership ? <Crown size={24} /> : <User size={24} />}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Selected Profile</p>
                    <p className="font-serif text-lg font-bold text-black">{selectedClient.name}</p>
                  </div>
                </motion.div>
              )}
            </div>

            {activeMembership && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="zen-pointed-surface mt-8 p-6 bg-zen-sand/[0.03] rounded-[2rem] border border-zen-sand/10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-zen-sand shadow-sm">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-zen-sand uppercase tracking-widest">Active Privilege Detected</h4>
                    <p className="font-serif text-base font-bold text-black">{activeMembership.plan.name} Tier</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Registry Balance</p>
                    <p className="text-sm font-bold text-black">{activeMembership.remainingSessions} / {activeMembership.totalSessions} Nodes</p>
                  </div>
                  <div className="h-8 w-[1px] bg-zen-sand/20" />
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Entitlement</p>
                    <p className="text-sm font-bold text-zen-leaf">
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
          <div className="zen-pointed-surface bg-white border border-black/5 shadow-sm flex flex-col">
            <div className="p-8 border-b border-black/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zen-leaf/10 flex items-center justify-center text-zen-leaf">
                  <ShoppingBag size={16} />
                </div>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-black/40">Active Registry</h3>
              </div>
              <div className="w-64">
                <ZenDropdown 
                  label=""
                  hideLabel
                  placeholder="+ Add Service Item"
                  options={services.map(s => s.name)}
                  value=""
                  onChange={handleAddService}
                />
              </div>
            </div>

            <div className="table-container p-0 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th>Internal Reference</th>
                    <th>Energy Value</th>
                    <th>Settlement Logic</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  <AnimatePresence mode="popLayout">
                    {invoiceItems.length === 0 ? (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <td colSpan={4} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-3 opacity-20">
                            <ShoppingBag size={48} strokeWidth={1} />
                            <p className="font-serif italic text-lg">Registry is currently vacant</p>
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
                          className="group hover:bg-gray-50/80 transition-all"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all ${item.isRedeem ? 'bg-zen-sand/10 border-zen-sand/20 text-zen-sand' : 'bg-white border-black/5 text-black/20 group-hover:text-black/40'}`}>
                                {item.isRedeem ? <Sparkles size={18} /> : <div className="w-2 h-2 rounded-full bg-current" />}
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <p className={`zen-table-primary transition-all leading-none ${item.isRedeem ? 'text-zen-sand' : 'text-black'}`}>{item.name}</p>
                                <span className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest">{item.duration}m duration</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                             <div className={`transition-all ${item.isRedeem ? 'opacity-30 line-through grayscale' : 'opacity-100'}`}>
                               <p className="text-[10px] font-bold text-black/30 mb-1">{settings?.general.currencySymbol || 'QR'}</p>
                               <p className="font-serif text-lg font-bold">{item.price?.toLocaleString()}</p>
                             </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                            {item.isRedeem ? (
                              <ZenBadge variant="leaf" className="uppercase tracking-[0.2em] text-[8px] py-1 px-3">Redeemed</ZenBadge>
                            ) : (
                              <ZenBadge variant="secondary" className="uppercase tracking-[0.2em] text-[8px] py-1 px-3 opacity-40">Standard Settlement</ZenBadge>
                            )}
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center justify-center gap-2">
                              {activeMembership && activeMembership.totalSessions > 0 && (
                                <ZenIconButton 
                                  onClick={() => toggleRedeem(item.uniqueId)}
                                  icon={Zap}
                                  variant={item.isRedeem ? 'sand' : 'outline'}
                                  className={item.isRedeem ? 'shadow-lg shadow-zen-sand/20' : ''}
                                />
                              )}
                              <ZenIconButton 
                                onClick={() => handleRemoveItem(item.uniqueId)}
                                icon={Trash2}
                                variant="danger"
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
          </div>
        </div>

        {/* Right Column: Settlement & Totals */}
        <div className="xl:col-span-4 space-y-8">
          
          {/* Summary Card */}
          <div className="zen-pointed-surface bg-white border border-black/10 shadow-2xl p-8 relative group">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:rotate-12 group-hover:scale-125 transition-transform duration-1000">
              <Receipt size={200} />
            </div>

            <div className="relative z-10 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-2xl font-bold">Statement</h3>
                  <p className="text-[10px] font-bold text-black/30 uppercase tracking-[0.4em] mt-1">Settlement Overview</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Reference</p>
                  <p className="font-serif text-base font-bold opacity-40">INV-{invoices.length + 1}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest">Base Exchange</span>
                  <span className="font-serif text-lg font-bold">{settings?.general.currencySymbol || 'QR'} {subtotal.toLocaleString()}</span>
                </div>

                {isGstEnabled && (
                  <div className="flex justify-between items-center px-2 py-3 bg-gray-50 rounded-2xl border border-black/5">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-white border border-black/5 flex items-center justify-center text-[8px] font-bold text-black/40">%</div>
                      <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest leading-none">Tax Protocol</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-24">
                        <ZenDropdown 
                          label=""
                          hideLabel
                          options={gstRates.map(r => ({ label: `${r.percentage}%`, value: r._id }))}
                          value={selectedGSTRate?._id || ''}
                          onChange={(val) => setSelectedGSTRate(gstRates.find(r => r._id === val))}
                        />
                      </div>
                      <span className="font-serif text-base font-bold">+{gst.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center px-2">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest">Adjustments</span>
                    <div className="w-24">
                      <ZenDropdown 
                        label=""
                        hideLabel
                        options={[
                          { label: 'Static', value: 'Fixed' },
                          { label: 'Relational', value: 'Percentage' }
                        ]}
                        value={discountType}
                        onChange={(val) => setDiscountType(val)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {discountType === 'Percentage' && <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest shrink-0">-{discountAmount.toFixed(2)}</span>}
                    <input 
                      type="number"
                      className="w-20 bg-transparent border-b border-black/10 focus:border-black text-right font-serif text-lg font-bold outline-none pb-1 transition-all"
                      value={discount || ''}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="pt-8 border-t border-black/5 mt-8">
                  <div className="flex items-center justify-between p-6 bg-black text-white rounded-[2rem] shadow-xl">
                    <div>
                      <h4 className="text-[9px] font-bold uppercase tracking-[0.4em] opacity-40 mb-1">Total Settlement</h4>
                      <p className="text-[11px] font-bold text-zen-sand uppercase tracking-widest">Final Authorization</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold opacity-30 leading-none mb-1">{settings?.general.currencySymbol || 'QR'}</p>
                      <p className="text-3xl font-serif font-bold tracking-tighter">{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Mode Selection */}
          <div className="zen-pointed-surface bg-gray-50/50 border border-black/5 p-8 space-y-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-black/40">Engagement Logic</h3>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'Cash', icon: Wallet },
                { name: 'Card', icon: CreditCard },
                { name: 'UPI', icon: Smartphone },
                { name: 'Split', icon: Split }
              ].map((mode) => (
                <button
                  key={mode.name}
                  onClick={() => setPaymentMode(mode.name)}
                  className={`zen-pointed-surface group relative flex flex-col items-center justify-center gap-4 p-6 rounded-3xl border transition-all duration-500 ${paymentMode === mode.name
                    ? 'bg-white border-zen-sand shadow-lg ring-1 ring-zen-sand/20' 
                    : 'bg-transparent border-black/5 hover:border-black/20 text-black/30 hover:text-black/60'}`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${paymentMode === mode.name ? 'bg-zen-sand text-white scale-110 shadow-md shadow-zen-sand/20' : 'bg-white border border-black/5 group-hover:scale-110'}`}>
                    <mode.icon size={20} strokeWidth={1.5} />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${paymentMode === mode.name ? 'text-black' : 'text-inherit'}`}>{mode.name}</span>
                  {paymentMode === mode.name && (
                    <motion.div 
                      layoutId="active-dot"
                      className="absolute top-4 right-4 w-2 h-2 rounded-full bg-zen-sand shadow-sm shadow-zen-sand/20"
                    />
                  )}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {paymentMode === 'Split' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 pt-4 overflow-hidden"
                >
                  {payments.map((p, idx) => (
                    <div key={p.mode} className="zen-pointed-surface flex items-center gap-4 p-4 bg-white rounded-2xl border border-black/5 shadow-sm">
                      <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest w-12">{p.mode}</span>
                      <div className="flex-1 relative">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-20">{settings?.general.currencySymbol || 'QR'}</span>
                        <input 
                          type="number"
                          className="w-full bg-transparent border-none text-right font-serif font-bold text-lg outline-none pr-2"
                          value={p.amount || ''}
                          onChange={(e) => {
                            const newPayments = [...payments];
                            newPayments[idx].amount = parseFloat(e.target.value) || 0;
                            setPayments(newPayments);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${Math.abs(payments.reduce((acc, p) => acc + p.amount, 0) - total) < 0.01 ? 'bg-zen-leaf/10 border-zen-leaf/20 text-zen-leaf' : 'bg-red-50 border-red-100 text-red-500'}`}>
                    <div className="flex items-center gap-2">
                       {Math.abs(payments.reduce((acc, p) => acc + p.amount, 0) - total) < 0.01 ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                       <span className="text-[10px] font-bold uppercase tracking-widest">Balanced</span>
                    </div>
                    <span className="font-serif font-bold">{payments.reduce((acc, p) => acc + p.amount, 0).toLocaleString()}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <ZenButton 
              className={`w-full py-6 rounded-3xl text-sm uppercase tracking-[0.3em] font-bold shadow-2xl transition-all duration-500 ${loading ? 'opacity-50' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
              onClick={handleConfirmPayment}
              disabled={loading || !selectedClient || invoiceItems.length === 0}
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Synchronizing...
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  Authorize Settlement
                  <ArrowRight size={18} />
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
