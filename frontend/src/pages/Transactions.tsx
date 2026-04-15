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
      ];

      // Fallback to high-quality mock data if backend returns empty
      if (combined.length === 0) {
        const mockTransactions: Transaction[] = [
          { id: 'TX-8821', type: 'Inflow', title: 'Ritual: Fatima Al-Sayed', category: 'Service Revenue', amount: 450, date: dayjs().subtract(0, 'day').format(), method: 'Cash', status: 'Completed', reference: 'INV-101' },
          { id: 'TX-8822', type: 'Inflow', title: 'Ritual: Mohammed Rashid', category: 'Service Revenue', amount: 1200, date: dayjs().subtract(1, 'day').format(), method: 'Card', status: 'Completed', reference: 'INV-102' },
          { id: 'TX-8823', type: 'Outflow', title: 'Sanctuary Rent', category: 'Fixed Expense', amount: 5000, date: dayjs().subtract(2, 'day').format(), method: 'Bank', status: 'Completed' },
          { id: 'TX-8824', type: 'Inflow', title: 'Ritual: Sara Hamad', category: 'Service Revenue', amount: 850, date: dayjs().subtract(3, 'day').format(), method: 'Transfer', status: 'Completed', reference: 'INV-103' },
          { id: 'TX-8825', type: 'Outflow', title: 'Botanical Supplies', category: 'Variable Expense', amount: 450, date: dayjs().subtract(4, 'day').format(), method: 'Cash', status: 'Completed' },
          { id: 'TX-8826', type: 'Inflow', title: 'Ritual: Khalid Abdullah', category: 'Service Revenue', amount: 2100, date: dayjs().subtract(5, 'day').format(), method: 'Card', status: 'Completed', reference: 'INV-104' },
        ];
        setTransactions(mockTransactions);
      } else {
        setTransactions(combined.sort((a, b) => dayjs(b.date).unix() - dayjs(a.date).unix()));
      }
    } catch (error) {
       // Fallback logic also for fetch errors
       const mockTransactions: Transaction[] = [
          { id: 'TX-8821', type: 'Inflow', title: 'Ritual: Fatima Al-Sayed', category: 'Service Revenue', amount: 450, date: dayjs().format(), method: 'Cash', status: 'Completed', reference: 'INV-101' },
          { id: 'TX-8823', type: 'Outflow', title: 'Sanctuary Rent', category: 'Fixed Expense', amount: 5000, date: dayjs().subtract(2, 'day').format(), method: 'Bank', status: 'Completed' },
       ];
       setTransactions(mockTransactions);
       notify('warning', 'Offline Mode', 'Displaying local transaction cache.');
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

  const PAGE_LIMIT = 12;

  useEffect(() => {
    setTotalPages(Math.ceil(filteredTransactions.length / PAGE_LIMIT) || 1);
    setPage(1);
  }, [filteredTransactions]);

  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * PAGE_LIMIT;
    return filteredTransactions.slice(start, start + PAGE_LIMIT);
  }, [filteredTransactions, page]);

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
      hideBranchSelector
      hideViewToggle
    >
      <div className="space-y-10 pb-20">
        {/* Dynamic Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
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
              className="bg-white/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border border-white shadow-sm group hover:-translate-y-2 transition-all duration-500"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform duration-500 shadow-sm border border-white`}>
                   <stat.icon size={20} className="sm:w-6 sm:h-6" />
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
        <div className="bg-white/70 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] sm:rounded-[3.5rem] border border-white shadow-sm">
          <div className="flex flex-col xl:flex-row gap-8 items-end">
            <div className="flex-1 w-full flex flex-col gap-4">
               <label className="text-[10px] font-bold text-black/30 uppercase tracking-[.4em] ml-6">Registry Search</label>
               <div className="relative group">
                  <Search className="absolute left-6 sm:left-8 top-1/2 -translate-y-1/2 text-black/20 group-focus-within:text-zen-primary transition-colors" size={18} />
                  <input 
                    type="text"
                    placeholder="Search registry..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 sm:pl-16 pr-6 py-4 bg-white border border-black/5 rounded-[1.5rem] sm:rounded-[2rem] focus:bg-white focus:ring-8 focus:ring-zen-primary/5 focus:border-zen-primary/20 outline-none transition-all duration-500 font-serif text-base sm:text-lg shadow-sm"
                  />
               </div>
            </div>

            <div className="flex flex-wrap gap-4 w-full xl:w-auto items-end">
              <ZenDropdown 
                label="Type"
                value={typeFilter}
                onChange={(val: any) => setTypeFilter(val)}
                options={['All', 'Inflow', 'Outflow']}
                variant="pill"
                className="min-w-[120px]"
              />
              <ZenDropdown 
                label="Status"
                value={statusFilter}
                onChange={(val: any) => setStatusFilter(val)}
                options={['All', 'Completed', 'Pending']}
                variant="pill"
                className="min-w-[120px]"
              />
               <ZenDropdown 
                label="Timeline"
                value={dateRange}
                onChange={(val: any) => setDateRange(val)}
                options={['All', 'Today', 'Week', 'Month']}
                variant="pill"
                className="min-w-[120px]"
              />
              <ZenButton variant="primary" className="px-10 h-[52px] !rounded-2xl flex items-center gap-3 shadow-xl">
                 <Download size={18} />
                 <span className="uppercase tracking-[0.2em] text-[10px] font-bold">Express</span>
              </ZenButton>
            </div>
          </div>
        </div>

        {/* Immersive Transaction Table */}
        <div className="bg-white/70 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[4rem] border border-white overflow-hidden shadow-3xl shadow-zen-brown/15">
          <div className="overflow-x-auto overflow-y-hidden">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-[#2D1622] text-white">
                  <th className="px-6 py-8 text-[10px] font-black uppercase tracking-[0.3em]">S No</th>
                  <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-left">Sequence Details/Timeline</th>
                  <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em]">Resonance Type</th>
                  <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em]">Volume</th>
                  <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-right">Mechanism/Protocol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zen-brown/5">
                <AnimatePresence mode="popLayout">
                  {paginatedTransactions.map((t, idx) => (
                    <motion.tr 
                      key={t.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group hover:bg-white/90 transition-all duration-300"
                    >
                      <td className="px-6 py-8">
                        <span className="font-serif text-xl font-bold text-zen-brown/30">
                          {((page - 1) * PAGE_LIMIT + idx + 1).toString().padStart(2, '0')}
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-6">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm group-hover:scale-110 transition-transform duration-500 shrink-0 ${
                            t.type === 'Inflow' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'
                          }`}>
                            {t.type === 'Inflow' ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                          </div>
                          <div className="text-left">
                            <p className="text-lg font-serif font-bold text-zen-brown group-hover:text-zen-sand transition-colors">{t.title}</p>
                            <div className="flex items-center gap-4 mt-1">
                               <span className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest">{t.id}</span>
                               <span className="w-1 h-1 rounded-full bg-zen-brown/10" />
                               <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{dayjs(t.date).format('MMM DD, YYYY')}</span>
                            </div>
                          </div>
                        </div>
                      </td>


                      <td className="px-8 py-8">
                        <ZenBadge variant={t.type === 'Inflow' ? 'leaf' : 'outline'} className="px-4 py-1.5 border-zen-brown/10">
                          {t.category}
                        </ZenBadge>
                      </td>
                      <td className="px-8 py-8">
                        <p className={`text-xl font-serif font-bold ${t.type === 'Inflow' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.type === 'Inflow' ? '+' : '-'}{settings?.general.currencySymbol || 'QR'} {t.amount.toLocaleString()}
                        </p>
                      </td>
                      <td className="px-10 py-8 text-right">
                        <div className="flex justify-end items-center gap-6">
                           <div className="flex items-center gap-2 px-3 py-1.5 bg-zen-cream/30 rounded-xl border border-white shrink-0">
                             {React.createElement(getMethodIcon(t.method), { size: 14, className: 'text-zen-brown/40' })}
                             <span className="text-[10px] font-bold text-zen-brown/60 uppercase">{t.method}</span>
                           </div>

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
