import React, { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Filter, 
  Trash2, 
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenBadge, ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { ZenStatCard } from '../../components/zen/ZenStatCard';
import { ZenInput, ZenDropdown, ZenDatePicker } from '../../components/zen/ZenInputs';
import { Modal } from '../../components/shared/Modal';
import { notify } from '../../components/shared/ZenNotification';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { useSettings } from '../../context/SettingsContext';

interface Expense {
  _id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
}

interface Invoice {
  _id: string;
  clientName: string;
  total: number;
  date: string;
  paymentMode: string;
}

interface LedgerRow {
  id: string;
  kind: 'Income' | 'Expense';
  title: string;
  subtitle: string;
  date: string;
  amount: number;
  meta: string;
  sourceId: string;
}

const Finance = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Inventory',
    amount: 0,
    date: dayjs().format('YYYY-MM-DD')
  });

  const [trendData, setTrendData] = useState<any[]>([]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invRes, expRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/invoices`, { headers: { 'Authorization': `Bearer ${user?.token}` } }),
        fetch(`${API_URL}/expenses`, { headers: { 'Authorization': `Bearer ${user?.token}` } }),
        fetch(`${API_URL}/stats/dashboard`, { headers: { 'Authorization': `Bearer ${user?.token}` } })
      ]);
      const invData = await invRes.json();
      const expData = await expRes.json();
      const statsData = await statsRes.json();
      
      if (Array.isArray(invData)) setInvoices(invData);
      if (Array.isArray(expData)) setExpenses(expData);
      if (statsData.revenue?.trend) {
        setTrendData(statsData.revenue.trend);
      }
    } catch (error) {
      notify('error', 'Sync Failure', 'Failed to retrieve finance records');
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = useMemo(() => invoices.reduce((acc, inv) => acc + (inv.total || 0), 0), [invoices]);
  const totalExpenses = useMemo(() => expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0), [expenses]);
  const netProfit = totalIncome - totalExpenses;

  const ledgerRows = useMemo<LedgerRow[]>(() => {
    const expenseRows = expenses.map(exp => ({
      id: `expense-${exp._id}`,
      kind: 'Expense' as const,
      title: exp.title,
      subtitle: exp.category,
      date: exp.date,
      amount: exp.amount || 0,
      meta: 'Operational outflow',
      sourceId: exp._id
    }));

    const invoiceRows = invoices.map(inv => ({
      id: `invoice-${inv._id}`,
      kind: 'Income' as const,
      title: `Service ${inv.clientName}`,
      subtitle: inv.paymentMode,
      date: inv.date,
      amount: inv.total || 0,
      meta: 'Completed invoice',
      sourceId: inv._id
    }));

    return [...expenseRows, ...invoiceRows].sort(
      (a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
    );
  }, [expenses, invoices]);

  const chartData = useMemo(() => {
    if (trendData.length > 0) return trendData;
    // Fallback if no trend data
    return [
      { name: '...', revenue: 0, expenses: 0 },
    ];
  }, [trendData]);

  const hasChartPoints = useMemo(
    () => chartData.some(point => Number(point.revenue || 0) > 0 || Number(point.expenses || 0) > 0),
    [chartData]
  );


  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        notify('success', 'Expense Recorded', 'The entry has been recorded.');
        setIsModalOpen(false);
        fetchData();
        setFormData({ title: '', category: 'Inventory', amount: 0, date: dayjs().format('YYYY-MM-DD') });
      }
    } catch (error) {
      notify('error', 'Save Error', 'Failed to update tactical record.');
    }
  };

  const executeDelete = async () => {
    if (!expenseToDelete) return;
    try {
      const response = await fetch(`${API_URL}/expenses/${expenseToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });

      if (response.ok) {
        notify('success', 'Entry Deleted', 'The entry has been removed from history.');
        setIsConfirmOpen(false);
        fetchData();
      }
    } catch (error) {
      notify('error', 'Removal Error', 'Failed to delete ledger entry.');
    }
  };

  return (
    <ZenPageLayout
      title="Finance Ledger"
      hideSearch
      hideBranchSelector
      hideViewToggle
      hideAddButton
      onAddClick={() => setIsModalOpen(true)}
    >
      <div style={{ '--zen-primary': settings?.theme?.primaryColor || '#332766' } as React.CSSProperties} className="space-y-10 pb-20 mt-4">
        <div className="flex overflow-x-auto overflow-y-visible pt-4 pb-6 gap-6 lg:grid lg:grid-cols-3 lg:gap-8 lg:overflow-visible scrollbar-hide px-4 lg:px-2">
          {[
            { label: 'Internal Inflow', value: `${settings?.general?.currencySymbol || 'QR'} ${totalIncome.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', trend: 'Total Revenue Generated' },
            { label: 'External Outflow', value: `${settings?.general?.currencySymbol || 'QR'} ${totalExpenses.toLocaleString()}`, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10', glow: 'bg-red-500/20', trend: 'Operational Expenditure' },
            { label: 'Net Balance', value: `${settings?.general?.currencySymbol || 'QR'} ${netProfit.toLocaleString()}`, icon: Coins, color: 'text-zen-sand', bg: 'bg-zen-sand/10', glow: 'bg-zen-sand/20', trend: 'Liquid Asset Position' }
          ].map((stat, i) => (
            <ZenStatCard key={stat.label} {...stat} delay={i * 0.2} />
          ))}
        </div>

        {/* Global Filter Bar */}
        <div className="zen-pointed-surface border border-zen-stone/70 bg-white/75 backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.04)] px-5 sm:px-6 py-5">
           <div className="flex flex-col xl:flex-row xl:items-end gap-5 xl:gap-8">
              <div className="flex-1 w-full flex flex-col gap-2.5">
                 <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-1.5">Registry Search</label>
                 <div className="relative group">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zen-brown/20 group-focus-within:text-zen-sand transition-colors">
                      <Filter size={16} />
                    </span>
                    <input
                      type="text"
                      placeholder="Search entries, amounts, or dates..."
                      disabled
                      className="w-full h-[58px] pl-[52px] pr-6 bg-white/70 border border-zen-brown/10 rounded-[1.15rem] focus:bg-white focus:ring-4 focus:ring-zen-sand/5 focus:border-zen-sand/20 outline-none transition-all duration-500 text-sm font-medium shadow-sm opacity-50"
                    />
                 </div>
              </div>

              <div className="flex flex-col gap-2.5 w-full xl:w-auto">
                 <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-1.5">Management</label>
                 <ZenButton onClick={() => setIsModalOpen(true)} variant="primary" className="w-full xl:w-auto px-8 h-[58px] shadow-sm flex items-center justify-center gap-2 group rounded-[1.15rem]">
                    <Plus size={16} className="group-hover:rotate-12 transition-transform duration-500" />
                    <span className="uppercase tracking-[0.2em] text-[10px] font-black">Log Expenditure</span>
                 </ZenButton>
              </div>
           </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans">
        {/* Left Side: Chart */}
        <div className="lg:col-span-7 w-full flex flex-col">
           <div className="bg-white/90 backdrop-blur-2xl border border-zen-stone/70 zen-pointed-surface shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-6 sm:p-8 min-h-[420px] relative overflow-hidden">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-zen-brown/5">
                <div>
                   <h3 className="text-xl font-bold text-gray-900 tracking-tight">Financial Status</h3>
                   <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Income vs expenditure dynamics</p>
                </div>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Revenue</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Expenses</span>
                   </div>
                </div>
             </div>

             {!hasChartPoints && (
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="text-center max-w-xs opacity-20">
                   <Coins size={46} strokeWidth={0.8} className="mx-auto mb-4" />
                   <p className="italic font-serif text-lg text-gray-500">No revenue trend data is available yet.</p>
                 </div>
               </div>
             )}
             <div className="h-[320px] w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                       <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                       </linearGradient>
                       <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '1.5rem', 
                        border: 'none', 
                        boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
                        padding: '1.5rem'
                      }} 
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} strokeDasharray="10 10" fillOpacity={1} fill="url(#colorExpense)" />
                 </AreaChart>
              </ResponsiveContainer>
             </div>
           </div>
        </div>

        {/* Right Side: Ledger */}
        <div className="lg:col-span-5 w-full flex flex-col">
           <div className="bg-white/90 backdrop-blur-2xl border border-zen-stone/70 zen-pointed-surface shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="flex justify-between items-center gap-4 px-6 sm:px-8 pt-6 pb-5 border-b border-zen-brown/5">
                 <div>
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">Recent Activity</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Combined transaction registry</p>
                 </div>
                 <ZenBadge variant="leaf" className="px-3 sm:px-5">Ledger</ZenBadge>
              </div>

               <div className="table-container overflow-x-auto">
                 <div className="min-w-[800px]">
                   <table className="w-full text-center border-collapse">
                     <colgroup>
                       <col className="w-[10%]" />
                       <col className="w-[15%]" />
                       <col className="w-[30%]" />
                       <col className="w-[15%]" />
                       <col className="w-[15%]" />
                       <col className="w-[15%]" />
                     </colgroup>
                     <thead>
                       <tr>
                         <th>S NO</th>
                         <th>VISUAL</th>
                         <th>ENTRY DETAILS</th>
                         <th>DATE</th>
                         <th>VOLUME</th>
                         <th>ACTIONS</th>
                       </tr>
                     </thead>
                     <tbody>
                       <AnimatePresence mode="popLayout">
                         {ledgerRows.length === 0 ? (
                           <tr>
                             <td colSpan={6} className="px-6 py-24 text-center text-[11px] font-sans text-gray-400 bg-gray-50/30">
                                <div className="flex flex-col items-center gap-4 opacity-20">
                                   <Coins size={60} strokeWidth={0.5} />
                                   <p className="italic font-serif text-xl">Ledger is currently quiet.</p>
                                </div>
                             </td>
                           </tr>
                         ) : (
                           ledgerRows.map((row, idx) => {
                             const isExpense = row.kind === 'Expense';
                             return (
                               <motion.tr 
                                 key={row.id} 
                                 initial={{ opacity: 0 }}
                                 animate={{ opacity: 1 }}
                                 exit={{ opacity: 0 }}
                                 className="transition-all group border-b border-black/[0.02]"
                               >
                                 <td className="text-center italic opacity-40 text-[11px]">
                                   {(idx + 1).toString().padStart(2, '0')}
                                 </td>
                                 <td>
                                   <div className="flex justify-center">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm group-hover:scale-110 transition-transform duration-500 shrink-0 ${isExpense ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'}`}>
                                        {isExpense ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                                      </div>
                                   </div>
                                 </td>
                                 <td>
                                   <div className="flex flex-col items-center justify-center px-4">
                                     <span className="zen-table-primary">{row.title}</span>
                                     <div className="flex items-center justify-center gap-2 mt-1">
                                        <span className="zen-table-meta">{row.subtitle}</span>
                                     </div>
                                   </div>
                                 </td>
                                 <td>
                                   <div className="flex flex-col items-center">
                                     <span className="zen-table-primary !text-[14px]">{dayjs(row.date).format('MMM DD, YYYY')}</span>
                                     <span className="zen-table-meta">{row.meta}</span>
                                   </div>
                                 </td>
                                 <td>
                                   <p className={`text-base font-serif font-black ${isExpense ? 'text-rose-500' : 'text-emerald-500'}`}>
                                     {isExpense ? '-' : '+'}{settings?.general?.currencySymbol || 'QR'} {row.amount?.toLocaleString()}
                                   </p>
                                 </td>
                                 <td>
                                   <div className="flex items-center justify-center gap-3">
                                     {isExpense ? (
                                       <ZenIconButton
                                         icon={Trash2}
                                         variant="danger"
                                         onClick={() => {
                                           setExpenseToDelete(row.sourceId);
                                           setIsConfirmOpen(true);
                                         }}
                                       />
                                     ) : (
                                       <ZenBadge variant="leaf" className="px-4">Settled</ZenBadge>
                                     )}
                                   </div>
                                 </td>
                               </motion.tr>
                             );
                           })
                         )}
                       </AnimatePresence>
                     </tbody>
                   </table>
                 </div>
               </div>
           </div>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Log Expenditure"
        subtitle="Record an external outflow"
        headerIcon={TrendingDown}
        footer={
          <div className="flex gap-6">
            <ZenButton 
               type="button" 
               variant="secondary" 
               onClick={() => setIsModalOpen(false)} 
               className="flex-1 text-[10px] tracking-[0.2em] font-black"
            >
               DISCARD
            </ZenButton>
            <ZenButton 
               type="submit" 
               form="log-expenditure-form" 
               className="flex-[2] bg-zen-sand hover:bg-zen-sand/90 shadow-lg shadow-zen-sand/20 text-[10px] tracking-[0.2em] font-black"
            >
               SAVE ENTRY
            </ZenButton>
          </div>
        }
      >
        <form id="log-expenditure-form" onSubmit={handleAddExpense} className="space-y-8">
           <ZenInput
             label="Resource Identity"
             required
             placeholder="e.g. Monthly Retainer"
             value={formData.title}
             onChange={(e: any) => setFormData({...formData, title: e.target.value})}
           />

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <ZenDropdown
                label="Tactical Category"
                value={formData.category}
                onChange={(val: any) => setFormData({...formData, category: val})}
                options={['Inventory', 'Utilities', 'Staff', 'Marketing', 'Rent', 'Misc']}
              />
              <ZenInput
                type="number"
                label={`Exchange Volume (${settings?.general?.currencySymbol || 'QR'})`}
                required
                value={formData.amount}
                onChange={(e: any) => setFormData({...formData, amount: parseInt(e.target.value) || 0})}
              />
           </div>

           <ZenDatePicker
             label="Ledger Entry Date"
             value={formData.date}
             onChange={(val: any) => setFormData({...formData, date: val})}
           />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Purge Entry?"
        message="Are you sure you want to remove this entry from the ledger?"
      />
      </div>
    </ZenPageLayout>
  );
};

export default Finance;
