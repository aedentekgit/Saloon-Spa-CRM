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
  Crown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ZenPageLayout } from '../components/zen/ZenLayout';
import { ZenBadge, ZenButton, ZenIconButton } from '../components/zen/ZenButtons';
import { ZenInput, ZenDropdown } from '../components/zen/ZenInputs';
import { notify } from '../components/ZenNotification';
import { useSettings } from '../context/SettingsContext';

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

const Billing = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('Fixed');
  const [paymentMode, setPaymentMode] = useState('Card');
  const [loading, setLoading] = useState(true);
  const [activeMembership, setActiveMembership] = useState<Membership | null>(null);
  const [gstRates, setGstRates] = useState<any[]>([]);
  const [selectedGSTRate, setSelectedGSTRate] = useState<any>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100/api';

  useEffect(() => {
    fetchData();
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

  const fetchData = async () => {
    try {
      const [invRes, cliRes, serRes] = await Promise.all([
        fetch(`${API_URL}/invoices`, { headers: { 'Authorization': `Bearer ${user?.token}` } }),
        fetch(`${API_URL}/clients`, { headers: { 'Authorization': `Bearer ${user?.token}` } }),
        fetch(`${API_URL}/services`, { headers: { 'Authorization': `Bearer ${user?.token}` } })
      ]);
      
      const [invData, cliData, serData] = await Promise.all([
        invRes.json(),
        cliRes.json(),
        serRes.json()
      ]);

      if (Array.isArray(invData)) setInvoices(invData);
      if (Array.isArray(cliData)) setClients(cliData.filter((c: any) => c.status === 'Active'));
      if (Array.isArray(serData)) setServices(serData.filter((s: any) => s.status === 'Active'));
    } catch (error) {
      notify('error', 'Sync Failure', 'Failed to retrieve financial sanctuary records');
    } finally {
      setLoading(false);
    }
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
        fetchData();
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
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white rounded-[3rem] border border-zen-brown/5 shadow-2xl shadow-zen-brown/10 overflow-hidden group">
              <div className="p-10 bg-zen-brown text-white flex flex-col sm:flex-row justify-between items-start gap-8 relative overflow-hidden">
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

              <div className="p-10 space-y-10">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                    <ZenDropdown 
                      label="Sanctuary Ambassador"
                      placeholder="Select Recipient"
                      options={['None', ...clients.map(c => c.name)]}
                      value={selectedClient?.name || 'None'}
                      onChange={(val) => setSelectedClient(clients.find(c => c.name === val) || null)}
                    />
                    
                    {activeMembership && (
                      <div className="sm:col-span-2 flex items-center gap-4 p-6 bg-zen-sand/5 rounded-3xl border border-zen-sand/10 animate-in fade-in slide-in-from-top-2 duration-500">
                         <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-zen-sand shadow-sm">
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
                          <tr className="text-zen-brown/30 text-[10px] uppercase tracking-[0.3em] italic">
                             <th className="px-6 font-bold">Ritual Sequence</th>
                             <th className="px-6 font-bold text-right">Energy Exchange</th>
                             <th className="px-6 font-bold text-right">Action</th>
                          </tr>
                       </thead>
                       <tbody>
                          {invoiceItems.map((item) => (
                             <tr key={item.uniqueId} className="group hover:bg-zen-cream/30 transition-all duration-500 rounded-2xl">
                                <td className="px-6 py-5 bg-zen-cream/10 rounded-l-2xl border-y border-l border-zen-brown/5 group-hover:bg-white">
                                   <div className="flex items-center gap-3">
                                      {item.isRedeem && (
                                         <div className="w-8 h-8 rounded-full bg-zen-sand/20 flex items-center justify-center text-zen-sand shrink-0 animate-in zoom-in duration-300">
                                            <Sparkles size={14} />
                                         </div>
                                      )}
                                      <div>
                                         <p className={`font-serif text-lg font-bold tracking-tight ${item.isRedeem ? 'text-zen-sand' : 'text-zen-brown'}`}>{item.name}</p>
                                         <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest mt-1">
                                            {item.isRedeem ? 'Session Redemption' : `${item.duration} Minutes Session`}
                                         </p>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-6 py-5 bg-zen-cream/10 border-y border-zen-brown/5 group-hover:bg-white text-right font-serif text-lg font-bold">
                                   {item.isRedeem ? (
                                      <span className="text-zen-leaf italic">Redeemed</span>
                                   ) : (
                                      <span className="text-zen-brown">{settings?.general.currencySymbol || 'QR'} {item.price?.toLocaleString()}</span>
                                   )}
                                </td>
                                <td className="px-6 py-5 bg-zen-cream/10 rounded-r-2xl border-y border-r border-zen-brown/5 group-hover:bg-white text-right">
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

                 <div className="space-y-4 pt-10 border-t border-zen-brown/5">
                    <div className="flex justify-between items-center px-6">
                       <span className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest text-left">Internal Subtotal</span>
                       <span className="font-serif text-lg font-bold text-zen-brown">{settings?.general.currencySymbol || 'QR'} {subtotal.toLocaleString()}</span>
                    </div>
                    {isGstEnabled && (
                      <div className="flex justify-between items-center px-6">
                         <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest text-left shrink-0">Tax Logic</span>
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
                          <span className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest">Adjust Balance</span>
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
                            className="w-32 bg-zen-cream/30 border-b border-zen-brown/10 p-2 text-right text-lg font-serif font-bold text-zen-brown outline-none focus:border-zen-brown transition-all"
                            value={discount}
                            onChange={(e) => setDiscount(parseInt(e.target.value) || 0)}
                          />
                       </div>
                    </div>

                    <div className="flex justify-between items-center px-8 py-8 bg-zen-cream/20 rounded-[2rem] mt-10">
                       <span className="text-xl font-serif font-bold text-zen-brown flex items-center gap-4">
                          <Sparkles size={24} className="text-zen-sand" />
                          Final Sanctuary Total
                       </span>
                       <span className="text-4xl font-serif font-bold text-zen-brown tracking-tighter">{settings?.general.currencySymbol || 'QR'} {total.toLocaleString()}</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="space-y-10">
           <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] border border-zen-brown/5 shadow-2xl shadow-zen-brown/5">
              <h3 className="text-xl font-serif font-bold text-zen-brown mb-8 flex items-center gap-3">
                 <Receipt size={20} className="text-zen-sand" />
                 Engagement Mode
              </h3>
              
              <div className="grid grid-cols-2 gap-6">
                 {[
                    { name: 'Cash', icon: Wallet },
                    { name: 'Card', icon: CreditCard },
                    { name: 'UPI', icon: Smartphone },
                    { name: 'GPay', icon: Smartphone }
                 ].map((mode) => (
                    <button
                      key={mode.name}
                      onClick={() => setPaymentMode(mode.name)}
                      className={`group p-8 rounded-[2rem] border transition-all duration-500 flex flex-col items-center gap-4 ${paymentMode === mode.name 
                        ? 'bg-zen-brown text-white border-zen-brown shadow-2xl shadow-zen-brown/20' 
                        : 'bg-white text-zen-brown/40 border-zen-brown/5 hover:border-zen-sand hover:bg-zen-cream/10'}`}
                    >
                       <mode.icon size={28} className={paymentMode === mode.name ? 'text-white' : 'text-zen-sand/60 group-hover:text-zen-sand'} strokeWidth={1.5} />
                       <span className="text-[10px] font-bold uppercase tracking-[0.3em]">{mode.name}</span>
                    </button>
                 ))}
              </div>

              <ZenButton 
                className="w-full py-5 rounded-[2rem] mt-10 text-lg shadow-2xl shadow-emerald-500/10" 
                onClick={handleConfirmPayment}
                disabled={!selectedClient || invoiceItems.length === 0}
              >
                 Confirm Ritual Exchange
              </ZenButton>
           </div>

           <div className="bg-white/60 backdrop-blur-sm rounded-[3rem] border border-zen-brown/5 overflow-hidden shadow-2xl shadow-zen-brown/5 flex flex-col h-[500px]">
              <div className="p-8 border-b border-zen-brown/5 bg-white/40">
                 <h3 className="text-lg font-serif font-bold text-zen-brown">Financial Registry</h3>
                 <p className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mt-1">Archived Invoices</p>
              </div>
              
              <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
                 {invoices.map((inv) => (
                    <div key={inv._id} className="group p-5 bg-white hover:bg-zen-cream/30 border border-zen-brown/5 rounded-[1.8rem] transition-all duration-500 cursor-pointer">
                       <div className="flex justify-between items-start mb-4">
                          <div className="min-w-0">
                             <p className="text-sm font-bold text-zen-brown truncate tracking-tight">{inv.clientName}</p>
                             <p className="text-[9px] font-bold text-zen-brown/20 uppercase tracking-[.2em] mt-1">{inv.invoiceNumber}</p>
                          </div>
                          <span className="text-[9px] font-bold text-zen-leaf bg-zen-leaf/10 px-3 py-1 rounded-full uppercase tracking-widest">{inv.paymentMode}</span>
                       </div>
                       
                       <div className="flex justify-between items-end">
                          <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest">{dayjs(inv.date).format('MMM DD, YYYY')}</p>
                          <p className="text-xl font-serif font-bold text-zen-brown">{settings?.general.currencySymbol || 'QR'} {inv.total?.toLocaleString()}</p>
                       </div>
                    </div>
                 ))}
                 {invoices.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                       <Receipt size={60} strokeWidth={0.5} />
                       <p className="text-sm italic font-serif mt-4">Registry is empty</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </ZenPageLayout>
  );
};

export default Billing;
