import React, { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { 
  Receipt, 
  ArrowUpRight, 
  ArrowDownRight, 
  Filter, 
  Search, 
  Download, 
  MoreVertical,
  Calendar as CalendarIcon,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  FilterX
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ZenPageLayout } from '../components/zen/ZenLayout';
import { ZenBadge, ZenButton, ZenIconButton } from '../components/zen/ZenButtons';
import { ZenPagination } from '../components/zen/ZenPagination';
import { ZenInput, ZenDropdown } from '../components/zen/ZenInputs';
import { useSettings } from '../context/SettingsContext';
import { motion, AnimatePresence } from 'motion/react';
import { notify } from '../components/ZenNotification';

dayjs.extend(isBetween);

interface Transaction {
  id: string;
  type: 'Inflow' | 'Outflow';
  title: string;
  category: string;
  amount: number;
  date: string;
  method: string;
  status: 'Completed' | 'Pending' | 'Failed';
  reference?: string;
}

const Transactions = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Inflow' | 'Outflow'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Pending'>('All');
  const [dateRange, setDateRange] = useState<'All' | 'Today' | 'Week' | 'Month'>('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, expRes] = await Promise.all([
        fetch(`${API_URL}/invoices`, { headers: { 'Authorization': `Bearer ${user?.token}` } }),
        fetch(`${API_URL}/expenses`, { headers: { 'Authorization': `Bearer ${user?.token}` } })
      ]);
      
      const invData = await invRes.json();
      const expData = await expRes.json();

      const combined: Transaction[] = [
        ...(Array.isArray(invData) ? invData.map((inv: any) => ({
          id: inv._id || inv.id,
          type: 'Inflow' as const,
          title: `Ritual: ${inv.clientName}`,
          category: 'Service Revenue',
          amount: inv.total || 0,
          date: inv.date,
          method: inv.paymentMode || 'Cash',
          status: 'Completed' as const,
          reference: inv.invoiceNumber
        })) : []),
        ...(Array.isArray(expData) ? expData.map((exp: any) => ({
          id: exp._id || exp.id,
          type: 'Outflow' as const,
          title: exp.title,
          category: exp.category,
          amount: exp.amount || 0,
          date: exp.date,
          method: 'Direct Outflow',
          status: 'Completed' as const
        })) : [])
      ].sort((a, b) => dayjs(b.date).unix() - dayjs(a.date).unix());

      setTransactions(combined);
    } catch (error) {
      notify('error', 'Data Retrieval Failure', 'Failed to synchronize transaction history.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           t.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'All' || t.type === typeFilter;
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      
      let matchesDate = true;
      const now = dayjs();
      if (dateRange === 'Today') matchesDate = dayjs(t.date).isSame(now, 'day');
      else if (dateRange === 'Week') matchesDate = dayjs(t.date).isAfter(now.subtract(7, 'day'));
      else if (dateRange === 'Month') matchesDate = dayjs(t.date).isAfter(now.subtract(1, 'month'));

      return matchesSearch && matchesType && matchesStatus && matchesDate;
    });
  }, [transactions, searchTerm, typeFilter, statusFilter, dateRange]);

  const stats = useMemo(() => {
    const inflow = filteredTransactions.filter(t => t.type === 'Inflow').reduce((acc, t) => acc + t.amount, 0);
    const outflow = filteredTransactions.filter(t => t.type === 'Outflow').reduce((acc, t) => acc + t.amount, 0);
    const avg = filteredTransactions.length > 0 ? (inflow + outflow) / filteredTransactions.length : 0;
    return { inflow, outflow, net: inflow - outflow, avg };
  }, [filteredTransactions]);

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'card': return CreditCard;
      case 'cash': return Banknote;
      case 'online': return Smartphone;
      default: return Receipt;
    }
  };

  return (
    <ZenPageLayout
      title="Transaction Registry"
      hideSearch
      hideAddButton
    >
      <div className="space-y-10 pb-20">
        {/* Dynamic Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: 'Total Inflow', value: stats.inflow, icon: ArrowUpRight, color: 'text-emerald-500', bg: 'bg-emerald-50' },
            { label: 'Total Outflow', value: stats.outflow, icon: ArrowDownRight, color: 'text-rose-500', bg: 'bg-rose-50' },
            { label: 'Net Resonance', value: stats.net, icon: Receipt, color: 'text-sky-500', bg: 'bg-sky-50' },
            { label: 'Avg. Transfer', value: stats.avg, icon: CheckCircle2, color: 'text-indigo-500', bg: 'bg-indigo-50' }
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/80 backdrop-blur-xl p-8 rounded-[3rem] border border-white shadow-2xl shadow-zen-brown/10 group hover:-translate-y-2 transition-all duration-500"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform duration-500 shadow-sm border border-white`}>
                  <stat.icon size={24} />
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${stat.color} ${stat.bg} border border-white`}>
                  Live
                </div>
              </div>
              <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[.4em] mb-1">{stat.label}</p>
              <h3 className="text-2xl font-serif font-bold text-zen-brown">
                {settings?.general.currencySymbol || 'QR'} {stat.value.toLocaleString()}
              </h3>
            </motion.div>
          ))}
        </div>

        {/* Global Filter Bar */}
        <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[3.5rem] border border-white shadow-2xl shadow-zen-brown/10">
          <div className="flex flex-col xl:flex-row gap-8 items-end">
            <div className="flex-1 w-full space-y-4">
               <label className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[.4em] ml-4">Registry Search</label>
               <div className="relative group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zen-brown/20 group-focus-within:text-zen-brown/50 transition-colors" size={20} />
                  <input 
                    type="text"
                    placeholder="Search by title, category, or reference..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-white/50 border border-zen-brown/10 rounded-2xl focus:bg-white focus:ring-4 focus:ring-zen-brown/5 focus:border-zen-brown/30 outline-none transition-all duration-500 font-serif"
                  />
               </div>
            </div>

            <div className="flex flex-wrap gap-4 w-full xl:w-auto">
              <ZenDropdown 
                label="Type"
                value={typeFilter}
                onChange={(val: any) => setTypeFilter(val)}
                options={['All', 'Inflow', 'Outflow']}
              />
              <ZenDropdown 
                label="Status"
                value={statusFilter}
                onChange={(val: any) => setStatusFilter(val)}
                options={['All', 'Completed', 'Pending']}
              />
               <ZenDropdown 
                label="Timeline"
                value={dateRange}
                onChange={(val: any) => setDateRange(val)}
                options={['All', 'Today', 'Week', 'Month']}
              />
              <ZenIconButton 
                icon={FilterX} 
                onClick={() => {
                  setSearchTerm('');
                  setTypeFilter('All');
                  setStatusFilter('All');
                  setDateRange('All');
                }}
              />
              <ZenButton variant="secondary" className="px-8 !rounded-2xl flex items-center gap-3">
                 <Download size={18} />
                 Express
              </ZenButton>
            </div>
          </div>
        </div>

        {/* Immersive Transaction Table */}
        <div className="bg-white/70 backdrop-blur-xl rounded-[4rem] border border-white overflow-hidden shadow-3xl shadow-zen-brown/15">
          <div className="overflow-x-auto overflow-y-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zen-brown text-white/50 text-[10px] font-bold uppercase tracking-[.3em]">
                  <th className="px-10 py-8 first:rounded-tl-[4rem]">Sequence Details</th>
                  <th className="px-8 py-8">Timeline</th>
                  <th className="px-8 py-8">Mechanism</th>
                  <th className="px-8 py-8">Resonance Type</th>
                  <th className="px-8 py-8 text-right">Volume</th>
                  <th className="px-10 py-8 last:rounded-tr-[4rem] text-center">Protocol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zen-brown/5">
                <AnimatePresence mode="popLayout">
                  {filteredTransactions.map((t, idx) => (
                    <motion.tr 
                      key={t.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group hover:bg-white/90 transition-all duration-300"
                    >
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-6">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm group-hover:scale-110 transition-transform duration-500 ${
                            t.type === 'Inflow' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'
                          }`}>
                            {t.type === 'Inflow' ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                          </div>
                          <div>
                            <p className="text-lg font-serif font-bold text-zen-brown group-hover:text-zen-sand transition-colors">{t.title}</p>
                            <span className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest">{t.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-zen-brown/70">{dayjs(t.date).format('MMMM DD, YYYY')}</span>
                          <span className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest mt-1">{dayjs(t.date).format('h:mm A')}</span>
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-zen-cream rounded-lg text-zen-sand border border-white shadow-sm">
                            {React.createElement(getMethodIcon(t.method), { size: 16 })}
                          </div>
                          <span className="text-sm font-semibold text-zen-brown/80">{t.method}</span>
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <ZenBadge variant={t.type === 'Inflow' ? 'leaf' : 'outline'} className="px-4 py-1.5 border-zen-brown/10">
                          {t.category}
                        </ZenBadge>
                      </td>
                      <td className="px-8 py-8 text-right">
                        <p className={`text-xl font-serif font-bold ${t.type === 'Inflow' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.type === 'Inflow' ? '+' : '-'}{settings?.general.currencySymbol || 'QR'} {t.amount.toLocaleString()}
                        </p>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex justify-center items-center gap-4">
                          <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border shadow-sm ${
                            t.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 
                            t.status === 'Pending' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 
                            'bg-rose-500/10 text-rose-600 border-rose-500/20'
                          }`}>
                            {t.status}
                          </div>
                          <ZenIconButton icon={ExternalLink} />
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            
            {filteredTransactions.length === 0 && (
              <div className="py-40 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-24 h-24 bg-zen-brown/5 rounded-full flex items-center justify-center border border-zen-brown/10">
                   <Receipt size={40} className="text-zen-brown/20" />
                </div>
                <div>
                   <h3 className="text-2xl font-serif text-zen-brown italic">No resonances found in current alignment.</h3>
                   <p className="text-xs font-bold text-zen-brown/20 uppercase tracking-widest mt-2">Try adjusting your filters to reveal hidden sequences.</p>
                </div>
                <ZenButton variant="secondary" onClick={() => { setSearchTerm(''); setTypeFilter('All'); setStatusFilter('All'); setDateRange('All'); }}>
                   Reset All Filters
                </ZenButton>
              </div>
            )}
          </div>

        </div>

        {/* Pagination Ritual */}
        <ZenPagination 
          currentPage={page} 
          totalPages={totalPages} 
          onPageChange={setPage} 
        />
      </div>
    </ZenPageLayout>
  );
};

export default Transactions;
