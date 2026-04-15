import React, { useMemo } from 'react';
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

  const cards = [
    { title: 'Total Revenue', value: `${settings?.general.currencySymbol || 'QR'} ${(stats?.revenue?.total || 0).toLocaleString()}`, trend: 'Global', icon: Coins, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { title: 'Today\'s Flow', value: `${settings?.general.currencySymbol || 'QR'} ${(stats?.revenue?.today || 0).toLocaleString()}`, trend: 'Live', icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-50' },
    { title: 'Active Clients', value: (stats?.clients?.total || 0).toLocaleString(), trend: 'Registry', icon: Users, color: 'text-sky-500', bg: 'bg-sky-50' },
    { title: 'Registry Health', value: `${stats?.attendance?.rate || 0}%`, trend: 'Presence', icon: Activity, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px]">
        <div className="w-12 h-12 border-4 border-zen-brown border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-6 text-[10px] font-black uppercase tracking-widest opacity-20">Synchronizing Sanctuary Metrics...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 sm:space-y-10 pb-20"
    >
      <div className="flex overflow-x-auto pt-0 pb-4 sm:pb-6 gap-4 sm:gap-6 lg:grid lg:grid-cols-4 lg:gap-8 lg:overflow-visible scrollbar-hide -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -18, zIndex: 50 }}
            className="flex-shrink-0 w-[240px] sm:w-[300px] lg:w-auto bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-zen-brown/15 shadow-[0_20px_50px_-15px_rgba(74,55,40,0.06)] group relative"
          >
            {/* Ambient Back Glow */}
            <div className={`absolute -right-10 -bottom-10 w-32 h-32 ${card.bg} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
            
            <div className="flex justify-between items-start mb-6 sm:mb-10 relative z-10">
              <div className={`p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] ${card.bg} ${card.color} group-hover:scale-110 transition-transform duration-700 shadow-sm border border-white`}>
                <card.icon size={22} className="sm:w-[26px] sm:h-[26px]" />
              </div>
              <div className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${card.color} ${card.bg} border border-white`}>
                {card.trend}
              </div>
            </div>
            
            <div className="relative z-10">
              <p className="text-[9px] sm:text-[10px] font-bold text-black/60 uppercase tracking-[0.4em] mb-2">{card.title}</p>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-black tracking-tighter">{card.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10">
        {/* Immersive Analytics Deck */}
        <div className="lg:col-span-8 bg-white p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[3.2rem] border border-zen-brown/15 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none hidden sm:block">
             <Activity size={180} className="text-zen-sand" />
          </div>
          
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 sm:mb-16 relative z-10">
             <div>
                <h3 className="text-2xl sm:text-3xl font-serif font-bold text-black tracking-tight">Sanctuary Analytics</h3>
                <p className="text-[9px] sm:text-[10px] font-bold text-black/40 uppercase tracking-[.4em] mt-2">Global Resonance & Flow</p>
             </div>
              <div className="flex gap-3 sm:gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-zen-sand/5 rounded-full border border-zen-sand/10">
                   <span className="text-[9px] font-bold text-black/70 uppercase tracking-widest">Revenue</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-500/5 rounded-full border border-emerald-500/10">
                   <span className="text-[9px] font-bold text-black/70 uppercase tracking-widest">Expenses</span>
                </div>
              </div>
          </header>

          <div className="h-[380px] w-full mt-4 relative z-10">
            <ResponsiveContainer width="100%" height="100%" minHeight={380}>
              <AreaChart data={stats?.revenue?.trend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="luminousRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4B996" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4B996" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="10 10" vertical={false} stroke="rgba(74,55,40,0.03)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#000000', opacity: 0.9, fontSize: 11, fontWeight: 700 }} 
                  dy={20}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#000000', opacity: 0.9, fontSize: 10, fontWeight: 700 }}
                  tickFormatter={(val) => `${settings?.general.currencySymbol || 'QR'} ${val >= 1000 ? val/1000 + 'k' : val}`}
                />
                <Tooltip
                  cursor={{ stroke: 'rgba(74,55,40,0.05)', strokeWidth: 2 }}
                  contentStyle={{ 
                    borderRadius: '2.5rem', 
                    border: '1px solid white', 
                    boxShadow: '0 30px 60px -15px rgba(74,55,40,0.1)', 
                    background: 'rgba(255,255,255,0.9)',
                    backdropBlur: 'xl',
                    padding: '20px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#D4B996" 
                  strokeWidth={5} 
                  fillOpacity={1} 
                  fill="url(#luminousRev)" 
                  animationDuration={2500}
                />
                <Area 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  strokeDasharray="8 8" 
                  fill="none" 
                  animationDuration={3000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vital Stats Dashboard */}
        <div className="lg:col-span-4 space-y-10">
          <section className="bg-zen-brown p-12 rounded-[3.2rem] text-white shadow-sm relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-125 transition-transform duration-1000">
                <Target size={150} />
             </div>
             
             <div className="relative z-10">
                <h3 className="text-2xl font-serif font-bold mb-10 tracking-tight">Vital Status</h3>
                
                <div className="space-y-6">
                   <div className="p-8 bg-white/5 backdrop-blur-md rounded-[2.2rem] border border-white/5 flex items-center justify-between hover:bg-white/10 transition-all duration-500">
                      <div className="flex items-center gap-6">
                         <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-amber-500">
                            <AlertTriangle size={24} />
                         </div>
                         <div>
                            <h4 className="font-serif text-xl font-bold">Low Material</h4>
                            <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mt-1">Requires Restock</p>
                         </div>
                      </div>
                      <span className="text-3xl font-serif font-black">{stats?.inventory?.lowStockCount || 0}</span>
                   </div>

                   <div className="p-8 bg-white/5 backdrop-blur-md rounded-[2.2rem] border border-white/5 flex items-center justify-between hover:bg-white/10 transition-all duration-500">
                      <div className="flex items-center gap-6">
                         <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-500">
                            <Calendar size={24} />
                         </div>
                         <div>
                            <h4 className="font-serif text-xl font-bold">Active Bookings</h4>
                            <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mt-1">Daily Sequence</p>
                         </div>
                      </div>
                      <span className="text-3xl font-serif font-black">{stats?.appointments?.activeCount || 0}</span>
                   </div>

                   <div className="p-8 bg-white/5 backdrop-blur-md rounded-[2.2rem] border border-white/5 flex items-center justify-between hover:bg-white/10 transition-all duration-500">
                      <div className="flex items-center gap-6">
                         <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-sky-500">
                            <TrendingUp size={24} />
                         </div>
                         <div>
                            <h4 className="font-serif text-xl font-bold">New Clients</h4>
                            <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mt-1">Today's Resonance</p>
                         </div>
                      </div>
                      <span className="text-3xl font-serif font-black">{stats?.clients?.newToday || 0}</span>
                   </div>
                </div>
             </div>
          </section>

        </div>
      </div>
    </motion.div>
  );
};

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const { appointments } = useData();
  
  const myAppointments = useMemo(() => 
    appointments.filter(a => a.employee === user?.name),
    [appointments, user]
  );

  const completedCount = myAppointments.filter(a => a.status === 'Completed').length;
  const pendingCount = myAppointments.filter(a => a.status !== 'Completed').length;

  const cards = [
    { title: "Today's Mandates", value: myAppointments.length.toString(), icon: Calendar, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { title: 'Concluded Sessions', value: completedCount.toString(), icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { title: 'Awaiting Rituals', value: pendingCount.toString(), icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
    { title: 'Resonance Points', value: '450 pts', icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-12 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-10 overflow-visible">
        {cards.map((card) => (
          <motion.div 
            key={card.title} 
            whileHover={{ y: -18, zIndex: 50 }}
            className="bg-white p-10 rounded-[3.5rem] border border-zen-brown/15 shadow-sm group transition-all duration-500 relative"
          >
            <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center mb-8 ${card.bg} ${card.color} group-hover:scale-110 transition-transform duration-700 shadow-sm border border-white`}>
              <card.icon size={26} />
            </div>
            <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-2">{card.title}</p>
            <h3 className="text-3xl font-serif font-bold text-black tracking-tighter">{card.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="bg-white p-12 rounded-[4rem] border border-zen-brown/15 shadow-sm">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h3 className="text-3xl font-serif font-bold text-black tracking-tight">Today's Sacred Schedule</h3>
            <p className="text-xs font-bold text-black/20 uppercase tracking-[0.4em] mt-2">Personalized Service Matrix</p>
          </div>
          <div className="px-6 py-2 bg-zen-sand/10 rounded-full border border-zen-sand/10">
             <span className="text-[10px] font-bold text-zen-sand uppercase tracking-widest">{user?.name}</span>
          </div>
        </div>
        
        <div className="space-y-6">
          {myAppointments.length > 0 ? (
            myAppointments.map((apt) => (
              <div key={apt._id || apt.id} className="flex items-center justify-between p-8 bg-white/50 rounded-[3rem] border border-transparent hover:border-zen-brown/15 hover:bg-white hover:shadow-sm hover:shadow-zen-brown/15 transition-all duration-700 group">
                <div className="flex items-center gap-10">
                  <div className="w-20 h-20 bg-zen-cream rounded-[2rem] flex flex-col items-center justify-center border border-white shadow-sm group-hover:bg-zen-brown group-hover:text-white transition-all duration-700">
                    <span className="text-[10px] font-bold uppercase opacity-30 tracking-widest mb-1">Ritual</span>
                    <span className="text-lg font-bold">{apt.time?.split(' ')[0]}</span>
                  </div>
                  <div>
                    <h4 className="text-2xl font-serif font-bold text-zen-brown mb-1">{apt.client}</h4>
                    <p className="text-xs font-bold text-zen-brown/30 uppercase tracking-[0.2em] flex items-center gap-2">
                       {apt.service} <span className="text-zen-brown/20 mx-1">|</span> Room {apt.room}
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
              <p className="text-2xl font-serif text-zen-brown/20 italic tracking-tight">No sacred appointments assigned to your presence today.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ManagerDashboard = () => {
  const { settings } = useSettings();
  const { appointments, rooms, employees } = useData();
  const freeRooms = rooms.filter(r => r.status === 'Free').length;
  const activeStaff = employees.length;

  const cards = [
    { title: "Today's Bookings", value: appointments.length.toString(), icon: Calendar, color: 'text-sky-500', bg: 'bg-sky-50' },
    { title: 'Room Availability', value: `${freeRooms} / ${rooms.length}`, icon: Bed, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { title: 'Active Collective', value: activeStaff.toString(), icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { title: 'Pending Settlement', value: `${settings?.general.currencySymbol || 'QR'} 0`, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-10 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {cards.map((card) => (
          <div key={card.title} className="bg-white p-10 rounded-[3.5rem] border border-zen-brown/15 shadow-sm group transition-all duration-500">
            <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center mb-8 ${card.bg} ${card.color} group-hover:scale-110 transition-transform duration-700 shadow-sm border border-white`}>
              <card.icon size={26} />
            </div>
            <p className="text-[10px] font-bold text-black/20 uppercase tracking-widest mb-2">{card.title}</p>
            <h3 className="text-3xl font-serif font-bold text-black tracking-tighter">{card.value}</h3>
          </div>
        ))}
      </div>
    </div>
  );
};

const ClientDashboard = () => {
  const { user } = useAuth();
  const { appointments } = useData();
  const navigate = useNavigate();
  
  const myAppointments = useMemo(() => 
    appointments.filter(a => a.client === user?.name),
    [appointments, user]
  );

  const upcomingApt = myAppointments.find(a => a.status === 'Booked' || a.status === 'In Service');

  const cards = [
    { title: 'Resonance Points', value: '1,250 pts', icon: Sparkles, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { title: 'Next Sanctuary Ritual', value: upcomingApt ? upcomingApt.time?.split(' ')[0] : 'None', icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { title: 'Total Visits', value: myAppointments.length.toString(), icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { title: 'Wellness Status', value: 'Platinum', icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-12 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-10 overflow-visible">
        {cards.map((card) => (
          <motion.div 
            key={card.title} 
            whileHover={{ y: -18, zIndex: 50 }}
            className="bg-white p-10 rounded-[3.5rem] border border-zen-brown/15 shadow-sm group transition-all duration-500 relative"
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
        <div className="lg:col-span-8 bg-white/60 backdrop-blur-xl rounded-[4rem] p-12 border border-white shadow-sm">
          <header className="mb-12">
            <h3 className="text-3xl font-serif font-bold text-black tracking-tight">Your Relaxation Journey</h3>
            <p className="text-xs font-bold text-black/20 uppercase tracking-[0.4em] mt-2">Personalized Sanctuary History</p>
          </header>
          
          <div className="space-y-6">
            {myAppointments.length > 0 ? (
              myAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-8 bg-white/40 rounded-[3.5rem] border border-transparent hover:border-zen-brown/15 hover:bg-white hover:shadow-sm transition-all duration-700 group">
                  <div className="flex items-center gap-8">
                    <div className="w-16 h-16 bg-zen-cream rounded-[2rem] flex items-center justify-center border border-white text-zen-sand group-hover:bg-zen-sand group-hover:text-white transition-all duration-700">
                      <Calendar size={28} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-serif font-bold text-zen-brown">{apt.service}</h4>
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
                <p className="text-2xl font-serif text-zen-brown/20 italic tracking-tight">You haven't booked any sessions yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-zen-sand/90 backdrop-blur-xl p-12 rounded-[4.5rem] text-white shadow-sm shadow-zen-sand/20 relative overflow-hidden group h-full flex flex-col justify-between">
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
              className="relative z-10 w-full py-5 bg-white text-zen-sand rounded-[2rem] font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/5"
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
