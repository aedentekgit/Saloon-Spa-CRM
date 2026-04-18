import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  Target
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

const AdminDashboard = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { employees } = useData();
  const { selectedBranch } = useBranches();
  const navigate = useNavigate();
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/stats/dashboard`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Stats ingestion failure:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchStats();
  }, [selectedBranch]);

  // Fully dynamic metrics mapping
  const displayRevenue = stats?.revenue?.total || 0;
  const displayExpenses = stats?.revenue?.today || 0;
  const displayProfit = (stats?.revenue?.total || 0) - (stats?.revenue?.today || 0);
  const displayClients = stats?.clients?.total || 0;

  const cards = [
    { 
      title: 'TOTAL REVENUE', 
      value: `${settings?.general?.currencySymbol || 'QR'} ${displayRevenue.toLocaleString()}`, 
      trend: stats?.revenue?.trend?.length > 0 ? '+Active' : '+0.0%', 
      icon: Coins, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-50/[0.03]', 
      trendColor: 'text-emerald-600', 
      trendBg: 'bg-emerald-50',
      watermark: Coins
    },
    { 
      title: 'DAILY REVENUE', 
      value: `${settings?.general?.currencySymbol || 'QR'} ${displayExpenses.toLocaleString()}`, 
      trend: stats?.revenue?.today > 0 ? 'Live' : 'Steady', 
      icon: ArrowDownRight, 
      color: 'text-rose-500', 
      bg: 'bg-rose-50/[0.03]', 
      trendColor: 'text-rose-500', 
      trendBg: 'bg-rose-50',
      watermark: Activity
    },
    { 
      title: 'NET PROFIT', 
      value: `${settings?.general?.currencySymbol || 'QR'} ${displayProfit.toLocaleString()}`, 
      trend: 'Calculated', 
      icon: TrendingUp, 
      color: 'text-blue-500', 
      bg: 'bg-blue-50/[0.03]', 
      trendColor: 'text-emerald-600', 
      trendBg: 'bg-emerald-50',
      watermark: TrendingUp 
    },
    { 
      title: 'TOTAL CLIENTS', 
      value: displayClients, 
      trend: stats?.clients?.newToday > 0 ? `+${stats.clients.newToday} New` : '+0 New', 
      icon: Users, 
      color: 'text-fuchsia-500', 
      bg: 'bg-fuchsia-50/[0.03]', 
      trendColor: 'text-emerald-600', 
      trendBg: 'bg-emerald-50',
      watermark: Users
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px]">
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
    color: i === 0 ? 'var(--theme-primary)' : i === 1 ? '#5b21b6' : '#a78bfa'
  })) : [
    { name: 'Loading Rituals...', value: 100, color: '#F3F4F6' }
  ];


  return (
    <div style={{ '--theme-primary': settings?.theme?.primaryColor || '#8B5CF6' } as React.CSSProperties} className="space-y-8 font-sans pb-20">

      {/* Quick Actions Bar */}
      <div className="flex flex-wrap items-center gap-4">
         {[
           { label: 'Book Ritual', icon: Sparkles, color: 'bg-zen-sand text-white', path: '/appointments' },
           { label: 'New Artisan', icon: Users, color: 'bg-white text-zen-brown border-zen-brown/10', path: '/employees' },
           { label: 'Inventory Restock', icon: Target, color: 'bg-white text-zen-brown border-zen-brown/10', path: '/inventory' },
         ].map((action, i) => (
           <motion.button
             key={action.label}
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: i * 0.1 }}
             onClick={() => navigate(action.path)}
             className={`flex items-center gap-3 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95 border ${action.color}`}
           >
             <action.icon size={14} />
             {action.label}
           </motion.button>
         ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-zen-brown/15 shadow-sm group hover:translate-y-[-4px] transition-all duration-500 relative overflow-hidden"
          >
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-zen-brown group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-1000">
               <card.watermark size={120} />
            </div>
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className={`w-10 h-10 rounded-xl bg-zen-brown/[0.03] border border-zen-brown/10 flex items-center justify-center text-zen-brown group-hover:bg-zen-brown group-hover:text-white transition-all duration-700 shadow-inner`}>
                 <card.icon size={18} />
              </div>
              <div className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest ${card.trendColor} ${card.trendBg}`}>
                 {card.trend}
              </div>
            </div>

            <div className="relative z-10">
               <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[.2em] mb-1">{card.title}</p>
               <h3 className="text-2xl font-serif font-black text-zen-brown tracking-tighter leading-none">
                 {card.value}
               </h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Analytics Overview */}
        <div className="lg:col-span-8 bg-white p-8 rounded-3xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col overflow-hidden hover:-translate-y-1 hover:shadow-[0_10px_30px_rgb(0,0,0,0.08)] hover:border-[color:var(--theme-primary)] transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 z-10 relative">
             <h3 className="text-xl font-bold text-gray-900 tracking-tight">Analytics Overview</h3>
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }}></div>
                   <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-[#5b21b6]"></div>
                   <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Expenses</span>
                </div>
             </div>
          </div>

          <div className="h-[300px] w-full mt-auto relative z-10 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                <defs>
                   <linearGradient id="colorRevs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--theme-primary)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--theme-primary)" stopOpacity={0} />
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
                  stroke="#5b21b6" 
                  strokeWidth={2} 
                  strokeDasharray="5 5" 
                  fill="none" 
                  activeDot={{ r: 6 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="var(--theme-primary)" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorRevs)" 
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Overview */}
        <div className="lg:col-span-4 bg-white p-8 rounded-3xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_10px_30px_rgb(0,0,0,0.08)] hover:border-[color:var(--theme-primary)] transition-all duration-300">
           <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-8">Daily Overview</h3>
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

              <div className="flex items-center justify-between p-4 rounded-[1rem] bg-blue-50 hover:bg-blue-100/60 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full border border-blue-200/50 bg-white shadow-sm flex items-center justify-center text-blue-500">
                       <Calendar size={18} strokeWidth={2} />
                    </div>
                    <span className="font-bold text-gray-800 text-sm">Bookings</span>
                 </div>
                 <div className="px-3 py-1.5 rounded-full bg-blue-100/60 text-blue-600 text-[10px] font-bold">
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
                <div className="h-[140px] w-1/2">
                   <ResponsiveContainer width="100%" height="100%">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Recent Ceremonies */}
         <div className="lg:col-span-12 bg-white/60 backdrop-blur-xl p-10 rounded-[2.5rem] border border-gray-200/60 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-10">
               <div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">Recent Rituals</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Real-time sanctuary log</p>
               </div>
               <ZenButton size="sm" variant="ghost" icon={ChevronRight}>View All Directory</ZenButton>
            </div>

            <div className="w-full bg-white rounded-xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden overflow-x-auto custom-scrollbar animate-in fade-in duration-700">
               <table className="w-full text-center border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50 border-y border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                      <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">S No</th>
                      <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Ritual Participant</th>
                      <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Sanctuary Role</th>
                      <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Service Scope</th>
                      <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Status & Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!stats?.appointments?.recent || stats.appointments.recent.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-[11px] font-sans text-gray-400 bg-gray-50/30">
                           <div className="flex flex-col items-center gap-4 opacity-10">
                              <Activity size={60} strokeWidth={0.5} />
                              <p className="italic font-serif text-xl">Sanctuary logs are currently quiet.</p>
                           </div>
                        </td>
                      </tr>
                    ) : (
                      stats.appointments.recent.map((apt: any, i: number) => (
                        <motion.tr 
                          key={apt._id} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="transition-all group border-b border-black/[0.02] hover:bg-black/[0.01]"
                        >
                          <td className="text-center italic opacity-40 text-[11px]">
                            {(i + 1).toString().padStart(2, '0')}
                          </td>
                          <td>
                             <div className="flex flex-col items-center px-6">
                                <span className="zen-table-primary">{apt.client}</span>
                                <span className="zen-table-meta">Verified Client</span>
                             </div>
                          </td>
                          <td>
                             <div className="flex flex-col items-center">
                                <span className="zen-table-primary font-accent italic !text-[18px]">{apt.employee}</span>
                                <span className="zen-table-meta">Lead Artisan</span>
                             </div>
                          </td>
                          <td>
                             <div className="flex flex-col items-center">
                                <span className="zen-table-primary">{apt.service}</span>
                                <span className="zen-table-meta">{apt.time || '60m Ritual'}</span>
                             </div>
                          </td>
                          <td>
                             <div className="flex items-center justify-center gap-4">
                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                                   apt.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600' :
                                   apt.status === 'Cancelled' ? 'bg-red-500/10 text-red-600' : 'bg-zen-sand/10 text-zen-sand'
                                }`}>
                                   {apt.status}
                                </span>
                                <ZenIconButton icon={ChevronRight} onClick={() => navigate('/appointments')} />
                             </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
               </table>
            </div>

         </div>
      </div>
    </div>
  );
};

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    const fetchEmployeeStats = async () => {
      try {
        const response = await fetch(`${API_URL}/stats/dashboard`, {
          headers: { 'Authorization': `Bearer ${user?.token}` }
        });
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Performance ingestion failure:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployeeStats();
  }, [user]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-zen-sand border-t-transparent rounded-full animate-spin"></div></div>;

  const cards = [
    { title: "Today's Rituals", value: (stats?.performance?.today || 0).toString(), icon: Calendar, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { title: 'Rituals Completed', value: (stats?.performance?.completed || 0).toString(), icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { title: 'Est. Earnings', value: `QR ${stats?.performance?.earnings || 0}`, icon: Coins, color: 'text-orange-500', bg: 'bg-orange-50' },
    { title: 'Zen Score', value: `${stats?.performance?.score || 0} pts`, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-12 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-10 overflow-visible">
        {cards.map((card) => (
          <motion.div 
            key={card.title} 
            whileHover={{ y: -18, zIndex: 50 }}
            className="bg-white p-10 rounded-[1.5rem] border border-zen-brown/15 shadow-sm group transition-all duration-500 relative"
          >
            <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center mb-8 ${card.bg} ${card.color} group-hover:scale-110 transition-transform duration-700 shadow-sm border border-white`}>
              <card.icon size={26} />
            </div>
            <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-2">{card.title}</p>
            <h3 className="text-3xl font-serif font-bold text-black tracking-tighter">{card.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="bg-white p-12 rounded-[1.5rem] border border-zen-brown/15 shadow-sm">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h3 className="text-3xl font-serif font-bold text-black tracking-tight">Schedule Matrix</h3>
            <p className="text-xs font-bold text-black/20 uppercase tracking-[0.4em] mt-2">Latest Sanctuary Interactions</p>
          </div>
          <div className="px-6 py-2 bg-zen-sand/10 rounded-full border border-zen-sand/10">
             <span className="text-[10px] font-bold text-zen-sand uppercase tracking-widest">{user?.name}</span>
          </div>
        </div>
        
        <div className="space-y-6">
          {stats?.recentRituals?.length > 0 ? (
            stats.recentRituals.map((apt: any) => (
              <div key={apt._id} className="flex items-center justify-between p-8 bg-white/50 rounded-[1.5rem] border border-transparent hover:border-zen-brown/15 hover:bg-white hover:shadow-sm hover:shadow-zen-brown/15 transition-all duration-700 group">
                <div className="flex items-center gap-10">
                  <div className="w-20 h-20 bg-zen-cream rounded-[1rem] flex flex-col items-center justify-center border border-white shadow-sm group-hover:bg-zen-brown group-hover:text-white transition-all duration-700">
                    <span className="text-[10px] font-bold uppercase opacity-30 tracking-widest mb-1">Time</span>
                    <span className="text-lg font-bold">{apt.time?.split(' ')[0] || '--'}</span>
                  </div>
                  <div>
                    <h4 className="text-2xl font-serif font-bold text-zen-brown mb-1">{apt.clientName || apt.client}</h4>
                    <p className="text-xs font-bold text-zen-brown/30 uppercase tracking-[0.2em] flex items-center gap-2">
                       {apt.serviceName || apt.service} <span className="text-zen-brown/20 mx-1">|</span> {apt.branch?.name || 'Local'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm ${
                    apt.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600' : 
                    apt.status === 'In Service' ? 'bg-indigo-500/10 text-indigo-600' : 'bg-orange-500/10 text-orange-600'
                  }`}>
                    {apt.status}
                  </div>
                  <ZenIconButton icon={ChevronRight} />
                </div>
              </div>
            ))
          ) : (
            <div className="py-24 text-center">
              <div className="w-20 h-20 bg-zen-brown/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white">
                 <Calendar size={32} className="text-zen-brown/20" />
              </div>
              <p className="text-2xl font-serif text-zen-brown/20 italic tracking-tight">No active rituals logged.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


const ManagerDashboard = () => {
  return <AdminDashboard />; // Managers now use the same dynamic Command Center as Admins
};


const ClientDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    const fetchClientStats = async () => {
      try {
        const response = await fetch(`${API_URL}/stats/dashboard`, {
          headers: { 'Authorization': `Bearer ${user?.token}` }
        });
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Loyalty data failure:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchClientStats();
  }, [user]);
  
  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-zen-sand border-t-transparent rounded-full animate-spin"></div></div>;

  const cards = [
    { title: 'Zen Affinity Points', value: `${stats?.loyalty?.points || 0} pts`, icon: Sparkles, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { title: 'Upcoming Ritual', value: stats?.nextAppointment ? stats.nextAppointment.date : 'Discovery Phase', icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { title: 'Sanctuary Visits', value: (stats?.visits?.total || 0).toString(), icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { title: 'Loyalty Tier', value: stats?.loyalty?.tier || 'Silver', icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-12 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-10 overflow-visible">
        {cards.map((card) => (
          <motion.div 
            key={card.title} 
            whileHover={{ y: -18, zIndex: 50 }}
            className="bg-white p-10 rounded-[1.5rem] border border-zen-brown/15 shadow-sm group transition-all duration-500 relative"
          >
            <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center mb-8 ${card.bg} ${card.color} group-hover:scale-110 transition-transform duration-700 shadow-sm border border-white`}>
              <card.icon size={26} />
            </div>
            <p className="text-[10px] font-bold text-black/20 uppercase tracking-widest mb-2">{card.title}</p>
            <h3 className="text-3xl font-serif font-bold text-black tracking-tighter">{card.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 bg-white/60 backdrop-blur-xl rounded-[1.5rem] p-12 border border-white shadow-sm">
          <header className="mb-12">
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
          <div className="bg-zen-sand/90 backdrop-blur-xl p-12 rounded-[1.5rem] text-white shadow-sm shadow-zen-sand/20 relative overflow-hidden group h-full flex flex-col justify-between">
            <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
            
            <div className="relative z-10">
               <Sparkles size={40} className="mb-8 opacity-40 hover:rotate-12 transition-transform" />
               <h3 className="text-3xl font-serif font-bold mb-6 tracking-tight">Zen Wisdom</h3>
               <p className="text-lg text-white/80 leading-relaxed italic mb-10 font-medium font-serif">
                 "True relaxation comes from within. Take 5 minutes today to focus only on your breath and let the world fade away."
               </p>
            </div>

            <ZenButton 
              onClick={() => navigate('/appointments')}
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
  const { user } = useAuth();

  return (
    <ZenPageLayout 
      title="Dashboard Overview" 
      hideSearch 
      hideAddButton
      hideBranchSelector={true}
      hideViewToggle={true}
    >
      <div className="mt-0">
        {user?.role === 'Admin' && <AdminDashboard />}
        {user?.role === 'Manager' && <ManagerDashboard />}
        {user?.role === 'Employee' && <EmployeeDashboard />}
        {user?.role === 'Client' && <ClientDashboard />}
      </div>
    </ZenPageLayout>
  );
};

export default Dashboard;
