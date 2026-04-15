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
  ChevronDown
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenBadge, ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { ZenInput, ZenDropdown } from '../../components/zen/ZenInputs';
import { notify } from '../../components/shared/ZenNotification';
import { useSettings } from '../../context/SettingsContext';

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

interface Invoice {
  _id: string;
  invoiceNumber: string;
  clientName: string;
  total: number;
  date: string;
  paymentMode: string;
}

import { useData } from '../../context/DataContext';

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

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchGSTRates();
  }, []);

  const fetchGSTRates = async () => {
    try {
      const res = await fetch(`${API_URL}/gst`, { headers: { 'Authorization': `Bearer ${user?.token}` } });
      const data = await res.json();
      if (Array.isArray(data)) {
        setGstRates(data);
        const active = data.find(r => r.isActive);
        if (active) setSelectedGSTRate(active);
        else if (data.length > 0) setSelectedGSTRate(data[0]);
      }
    } catch (e) {}
  };

  const subtotal = useMemo(() => {
    return invoiceItems.reduce((acc, item) => acc + (item.isRedeem ? 0 : (item.price || 0)), 0);
  }, [invoiceItems]);

  useEffect(() => {
    if (selectedClient) {
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
      const active = data.find((m: any) => m.status === 'Active');
      if (active) {
        setActiveMembership(active);
        // Only apply tier discount if it's not a session-only plan or if sessions are exhausted
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
        // Validation: Ensure membership has sessions and service is applicable
        if (!activeMembership) {
          notify('warning', 'Access Denied', 'Ambassador has no active membership record');
          return item;
        }
        if (activeMembership.remainingSessions <= 0 && activeMembership.totalSessions > 0) {
          notify('error', 'Cycle Exhausted', 'No sessions remaining in the current cycle');
          return item;
        }
        
        const isCurrentlyRedeeming = !item.isRedeem;
        const totalRedeemedAlready = invoiceItems.filter(i => i.isRedeem && i.uniqueId !== uniqueId).length;
        
        if (isCurrentlyRedeeming && (totalRedeemedAlready >= activeMembership.remainingSessions)) {
           notify('error', 'Limit Reached', 'Cannot redeem more sessions than available balance');
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
      notify('error', 'Incomplete Application', 'Please select an ambassador and add services.');
      return;
    }

    if (paymentMode === 'Split') {
      const splitTotal = payments.reduce((acc, p) => acc + p.amount, 0);
      if (Math.abs(splitTotal - total) > 0.01) {
        notify('error', 'Balance Mismatch', `Split total (${splitTotal}) must match final total (${total})`);
        return;
      }
    }

    const nextNumber = `INV-${dayjs().year()}-${String(invoices.length + 1).padStart(3, '0')}`;
    
    const newInvoice = {
      invoiceNumber: nextNumber,
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
        
        // Handle Session Redemptions sequentially
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
                    notes: `Redeemed via Invoice ${nextNumber}`,
                    branchId: user?.branch || undefined
                 })
              });
           }
        }

        notify('success', 'Exchange Recorded', 'The financial transaction has been successfully archived.');
        setSelectedClient(null);
        setInvoiceItems([]);
        setDiscount(0);
        setPayments(payments.map(p => ({ ...p, amount: 0 })));
        setPaymentMode('Card');
        refreshData();
      }
    } catch (error) {
      notify('error', 'Transaction Error', 'Failed to conclude the financial sequence.');
    }
  };

  return (
    <ZenPageLayout
      title="Financial Sanctuary"
      hideSearch
      hideAddButton
      hideBranchSelector
      onViewModeChange={null as any}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10 items-stretch">
        <div className="lg:col-span-2 flex flex-col h-full">
           <div className="bg-white rounded-[2rem] sm:rounded-[3rem] border border-zen-brown/15 shadow-sm overflow-hidden group flex flex-col h-full">
              <div className="p-6 sm:p-10 bg-zen-brown text-white flex flex-col sm:flex-row justify-between items-start gap-6 sm:gap-8 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-125 transition-transform duration-1000">
                    <Zap size={150} />
                 </div>
                 
                 <div className="relative z-10">
                    <h2 className="text-3xl font-serif font-bold tracking-tight">Sanctuary Terminal</h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40 mt-2">Authentic Wellness Exchange</p>
                 </div>
                 
                 <div className="relative z-10 text-left sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Sequence Number</p>
                    <p className="text-2xl font-serif font-bold mt-1">INV-{dayjs().year()}-{String(invoices.length + 1).padStart(3, '0')}</p>
                 </div>
              </div>

              <div className="p-6 sm:p-10 space-y-6 sm:space-y-10">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10">
                    <ZenDropdown 
                      label="Sanctuary Ambassador"
                      placeholder="Select Recipient"
                      options={['None', ...clients.map(c => c.name)]}
                      value={selectedClient?.name || 'None'}
                      onChange={(val) => setSelectedClient(clients.find(c => c.name === val) || null)}
                    />
                    
                    {activeMembership && (
                      <div className="sm:col-span-2 flex flex-col sm:flex-row items-center gap-4 p-4 sm:p-6 bg-zen-sand/5 rounded-2xl sm:rounded-3xl border border-zen-sand/10 animate-in fade-in slide-in-from-top-2 duration-500">
                         <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white flex items-center justify-center text-zen-sand shadow-sm shrink-0">
                            <Crown size={24} />
                         </div>
                         <div className="flex-1">
                            <h4 className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em]">Ambassador Priority Status</h4>
                            <p className="font-serif text-lg font-bold text-zen-brown leading-none mt-1">
                               {activeMembership.plan.name} Member
                            </p>
                            {activeMembership.totalSessions > 0 && (
                               <p className="text-[8px] font-bold text-zen-sand uppercase tracking-[0.2em] mt-2">
                                  Registry Balance: {activeMembership.remainingSessions} / {activeMembership.totalSessions} Nodes Remaining
                               </p>
                            )}
                         </div>
                         <div className="text-right">
                             <p className="text-[10px] font-bold text-zen-leaf uppercase tracking-widest">Active Privilege Applied</p>
                             <p className="font-serif text-lg font-bold text-zen-leaf">
                                {activeMembership.plan.discountValue > 0 ? (
                                   `${activeMembership.plan.discountValue}${activeMembership.plan.discountType === 'Percentage' ? '%' : ` ${settings?.general.currencySymbol || 'QR'}`} Deduction`
                                ) : (
                                   'Session Access'
                                )}
                             </p>
                         </div>
                      </div>
                    )}
                    
                    <ZenDropdown 
                      label="Add Ritual Service"
                      placeholder="+ Select Sequence"
                      options={services.map(s => s.name)}
                      value=""
                      onChange={handleAddService}
                    />
                 </div>

                 <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left border-separate border-spacing-y-4">
                        <thead>
                           <tr className="text-zen-brown/30 text-[10px] uppercase tracking-[0.25em] italic">
                              <th className="px-6 font-bold py-4">Ritual Sequence</th>
                              <th className="px-6 font-bold py-4 text-right">Energy Exchange</th>
                              <th className="px-6 font-bold py-4 text-right">Action</th>
                           </tr>
                        </thead>
                        <tbody>
                           {invoiceItems.map((item) => (
                              <tr key={item.uniqueId} className="group hover:bg-zen-cream/30 transition-all duration-500 rounded-2xl">
                                 <td className="px-6 py-4 bg-zen-cream/10 rounded-l-2xl border-y border-l border-zen-brown/15 group-hover:bg-white transition-all">
                                    <div className="flex items-center gap-3">
                                       {item.isRedeem && (
                                          <div className="w-8 h-8 rounded-full bg-zen-sand/20 flex items-center justify-center text-zen-sand shrink-0 animate-in zoom-in duration-300">
                                             <Sparkles size={14} />
                                          </div>
                                       )}
                                       <div>
                                          <span className={`zen-table-primary ${item.isRedeem ? 'text-zen-sand' : ''}`}>{item.name}</span>
                                          <span className="zen-table-meta">
                                             {item.isRedeem ? 'Session Redemption' : `${item.duration} Minutes Session`}
                                          </span>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-4 sm:px-6 py-4 bg-zen-cream/10 border-y border-zen-brown/15 group-hover:bg-white text-right font-serif text-base font-bold transition-all">
                                    {item.isRedeem ? (
                                       <span className="text-zen-leaf italic">Redeemed</span>
                                    ) : (
                                       <span className="text-zen-brown">{settings?.general.currencySymbol || 'QR'} {item.price?.toLocaleString()}</span>
                                    )}
                                 </td>
                                 <td className="px-6 py-4 bg-zen-cream/10 rounded-r-2xl border-y border-r border-zen-brown/15 group-hover:bg-white text-right transition-all">
                                   <div className="flex items-center justify-end gap-2">
                                      {activeMembership && activeMembership.totalSessions > 0 && (
                                         <ZenIconButton 
                                           icon={Zap} 
                                           variant={item.isRedeem ? 'leaf' : 'secondary'} 
                                           onClick={() => toggleRedeem(item.uniqueId)}
                                           title={item.isRedeem ? "Revert to Paid" : "Redeem Session"}
                                         />
                                      )}
                                      <ZenIconButton 
                                        icon={Trash2} 
                                        variant="danger" 
                                        onClick={() => handleRemoveItem(item.uniqueId)} 
                                      />
                                   </div>
                                </td>
                             </tr>
                          ))}
                          {invoiceItems.length === 0 && (
                             <tr>
                                <td colSpan={3} className="py-20 text-center text-zen-brown/20 italic font-serif text-lg">
                                   Initiate sequence by adding services
                                </td>
                             </tr>
                          )}
                       </tbody>
                    </table>
                 </div>

                 <div className="space-y-4 pt-10 border-t border-zen-brown/15">
                    <div className="flex justify-between items-center px-6">
                       <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest text-left">Internal Subtotal</span>
                       <span className="font-serif text-lg font-bold text-zen-brown">{settings?.general.currencySymbol || 'QR'} {subtotal.toLocaleString()}</span>
                    </div>
                    {isGstEnabled && (
                      <div className="flex justify-between items-center px-6">
                         <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest text-left shrink-0">Tax Logic</span>
                            <ZenDropdown 
                              label="Tax Rate"
                              hideLabel
                              options={gstRates.map(r => `${r.percentage}%`)}
                              value={selectedGSTRate ? `${selectedGSTRate.percentage}%` : '0%'}
                              onChange={(val) => setSelectedGSTRate(gstRates.find(r => `${r.percentage}%` === val))}
                              className="w-48"
                            />
                         </div>
                         <span className="font-serif text-lg font-bold text-zen-brown">{settings?.general.currencySymbol || 'QR'} {gst.toLocaleString()}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center px-6 pt-4">
                       <div className="flex items-center gap-4">
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Adjust Balance</span>
                          <ZenDropdown 
                            label="Adjustment Method" 
                            options={['Fixed', 'Percentage']} 
                            value={discountType} 
                            onChange={(val) => setDiscountType(val || 'Fixed')} 
                            className="w-48"
                          />
                       </div>
                       <div className="flex items-center gap-6">
                          {discountType === 'Percentage' && <span className="text-[10px] font-bold text-zen-leaf uppercase tracking-widest">(-{settings?.general.currencySymbol || 'QR'} {discountAmount.toLocaleString()})</span>}
                          <input 
                            type="number" 
                            className="w-32 bg-zen-cream/30 border-b border-zen-brown/25 p-2 text-right text-lg font-serif font-bold text-zen-brown outline-none focus:border-zen-brown transition-all"
                            value={discount}
                            onChange={(e) => setDiscount(parseInt(e.target.value) || 0)}
                          />
                       </div>
                    </div>

                    <div className="flex justify-between items-center px-4 sm:px-8 py-6 sm:py-8 bg-zen-cream/20 rounded-[1.5rem] sm:rounded-[2rem] mt-6 sm:mt-10">
                       <span className="text-lg sm:text-xl font-serif font-bold text-zen-brown flex items-center gap-3 sm:gap-4">
                          <Sparkles size={20} className="text-zen-sand sm:w-6 sm:h-6" />
                          Final Sanctuary Total
                       </span>
                       <span className="text-2xl sm:text-4xl font-serif font-bold text-zen-brown tracking-tighter">{settings?.general.currencySymbol || 'QR'} {total.toLocaleString()}</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="flex flex-col h-full">
           <div className="bg-white/80 backdrop-blur-xl p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-zen-brown/15 shadow-sm flex flex-col h-full">
              <h3 className="text-lg sm:text-xl font-serif font-bold text-zen-brown mb-6 sm:mb-8 flex items-center gap-3">
                 <div className="w-8 h-8 rounded-xl bg-zen-sand/10 flex items-center justify-center text-[10px] font-bold text-zen-sand border border-zen-sand/20 shadow-sm shrink-0">
                    {settings?.general.currencySymbol || 'QR'}
                 </div>
                 Engagement Mode
              </h3>
              
              <div className="flex flex-col gap-3">
                 {[
                    { name: 'Cash', icon: Wallet },
                    { name: 'Card', icon: CreditCard },
                    { name: 'UPI', icon: Smartphone },
                    { name: 'GPay', icon: Smartphone },
                    { name: 'Split', icon: Split }
                 ].map((mode) => (
                   <button
                     key={mode.name}
                     onClick={() => setPaymentMode(paymentMode === mode.name && mode.name === 'Split' ? 'Card' : mode.name)}
                     className={`group px-6 py-4 rounded-2xl border transition-all duration-300 flex items-center justify-between ${paymentMode === mode.name 
                       ? 'bg-zen-brown text-white border-zen-brown shadow-xl shadow-zen-brown/20' 
                       : 'bg-white/50 text-zen-brown/40 border-zen-brown/10 hover:border-zen-sand/30 hover:bg-white'}`}
                   >
                      <div className="flex items-center gap-4">
                        <mode.icon size={20} className={paymentMode === mode.name ? 'text-white' : 'text-zen-sand/60 group-hover:text-zen-sand'} strokeWidth={1.5} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em]">{mode.name}</span>
                      </div>
                      {paymentMode === mode.name && (
                        <motion.div 
                          layoutId="payment-active"
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-white shadow-sm ${mode.name === 'Split' ? 'bg-zen-sand shadow-zen-sand/20' : 'bg-zen-leaf shadow-zen-leaf/20'}`}
                        >
                          {mode.name === 'Split' ? (
                             <motion.div
                               initial={{ rotate: 0 }}
                               animate={{ rotate: 180 }}
                               transition={{ duration: 0.3 }}
                             >
                               <ChevronDown size={12} />
                             </motion.div>
                          ) : (
                             <Sparkles size={10} />
                          )}
                        </motion.div>
                      )}
                   </button>
                 ))}
              </div>

              {paymentMode === 'Split' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-8 p-8 bg-zen-cream/30 rounded-[2.5rem] border border-zen-brown/15 space-y-6"
                >
                  <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mb-4">Allocate Split Balance</p>
                  {payments.map((p, idx) => (
                    <div key={p.mode} className="flex items-center justify-between gap-4">
                      <span className="text-sm font-bold text-zen-brown/60 w-16">{p.mode}</span>
                      <div className="flex-1 relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zen-brown/20">{settings?.general.currencySymbol || 'QR'}</span>
                        <input 
                          type="number"
                          className="w-full bg-white/60 border border-zen-brown/15 rounded-xl py-3 pl-12 pr-4 text-right font-serif font-bold text-zen-brown outline-none focus:border-zen-brown transition-all"
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
                  <div className="pt-4 border-t border-zen-brown/15 flex justify-between items-center italic">
                    <span className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest">Total Allocated</span>
                    <span className={`font-serif font-bold ${Math.abs(payments.reduce((acc, p) => acc + p.amount, 0) - total) < 0.01 ? 'text-zen-leaf' : 'text-red-400'}`}>
                      {settings?.general.currencySymbol || 'QR'} {payments.reduce((acc, p) => acc + p.amount, 0).toLocaleString()}
                    </span>
                  </div>
                </motion.div>
              )}

              <ZenButton 
                className="w-full py-5 rounded-[2rem] mt-10 text-lg shadow-sm shadow-emerald-500/10" 
                onClick={handleConfirmPayment}
                disabled={!selectedClient || invoiceItems.length === 0}
              >
                 Confirm Ritual Exchange
              </ZenButton>
           </div>

        </div>
      </div>
    </ZenPageLayout>
  );
};

export default Billing;
