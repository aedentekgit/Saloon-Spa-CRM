import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAttendanceRouteForRole } from '../../config/accessControl';
import { useData } from '../../context/DataContext';
import dayjs from 'dayjs';
import {
  TrendingUp,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Bed,
  Sparkles,
  Shield,
  Zap,
  Activity,
  ChevronRight,
  Target,
  UserCheck,
  TrendingDown,
  Trash2,
  FileText,
  MapPin
} from 'lucide-react';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

import { motion, AnimatePresence } from 'motion/react';
import { ZenBadge, ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { useBranches } from '../../context/BranchContext';
import { useSettings } from '../../context/SettingsContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenStatCard } from '../../components/zen/ZenStatCard';
import { getPollIntervalMs, shouldPollNow } from '../../utils/polling';
import { getCachedJson, setCachedJson } from '../../utils/localCache';
import { ZenMasterCalendar } from '../../components/zen/ZenInputs';
import { HeaderPortal } from '../../components/shared/HeaderPortal';
import { BranchSelector } from '../../components/zen/BranchSelector';

const AdminDashboard = ({ dateRange, setDateRange }: { dateRange: any, setDateRange: any }) => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { employees } = useData();
  const { selectedBranch } = useBranches();
  const navigate = useNavigate();
  const [stats, setStats] = React.useState<any>(() => getCachedJson('zen_dashboard_admin_stats', null));
  const [loading, setLoading] = React.useState(() => !getCachedJson('zen_dashboard_admin_stats', null));
  const [invoices, setInvoices] = useState<any[]>(() => getCachedJson('zen_dashboard_admin_invoices', []));
  const [expenses, setExpenses] = useState<any[]>(() => getCachedJson('zen_dashboard_admin_expenses', []));

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  const dateWindow = useMemo(() => {
    if (!dateRange || dateRange === 'All') return { startDate: '', endDate: '' };
    
    const now = dayjs();
    if (typeof dateRange === 'string') {
      if (dateRange === 'Today') return { startDate: now.format('YYYY-MM-DD'), endDate: now.format('YYYY-MM-DD') };
      if (dateRange === 'Week') return { startDate: now.subtract(7, 'day').format('YYYY-MM-DD'), endDate: now.format('YYYY-MM-DD') };
      if (dateRange === 'Month') return { startDate: now.subtract(1, 'month').format('YYYY-MM-DD'), endDate: now.format('YYYY-MM-DD') };
      
      if (dateRange.length === 7) { // YYYY-MM
        const m = dayjs(dateRange + '-01');
        return { startDate: m.startOf('month').format('YYYY-MM-DD'), endDate: m.endOf('month').format('YYYY-MM-DD') };
      }
      
      if (dateRange.length === 10) { // YYYY-MM-DD
        return { startDate: dateRange, endDate: dateRange };
      }
      
      return { startDate: '', endDate: '' };
    }

    if (dateRange.from || dateRange.to) {
      return { 
        startDate: dateRange.from || dateRange.to || '', 
        endDate: dateRange.to || dateRange.from || '' 
      };
    }

    return { startDate: '', endDate: '' };
  }, [dateRange]);

  const formatName = (name: string) => {
    if (!name) return 'Guest';
    if (name.includes('authsec_')) {
      const parts = name.split('_');
      return parts[parts.length - 1] || 'Valued Client';
    }
    return name;
  };

  const fetchStats = async (silent: boolean = false) => {
    try {
      if (!silent && !stats) setLoading(true);
      const queryParams = new URLSearchParams();
      if (selectedBranch && selectedBranch !== 'all') {
        queryParams.set('branch', selectedBranch);
      }
      if (dateWindow.startDate) queryParams.set('startDate', dateWindow.startDate);
      if (dateWindow.endDate) queryParams.set('endDate', dateWindow.endDate);

      const queryString = queryParams.toString();
      const statsUrl = `${API_URL.replace(/\/$/, '')}/stats/dashboard${queryString ? `?${queryString}` : ''}`;
      const response = await fetch(statsUrl, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Stats ingestion failure:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchFinanceData = async () => {
    try {
      const [invRes, expRes] = await Promise.all([
        fetch(`${API_URL.replace(/\/$/, '')}/invoices`, { headers: { 'Authorization': `Bearer ${user?.token}` } }),
        fetch(`${API_URL.replace(/\/$/, '')}/expenses`, { headers: { 'Authorization': `Bearer ${user?.token}` } })
      ]);
      const invData = await invRes.json();
      const expData = await expRes.json();
      setInvoices(Array.isArray(invData) ? invData : (invData.data || []));
      setExpenses(Array.isArray(expData) ? expData : (expData.data || []));
    } catch (error) {
      console.error('Finance sync failure:', error);
    }
  };

  React.useEffect(() => {
    fetchStats();
    fetchFinanceData();

    // Pulse polling for real-time dashboard data
    const interval = setInterval(() => {
      if (!shouldPollNow()) return;
      fetchStats(true);
      fetchFinanceData();
    }, getPollIntervalMs(30000)); // default 30s

    return () => clearInterval(interval);
  }, [selectedBranch, dateRange]);

  React.useEffect(() => {
    if (stats) setCachedJson('zen_dashboard_admin_stats', stats);
    if (invoices) setCachedJson('zen_dashboard_admin_invoices', invoices);
    if (expenses) setCachedJson('zen_dashboard_admin_expenses', expenses);
  }, [stats, invoices, expenses]);

  const ledgerRows = useMemo(() => {
    const expenseRows = expenses.map((exp: any) => ({
      id: `expense-${exp._id}`,
      kind: 'Expense',
      title: exp.title,
      subtitle: exp.sectorCategory || exp.category || 'General',
      date: exp.date,
      amount: exp.amount || 0,
      meta: 'Operational outflow',
      sourceId: exp._id
    }));

    const invoiceRows = invoices.map((inv: any) => ({
      id: `invoice-${inv._id}`,
      kind: 'Income',
      title: `Service ${inv.clientName}`,
      subtitle: inv.paymentMode,
      date: inv.date,
      amount: inv.total || 0,
      meta: 'Completed invoice',
      sourceId: inv._id
    }));

    return [...expenseRows, ...invoiceRows].sort(
      (a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
    ).slice(0, 10); // Show only top 10 in dashboard
  }, [expenses, invoices]);

  // Fully dynamic metrics mapping
  const displayRevenue = stats?.revenue?.total || 0;
  const displayTodayRevenue = stats?.revenue?.today || 0;
  const displayProfit = stats?.profit?.total ?? ((stats?.revenue?.total || 0) - (stats?.expenses?.total || 0));
  const displayClients = stats?.clients?.total || 0;

  const cards = [
    {
      label: 'TOTAL REVENUE',
      value: `${settings?.general?.currencySymbol || 'QR'} ${displayRevenue.toLocaleString()}`,
      trend: stats?.revenue?.trend?.length > 0 ? 'Active Stream' : 'Initial Phase',
      icon: Coins,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      glow: 'bg-emerald-500/20',
      delay: 0
    },
    {
      label: 'DAILY REVENUE',
      value: `${settings?.general?.currencySymbol || 'QR'} ${displayTodayRevenue.toLocaleString()}`,
      trend: stats?.revenue?.today > 0 ? 'Operating Today' : 'System Ready',
      icon: Activity,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      glow: 'bg-rose-500/20',
      delay: 0.2
    },
    {
      label: 'NET PROFIT',
      value: `${settings?.general?.currencySymbol || 'QR'} ${displayProfit.toLocaleString()}`,
      trend: 'Final Calculation',
      icon: TrendingUp,
      color: 'text-sky-500',
      bg: 'bg-sky-500/10',
      glow: 'bg-sky-500/20',
      delay: 0.4
    },
    {
      label: 'TOTAL CLIENTS',
      value: displayClients,
      trend: stats?.clients?.newToday > 0 ? `${stats.clients.newToday} New Registries` : 'Steady Base',
      icon: Users,
      color: 'text-fuchsia-500',
      bg: 'bg-fuchsia-500/10',
      glow: 'bg-fuchsia-500/20',
      delay: 0.6
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] sm:min-h-[600px]">
        <div className="w-12 h-12 border-4 border-zen-brown border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const mockChartData = [
    { name: 'Mon', revenue: 0, expenses: 0 },
    { name: 'Tue', revenue: 0, expenses: 0 },
    { name: 'Wed', revenue: 0, expenses: 0 },
    { name: 'Thu', revenue: 0, expenses: 0 },
    { name: 'Fri', revenue: 0, expenses: 0 },
    { name: 'Sat', revenue: 0, expenses: 0 },
    { name: 'Sun', revenue: 0, expenses: 0 },
  ];

  const chartData = stats?.revenue?.trend?.length > 0 ? stats.revenue.trend : mockChartData;

  const ritualData = stats?.topServices?.length > 0 ? stats.topServices.map((s: any, i: number) => ({
    ...s,
    color: i === 0 ? `var(--zen-primary, #332766)` : i === 1 ? `var(--zen-sand, #8B5CF6)` : 'rgba(139,92,246,0.4)'
  })) : [
    { name: 'Loading Rituals...', value: 100, color: '#F3F4F6' }
  ];


  return (
    <div
      style={{ height: 'calc(100vh - 100px)' }}
      className="space-y-4 sm:space-y-8 font-sans overflow-x-hidden flex flex-col"
    >
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 sm:space-y-8 pr-4">




      <div className="zen-metrics-grid">
        {cards.map((card, i) => (
           <ZenStatCard key={i} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 pb-10">
        {/* Analytics Overview - Classic Framing */}
        <div className="lg:col-span-8 bg-white p-6 sm:p-8 lg:p-10 rounded-[2rem] border border-zen-stone shadow-sm flex flex-col transition-all duration-300 zen-card-hover relative group">
          <div className="absolute inset-2 rounded-[1.6rem] border border-zen-gold/5 pointer-events-none group-hover:border-zen-gold/10 transition-colors duration-700" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 z-10 relative">
             <div className="space-y-1">
                <h3 className="text-2xl font-serif font-black text-gray-900 tracking-tight">Analytics Overview</h3>
                <div className="w-12 h-1 bg-zen-gold/20 rounded-full"></div>
             </div>
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--zen-primary, #332766)' }}></div>
                   <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-zen-sand/50"></div>
                   <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Expenses</span>
                </div>
             </div>
          </div>

          <div className="h-[300px] w-full mt-auto relative z-10 -ml-4" style={{ minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                <defs>
                   <linearGradient id="colorRevs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--zen-primary, #332766)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--zen-primary, #332766)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                   dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 500 }}
                  dy={15}
                />
                <Tooltip
                  cursor={{ stroke: '#F3F4F6', strokeWidth: 2 }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="var(--zen-sand, #8B5CF6)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="none"
                  activeDot={{ r: 6 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--zen-primary, #332766)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevs)"
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Overview - Classic Framing */}
        <div className="lg:col-span-4 bg-white p-6 sm:p-8 lg:p-10 rounded-[2rem] border border-zen-stone shadow-sm flex flex-col transition-all duration-300 zen-card-hover relative group">
          <div className="absolute inset-2 rounded-[1.6rem] border border-zen-gold/5 pointer-events-none group-hover:border-zen-gold/10 transition-colors duration-700" />

           <div className="space-y-1 mb-8">
              <h3 className="text-2xl font-serif font-black text-gray-900 tracking-tight">Daily Overview</h3>
              <div className="w-12 h-1 bg-zen-gold/20 rounded-full"></div>
           </div>
           <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-[1rem] bg-orange-50 hover:bg-orange-100/60 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full border border-orange-200/50 bg-white shadow-sm flex items-center justify-center text-orange-500">
                       <AlertTriangle size={18} strokeWidth={2} />
                    </div>
                    <span className="font-bold text-gray-800 text-sm">Low Inventory</span>
                 </div>
                 <div className="px-3 py-1.5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold">
                    {stats?.inventory?.lowStockCount || 0} Items
                 </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-[1rem] bg-zen-sand/5 hover:bg-zen-sand/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full border border-zen-sand/20 bg-white shadow-sm flex items-center justify-center text-zen-sand">
                       <Calendar size={18} strokeWidth={2} />
                    </div>
                    <span className="font-bold text-gray-800 text-sm">Bookings</span>
                 </div>
                 <div className="px-3 py-1.5 rounded-full bg-zen-sand/10 text-zen-sand text-[10px] font-bold">
                    {stats?.appointments?.activeCount || 0} Today
                 </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-[1rem] bg-emerald-50 hover:bg-emerald-100/60 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full border border-emerald-200/50 bg-white shadow-sm flex items-center justify-center text-emerald-500">
                       <CheckCircle2 size={18} strokeWidth={2} />
                    </div>
                    <span className="font-bold text-gray-800 text-sm">Artisans</span>
                 </div>
                 <div className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold">
                    {stats?.attendance?.presentToday || 0} Ready
                 </div>
              </div>

           </div>

           {/* Service Matrix / Ritual Distribution */}
           <div className="mt-12">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-6">Ritual Distribution</h4>
              <div className="flex items-center justify-between">
                <div className="h-[140px] w-1/2" style={{ minWidth: 0, minHeight: 0 }}>
                   <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <PieChart>
                        <Pie
                          data={ritualData}
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {ritualData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                   </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-3 pl-4">
                   {ritualData.map((s: any) => (
                     <div key={s.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                           <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }}></div>
                           <span className="text-[10px] font-bold text-gray-500 truncate">{s.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-gray-900">{s.value}</span>
                     </div>
                   ))}
                </div>
              </div>
           </div>
        </div>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 pb-10">
         {/* Recent Ceremonies - Classic Framing */}
         <div className="lg:col-span-6 bg-white p-6 sm:p-8 lg:p-10 rounded-[2rem] border border-zen-stone shadow-sm zen-card-hover relative group overflow-hidden">
            <div className="absolute inset-2 rounded-[1.6rem] border border-zen-gold/5 pointer-events-none group-hover:border-zen-gold/10 transition-colors duration-700" />

            <div className="flex items-center justify-between mb-10">
               <div>
                  <h3 className="text-2xl font-serif font-black text-zen-brown tracking-tight">Recent Rituals</h3>
                  <div className="w-12 h-1 bg-zen-gold/20 rounded-full mt-2"></div>
               </div>
               <ZenButton size="sm" variant="ghost" icon={ChevronRight} onClick={() => navigate('/appointments')}>Directory</ZenButton>
            </div>

            <div className="overflow-x-auto -mx-6 sm:-mx-8 lg:-mx-10">
               <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-zen-stone/40">
                      <th className="py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-zen-brown/40 pl-10">Registry</th>
                      <th className="py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-zen-brown/40">Ritual Type</th>
                      <th className="py-4 text-right text-[10px] font-black uppercase tracking-[0.2em] text-zen-brown/40 pr-10">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!stats?.appointments?.recent || stats.appointments.recent.length === 0) ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-20 text-center text-[11px] font-sans text-gray-400 bg-gray-50/30">
                           <div className="flex flex-col items-center gap-4 opacity-10">
                              <Activity size={40} strokeWidth={1} />
                              <p className="italic font-serif text-lg">No recent activity logged.</p>
                           </div>
                        </td>
                      </tr>
                    ) : (
                      stats.appointments.recent.slice(0, 6).map((apt: any, i: number) => (
                        <tr key={apt._id} className="group border-b border-zen-stone/10 hover:bg-zen-cream/30 transition-all duration-300">
                          <td className="py-5 pl-10">
                             <div className="flex flex-col text-left">
                                <span className="text-[14px] font-serif font-black text-zen-brown group-hover:text-zen-sand transition-colors">{formatName(apt.client)}</span>
                                <span className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest mt-0.5">Verified Client</span>
                             </div>
                          </td>
                          <td className="py-5 text-center">
                             <span className="text-[11px] font-bold text-zen-brown/60 italic">{apt.service}</span>
                          </td>
                          <td className="py-5 text-right pr-10">
                             <span className={`inline-flex px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-500 ${
                                apt.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                apt.status === 'Cancelled' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                'bg-zen-sand/5 text-zen-sand border-zen-sand/10'
                             }`}>
                                {apt.status}
                             </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Finance Ledger - Premium Refinement */}
         <div className="lg:col-span-6 bg-white p-8 rounded-[2.5rem] border border-zen-stone/60 shadow-none zen-card-hover relative group overflow-hidden">
            <div className="absolute inset-2 rounded-[2.1rem] border border-zen-gold/5 pointer-events-none" />

            <div className="flex items-center justify-between mb-10">
               <div>
                  <h3 className="text-2xl font-serif font-black text-zen-brown tracking-tight">Finance Registry</h3>
                  <div className="w-12 h-1 bg-zen-gold/20 rounded-full mt-2"></div>
               </div>
               <ZenButton size="sm" variant="ghost" icon={ChevronRight} onClick={() => navigate('/transactions')}>Full Ledger</ZenButton>
            </div>

            <div className="overflow-x-auto -mx-6 sm:-mx-8 lg:-mx-10">
               <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-zen-stone/40">
                      <th className="py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-zen-brown/40 pl-8">Entry</th>
                      <th className="py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-zen-brown/40">Timing</th>
                      <th className="py-4 text-right text-[10px] font-black uppercase tracking-[0.2em] text-zen-brown/40 pr-8">Flow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerRows.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-20 text-center text-[11px] font-sans text-gray-400 bg-gray-50/30">
                           <div className="flex flex-col items-center gap-4 opacity-10">
                              <Coins size={40} strokeWidth={1} />
                              <p className="italic font-serif text-lg">Registry is empty.</p>
                           </div>
                        </td>
                      </tr>
                    ) : (
                      ledgerRows.slice(0, 6).map((row: any) => (
                        <tr key={row.id} className="group border-b border-zen-stone/10 hover:bg-zen-cream/30 transition-all duration-300">
                          <td className="py-5 pl-8">
                             <div className="flex items-center gap-4 justify-start">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-sm transition-transform duration-500 group-hover:scale-110 ${
                                   row.kind === 'Expense' ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'
                                }`}>
                                   {row.kind === 'Expense' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                                </div>
                                <div className="flex flex-col text-left">
                                   <span className="text-[13px] font-bold text-zen-brown">{row.title}</span>
                                   <span className="text-[9px] text-zen-brown/30 font-black uppercase tracking-widest">{row.subtitle}</span>
                                </div>
                             </div>
                          </td>
                          <td className="py-5 text-center">
                             <div className="flex flex-col items-center">
                                <span className="text-[12px] font-serif italic text-zen-brown/60">{dayjs(row.date).format('MMM DD')}</span>
                                <span className="text-[8px] font-black text-zen-brown/20 uppercase tracking-tighter">Verified</span>
                             </div>
                          </td>
                          <td className="py-5 text-right pr-8">
                             <span className={`text-[14px] font-serif font-black ${row.kind === 'Expense' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {row.kind === 'Expense' ? '-' : '+'}{settings?.general?.currencySymbol || 'QR'} {row.amount?.toLocaleString()}
                             </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
               </table>
            </div>
         </div>
       </div>
      </div>
    </div>
  );
};

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = React.useState<any>(() => getCachedJson('zen_dashboard_employee_stats', null));
  const [loading, setLoading] = React.useState(() => !getCachedJson('zen_dashboard_employee_stats', null));

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  const formatName = (name: string) => {
    if (!name) return 'Guest';
    if (name.includes('authsec_')) {
      const parts = name.split('_');
      return parts[parts.length - 1] || 'Valued Client';
    }
    return name;
  };

  useEffect(() => {
    const fetchEmployeeStats = async (silent: boolean = false) => {
      try {
        if (!silent && !stats) setLoading(true);
        const response = await fetch(`${API_URL}/stats/dashboard`, {
          headers: { 'Authorization': `Bearer ${user?.token}` }
        });
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Performance ingestion failure:', error);
      } finally {
        if (!silent) setLoading(false);
      }
    };

    fetchEmployeeStats();

    const interval = setInterval(() => {
      if (!shouldPollNow()) return;
      fetchEmployeeStats(true);
    }, getPollIntervalMs(30000));

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (stats) setCachedJson('zen_dashboard_employee_stats', stats);
  }, [stats]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <div className="w-12 h-12 border-4 border-zen-sand border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em]">Synchronizing your sanctuary...</p>
    </div>
  );

  const cards = [
    { label: "Today's Rituals", value: (stats?.performance?.today || 0).toString(), icon: Calendar, color: 'text-zen-sand', bg: 'bg-zen-sand/10', glow: 'bg-zen-sand/20', trend: 'Current Load', delay: 0 },
    { label: 'Completed', value: (stats?.performance?.completed || 0).toString(), icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', trend: 'Total Accomplished', delay: 0.2 },
    { label: 'Est. Earnings', value: `QR ${stats?.performance?.earnings || 0}`, icon: Coins, color: 'text-sky-500', bg: 'bg-sky-500/10', glow: 'bg-sky-500/20', trend: 'Value Created', delay: 0.4 },
    { label: 'Zen Score', value: `${stats?.performance?.score || 0}`, icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-500/10', glow: 'bg-amber-500/20', trend: 'Harmony Metric', delay: 0.6 },
  ];

  const filteredRecentRituals = useMemo(() => {
    if (!stats?.recentRituals) return [];
    return stats.recentRituals.filter((apt: any) => apt.status !== 'Pending');
  }, [stats?.recentRituals]);

  const nextRitual = filteredRecentRituals.find((apt: any) => apt.status === 'Confirmed' || apt.status === 'In Service');

   return (
    <div className="space-y-12 sm:space-y-16 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-1000">
      {/* Refined Welcome Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 px-4 lg:px-2">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-zen-sand uppercase tracking-[0.4em] bg-zen-sand/5 px-5 py-2 rounded-full border border-zen-sand/10 backdrop-blur-sm">Artisan Command Center</span>
            <div className="h-px w-16 bg-gradient-to-r from-zen-sand/30 to-transparent"></div>
          </div>
          <h2 className="text-5xl sm:text-6xl font-serif font-black text-gray-900 tracking-normal leading-tight">
            Ahlan, <span className="text-transparent bg-clip-text bg-gradient-to-r from-zen-primary to-zen-sand italic pr-4">{user?.name?.split(' ')[0]}</span>
          </h2>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.4em] flex items-center gap-3">
            <Clock size={16} className="text-zen-sand animate-pulse" /> 
            {dayjs().format('dddd, MMMM D')} <span className="w-1.5 h-1.5 rounded-full bg-zen-sand/20"></span> 
            {dayjs().format('YYYY')}
          </p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex flex-col items-end gap-2">
             <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em]">Sanctuary Pulse</span>
             <div className="flex items-center gap-4 bg-white/60 backdrop-blur-md px-8 py-4 rounded-2xl border border-zen-stone shadow-none group hover:border-zen-sand/30 transition-all duration-500">
                <div className="relative">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-40"></div>
                </div>
                <span className="text-[11px] font-black text-gray-800 uppercase tracking-[0.2em]">Systems Operational</span>
             </div>
          </div>
        </div>
      </div>

      {/* Metrics Section with subtle backdrop glow */}
      <div className="relative">
        <div className="absolute -inset-10 bg-zen-sand/5 blur-[100px] rounded-full pointer-events-none opacity-50" />
        <div className="zen-metrics-grid relative z-10">
          {cards.map((card, i) => (
             <ZenStatCard key={i} {...card} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 px-4 lg:px-2">
        {/* Left Column: Highlight & Impact */}
        <div className="lg:col-span-4 space-y-10">
           {/* Majestic Next Session Highlight */}
           <div className="zen-majestic-gradient p-12 rounded-[3.5rem] text-white shadow-none relative overflow-hidden group border border-white/20 min-h-[460px] flex flex-col justify-between transition-all duration-1000 hover:shadow-[0_40px_80px_-20px_rgba(109,40,217,0.25)]">
              {/* Animated decorative backgrounds */}
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-[100px] group-hover:bg-white/20 transition-all duration-1000 animate-pulse"></div>
              <div className="absolute top-0 right-0 p-16 opacity-5 group-hover:opacity-10 group-hover:rotate-12 group-hover:scale-125 transition-all duration-1000">
                 <Sparkles size={240} strokeWidth={0.5} />
              </div>
              <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-zen-brown/20 rounded-full blur-[120px]"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-12">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-md shadow-inner group-hover:rotate-6 transition-all duration-500">
                         <Calendar size={20} className="text-white" />
                      </div>
                      <h3 className="text-[11px] font-black text-white/50 uppercase tracking-[0.5em]">Upcoming Ritual</h3>
                   </div>
                   {nextRitual?.status === 'In Service' && (
                     <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/20 animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-zen-sand" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white">Live Now</span>
                     </div>
                   )}
                </div>

                {nextRitual ? (
                  <div className="space-y-10 animate-in slide-in-from-bottom-6 duration-1000">
                    <div className="space-y-3">
                       <h4 className="text-5xl font-serif font-black leading-[1.1] tracking-tight group-hover:translate-x-2 transition-transform duration-700">
                         {formatName(nextRitual.client)}
                       </h4>
                       <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-md">
                         <Zap size={14} className="text-white animate-pulse" />
                         <p className="text-white font-black text-[11px] uppercase tracking-[0.2em]">{formatName(nextRitual.service)}</p>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                       <div className="bg-white/10 backdrop-blur-xl px-7 py-6 rounded-[2rem] border border-white/15 shadow-inner group-hover:-translate-y-1 transition-all duration-500">
                          <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] mb-2">Ceremony Time</p>
                          <div className="flex items-center gap-3 text-lg font-black tracking-tight">
                             <Clock size={18} className="text-white/60" /> {nextRitual.time}
                          </div>
                       </div>
                       <div className="bg-white/10 backdrop-blur-xl px-7 py-6 rounded-[2rem] border border-white/15 shadow-inner group-hover:-translate-y-1 transition-all duration-500 delay-75">
                          <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] mb-2">Sanctuary Hall</p>
                          <div className="flex items-center gap-3 text-lg font-black tracking-tight">
                             <MapPin size={18} className="text-white/60" /> {nextRitual.branch?.name?.split(' ')[0] || 'Main'}
                          </div>
                       </div>
                    </div>

                    {nextRitual.status === 'In Service' && (
                       <div className="space-y-3 pt-2">
                          <div className="flex justify-between items-center">
                             <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Ritual Progress</span>
                             <span className="text-[9px] font-black text-white uppercase tracking-widest">45%</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: '45%' }}
                               transition={{ duration: 2, ease: "easeOut" }}
                               className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                             />
                          </div>
                       </div>
                    )}
                  </div>
                ) : (
                  <div className="py-20 text-center">
                     <div className="w-24 h-24 rounded-[2.5rem] bg-white/10 flex items-center justify-center mx-auto mb-8 border border-white/10 backdrop-blur-md animate-float">
                        <Activity size={40} className="text-white/20" strokeWidth={1} />
                     </div>
                     <p className="text-2xl font-serif italic text-white/40">The sanctuary remains in peace.</p>
                     <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mt-3">No active rituals scheduled</p>
                  </div>
                )}
              </div>

              <div className="relative z-10 pt-10 mt-auto">
                 <button 
                    onClick={() => navigate('/appointments')}
                    className="w-full bg-white text-zen-primary rounded-[2.2rem] py-6 font-black text-[12px] uppercase tracking-[0.4em] flex items-center justify-center gap-4 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] hover:bg-zen-sand hover:text-white hover:scale-[1.02] transition-all duration-500 active:scale-95 group/btn"
                 >
                   Sanctuary Hub 
                   <ArrowUpRight size={18} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                 </button>
              </div>
           </div>

           {/* Refined Service Impact */}
           <div className="bg-white p-12 rounded-[3.5rem] border border-zen-stone shadow-none flex flex-col group relative overflow-hidden transition-all duration-700 hover:border-zen-sand/20">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-10 group-hover:scale-125 transition-all duration-1000">
                 <TrendingUp size={140} />
              </div>
              
              <div className="flex items-center justify-between mb-12">
                 <div className="space-y-1">
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.5em]">Artisan Velocity</h3>
                    <div className="w-10 h-1 bg-zen-sand/20 rounded-full" />
                 </div>
                 <div className="w-10 h-10 rounded-full bg-zen-sand/5 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-zen-sand animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.5)]"></div>
                 </div>
              </div>

              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Rituals', value: stats?.performance?.completed || 0 },
                    { name: 'Target', value: Math.max((stats?.performance?.completed || 0) + 2, 10) }
                  ]}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--zen-sand, #8B5CF6)" stopOpacity={1} />
                        <stop offset="100%" stopColor="var(--zen-primary, #6D28D9)" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <Bar dataKey="value" radius={[14, 14, 0, 0]} barSize={50}>
                       { [0, 1].map((_, index) => (
                         <Cell key={index} fill={index === 0 ? "url(#barGradient)" : "#F8FAFC"} />
                       ))}
                    </Bar>
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', padding: '16px' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-10 pt-10 border-t border-gray-50 flex justify-between items-end relative z-10">
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Achieved Today</p>
                    <p className="text-3xl font-serif font-black text-gray-900 group-hover:text-zen-primary transition-colors">{stats?.performance?.completed || 0} <span className="text-lg text-gray-300 font-normal">Ceremonies</span></p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black text-zen-sand uppercase tracking-widest">Performance</p>
                    <div className="flex items-center gap-2 mt-1">
                       <Sparkles size={14} className="text-zen-gold" />
                       <p className="text-xl font-serif font-black text-gray-900">Elite</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Right Column: Timeline Schedule */}
        <div className="lg:col-span-8 bg-white p-10 sm:p-16 rounded-[3.5rem] border border-zen-stone shadow-none relative group overflow-hidden transition-all duration-1000 hover:border-zen-sand/10">
          <div className="absolute inset-6 rounded-[2.8rem] border border-zen-gold/5 pointer-events-none group-hover:border-zen-gold/10 transition-colors duration-1000" />
          <div className="absolute top-0 right-0 p-20 opacity-[0.02] pointer-events-none">
             <Clock size={300} strokeWidth={0.5} />
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 mb-20 relative z-10">
            <div className="space-y-3">
              <h3 className="text-4xl font-serif font-black text-gray-900 tracking-tight">Today's Journey</h3>
              <div className="flex items-center gap-4">
                 <div className="w-12 h-1.5 bg-gradient-to-r from-zen-sand to-zen-sand/10 rounded-full"></div>
                 <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em]">Chronological Pulse</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/appointments')}
              className="px-8 py-4 rounded-2xl bg-zen-cream/50 text-zen-brown font-black text-[11px] uppercase tracking-[0.3em] hover:bg-zen-sand hover:text-white transition-all duration-500 shadow-none flex items-center gap-3 group/all backdrop-blur-sm border border-zen-stone"
            >
              Full Directory <ArrowUpRight size={16} className="group-hover/all:translate-x-1 group-hover/all:-translate-y-1 transition-transform" />
            </button>
          </div>

          <div className="relative z-10 pl-2 sm:pl-0 space-y-0">
            {/* Elegant Vertical Line */}
            <div className="zen-timeline-line" />

            {filteredRecentRituals.length > 0 ? (
              filteredRecentRituals.map((apt: any, idx: number) => (
                <motion.div 
                  key={apt._id} 
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: idx * 0.15 }}
                  className="flex gap-10 group/item relative pb-16 last:pb-0"
                >
                  <div className="flex flex-col items-center shrink-0 pt-2">
                    <div className={`w-[64px] h-[64px] rounded-[1.8rem] flex flex-col items-center justify-center font-black shadow-none transition-all duration-700 relative z-10 border-2 ${
                      apt.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      apt.status === 'In Service' ? 'bg-zen-primary text-white border-zen-primary shadow-[0_15px_30px_rgba(109,40,217,0.3)] scale-125' :
                      'bg-white text-gray-400 border-zen-stone group-hover/item:border-zen-sand group-hover/item:text-zen-sand group-hover/item:-translate-y-1'
                    }`}>
                      <span className="text-[11px] leading-none mb-0.5">{apt.time?.split(' ')[0]}</span>
                      <span className="text-[8px] opacity-40 leading-none">{apt.time?.split(' ')[1] || 'PM'}</span>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className={`p-10 rounded-[2.8rem] border transition-all duration-700 relative group/card overflow-hidden ${
                      apt.status === 'In Service' ? 'bg-white border-zen-primary/30 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.12)]' :
                      'bg-gray-50/30 border-transparent hover:border-zen-stone hover:bg-white hover:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.08)]'
                    }`}>
                       {/* Subtle backdrop patterns for cards */}
                       <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover/card:opacity-[0.05] transition-all duration-1000">
                          <Activity size={120} />
                       </div>

                       {apt.status === 'In Service' && (
                         <div className="absolute top-10 right-10 flex items-center gap-3 bg-zen-sand/10 px-4 py-2 rounded-full border border-zen-sand/20">
                            <span className="w-2 h-2 rounded-full bg-zen-sand animate-ping"></span>
                            <span className="text-[9px] font-black text-zen-sand uppercase tracking-widest">Active Presence</span>
                         </div>
                       )}

                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                          <div className="space-y-2">
                             <h4 className="text-3xl font-serif font-black text-gray-900 group-hover/card:text-zen-primary transition-colors duration-500">
                               {formatName(apt.client)}
                             </h4>
                             <div className="flex items-center gap-4">
                                <span className="text-[11px] font-black text-zen-sand uppercase tracking-[0.2em]">{formatName(apt.service)}</span>
                                <div className="w-1 h-1 rounded-full bg-zen-stone"></div>
                                <span className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">60m Session</span>
                             </div>
                          </div>
                          
                          <span className={`self-start sm:self-center px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] border transition-all duration-500 ${
                            apt.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            apt.status === 'In Service' ? 'bg-zen-primary text-white border-white/20' : 
                            'bg-white text-gray-400 border-zen-stone group-hover/card:border-zen-sand/20'
                          }`}>
                            {apt.status}
                          </span>
                       </div>
                       
                       <div className="flex items-center gap-8 pt-8 border-t border-gray-100/60 mt-6 opacity-40 group-hover/card:opacity-100 transition-all duration-700 overflow-x-auto scrollbar-none">
                          <div className="flex items-center gap-3 shrink-0">
                             <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                                <MapPin size={14} />
                             </div>
                             <div className="flex flex-col">
                                <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest leading-none mb-1">Sanctuary</span>
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-none">{apt.branch?.name || apt.branch || 'Main Hall'}</span>
                             </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                             <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                                <UserCheck size={14} />
                             </div>
                             <div className="flex flex-col">
                                <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest leading-none mb-1">{apt.status === 'Completed' ? 'Completed By' : 'Artisan'}</span>
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-none">{apt.completedByName || apt.employee || 'Specialist'}</span>
                             </div>
                          </div>

                          {apt.completedAt && (
                            <div className="flex items-center gap-3 shrink-0 animate-in fade-in slide-in-from-left-2 duration-500">
                               <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                                  <Clock size={14} />
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-emerald-600/40 uppercase tracking-widest leading-none mb-1">Timestamp</span>
                                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none">{dayjs(apt.completedAt).format('hh:mm A')}</span>
                               </div>
                            </div>
                          )}
                       </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-32 text-center animate-in fade-in zoom-in duration-1000">
                <div className="w-32 h-32 rounded-[3rem] bg-zen-cream/40 flex items-center justify-center mx-auto mb-10 border border-white relative">
                   <div className="absolute inset-0 rounded-[3rem] bg-zen-sand/10 animate-ping opacity-20"></div>
                   <Activity size={56} className="text-zen-sand/30" strokeWidth={0.5} />
                </div>
                <p className="text-3xl font-serif italic text-gray-300 leading-tight">Your timeline awaits<br/>the next ritual.</p>
                <div className="flex items-center justify-center gap-4 mt-8">
                   <div className="h-px w-8 bg-gray-100"></div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Ready & Synchronized</p>
                   <div className="h-px w-8 bg-gray-100"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


const ManagerDashboard = ({ dateRange, setDateRange }: { dateRange: any, setDateRange: any }) => {
  return <AdminDashboard dateRange={dateRange} setDateRange={setDateRange} />; // Managers now use the same dynamic Command Center as Admins
};


const ClientDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = React.useState<any>(() => getCachedJson('zen_dashboard_client_stats', null));
  const [loading, setLoading] = React.useState(() => !getCachedJson('zen_dashboard_client_stats', null));
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  useEffect(() => {
    const fetchClientStats = async (silent = false) => {
      try {
        if (!silent && !stats) setLoading(true);
        const response = await fetch(`${API_URL}/stats/dashboard`, {
          headers: { 'Authorization': `Bearer ${user?.token}` }
        });
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Loyalty data failure:', error);
      } finally {
        if (!silent) setLoading(false);
      }
    };

    fetchClientStats();

    const interval = setInterval(() => {
      if (!shouldPollNow()) return;
      fetchClientStats(true);
    }, getPollIntervalMs(30000));

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (stats) setCachedJson('zen_dashboard_client_stats', stats);
  }, [stats]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-zen-sand border-t-transparent rounded-full animate-spin"></div></div>;

  const cards = [
    { label: 'Zen Affinity Points', value: `${stats?.loyalty?.points || 0} pts`, icon: Sparkles, color: 'text-yellow-500', bg: 'bg-yellow-500/10', glow: 'bg-yellow-500/20', trend: 'Loyalty Reward', delay: 0 },
    { label: 'Upcoming Ritual', value: stats?.nextAppointment ? stats.nextAppointment.date : 'Discovery', icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', trend: 'Next Sanctuary', delay: 0.2 },
    { label: 'Sanctuary Visits', value: (stats?.visits?.total || 0).toString(), icon: Users, color: 'text-zen-sand', bg: 'bg-zen-sand/10', glow: 'bg-zen-sand/20', trend: 'History Log', delay: 0.4 },
    { label: 'Loyalty Tier', value: stats?.loyalty?.tier || 'Silver', icon: TrendingUp, color: 'text-zen-brown', bg: 'bg-zen-brown/[0.06]', glow: 'bg-zen-brown/10', trend: 'Status Level', delay: 0.6 },
  ];

  return (
    <div className="space-y-12 pb-20">
      <div className="zen-metrics-grid">
        {cards.map((card, i) => (
           <ZenStatCard key={i} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 bg-white rounded-[2rem] p-12 border border-zen-stone shadow-sm zen-card-hover relative group overflow-hidden">
          <div className="absolute inset-2 rounded-[1.6rem] border border-zen-gold/5 pointer-events-none group-hover:border-zen-gold/10 transition-colors duration-700" />
          <header className="mb-12 relative z-10">
            <h3 className="text-3xl font-serif font-bold text-black tracking-tight">Your Relaxation Journey</h3>
            <p className="text-xs font-bold text-black/20 uppercase tracking-[0.4em] mt-2">Recent Sanctuary History</p>
          </header>

          <div className="space-y-6">
            {stats?.visits?.all?.length > 0 ? (
              stats.visits.all.map((apt: any) => (
                <div key={apt._id} className="flex items-center justify-between p-8 bg-white/40 rounded-[1.5rem] border border-transparent hover:border-zen-brown/15 hover:bg-white hover:shadow-sm transition-all duration-700 group">
                  <div className="flex items-center gap-8">
                    <div className="w-16 h-16 bg-zen-cream rounded-[1rem] flex items-center justify-center border border-white text-zen-sand group-hover:bg-zen-sand group-hover:text-white transition-all duration-700">
                      <Calendar size={28} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-serif font-bold text-zen-brown">{apt.serviceName || apt.service}</h4>
                      <p className="text-xs font-bold text-zen-brown/30 uppercase tracking-[0.2em] mt-1">{apt.date} • {apt.time}</p>
                    </div>
                  </div>
                  <div className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    apt.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600' :
                    'bg-zen-brown/5 text-zen-brown/30 border border-zen-brown/15'
                  }`}>
                    {apt.status}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-24 text-center">
                <p className="text-2xl font-serif text-zen-brown/20 italic tracking-tight">Your exploration log is waiting to be filled.</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-zen-brown p-12 rounded-[2rem] text-white shadow-lg relative overflow-hidden group h-full flex flex-col justify-between border border-zen-gold/20">
            <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-zen-gold/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />

            <div className="relative z-10">
               <Sparkles size={40} className="mb-8 opacity-40 hover:rotate-12 transition-transform" />
               <h3 className="text-3xl font-serif font-bold mb-6 tracking-tight">Zen Wisdom</h3>
               <p className="text-lg text-white/80 leading-relaxed italic mb-10 font-medium font-serif">
                 "True relaxation comes from within. Take 5 minutes today to focus only on your breath and let the world fade away."
               </p>
            </div>

            <ZenButton
              onClick={() => navigate('/book')}
              className="relative z-10 w-full py-5 bg-white text-zen-sand rounded-[1rem] font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/5 font-sans"
            >
              Book Your Next Escape
            </ZenButton>
          </div>
        </div>
      </div>
    </div>
  );
};


const Dashboard = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<any>('All');
  const quickActions = [
    { label: 'Book Ritual', icon: Sparkles, color: 'bg-zen-brown text-white', path: hasPermission('appointments') ? '/appointments' : '/book', permissions: ['appointments', 'book'] },
    { label: 'Digital Punch', icon: Clock, color: 'bg-white text-zen-brown border-zen-gold/20', path: getAttendanceRouteForRole(user?.role), permissions: ['attendance'] },
    { label: 'New Artisan', icon: Users, color: 'bg-white text-zen-brown border-zen-gold/20', path: '/employees', permissions: ['employees'] },
    { label: 'Inventory Restock', icon: Target, color: 'bg-white text-zen-brown border-zen-gold/20', path: '/inventory', permissions: ['inventory'] },
  ].filter((action) => action.permissions.some((permission) => hasPermission(permission)));

  return (
    <ZenPageLayout
      title="Dashboard & Finance"
      hideSearch
      hideAddButton
      hideBranchSelector={true}
      hideViewToggle={true}
    >
      <HeaderPortal>
        <div className="flex items-center gap-4 py-1">
          <ZenMasterCalendar
            label="Date Range"
            value={dateRange}
            onChange={(v: any) => setDateRange(v)}
            selectionType="range"
            variant="pill"
            className="w-[200px]"
            hideLabel
          />
          <BranchSelector variant="pill" className="w-[200px]" />
        </div>
      </HeaderPortal>
      <div className="mt-0">
        {user?.role === 'Admin' && <AdminDashboard dateRange={dateRange} setDateRange={setDateRange} />}
        {user?.role === 'Manager' && <ManagerDashboard dateRange={dateRange} setDateRange={setDateRange} />}
        {user?.role === 'Employee' && <EmployeeDashboard />}
        {user?.role === 'Client' && <ClientDashboard />}
      </div>
    </ZenPageLayout>
  );
};

export default Dashboard;
