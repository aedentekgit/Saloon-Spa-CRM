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
import { ZenStatCard } from '../../components/zen/ZenStatCard';
import { getPollIntervalMs, shouldPollNow } from '../../utils/polling';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { employees } = useData();
  const { selectedBranch } = useBranches();
  const navigate = useNavigate();
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  const fetchStats = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const statsUrl = new URL(`${API_URL}/stats/dashboard`);
      if (selectedBranch && selectedBranch !== 'all') {
        statsUrl.searchParams.set('branch', selectedBranch);
      }
      const response = await fetch(statsUrl.toString(), {
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

  React.useEffect(() => {
    fetchStats();
    
    // Pulse polling for real-time dashboard data
    const interval = setInterval(() => {
      if (!shouldPollNow()) return;
      fetchStats(true);
    }, getPollIntervalMs(30000)); // default 30s

    return () => clearInterval(interval);
  }, [selectedBranch]);

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
    color: i === 0 ? `var(--zen-primary, #332766)` : i === 1 ? `var(--zen-sand, #8B5CF6)` : 'rgba(139,92,246,0.4)'
  })) : [
    { name: 'Loading Rituals...', value: 100, color: '#F3F4F6' }
  ];


  return (
    <div style={{ '--zen-primary': settings?.theme?.primaryColor || '#2D2D2D' } as React.CSSProperties} className="space-y-8 font-sans pb-20">


      {/* Quick Actions Bar */}
      <div className="flex flex-wrap items-center gap-4">
          {[
            { label: 'Book Ritual', icon: Sparkles, color: 'bg-zen-sand text-white', path: '/appointments' },
            { label: 'Digital Punch', icon: Clock, color: 'bg-white text-zen-brown border-zen-brown/10', path: '/attendance' },
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

      <div className="flex overflow-x-auto overflow-y-visible pt-4 pb-12 gap-6 lg:grid lg:grid-cols-4 lg:gap-10 lg:overflow-visible scrollbar-hide px-4 lg:px-2">
        {cards.map((card, i) => (
           <ZenStatCard key={i} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Analytics Overview */}
        <div className="lg:col-span-8 bg-white p-8 rounded-3xl border border-zen-stone/80 shadow-[0_8px_40px_rgb(0,0,0,0.03)] flex flex-col transition-all duration-300 zen-card-hover">

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

        {/* Daily Overview */}
        <div className="lg:col-span-4 bg-white p-8 rounded-3xl border border-zen-stone/80 shadow-[0_8px_40px_rgb(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-[0_15px_40px_rgb(0,0,0,0.06)] hover:border-zen-sand/30 transition-all duration-300">

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Recent Ceremonies */}
         <div className="lg:col-span-12 bg-white/80 backdrop-blur-3xl p-10 rounded-[2rem] border border-zen-stone/80 shadow-sm">

            <div className="flex items-center justify-between mb-10">
               <div>
                  <h3 className="text-2xl font-serif font-black text-gray-900 tracking-tight">Recent Rituals</h3>
                  <div className="w-12 h-1 bg-zen-gold/20 rounded-full mt-2"></div>
               </div>
               <ZenButton size="sm" variant="ghost" icon={ChevronRight}>View All Directory</ZenButton>
            </div>

            <div className="-mx-10 overflow-x-auto animate-in fade-in duration-700">
               <table className="w-full text-center border-collapse min-w-[1000px]">
                  <thead>
                    <tr>
                      <th>S No</th>
                      <th>Ritual Participant</th>
                      <th>Sanctuary Role</th>
                      <th>Service Scope</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!stats?.appointments?.recent || stats.appointments.recent.length === 0) ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center text-[11px] font-sans text-gray-400 bg-gray-50/30">
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
                             <div className="flex items-center justify-center">
                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                                   apt.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600' :
                                   apt.status === 'Cancelled' ? 'bg-red-500/10 text-red-600' : 'bg-zen-sand/10 text-zen-sand'
                                }`}>
                                   {apt.status}
                                </span>
                             </div>
                          </td>
                          <td>
                             <div className="flex items-center justify-center">
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
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  useEffect(() => {
    const fetchEmployeeStats = async (silent: boolean = false) => {
      try {
        if (!silent) setLoading(true);
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

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-zen-sand border-t-transparent rounded-full animate-spin"></div></div>;

  const cards = [
    { label: "Today's Rituals", value: (stats?.performance?.today || 0).toString(), icon: Calendar, color: 'text-zen-sand', bg: 'bg-zen-sand/10', glow: 'bg-zen-sand/20', trend: 'Sanctuary Load', delay: 0 },
    { label: 'Rituals Completed', value: (stats?.performance?.completed || 0).toString(), icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', trend: 'Mission Status', delay: 0.2 },
    { label: 'Est. Earnings', value: `QR ${stats?.performance?.earnings || 0}`, icon: Coins, color: 'text-orange-500', bg: 'bg-orange-500/10', glow: 'bg-orange-500/20', trend: 'Value Created', delay: 0.4 },
    { label: 'Zen Score', value: `${stats?.performance?.score || 0} pts`, icon: TrendingUp, color: 'text-zen-brown', bg: 'bg-zen-brown/[0.06]', glow: 'bg-zen-brown/10', trend: 'Harmony Metric', delay: 0.6 },
  ];

  return (
    <div className="space-y-12 pb-20">
      <div className="flex overflow-x-auto overflow-y-visible pt-4 pb-12 gap-6 lg:grid lg:grid-cols-4 lg:gap-10 lg:overflow-visible scrollbar-hide px-4 lg:px-2">
        {cards.map((card, i) => (
           <ZenStatCard key={i} {...card} />
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
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  useEffect(() => {
    const fetchClientStats = async (silent = false) => {
      try {
        if (!silent) setLoading(true);
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
  
  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-zen-sand border-t-transparent rounded-full animate-spin"></div></div>;

  const cards = [
    { label: 'Zen Affinity Points', value: `${stats?.loyalty?.points || 0} pts`, icon: Sparkles, color: 'text-yellow-500', bg: 'bg-yellow-500/10', glow: 'bg-yellow-500/20', trend: 'Loyalty Reward', delay: 0 },
    { label: 'Upcoming Ritual', value: stats?.nextAppointment ? stats.nextAppointment.date : 'Discovery', icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', trend: 'Next Sanctuary', delay: 0.2 },
    { label: 'Sanctuary Visits', value: (stats?.visits?.total || 0).toString(), icon: Users, color: 'text-zen-sand', bg: 'bg-zen-sand/10', glow: 'bg-zen-sand/20', trend: 'History Log', delay: 0.4 },
    { label: 'Loyalty Tier', value: stats?.loyalty?.tier || 'Silver', icon: TrendingUp, color: 'text-zen-brown', bg: 'bg-zen-brown/[0.06]', glow: 'bg-zen-brown/10', trend: 'Status Level', delay: 0.6 },
  ];

  return (
    <div className="space-y-12 pb-20">
      <div className="flex overflow-x-auto overflow-y-visible pt-4 pb-12 gap-6 lg:grid lg:grid-cols-4 lg:gap-10 lg:overflow-visible scrollbar-hide px-4 lg:px-2">
        {cards.map((card, i) => (
           <ZenStatCard key={i} {...card} />
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
