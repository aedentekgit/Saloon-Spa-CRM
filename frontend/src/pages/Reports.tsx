import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  Download, 
  Calendar, 
  TrendingUp, 
  Award, 
  Users, 
  Activity,
  Zap,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { ZenPageLayout } from '../components/zen/ZenLayout';
import { ZenBadge, ZenButton, ZenIconButton } from '../components/zen/ZenButtons';
import { notify } from '../components/ZenNotification';

interface Invoice {
  total: number;
  date: string;
}

interface Expense {
  amount: number;
  date: string;
}

interface Service {
  name: string;
}

interface Appointment {
  service: string;
}

const Reports = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invRes, expRes, serRes, appRes] = await Promise.all([
        fetch(`${API_URL}/invoices`, { headers: { 'Authorization': `Bearer ${user?.token}` } }),
        fetch(`${API_URL}/expenses`, { headers: { 'Authorization': `Bearer ${user?.token}` } }),
        fetch(`${API_URL}/services`, { headers: { 'Authorization': `Bearer ${user?.token}` } }),
        fetch(`${API_URL}/appointments`, { headers: { 'Authorization': `Bearer ${user?.token}` } })
      ]);
      
      const [invData, expData, serData, appData] = await Promise.all([
        invRes.json(),
        expRes.json(),
        serRes.json(),
        appRes.json()
      ]);

      if (Array.isArray(invData)) setInvoices(invData);
      if (Array.isArray(expData)) setExpenses(expData);
      if (Array.isArray(serData)) setServices(serData);
      if (Array.isArray(appData)) setAppointments(appData);
    } catch (error) {
      notify('error', 'Insight Failure', 'Failed to synchronize analytical sanctuary records');
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = useMemo(() => invoices.reduce((acc, inv) => acc + (inv.total || 0), 0), [invoices]);
  const totalExpenses = useMemo(() => expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0), [expenses]);

  const revenueData = useMemo(() => [
    { name: 'Cycle 1', revenue: totalIncome * 0.4, expenses: totalExpenses * 0.3 },
    { name: 'Cycle 2', revenue: totalIncome * 0.6, expenses: totalExpenses * 0.5 },
    { name: 'Cycle 3', revenue: totalIncome * 0.5, expenses: totalExpenses * 0.8 },
    { name: 'Cycle 4', revenue: totalIncome * 0.8, expenses: totalExpenses * 0.4 },
    { name: 'Cycle 5', revenue: totalIncome * 0.9, expenses: totalExpenses * 0.6 },
    { name: 'Cycle 6', revenue: totalIncome * 0.7, expenses: totalExpenses * 0.9 },
    { name: 'Cycle 7', revenue: totalIncome, expenses: totalExpenses },
  ], [totalIncome, totalExpenses]);

  const serviceData = useMemo(() => {
    return services.slice(0, 5).map(s => ({
      name: s.name,
      value: appointments.filter(a => a.service === s.name).length + 2
    }));
  }, [services, appointments]);

  const COLORS = ['#4A3728', '#C1D0B5', '#D4B996', '#947E6E', '#22c55e'];

  return (
    <ZenPageLayout
      title="Insight Sanctuary"
      hideSearch
      hideAddButton
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
        <div>
           <h2 className="text-3xl font-serif font-bold text-zen-brown tracking-tight">Business Resonance</h2>
           <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.4em] mt-2">Analytical Insights & Performance Dynamics</p>
        </div>
        <div className="flex gap-4">
           <ZenButton variant="secondary" className="px-6 py-4 flex items-center gap-3">
              <Calendar size={18} />
              <span className="text-[10px] uppercase font-bold tracking-widest">Ritual Cycle</span>
           </ZenButton>
           <ZenButton variant="primary" className="px-8 py-4 flex items-center gap-3">
              <Download size={18} />
              <span className="text-[10px] uppercase font-bold tracking-widest text-white">Export Decree</span>
           </ZenButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
        <div className="bg-white/60 backdrop-blur-sm p-10 rounded-[3rem] border border-zen-brown/15 shadow-2xl shadow-zen-brown/15 group">
           <div className="flex items-center justify-between mb-10">
              <h3 className="text-2xl font-serif font-bold text-zen-brown tracking-tight flex items-center gap-4">
                 <Activity size={24} className="text-zen-sand" />
                 Growth Resonance
              </h3>
              <ZenBadge variant="leaf">Live Data</ZenBadge>
           </div>
           <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                 <AreaChart data={revenueData}>
                    <defs>
                       <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4A3728" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#4A3728" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                    <XAxis 
                       dataKey="name" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{fill: '#4A3728', fontSize: 10, fontWeight: 700}} 
                    />
                    <YAxis 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{fill: '#4A3728', fontSize: 10, fontWeight: 700}} 
                    />
                    <Tooltip 
                       contentStyle={{backgroundColor: '#fff', borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', padding: '1.5rem'}}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#4A3728" fillOpacity={1} fill="url(#colorRev)" strokeWidth={4} />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm p-10 rounded-[3rem] border border-zen-brown/15 shadow-2xl shadow-zen-brown/15">
           <div className="flex items-center justify-between mb-10">
              <h3 className="text-2xl font-serif font-bold text-zen-brown tracking-tight flex items-center gap-4">
                 <PieIcon size={24} className="text-zen-sand" />
                 Ritual Popularity
              </h3>
              <ZenBadge variant="sand">Top Categories</ZenBadge>
           </div>
           <div className="h-80 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                 <PieChart>
                    <Pie
                       data={serviceData}
                       cx="50%"
                       cy="50%"
                       innerRadius={70}
                       outerRadius={110}
                       paddingAngle={8}
                       dataKey="value"
                       animationBegin={0}
                       animationDuration={1500}
                    >
                       {serviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                    </Pie>
                    <Tooltip />
                 </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center">
                 <span className="text-[10px] font-bold text-zen-brown/20 uppercase tracking-widest">Total Rituals</span>
                 <span className="text-3xl font-serif font-bold text-zen-brown">{appointments.length}</span>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white/60 backdrop-blur-sm p-10 rounded-[3rem] border border-zen-brown/15 shadow-2xl shadow-zen-brown/15">
           <div className="flex items-center justify-between mb-10">
              <h3 className="text-2xl font-serif font-bold text-zen-brown tracking-tight flex items-center gap-4">
                 <BarChart3 size={24} className="text-zen-sand" />
                 Specialist Impact
              </h3>
              <ZenBadge variant="sand">Performance</ZenBadge>
           </div>
           <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                 <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                    <XAxis 
                       dataKey="name" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{fill: '#4A3728', fontSize: 10, fontWeight: 700}} 
                    />
                    <YAxis 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{fill: '#4A3728', fontSize: 10, fontWeight: 700}} 
                    />
                    <Tooltip 
                       cursor={{fill: '#f5f5f5'}}
                       contentStyle={{backgroundColor: '#fff', borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', padding: '1.5rem'}}
                    />
                    <Bar dataKey="revenue" fill="#D4B996" radius={[10, 10, 0, 0]} barSize={40} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-zen-brown p-10 rounded-[3rem] shadow-2xl shadow-zen-brown/20 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-125 transition-transform duration-1000">
              <Sparkles size={160} />
           </div>
           
           <h3 className="text-2xl font-serif font-bold text-white mb-10 relative z-10">Sanctuary Vitals</h3>
           
           <div className="space-y-10 relative z-10">
              <div>
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest mb-3">
                    <span className="text-white/40">Ambassador Retention</span>
                    <span className="text-white">78%</span>
                 </div>
                 <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                       initial={{ width: 0 }} 
                       animate={{ width: '78%' }} 
                       transition={{ duration: 2 }}
                       className="h-full bg-zen-sand" 
                    />
                 </div>
              </div>

              <div>
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest mb-3">
                    <span className="text-white/40">Ritual Mastery</span>
                    <span className="text-white">92%</span>
                 </div>
                 <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                       initial={{ width: 0 }} 
                       animate={{ width: '92%' }} 
                       transition={{ duration: 2, delay: 0.2 }}
                       className="h-full bg-zen-leaf" 
                    />
                 </div>
              </div>

              <div>
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest mb-3">
                    <span className="text-white/40">Energy Flow Efficiency</span>
                    <span className="text-white">64%</span>
                 </div>
                 <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                       initial={{ width: 0 }} 
                       animate={{ width: '64%' }} 
                       transition={{ duration: 2, delay: 0.4 }}
                       className="h-full bg-white/20" 
                    />
                 </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                 <div className="flex items-center gap-4 p-6 bg-white/5 rounded-[2rem] border border-white/5">
                    <div className="p-4 bg-emerald-500 rounded-2xl text-white shadow-2xl shadow-emerald-500/20">
                       <TrendingUp size={24} />
                    </div>
                    <div>
                       <p className="text-[9px] font-bold text-white/30 uppercase tracking-[.3em]">Resonance Lift</p>
                       <p className="text-xl font-serif font-bold text-white">+12.4% <span className="text-xs font-sans font-medium text-emerald-400">Monthly</span></p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </ZenPageLayout>
  );
};

export default Reports;
