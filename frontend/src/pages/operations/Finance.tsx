import React, { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Filter, 
  Trash2, 
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  CheckCircle2,
  Grid,
  List
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

const Finance = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('zen_finance_view') as 'grid' | 'table') || 'table';
  });

  const [formData, setFormData] = useState({
    title: '',
    category: 'Inventory',
    amount: 0,
    date: dayjs().format('YYYY-MM-DD')
  });

  const [trendData, setTrendData] = useState<any[]>([]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

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

  const chartData = useMemo(() => {
    if (trendData.length > 0) return trendData;
    // Fallback if no trend data
    return [
      { name: '...', revenue: 0, expenses: 0 },
    ];
  }, [trendData]);


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
      <div style={{ '--theme-primary': settings?.theme?.primaryColor || '#8B5CF6' } as React.CSSProperties} className="contents">
        <div className="flex overflow-x-auto pb-6 gap-4 sm:gap-6 md:grid md:grid-cols-3 mb-8 sm:mb-10 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
          {[
            { label: 'Internal Inflow', value: `${settings?.general?.currencySymbol || 'QR'} ${totalIncome.toLocaleString()}`, unit: '', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', watermark: TrendingUp },
            { label: 'External Outflow', value: `${settings?.general?.currencySymbol || 'QR'} ${totalExpenses.toLocaleString()}`, unit: '', icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10', watermark: TrendingDown },
            { label: 'Net Balance', value: `${settings?.general?.currencySymbol || 'QR'} ${netProfit.toLocaleString()}`, unit: '', icon: Coins, color: 'text-indigo-500', bg: 'bg-indigo-500/10', watermark: Coins }
          ].map((stat, i) => (
            <ZenStatCard key={stat.label} {...stat} index={i} />
          ))}
        </div>

        {/* Global Filter Bar */}
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl border border-zen-brown/15 shadow-sm mb-10">
          <div className="flex flex-col lg:flex-row gap-8 items-end">
             <div className="flex-1 w-full flex flex-col gap-3">
                <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-2">Registry Search</label>
                <div className="relative group">
                   <span className="absolute left-6 top-1/2 -translate-y-1/2 text-zen-brown/20 group-focus-within:text-zen-sand transition-colors">
                     <Filter size={16} />
                   </span>
                   <input 
                     type="text"
                     placeholder="Transactions are logged chronologically..."
                     disabled
                     className="w-full pl-14 pr-6 py-3.5 bg-zen-cream/30 border border-zen-brown/10 rounded-xl focus:bg-white focus:ring-4 focus:ring-zen-sand/5 focus:border-zen-sand/20 outline-none transition-all duration-500 text-sm font-medium shadow-sm opacity-50"
                   />
                </div>
             </div>

             <div className="flex flex-wrap lg:flex-nowrap gap-4 w-full lg:w-auto items-end">
                <div className="flex items-center gap-4">
                   <div className="flex flex-col gap-3">
                      <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-2">Perspective</label>
                      <div className="flex items-center h-[48px] bg-zen-cream/50 p-1 rounded-xl border border-zen-brown/10 shadow-inner">
                         <button 
                           onClick={() => setViewMode('grid')}
                           className={`h-full aspect-square flex items-center justify-center rounded-lg transition-all duration-500 ${viewMode === 'grid' ? 'bg-zen-brown text-white shadow-lg' : 'text-zen-brown/30 hover:text-zen-brown hover:bg-white'}`}
                         >
                           <Grid size={16} />
                         </button>
                         <button 
                           onClick={() => setViewMode('table')}
                           className={`h-full aspect-square flex items-center justify-center rounded-lg transition-all duration-500 ${viewMode === 'table' ? 'bg-zen-brown text-white shadow-lg' : 'text-zen-brown/30 hover:text-zen-brown hover:bg-white'}`}
                         >
                           <List size={16} />
                         </button>
                      </div>
                   </div>
                </div>

                <div className="flex flex-col gap-3 w-full lg:w-auto">
                   <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-2">Management</label>
                   <ZenButton onClick={() => setIsModalOpen(true)} variant="primary" className="w-full sm:w-auto px-8 h-[48px] shadow-sm flex items-center justify-center gap-2 group">
                      <Plus size={16} className="group-hover:rotate-12 transition-transform duration-500" />
                      <span className="uppercase tracking-[0.2em] text-[10px] font-black">Log Expenditure</span>
                   </ZenButton>
                </div>
             </div>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
        {/* Left Side: Chart */}
        <div className="w-full bg-white p-8 rounded-3xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col overflow-hidden hover:-translate-y-1 hover:shadow-[0_10px_30px_rgb(0,0,0,0.08)] hover:border-[color:var(--theme-primary)] transition-all duration-300">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 z-10 relative">
              <div>
                 <h3 className="text-xl font-bold text-gray-900 tracking-tight">Financial Status</h3>
                 <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Income vs Expenditure Dynamics</p>
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
                 <div className="ml-2">
                    <ZenIconButton icon={Filter} />
                 </div>
              </div>
           </div>
           
           <div className="h-[300px] w-full mt-auto relative z-10 -ml-4">
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

        {/* Right Side: List */}
        <div className="w-full bg-white p-8 rounded-3xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-full min-h-[500px] overflow-hidden hover:-translate-y-1 hover:shadow-[0_10px_30px_rgb(0,0,0,0.08)] hover:border-[color:var(--theme-primary)] transition-all duration-300">
           <div className="flex justify-between items-center bg-white sticky top-0 z-10 mb-6 border-b border-gray-100 pb-4">
              <div>
                 <h3 className="text-xl font-bold text-gray-900 tracking-tight">Recent Activity</h3>
                 <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Combined Transaction Registry</p>
              </div>
              <div className="flex gap-4 items-center">
                  <ZenBadge variant="leaf" className="px-3 sm:px-5">Active Entries</ZenBadge>
               </div>
           </div>
 
           <div className="flex-1 overflow-y-auto custom-scrollbar -mr-4 pr-4">
              {viewMode === 'grid' ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {expenses.map((exp) => (
                       <div key={exp._id} className="group relative bg-red-50/30 rounded-2xl p-5 border border-red-100 hover:bg-red-50 hover:border-red-200 transition-all duration-300">
                          <div className="flex justify-between items-start mb-4">
                             <div className="w-10 h-10 bg-white border border-red-100 rounded-xl flex items-center justify-center text-red-500 shadow-sm">
                                <TrendingDown size={18} strokeWidth={2} />
                             </div>
                             <button onClick={() => { setExpenseToDelete(exp._id); setIsConfirmOpen(true); }} className="text-gray-400 hover:text-red-500 transition-colors">
                                <Trash2 size={16} />
                             </button>
                          </div>
                          <div className="space-y-1">
                             <h4 className="text-sm font-bold text-gray-900 tracking-tight line-clamp-1">{exp.title}</h4>
                             <div className="flex items-center justify-between pt-1">
                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{dayjs(exp.date).format('MMM DD')} • {exp.category}</span>
                                <p className="text-lg font-bold text-red-600">-{settings?.general?.currencySymbol || 'QR'} {exp.amount?.toLocaleString()}</p>
                             </div>
                          </div>
                       </div>
                    ))}
                    {invoices.map((inv) => (
                       <div key={inv._id} className="group relative bg-emerald-50/30 rounded-2xl p-5 border border-emerald-100 hover:bg-emerald-50 hover:border-emerald-200 transition-all duration-300">
                          <div className="flex justify-between items-start mb-4">
                             <div className="w-10 h-10 bg-white border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-500 shadow-sm">
                                <TrendingUp size={18} strokeWidth={2} />
                             </div>
                             <div className="p-1 px-2 bg-emerald-100/50 text-emerald-600 rounded-lg border border-emerald-100/50 flex items-center"><Sparkles size={12} className="mr-1" /><span className="text-[9px] font-bold uppercase tracking-widest">Settled</span></div>
                          </div>
                          <div className="space-y-1">
                             <h4 className="text-sm font-bold text-gray-900 tracking-tight line-clamp-1">Service {inv.clientName}</h4>
                             <div className="flex items-center justify-between pt-1">
                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{dayjs(inv.date).format('MMM DD')} • {inv.paymentMode}</span>
                                <p className="text-lg font-bold text-emerald-600">+{settings?.general?.currencySymbol || 'QR'} {inv.total?.toLocaleString()}</p>
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              ) : (
                 <div className="space-y-3">
                    {expenses.map((exp) => (
                       <div key={exp._id} className="group flex items-center justify-between p-4 bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl transition-all duration-300">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-red-50 rounded-xl border border-red-100 flex items-center justify-center text-red-500">
                                <TrendingDown size={18} strokeWidth={2} />
                             </div>
                             <div>
                                <p className="text-sm font-bold text-gray-900 tracking-tight leading-tight">{exp.title}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{dayjs(exp.date).format('MMM DD, YYYY')} • {exp.category}</p>
                             </div>
                          </div>
                          <div className="text-right flex items-center gap-5">
                             <p className="text-base font-serif font-black text-red-600">-{settings?.general?.currencySymbol || 'QR'} {exp.amount?.toLocaleString()}</p>
                             <ZenIconButton icon={Trash2} variant="danger" onClick={() => { setExpenseToDelete(exp._id); setIsConfirmOpen(true); }} />
                          </div>
                       </div>
                    ))}
                    {invoices.map((inv) => (
                       <div key={inv._id} className="group flex items-center justify-between p-4 bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl transition-all duration-300">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-center text-emerald-500">
                                <TrendingUp size={18} strokeWidth={2} />
                             </div>
                             <div>
                                <p className="text-sm font-bold text-gray-900 tracking-tight leading-tight">Service {inv.clientName}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{dayjs(inv.date).format('MMM DD, YYYY')} • {inv.paymentMode}</p>
                             </div>
                          </div>
                          <p className="text-base font-serif font-black text-emerald-600 mr-10">+{settings?.general?.currencySymbol || 'QR'} {inv.total?.toLocaleString()}</p>
                       </div>
                    ))}
                 </div>
              )}
 
              {expenses.length === 0 && invoices.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center py-20 text-gray-400 font-bold text-xs uppercase tracking-widest">
                    No transactions found for the current filters
                 </div>
              )}
           </div>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Log Expenditure"
      >
        <form onSubmit={handleAddExpense} className="px-10 py-12 space-y-8">
           <ZenInput
             label="Resource Identity"
             required
             placeholder="e.g. Monthly Retainer"
             value={formData.title}
             onChange={(e: any) => setFormData({...formData, title: e.target.value})}
           />

           <div className="grid grid-cols-2 gap-8">
              <ZenDropdown
                label="Tactical Category"
                value={formData.category}
                onChange={val => setFormData({...formData, category: val})}
                options={['Inventory', 'Utilities', 'Staff', 'Marketing', 'Rent', 'Misc']}
              />
              <ZenInput
                type="number"
                label={`Exchange Volume (${settings?.general?.currencySymbol || 'QR'})`}
                required
                value={formData.amount}
                onChange={(e: any) => setFormData({...formData, amount: parseInt(e.target.value)})}
              />
           </div>

           <ZenDatePicker
             label="Ledger Entry Date"
             value={formData.date}
             onChange={val => setFormData({...formData, date: val})}
           />

           <div className="pt-4 flex gap-4">
              <ZenButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Discard</ZenButton>
              <ZenButton type="submit" className="flex-[2] py-5 rounded-[1rem] shadow-sm">
                 Save Entry
              </ZenButton>
           </div>
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
