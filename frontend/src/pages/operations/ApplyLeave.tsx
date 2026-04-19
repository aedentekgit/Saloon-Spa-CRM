import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { 
  CalendarDays, Sparkles, Info, ArrowLeft, Sun, User as UserIcon, Tag, AlertCircle, Calendar, Clock 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ZenButton } from '../../components/zen/ZenButtons';
import { ZenInput, ZenDropdown, ZenTextarea } from '../../components/zen/ZenInputs';
import { notify } from '../../components/shared/ZenNotification';
import { useBranches } from '../../context/BranchContext';

const ApplyLeave = () => {
  const { user } = useAuth();
  const { selectedBranch } = useBranches();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    employeeName: '',
    type: 'Full Day',
    reason: '',
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    daysCount: 1
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    if (user?.role === 'Admin' || user?.role === 'Manager') {
      fetchEmployees();
    } else {
        setFormData(prev => ({ ...prev, employeeName: user?.name || '' }));
    }
  }, [user]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_URL}/employees`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setEmployees(data.filter((e: any) => e.status === 'Active'));
      }
    } catch (error) {
      console.error('Failed to fetch employees');
    }
  };

  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = dayjs(formData.startDate);
      const end = dayjs(formData.endDate);
      const count = end.diff(start, 'day') + 1;
      setFormData(prev => ({ ...prev, daysCount: count > 0 ? count : 1 }));
    }
  }, [formData.startDate, formData.endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.daysCount < 1) {
      notify('error', 'Invalid Range', 'End date must be after or on start date');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        employeeName: (user?.role === 'Admin' || user?.role === 'Manager') ? formData.employeeName : user?.name
      };

      const response = await fetch(`${API_URL}/leaves`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        notify('success', 'Application Dispatched', 'Your retreat request has been logged successfully.');
        navigate('/leave');
      } else {
        const err = await response.json();
        notify('error', 'Submission Failed', err.message || 'Something went wrong');
      }
    } catch (error) {
      notify('error', 'Error', 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-[#F9FAFB] p-4 sm:p-10 pb-32">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
            <div>
                <button 
                  onClick={() => navigate('/leave')}
                  className="flex items-center gap-2 text-zen-brown/40 hover:text-zen-brown transition-colors mb-4 group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Back to History</span>
                </button>
                <h1 className="text-3xl sm:text-4xl font-serif font-black text-zen-brown tracking-tight">Request Presence Pause</h1>
                <p className="text-xs text-zen-brown/40 font-medium mt-2">Harmonize your energy by scheduling a purposeful retreat.</p>
            </div>
            
            <div className="hidden sm:flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-zen-brown/5 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-zen-sand/10 flex items-center justify-center text-zen-sand">
                    <CalendarDays size={20} />
                </div>
                <div>
                    <p className="text-[9px] font-black text-zen-brown/30 uppercase tracking-widest">Annual Balance</p>
                    <p className="text-sm font-serif font-black text-zen-brown">14 Solar Cycles</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Form Side */}
            <div className="lg:col-span-2 space-y-8">
                <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] p-8 sm:p-12 border border-zen-brown/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden">
                    {/* Decorative element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-zen-sand/5 to-transparent rounded-bl-full pointer-events-none" />

                    <div className="space-y-10 relative z-10">
                        {/* Selector Section */}
                        <div className="space-y-8">
                            {(user?.role === 'Admin' || user?.role === 'Manager') ? (
                                <ZenDropdown
                                    label="Ambassador Selection"
                                    value={formData.employeeName}
                                    icon={UserIcon}
                                    variant="pill"
                                    onChange={val => setFormData({...formData, employeeName: val})}
                                    placeholder="Select an Ambassador"
                                    options={employees.map(e => e.name)}
                                />
                            ) : (
                                <div className="p-6 bg-zen-cream/30 rounded-2xl border border-zen-brown/5 flex justify-between items-center group hover:bg-white transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white border border-zen-brown/5 flex items-center justify-center text-zen-brown/30 group-hover:text-zen-brown transition-colors">
                                            <UserIcon size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-zen-brown/40 uppercase tracking-widest">Declaring For</p>
                                            <p className="text-base font-serif font-black text-zen-brown">{user?.name}</p>
                                        </div>
                                    </div>
                                    <Sparkles size={16} className="text-zen-sand/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )}

                            <ZenDropdown
                                label="Nature of Retreat"
                                value={formData.type}
                                icon={Tag}
                                variant="pill"
                                onChange={val => setFormData({...formData, type: val})}
                                options={['Full Day', 'Half Day', 'Annual Leave', 'Sick Leave', 'Casual Leave', 'Emergency Leave']}
                            />
                        </div>

                        {/* Date Range Section */}
                        <div className="p-8 bg-zen-cream/10 rounded-[2rem] border border-zen-brown/5">
                            <h3 className="text-[10px] font-black text-zen-brown/20 uppercase tracking-[0.3em] mb-8 text-center px-4">Retreat Duration</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                                <ZenInput
                                    type="date"
                                    label="Commencement Date"
                                    icon={Calendar}
                                    required
                                    value={formData.startDate}
                                    onChange={(e: any) => setFormData({...formData, startDate: e.target.value})}
                                />
                                <ZenInput
                                    type="date"
                                    label="Conclusion Date"
                                    icon={Clock}
                                    required
                                    value={formData.endDate}
                                    onChange={(e: any) => setFormData({...formData, endDate: e.target.value})}
                                />
                            </div>

                            <div className="mt-10 pt-8 border-t border-zen-brown/5 flex items-center justify-center gap-6">
                                <div className="flex items-center gap-2 text-zen-brown/20">
                                    <Sun size={14} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Total Cycles</span>
                                </div>
                                <div className="h-4 w-px bg-zen-brown/10" />
                                <div className="flex items-center gap-2">
                                    <span className="text-3xl font-serif font-black text-zen-brown">{formData.daysCount}</span>
                                    <span className="text-[10px] font-black text-zen-sand uppercase tracking-widest">{formData.daysCount === 1 ? 'Solar Cycle' : 'Solar Cycles'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Reason Section */}
                        <ZenTextarea
                            label="Purpose of Pause"
                            required
                            placeholder="Share the nature of your retreat with the sanctuary context..."
                            value={formData.reason}
                            onChange={(e: any) => setFormData({...formData, reason: e.target.value})}
                        />

                        {/* Submit Section */}
                        <div className="pt-6">
                            <ZenButton 
                                type="submit" 
                                disabled={loading}
                                className="w-full py-6 rounded-[1.5rem] shadow-xl group overflow-hidden relative"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3 text-sm tracking-[0.2em]">
                                    {loading ? 'Dispersing...' : 'Dispatch Application'}
                                    {!loading && <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />}
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                            </ZenButton>
                            <p className="text-center mt-6 text-[10px] font-medium text-zen-brown/30 italic">
                                Your request will be synchronized with the sanctuary's presence registry for review.
                            </p>
                        </div>
                    </div>
                </form>
            </div>

            {/* Info Side */}
            <div className="space-y-8">
                <div className="bg-zen-brown p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-125 transition-transform duration-1000">
                        <CalendarDays size={120} />
                    </div>
                    <p className="text-[9px] font-bold opacity-30 uppercase tracking-[0.4em] mb-6">Zen Protocol</p>
                    <h4 className="text-xl font-serif font-black mb-4 leading-tight tracking-tight text-zen-cream">Before You Retreat</h4>
                    <ul className="space-y-5">
                       {[
                         "Ensure all pending sanctuary rituals are delegated.",
                         "Verify your duration fits your solar cycle balance.",
                         "Communicate with your branch manager for urgent drifts.",
                         "Rest deeply to return with higher resonance."
                       ].map((item, i) => (
                         <li key={i} className="flex gap-4 items-start group/item">
                           <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-serif font-black shrink-0 group-hover/item:bg-zen-sand transition-colors">
                             {i + 1}
                           </div>
                           <p className="text-xs opacity-60 font-medium leading-relaxed">{item}</p>
                         </li>
                       ))}
                    </ul>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-zen-brown/10 group hover:translate-y-[-4px] transition-all duration-500">
                    <div className="flex gap-4 items-start mb-6">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                            <AlertCircle size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-serif font-black text-zen-brown">Registry Alert</h4>
                            <p className="text-[10px] text-zen-brown/40 font-bold uppercase tracking-widest mt-0.5">Extended Retreats</p>
                        </div>
                    </div>
                    <p className="text-xs text-zen-brown/60 leading-relaxed font-medium">
                        Retreats exceeding 3 solar cycles may require physical documentation (e.g., medical scrolls) upon return to the sanctuary.
                    </p>
                </div>

                <div className="bg-zen-sand/5 p-8 rounded-[2rem] border border-zen-sand/10 flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-zen-sand shadow-sm">
                        <Info size={18} />
                    </div>
                    <p className="text-[11px] text-zen-brown/50 font-medium leading-relaxed italic">
                        "A pause is not an end, but a preparation for a new beginning."
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ApplyLeave;
