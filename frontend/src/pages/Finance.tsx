import React, { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Filter, 
  Download, 
  Trash2, 
  PieChart, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
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
import { useAuth } from '../context/AuthContext';
import { ZenPageLayout } from '../components/zen/ZenLayout';
import { ZenBadge, ZenButton, ZenIconButton } from '../components/zen/ZenButtons';
import { ZenInput, ZenDropdown, ZenDatePicker } from '../components/zen/ZenInputs';
import { Modal } from '../components/Modal';
import { notify } from '../components/ZenNotification';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useSettings } from '../context/SettingsContext';

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

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    localStorage.setItem('zen_finance_view', viewMode);
  }, [viewMode]);

  const fetchData = async () => {
    try {
      const [invRes, expRes] = await Promise.all([
        fetch(`${API_URL}/invoices`, { headers: { 'Authorization': `Bearer ${user?.token}` } }),
        fetch(`${API_URL}/expenses`, { headers: { 'Authorization': `Bearer ${user?.token}` } })
      ]);
      const invData = await invRes.json();
      const expData = await expRes.json();
      
      if (Array.isArray(invData)) setInvoices(invData);
      if (Array.isArray(expData)) setExpenses(expData);
    } catch (error) {
      notify('error', 'Sync Failure', 'Failed to retrieve sacred ledger records');
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = useMemo(() => invoices.reduce((acc, inv) => acc + (inv.total || 0), 0), [invoices]);
  const totalExpenses = useMemo(() => expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0), [expenses]);
  const netProfit = totalIncome - totalExpenses;

  const chartData = useMemo(() => {
    // Basic daily summary for the last 7 days (mock representation for visual excellence)
    return [
      { name: 'Cycle 1', revenue: totalIncome * 0.4, expenses: totalExpenses * 0.3 },
      { name: 'Cycle 2', revenue: totalIncome * 0.6, expenses: totalExpenses * 0.5 },
      { name: 'Cycle 3', revenue: totalIncome * 0.5, expenses: totalExpenses * 0.8 },
      { name: 'Cycle 4', revenue: totalIncome * 0.8, expenses: totalExpenses * 0.4 },
      { name: 'Cycle 5', revenue: totalIncome * 0.9, expenses: totalExpenses * 0.6 },
      { name: 'Cycle 6', revenue: totalIncome * 0.7, expenses: totalExpenses * 0.9 },
      { name: 'Cycle 7', revenue: totalIncome, expenses: totalExpenses },
    ];
  }, [totalIncome, totalExpenses]);

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
        notify('success', 'Tactical Expenditure Logged', 'Resource allocation has been recorded in the ledger.');
        setIsModalOpen(false);
        fetchData();
        setFormData({ title: '', category: 'Inventory', amount: 0, date: dayjs().format('YYYY-MM-DD') });
      }
    } catch (error) {
      notify('error', 'Log Error', 'Failed to update tactical record.');
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
        notify('success', 'Record Purged', 'Expenditure entry has been removed from history.');
        setIsConfirmOpen(false);
        fetchData();
      }
    } catch (error) {
      notify('error', 'Removal Error', 'Failed to purge ledger entry.');
    }
  };

  return (
    <ZenPageLayout
      title="Sacred Ledger"
      hideSearch
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      addButtonLabel="Log Expenditure"
      onAddClick={() => setIsModalOpen(true)}
      addButtonIcon={<Plus size={18} />}
    >
      <div className="flex overflow-x-auto pb-8 gap-6 md:grid md:grid-cols-3 md:gap-8 mb-12 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
        <div className="flex-shrink-0 w-[300px] md:w-auto bg-white/80 backdrop-blur-xl p-8 rounded-[3.5rem] border border-white shadow-2xl shadow-zen-brown/15 hover:shadow-emerald-500/5 transition-all duration-700 group hover:-translate-y-2">
           <div className="flex justify-between items-start mb-6">
              <div className="p-5 bg-emerald-50 text-emerald-600 rounded-[1.5rem] group-hover:scale-110 transition-transform duration-500 border border-white shadow-sm">
                 <TrendingUp size={28} />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full uppercase tracking-widest border border-white">
                 <ArrowUpRight size={12} />
                 Growth
              </div>
           </div>
           <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.4em]">Internal Inflow</p>
           <h3 className="text-3xl font-serif font-bold text-zen-brown mt-2">{settings?.general.currencySymbol || 'QR'} {totalIncome.toLocaleString()}</h3>
        </div>

        <div className="flex-shrink-0 w-[300px] md:w-auto bg-white/80 backdrop-blur-xl p-8 rounded-[3.5rem] border border-white shadow-2xl shadow-zen-brown/15 hover:shadow-red-500/5 transition-all duration-700 group hover:-translate-y-2">
           <div className="flex justify-between items-start mb-6">
              <div className="p-5 bg-red-50 text-red-600 rounded-[1.5rem] group-hover:scale-110 transition-transform duration-500 border border-white shadow-sm">
                 <TrendingDown size={28} />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-full uppercase tracking-widest border border-white">
                 <ArrowDownRight size={12} />
                 Burn Rate
              </div>
           </div>
           <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.4em]">External Outflow</p>
           <h3 className="text-3xl font-serif font-bold text-zen-brown mt-2">{settings?.general.currencySymbol || 'QR'} {totalExpenses.toLocaleString()}</h3>
        </div>

        <div className="flex-shrink-0 w-[300px] md:w-auto bg-zen-brown p-10 rounded-[3.5rem] shadow-2xl shadow-zen-brown/20 relative overflow-hidden group transition-all duration-700 hover:-translate-y-2">
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-1000">
              <Sparkles size={120} />
           </div>
           <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="p-5 bg-white/10 text-white rounded-[1.5rem] border border-white/10 shadow-lg backdrop-blur-md">
                 <Coins size={28} />
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-white bg-white/10 px-4 py-1.5 rounded-full uppercase tracking-widest border border-white/10">
                 Sacred Balance
              </div>
           </div>
           <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.4em] relative z-10">Net Sanity</p>
           <h3 className="text-3xl font-serif font-bold text-white mt-2 relative z-10">{settings?.general.currencySymbol || 'QR'} {netProfit.toLocaleString()}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white/70 backdrop-blur-xl p-12 rounded-[4rem] border border-white shadow-2xl shadow-zen-brown/15">
           <div className="flex items-center justify-between mb-10">
              <div>
                 <h3 className="text-2xl font-serif font-bold text-zen-brown tracking-tight">Financial Resonance</h3>
                 <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[.4em] mt-2">Income vs Expenditure Dynamics</p>
              </div>
              <ZenIconButton icon={Filter} />
           </div>
           
           <div className="h-80 w-full animate-in fade-in duration-1000">
              <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                 <AreaChart data={chartData}>
                    <defs>
                       <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                       </linearGradient>
                       <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.05}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#947e6e', fontSize: 10, fontWeight: 700 }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#947e6e', fontSize: 10, fontWeight: 700 }} 
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

        <div className="bg-white/70 backdrop-blur-xl rounded-[4rem] border border-white overflow-hidden shadow-2xl shadow-zen-brown/15 flex flex-col h-full min-h-[500px]">
           <div className="px-10 py-10 border-b border-zen-brown/15 flex justify-between items-center bg-white/40 sticky top-0 z-10">
              <div>
                 <h3 className="text-2xl font-serif font-black text-zen-brown tracking-tight">Sacred Sequence</h3>
                 <p className="text-[10px] font-black text-zen-brown/30 uppercase tracking-[0.4em] mt-2">Combined Transaction Registry</p>
              </div>
              <div className="flex gap-2">
                 <ZenBadge variant="leaf" className="px-5">Active Sequence</ZenBadge>
              </div>
           </div>
 
           <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
              {viewMode === 'grid' ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {expenses.map((exp) => (
                       <div key={exp._id} className="group relative bg-white/90 backdrop-blur-2xl rounded-[3rem] p-8 border border-white shadow-xl hover:shadow-red-500/5 transition-all duration-700 hover:-translate-y-2">
                          <div className="flex justify-between items-start mb-8">
                             <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform duration-500">
                                <TrendingDown size={24} />
                             </div>
                             <ZenIconButton icon={Trash2} variant="danger" onClick={() => { setExpenseToDelete(exp._id); setIsConfirmOpen(true); }} />
                          </div>
                          <div className="space-y-4">
                             <h4 className="text-xl font-serif font-black text-zen-brown tracking-tight line-clamp-1">{exp.title}</h4>
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-zen-brown/20 uppercase tracking-[0.3em]">{dayjs(exp.date).format('MMM DD')} • {exp.category}</span>
                                <p className="text-2xl font-serif font-black text-red-500">-{settings?.general.currencySymbol || 'QR'} {exp.amount?.toLocaleString()}</p>
                             </div>
                          </div>
                       </div>
                    ))}
                    {invoices.map((inv) => (
                       <div key={inv._id} className="group relative bg-white/90 backdrop-blur-2xl rounded-[3rem] p-8 border border-white shadow-xl hover:shadow-emerald-500/5 transition-all duration-700 hover:-translate-y-2">
                          <div className="flex justify-between items-start mb-8">
                             <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform duration-500">
                                <TrendingUp size={24} />
                             </div>
                             <div className="p-2 bg-emerald-50 text-emerald-600 rounded-full border border-white"><Sparkles size={14} /></div>
                          </div>
                          <div className="space-y-4">
                             <h4 className="text-xl font-serif font-black text-zen-brown tracking-tight line-clamp-1">Ritual {inv.clientName}</h4>
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-zen-brown/20 uppercase tracking-[0.3em]">{dayjs(inv.date).format('MMM DD')} • {inv.paymentMode}</span>
                                <p className="text-2xl font-serif font-black text-emerald-600">+{settings?.general.currencySymbol || 'QR'} {inv.total?.toLocaleString()}</p>
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              ) : (
                 <div className="space-y-6">
                    {expenses.map((exp) => (
                       <div key={exp._id} className="group flex items-center justify-between p-8 bg-white/60 hover:bg-white/90 border border-zen-brown/15 rounded-[2.5rem] transition-all duration-500 shadow-sm hover:shadow-xl">
                          <div className="flex items-center gap-8">
                             <div className="w-16 h-16 bg-red-50 rounded-[1.5rem] flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform duration-500">
                                <TrendingDown size={28} />
                             </div>
                             <div>
                                <p className="text-lg font-serif font-black text-zen-brown tracking-tight">{exp.title}</p>
                                <p className="text-[10px] font-black text-zen-brown/20 uppercase tracking-[.3em] mt-1">{dayjs(exp.date).format('MMM DD, YYYY')} • {exp.category}</p>
                             </div>
                          </div>
                          <div className="text-right flex items-center gap-8">
                             <p className="text-2xl font-serif font-black text-red-500">-{settings?.general.currencySymbol || 'QR'} {exp.amount?.toLocaleString()}</p>
                             <ZenIconButton 
                               icon={Trash2} 
                               variant="danger" 
                               onClick={() => { setExpenseToDelete(exp._id); setIsConfirmOpen(true); }} 
                             />
                          </div>
                       </div>
                    ))}
                    {invoices.map((inv) => (
                       <div key={inv._id} className="group flex items-center justify-between p-8 bg-emerald-50/10 hover:bg-emerald-50/30 border border-emerald-500/5 rounded-[2.5rem] transition-all duration-500 shadow-sm hover:shadow-xl">
                          <div className="flex items-center gap-8">
                             <div className="w-16 h-16 bg-emerald-50 rounded-[1.5rem] flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform duration-500">
                                <TrendingUp size={28} />
                             </div>
                             <div>
                                <p className="text-lg font-serif font-black text-zen-brown tracking-tight">Ritual {inv.clientName}</p>
                                <p className="text-[10px] font-black text-zen-brown/20 uppercase tracking-[.3em] mt-1">{dayjs(inv.date).format('MMM DD, YYYY')} • {inv.paymentMode}</p>
                             </div>
                          </div>
                          <p className="text-2xl font-serif font-black text-emerald-600">+{settings?.general.currencySymbol || 'QR'} {inv.total?.toLocaleString()}</p>
                       </div>
                    ))}
                 </div>
              )}
 
              {expenses.length === 0 && invoices.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center py-40 opacity-20 italic font-serif text-2xl">
                    The ledger remains unwritten in this sequence.
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
             placeholder="e.g. Monthly Sanctuary Retainer"
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
                label={`Exchange Volume (${settings?.general.currencySymbol || 'QR'})`}
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
              <ZenButton type="submit" className="flex-[2] py-5 rounded-[2rem] shadow-2xl shadow-zen-brown/20">
                 Commit to Ledger
              </ZenButton>
           </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Purge Entry?"
        message="Are you certain you wish to remove this resource allocation from the sacred ledger?"
      />
    </ZenPageLayout>
  );
};

export default Finance;
