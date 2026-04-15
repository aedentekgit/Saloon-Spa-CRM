import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Crown, 
  Clock, 
  Hash, 
  CreditCard, 
  Calendar, 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  BarChart3,
  ShieldCheck,
  History,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { notify } from '../components/ZenNotification';

// Zen Components
import { ZenPageLayout } from '../components/zen/ZenLayout';
import { ZenPagination } from '../components/zen/ZenPagination';
import { ZenButton, ZenIconButton, ZenBadge } from '../components/zen/ZenButtons';
import { ZenInput, ZenDropdown, ZenTextarea, ZenDatePicker } from '../components/zen/ZenInputs';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100/api';

const Memberships = () => {
    const { user } = useAuth();
    const [memberships, setMemberships] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'registry' | 'plans'>('registry');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
        return (localStorage.getItem('zen_membership_view') as 'grid' | 'table') || 'table';
    });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modals
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedHistory, setSelectedHistory] = useState<any>(null);
    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [editingEnrollmentId, setEditingEnrollmentId] = useState<string | null>(null);
    
    // Confirm Dialog State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type?: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        type: 'danger'
    });

    // Form States
    const [planFormData, setPlanFormData] = useState({
       name: '',
       price: 0,
       durationDays: 30,
       maxSessions: 0,
       applicableServices: [] as string[],
       description: '',
       branches: [] as string[],
       isActive: true,
       isUnlimited: false
    });

    const [enrollData, setEnrollData] = useState({
       clientId: '',
       planId: '',
       branchId: '',
       startDate: new Date().toISOString().split('T')[0],
       status: 'Active'
    });

    const [redeemData, setRedeemData] = useState({
       membershipId: '',
       serviceId: '',
       notes: ''
    });

    const [activeMembershipForRedeem, setActiveMembershipForRedeem] = useState<any>(null);

    useEffect(() => {
       localStorage.setItem('zen_membership_view', viewMode);
    }, [viewMode]);

    const fetchData = async () => {
       setIsLoading(true);
       try {
          const headers = { 'Authorization': `Bearer ${user?.token}` };
          const [plansRes, enrollRes, servicesRes, branchRes, clientsRes, statsRes] = await Promise.all([
             fetch(`${API_URL}/memberships/plans`, { headers }),
             fetch(`${API_URL}/memberships/client/all?page=${page}&limit=10`, { headers }),
             fetch(`${API_URL}/services`, { headers }),
             fetch(`${API_URL}/branches`, { headers }),
             fetch(`${API_URL}/clients`, { headers }),
             fetch(`${API_URL}/memberships/stats`, { headers })
          ]);

          const [plansData, membershipsData, servicesData, branchesData, clientsData, statsData] = await Promise.all([
             plansRes.json(),
             enrollRes.json(),
             servicesRes.json(),
             branchRes.json(),
             clientsRes.json(),
             statsRes.json()
          ]);

          setPlans(Array.isArray(plansData) ? plansData : (plansData?.data || []));
          setMemberships(Array.isArray(membershipsData) ? membershipsData : (membershipsData?.data || []));
          setTotalPages(membershipsData?.pagination?.pages || 1);
          setServices(Array.isArray(servicesData) ? servicesData : (servicesData?.data || []));
          setBranches(Array.isArray(branchesData) ? branchesData : (branchesData?.data ?? branchesData?.branches ?? []));
          setClients(Array.isArray(clientsData) ? clientsData : (clientsData?.data || []));
          setStats(statsData?.data || statsData);
       } catch (error) {
          console.error('Error fetching sanctuary data:', error);
          notify('error', 'Sync Failure', 'Failed to retrieve sanctuary records');
       } finally {
          setIsLoading(false);
       }
    };

    useEffect(() => {
       fetchData();
    }, [page]);

    const handleCreatePlan = async (e: React.FormEvent) => {
       e.preventDefault();
       try {
          const url = editingPlan 
             ? `${API_URL}/memberships/plans/${editingPlan._id}` 
             : `${API_URL}/memberships/plans`;
          
          const method = editingPlan ? 'PUT' : 'POST';
          
          const response = await fetch(url, {
             method,
             headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user?.token}` 
             },
             body: JSON.stringify({
                ...planFormData,
                durationDays: planFormData.isUnlimited ? 36500 : planFormData.durationDays
             })
          });

          if (response.ok) {
             setIsPlanModalOpen(false);
             setEditingPlan(null);
             fetchData();
             notify('success', 'Tier Manifested', 'Sacred tier successfully synchronized');
          }
       } catch (error) {
          console.error('Error saving plan:', error);
          notify('error', 'Creation Error', 'Failed to manifest new tier');
       }
    };

    const handleEnroll = async (e: React.FormEvent) => {
       e.preventDefault();
       try {
          const url = editingEnrollmentId 
             ? `${API_URL}/memberships/${editingEnrollmentId}`
             : `${API_URL}/memberships/enroll`;
          
          const method = editingEnrollmentId ? 'PUT' : 'POST';

          const response = await fetch(url, {
             method,
             headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user?.token}`
             },
             body: JSON.stringify(enrollData)
          });

          if (response.ok) {
             setIsEnrollModalOpen(false);
             setEditingEnrollmentId(null);
             fetchData();
             notify('success', editingEnrollmentId ? 'Enrollment Refined' : 'Enrollment Complete', 'Sanctuary records updated successfully');
          }
       } catch (error) {
          console.error('Error enrolling client:', error);
          notify('error', 'Enrollment Failed', 'Failed to initiate membership');
       }
    };

    const handleRedeemClick = (membership: any) => {
       setActiveMembershipForRedeem(membership);
       setRedeemData({
          membershipId: membership._id,
          serviceId: '',
          notes: ''
       });
       setIsRedeemModalOpen(true);
    };

    const handleRedeem = async (e: React.FormEvent) => {
       e.preventDefault();
       try {
          const response = await fetch(`${API_URL}/memberships/${redeemData.membershipId}/redeem`, {
             method: 'POST',
             headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user?.token}`
             },
             body: JSON.stringify(redeemData)
          });

          if (response.ok) {
             setIsRedeemModalOpen(false);
             fetchData();
             notify('success', 'Essence Redeemed', 'Ritual session recorded successfully');
          }
       } catch (error) {
          console.error('Error redeeming session:', error);
          notify('error', 'Redemption Error', 'Failed to record ritual usage');
       }
    };

    const deleteMembershipConfirmed = async (id: string) => {
       try {
          const response = await fetch(`${API_URL}/memberships/${id}`, { 
             method: 'DELETE',
             headers: { 'Authorization': `Bearer ${user?.token}` }
          });
          if (response.ok) {
             fetchData();
             notify('success', 'Registry Cleaned', 'Membership record removed');
          } else {
             throw new Error('Failed to delete');
          }
       } catch (error) {
          console.error('Error deleting membership:', error);
          notify('error', 'Deletion Failed', 'Failed to remove membership');
       }
    };

    const deletePlanConfirmed = async (id: string) => {
       try {
          const response = await fetch(`${API_URL}/memberships/plans/${id}`, { 
             method: 'DELETE',
             headers: { 'Authorization': `Bearer ${user?.token}` }
          });
          if (response.ok) {
             fetchData();
             notify('success', 'Tier Retired', 'Sacred tier has been deactivated');
          } else {
             throw new Error('Failed to delete plan');
          }
       } catch (error) {
          console.error('Error deleting plan:', error);
          notify('error', 'Retirement Failed', 'Failed to retire tier');
       }
    };

    const handleDeleteMembership = (id: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Delete Membership',
            message: 'Are you sure you want to remove this client from the membership sanctuary? This action cannot be undone.',
            onConfirm: () => deleteMembershipConfirmed(id),
            type: 'danger'
        });
    };

    const handleDeletePlan = (id: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Retire Tier',
            message: 'Are you sure you want to retire this sacred tier? Existing members will retain their benefits, but no new enrollments will be possible.',
            onConfirm: () => deletePlanConfirmed(id),
            type: 'warning'
        });
    };

    const getStatusColor = (status: string) => {
       switch (status) {
          case 'Active': return 'bg-zen-leaf/10 text-zen-leaf border-zen-leaf/20 shadow-[0_0_15px_rgba(74,103,32,0.1)]';
          case 'Expired': return 'bg-zen-brown/10 text-zen-brown/40 border-zen-brown/25';
          default: return 'bg-gray-100 text-gray-400 border-gray-200';
       }
    };

    const toggleService = (serviceId: string) => {
       const current = [...planFormData.applicableServices];
       const index = current.indexOf(serviceId);
       if (index > -1) {
          setPlanFormData({ ...planFormData, applicableServices: current.filter(id => id !== serviceId) });
       } else {
          setPlanFormData({ ...planFormData, applicableServices: [...current, serviceId] });
       }
    };

    const filteredMemberships = memberships.filter(m => 
       m.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       m.client?.phone?.includes(searchTerm)
    );

    return (
    <ZenPageLayout 
      title="Membership Sanctuary" 
      addButtonLabel="New Enrollment"
      addButtonIcon={<Crown size={18} />}
      onAddClick={() => {
         setEditingEnrollmentId(null);
         setEnrollData({
            clientId: '',
            planId: '',
            branchId: '',
            startDate: new Date().toISOString().split('T')[0],
            status: 'Active'
         });
         setIsEnrollModalOpen(true);
      }}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    >
      {/* Tabs Header */}
      <div className="flex items-center gap-8 mb-8 border-b border-zen-brown/15 px-2">
         {[
           { id: 'registry', label: 'Memberships', icon: Users },
           { id: 'plans', label: 'Tier Management', icon: Crown }
         ].map((tab) => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id as any)}
             className={`py-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] relative transition-all duration-500 ${activeTab === tab.id ? 'text-zen-brown' : 'text-zen-brown/30 hover:text-zen-brown/60'}`}
           >
             <tab.icon size={16} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
             {tab.label}
             {activeTab === tab.id && (
               <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zen-brown shadow-[0_-2px_8px_rgba(0,0,0,0.1)]" />
             )}
           </button>
         ))}
      </div>

      <AnimatePresence mode="wait">
         <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
         >
            {activeTab === 'plans' && (
              <div className="space-y-10">
                 <div className="flex items-center justify-between px-2">
                    <div>
                       <h3 className="text-xl font-serif font-bold text-zen-brown">Divine Tier Configuration</h3>
                       <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest mt-1">Strategic Blueprint for Membership Structures</p>
                    </div>
                    <ZenButton onClick={() => { 
                      setEditingPlan(null); 
                      setPlanFormData({ name: '', price: 0, durationDays: 30, maxSessions: 0, applicableServices: [], description: '', branches: [], isActive: true, isUnlimited: false }); 
                      setIsPlanModalOpen(true); 
                    }} variant="secondary" type="button">Establish New Tier</ZenButton>
                 </div>
                 
                 {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                     {plans.map((plan) => (
                        <div key={plan._id} className="group relative bg-white/80 backdrop-blur-xl rounded-[3.5rem] p-8 shadow-2xl shadow-zen-brown/15 border border-white transition-all duration-700 hover:shadow-zen-brown/15 hover:-translate-y-2 h-full flex flex-col justify-between overflow-hidden">
                           {/* Sanctuary Background Glow */}
                           <div className="absolute top-0 right-0 w-32 h-32 bg-zen-sand/5 rounded-bl-full -z-0 pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>
                           
                           <div className="absolute -bottom-4 -right-4 text-zen-sand opacity-[0.03] group-hover:opacity-[0.07] transition-all duration-700 pointer-events-none">
                              <Crown size={150} />
                           </div>

                           <div className="relative z-10 flex flex-col h-full justify-between">
                              <div>
                                 <div className="flex items-center justify-between mb-8">
                                    <div className="w-16 h-16 rounded-[1.80rem] bg-zen-sand/10 text-zen-sand flex items-center justify-center group-hover:scale-110 transition-transform duration-700 shadow-xl border border-white/80">
                                       <Crown size={28} strokeWidth={1.5} />
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                       <ZenBadge variant={plan.isActive ? 'sand' : 'default'}>
                                          {plan.isActive ? 'Active' : 'Retired'}
                                       </ZenBadge>
                                       <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all lg:translate-x-4 lg:group-hover:translate-x-0 duration-500">
                                          <ZenIconButton icon={Edit3} onClick={() => {
                                             setEditingPlan(plan);
                                             setPlanFormData({
                                               ...plan as any,
                                               isUnlimited: plan.durationDays >= 36500
                                             });
                                             setIsPlanModalOpen(true);
                                          }} />
                                          <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDeletePlan(plan._id)} />
                                       </div>
                                    </div>
                                 </div>
                                 
                                 <h4 className="text-2xl font-serif font-black text-zen-brown mb-2 group-hover:text-zen-sand transition-colors duration-500">{plan.name}</h4>
                                 <div className="flex items-baseline gap-2 mb-6">
                                    <span className="text-4xl font-black tracking-tighter text-zen-brown">QR {plan.price}</span>
                                    <span className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[0.2em]">Asset Investment</span>
                                 </div>

                                 {/* Applicable Services List */}
                                 <div className="mb-8">
                                    <p className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[0.3em] mb-3 px-1">Covered Rituals</p>
                                    <div className="flex flex-wrap gap-1.5">
                                       {(plan.applicableServices || []).slice(0, 3).map((s: any) => (
                                          <span key={s._id} className="px-2 py-1 bg-zen-brown/5 rounded-lg text-[8px] text-zen-brown/60 font-bold border border-zen-brown/15 shadow-sm">
                                             {s.name}
                                          </span>
                                       ))}
                                       {(plan.applicableServices || []).length > 3 && (
                                          <span className="px-2 py-1 bg-zen-sand/10 rounded-lg text-[8px] text-zen-sand font-bold border border-zen-sand/10">
                                             +{(plan.applicableServices || []).length - 3} More
                                          </span>
                                       )}
                                       {(plan.applicableServices || []).length === 0 && (
                                          <span className="text-[8px] text-zen-brown/20 italic font-serif">Universal Sanctuary Coverage</span>
                                       )}
                                    </div>
                                 </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-6 pt-8 border-t border-zen-brown/15 relative z-10">
                                 <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-black text-zen-brown/20 uppercase tracking-[0.3em]">Ritual Sequence</span>
                                    <span className="text-sm font-black text-zen-brown flex items-center gap-2">
                                       <div className="w-1.5 h-1.5 rounded-full bg-zen-sand" />
                                       {plan.maxSessions} Sessions
                                    </span>
                                 </div>
                                 <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-black text-zen-brown/20 uppercase tracking-[0.3em]">Temporal Scope</span>
                                    <span className="text-sm font-black text-zen-brown flex items-center gap-2">
                                       <div className="w-1.5 h-1.5 rounded-full bg-zen-leaf" />
                                       {plan.durationDays >= 36500 ? 'Infinite' : `${plan.durationDays} Days`}
                                    </span>
                                 </div>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
                 ) : (
                    <div className="bg-white/70 backdrop-blur-xl rounded-[3.5rem] shadow-2xl shadow-zen-brown/15 border border-white overflow-hidden overflow-x-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-4 duration-700">
                       <table className="w-full text-center border-collapse min-w-[900px]">
                          <thead>
                             <tr className="bg-zen-cream/10 border-b border-zen-brown/15">
                                <th className="px-8 py-6 text-[10px] font-black text-zen-brown/40 uppercase tracking-[0.3em]">Hierarchy</th>
                                <th className="px-8 py-6 text-[10px] font-black text-zen-brown/40 uppercase tracking-[0.3em]">Tier Identity</th>
                                <th className="px-8 py-6 text-[10px] font-black text-zen-brown/40 uppercase tracking-[0.3em]">Investment (QR)</th>
                                <th className="px-8 py-6 text-[10px] font-black text-zen-brown/40 uppercase tracking-[0.3em]">Scope (Days)</th>
                                <th className="px-8 py-6 text-[10px] font-black text-zen-brown/40 uppercase tracking-[0.3em]">Manifest (Sessions)</th>
                                <th className="px-8 py-6 text-[10px] font-black text-zen-brown/40 uppercase tracking-[0.3em]">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black text-zen-brown/40 uppercase tracking-[0.3em]">Controls</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-zen-brown/15">
                             {plans.map((plan, idx) => (
                                <tr key={plan._id} className="hover:bg-zen-cream/5 transition-all duration-500 group">
                                   <td className="px-8 py-6 text-zen-brown/40 font-serif text-lg">{(idx + 1).toString().padStart(2, '0')}</td>
                                   <td className="px-8 py-6">
                                      <div className="flex items-center justify-center gap-4">
                                         <div className="w-10 h-10 rounded-xl bg-zen-sand/10 flex items-center justify-center text-zen-sand shadow-sm group-hover:scale-110 transition-transform">
                                            <Crown size={18} />
                                         </div>
                                         <span className="font-serif font-black text-lg text-zen-brown">{plan.name}</span>
                                      </div>
                                   </td>
                                   <td className="px-8 py-6">
                                      <span className="font-serif font-black text-xl text-zen-brown">QR {plan.price}</span>
                                   </td>
                                   <td className="px-8 py-6">
                                      <span className="text-[11px] font-black text-zen-brown/60 uppercase tracking-widest">{plan.durationDays >= 36500 ? 'Infinite' : `${plan.durationDays} Days`}</span>
                                   </td>
                                   <td className="px-8 py-6">
                                      <ZenBadge variant="leaf">{plan.maxSessions} Sacred Rituals</ZenBadge>
                                   </td>
                                   <td className="px-8 py-6">
                                      <ZenBadge variant={plan.isActive ? 'sand' : 'default'}>{plan.isActive ? 'Operational' : 'Retired'}</ZenBadge>
                                   </td>
                                   <td className="px-8 py-6">
                                      <div className="flex items-center justify-center gap-2">
                                         <ZenIconButton icon={Edit3} onClick={() => {
                                            setEditingPlan(plan);
                                            setPlanFormData({ ...plan as any, isUnlimited: plan.durationDays >= 36500 });
                                            setIsPlanModalOpen(true);
                                         }} />
                                         <ZenIconButton icon={Trash2} onClick={() => handleDeletePlan(plan._id)} />
                                      </div>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 )}
              </div>
            )}

            {activeTab === 'registry' && (
              <div className="space-y-12">
                  <div className="flex overflow-x-auto pb-6 gap-6 lg:grid lg:grid-cols-4 lg:gap-8 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-2">
                    {[
                      { label: 'Total Votaries', value: memberships.length.toString(), icon: Users, trend: `${stats?.totalActive || 0} active currently` },
                      { label: 'Tier Engagement', value: stats?.activeTiers?.toString() || '0', icon: BarChart3, trend: 'In sanctuary' },
                      { label: 'Active Rituals', value: stats?.totalSessionsRemaining?.toString() || '0', icon: Sparkles, trend: 'Available assets' },
                      { label: 'Concluded Journeys', value: stats?.totalExpired?.toString() || '0', icon: AlertCircle, trend: 'History' }
                    ].map((stat, i) => (
                      <div key={i} className="flex-shrink-0 w-[280px] lg:w-auto bg-white/80 backdrop-blur-xl p-8 rounded-[3rem] shadow-2xl shadow-zen-brown/15 border border-white relative overflow-hidden group hover:-translate-y-2 transition-all duration-700">
                         <div className="absolute top-0 right-0 w-24 h-24 bg-zen-sand/5 rounded-bl-full -z-0"></div>
                         <stat.icon className="text-zen-brown/20 mb-6 group-hover:scale-110 transition-transform duration-700" size={32} />
                         <h5 className="text-[10px] font-black text-zen-brown/30 uppercase tracking-[0.4em] mb-1.5">{stat.label}</h5>
                         <p className="text-4xl font-serif font-black text-zen-brown tracking-tighter">{stat.value}</p>
                         <p className="text-[9px] text-zen-leaf/60 font-black uppercase tracking-widest mt-6 flex items-center gap-2">
                            <CheckCircle2 size={12} />
                            {stat.trend}
                         </p>
                      </div>
                    ))}
                 </div>

                 <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                       <div>
                          <h3 className="text-xl font-serif font-bold text-zen-brown">Member Registry</h3>
                          <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest mt-1">Live Sanctuary Engagement Data</p>
                       </div>
                    </div>

                    {viewMode === 'table' ? (
                       <div className="bg-white/70 backdrop-blur-xl rounded-[3.5rem] shadow-2xl shadow-zen-brown/15 border border-white overflow-hidden overflow-x-auto custom-scrollbar">
                          <table className="w-full text-center border-collapse min-w-[1000px]">
                             <thead>
                                <tr className="bg-zen-cream/10 border-b border-zen-brown/15">
                                   <th className="px-6 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em]">No</th>
                                   <th className="px-6 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em]">Votary (Client)</th>
                                   <th className="px-6 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em]">Sacred Tier</th>
                                   <th className="px-6 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em]">Temporal Scope</th>
                                   <th className="px-6 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em]">Essence (Sessions)</th>
                                   <th className="px-6 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em]">Status</th>
                                   <th className="px-6 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em]">Actions</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-zen-brown/15">
                                {filteredMemberships.map((m, index) => (
                                  <tr key={m._id} className="hover:bg-zen-cream/5 transition-all duration-500 group">
                                     <td className="px-6 py-6 text-zen-brown/40 font-serif">{(index + 1).toString().padStart(2, '0')}</td>
                                     <td className="px-6 py-6">
                                        <div className="flex flex-col items-center">
                                           <span className="font-serif font-bold text-zen-brown">{m.client?.name}</span>
                                           <span className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest mt-1">{m.client?.phone}</span>
                                        </div>
                                     </td>
                                     <td className="px-6 py-6">
                                        <ZenBadge variant="sand">{m.plan?.name}</ZenBadge>
                                     </td>
                                     <td className="px-6 py-6 text-xs text-zen-brown font-medium">
                                        {new Date(m.startDate).toLocaleDateString()} - {new Date(m.endDate).toLocaleDateString()}
                                     </td>
                                     <td className="px-6 py-6 text-zen-brown font-bold tracking-tighter">
                                        {Math.max(0, (m.totalSessions > 0 ? m.totalSessions : (m.plan?.maxSessions || 0)) - m.remainingSessions)} / {m.totalSessions > 0 ? m.totalSessions : (m.plan?.maxSessions || 0)} Sessions
                                     </td>
                                     <td className="px-6 py-6">
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${getStatusColor(m.status)}`}>
                                           {m.status}
                                        </span>
                                     </td>
                                     <td className="px-6 py-6">
                                        <div className="flex items-center justify-center gap-2">
                                           <ZenIconButton icon={History} onClick={() => {
                                              setSelectedHistory(m);
                                              setIsHistoryModalOpen(true);
                                           }} />
                                           <ZenIconButton icon={Edit3} onClick={() => {
                                              setEditingEnrollmentId(m._id);
                                              setEnrollData({
                                                 clientId: m.client?._id || '',
                                                 planId: m.plan?._id || '',
                                                 branchId: m.branch?._id || '',
                                                 startDate: new Date(m.startDate).toISOString().split('T')[0],
                                                 status: m.status
                                              });
                                              setIsEnrollModalOpen(true);
                                           }} />
                                           <ZenIconButton icon={Trash2} onClick={() => handleDeleteMembership(m._id)} />
                                        </div>
                                     </td>
                                  </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    ) : (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                          {filteredMemberships.map((m) => (
                             <div key={m._id} className="group relative bg-white/80 backdrop-blur-xl rounded-[3.5rem] p-8 shadow-2xl shadow-zen-brown/15 border border-white transition-all duration-700 hover:shadow-zen-brown/15 hover:-translate-y-2 h-full flex flex-col justify-between overflow-hidden">
                                {/* Background Glow Overlay */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-zen-sand/5 rounded-bl-full -z-0 pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>
                                
                                <div className="relative z-10">
                                   <div className="flex items-center justify-between mb-8">
                                      <div className="flex items-center gap-5">
                                         <div className="w-16 h-16 rounded-[1.8rem] bg-zen-sand/10 text-zen-sand flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-700 shadow-xl border border-white/80">
                                            <Users size={24} strokeWidth={1.5} />
                                         </div>
                                         <div className="min-w-0">
                                            <h4 className="font-serif font-black text-xl text-zen-brown group-hover:text-zen-sand transition-colors duration-500 truncate">{m.client?.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                               <span className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[0.2em]">{m.client?.phone}</span>
                                               <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border ${getStatusColor(m.status)}`}>
                                                  {m.status}
                                               </span>
                                            </div>
                                         </div>
                                      </div>
                                      <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all lg:translate-x-4 lg:group-hover:translate-x-0 duration-500">
                                         <ZenIconButton icon={History} onClick={() => {
                                               setSelectedHistory(m);
                                               setIsHistoryModalOpen(true);
                                            }} />
                                         <ZenIconButton icon={Edit3} onClick={() => {
                                               setEditingEnrollmentId(m._id);
                                               setEnrollData({
                                                  clientId: m.client?._id || '',
                                                  planId: m.plan?._id || '',
                                                  branchId: m.branch?._id || '',
                                                  startDate: new Date(m.startDate).toISOString().split('T')[0],
                                                  status: m.status
                                               });
                                               setIsEnrollModalOpen(true);
                                            }} />
                                         <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDeleteMembership(m._id)} />
                                      </div>
                                   </div>

                                   <div className="space-y-4">
                                      <div className="flex items-center justify-between p-5 bg-white border border-zen-brown/15 rounded-[2rem] shadow-sm hover:shadow-lg transition-all duration-500 group/tier">
                                         <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-zen-sand/5 flex items-center justify-center text-zen-sand group-hover/tier:scale-110 transition-transform">
                                               <ShieldCheck size={18} />
                                            </div>
                                            <div className="flex flex-col">
                                               <span className="text-[9px] font-black text-zen-brown/20 uppercase tracking-[0.3em]">Ritual Tier</span>
                                               <span className="text-xs font-black text-zen-brown uppercase tracking-widest">{m.plan?.name}</span>
                                            </div>
                                         </div>
                                         <div className="flex flex-col items-end">
                                            <span className="text-2xl font-black text-zen-brown tracking-tighter">
                                               {Math.max(0, (m.totalSessions > 0 ? m.totalSessions : (m.plan?.maxSessions || 0)) - m.remainingSessions)}<span className="text-sm text-zen-brown/30 mx-1">/</span>{m.totalSessions > 0 ? m.totalSessions : (m.plan?.maxSessions || 0)}
                                            </span>
                                            <span className="text-[8px] font-black text-zen-brown/20 uppercase tracking-widest">Rituals Used</span>
                                         </div>
                                      </div>

                                      <div className="flex items-center justify-between px-2 pt-2">
                                         <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black text-zen-brown/20 uppercase tracking-widest">Sequence Cycle</span>
                                            <div className="flex items-center gap-2 text-zen-brown/60">
                                               <Calendar size={14} className="text-zen-sand" />
                                               <span className="text-[10px] font-serif font-black">{new Date(m.startDate).toLocaleDateString()}</span>
                                            </div>
                                         </div>
                                         <ZenBadge variant="leaf">Sanctuary Member</ZenBadge>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>
                    )}
                    <ZenPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                 </div>
              </div>
            )}
         </motion.div>
      </AnimatePresence>

      {/* Plan Configuration Modal */}
      <Modal isOpen={isPlanModalOpen} onClose={() => setIsPlanModalOpen(false)} title={editingPlan ? 'Refine Tier' : 'Establish Sacred Tier'} hideHeader maxWidth="max-w-4xl" >
        <form onSubmit={handleCreatePlan} className="flex flex-col h-[90vh]">
           <div className="px-10 py-10 border-b border-zen-brown/15 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-50">
              <div className="flex items-center gap-6">
                 <div className="w-16 h-16 rounded-2xl bg-zen-cream flex items-center justify-center text-zen-sand">
                    <Crown size={32} />
                 </div>
                 <div>
                    <h2 className="text-3xl font-serif font-bold text-zen-brown">{editingPlan ? 'Refine Tier' : 'Establish Sacred Tier'}</h2>
                    <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.4em] mt-1">Tier Session & Scope Configuration</p>
                 </div>
              </div>
              <ZenIconButton icon={X} onClick={() => setIsPlanModalOpen(false)} />
           </div>

           <div className="flex-1 overflow-y-auto px-10 py-12 space-y-12 scrollbar-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                 <ZenInput label="Tier Identity" placeholder="E.g. Zenith Platinum" value={planFormData.name} onChange={(e: any) => setPlanFormData({...planFormData, name: e.target.value})} />
                 <ZenInput label="No of times (Sessions)" icon={Hash} type="number" value={planFormData.maxSessions} onChange={(e: any) => setPlanFormData({...planFormData, maxSessions: Number(e.target.value)})} />
                 <ZenInput label="Primary Investment (QR)" icon={CreditCard} type="number" value={planFormData.price} onChange={(e: any) => setPlanFormData({...planFormData, price: Number(e.target.value)})} />
                 <div className="space-y-4">
                    <ZenInput 
                       label="Temporal Duration (Days)" 
                       icon={Clock} 
                       type="number" 
                       disabled={planFormData.isUnlimited}
                       value={planFormData.isUnlimited ? '' : planFormData.durationDays} 
                       onChange={(e: any) => setPlanFormData({...planFormData, durationDays: Number(e.target.value)})} 
                    />
                    <label className="flex items-center gap-3 cursor-pointer group mt-2">
                       <input 
                         type="checkbox" 
                         checked={planFormData.isUnlimited} 
                         onChange={e => setPlanFormData({...planFormData, isUnlimited: e.target.checked})}
                         className="w-4 h-4 rounded border-zen-brown/25 text-zen-sand focus:ring-zen-sand transition-all"
                       />
                       <span className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest">Infinite Lifespan</span>
                    </label>
                 </div>

                 <div className="flex flex-col justify-center">
                    <h4 className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mb-4">Availability Status</h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={planFormData.isActive} onChange={e => setPlanFormData({...planFormData, isActive: e.target.checked})} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-zen-leaf after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                      <span className="ms-3 text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest">{planFormData.isActive ? 'Active' : 'Deactivated'}</span>
                    </label>
                 </div>
              </div>

              <div className="space-y-6">
                  <h4 className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] px-2">Services List (Coverage)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                     {services.filter(s => s.status === 'Active').map(service => {
                        const isSelected = planFormData.applicableServices.includes(service._id);
                        return (
                           <button
                             key={service._id}
                             type="button"
                             onClick={() => toggleService(service._id)}
                             className={`p-4 rounded-2xl border text-left transition-all duration-300 ${isSelected ? 'bg-zen-brown text-zen-cream border-zen-brown shadow-xl' : 'bg-white text-zen-brown/60 border-zen-brown/15 hover:border-zen-brown/35'}`}
                           >
                              <p className="font-serif font-bold text-sm leading-tight">{service.name}</p>
                              <div className="flex items-center justify-between mt-2">
                                 <span className="text-[8px] uppercase tracking-widest opacity-60">{service.category?.name}</span>
                                 {isSelected && <CheckCircle2 size={12} />}
                              </div>
                           </button>
                        );
                     })}
                  </div>
              </div>
              <ZenTextarea label="Manifest Essence" value={planFormData.description} onChange={(e: any) => setPlanFormData({...planFormData, description: e.target.value})} />
           </div>

           <div className="px-10 py-10 border-t border-zen-brown/15 bg-gray-50/50 flex gap-6 sticky bottom-0 z-50">
              <ZenButton variant="secondary" onClick={() => setIsPlanModalOpen(false)} className="flex-1" type="button">Discard</ZenButton>
              <ZenButton type="submit" className="flex-[2]">Manifest Tier</ZenButton>
           </div>
        </form>
      </Modal>

      {/* Enrollment Modal */}
      <Modal isOpen={isEnrollModalOpen} onClose={() => setIsEnrollModalOpen(false)} title="Divine Enrollment" hideHeader maxWidth="max-w-2xl" >
         <form onSubmit={handleEnroll} className="p-10 space-y-10">
            <div className="flex items-center gap-6">
               <div className="w-14 h-14 rounded-2xl bg-zen-sand/10 text-zen-sand flex items-center justify-center">
                  <Plus size={24} />
               </div>
               <div>
                  <h2 className="text-2xl font-serif font-bold text-zen-brown">{editingEnrollmentId ? 'Refine Enrollment' : 'Divine Enrollment'}</h2>
                  <p className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mt-1">Initiating members</p>
               </div>
            </div>

            <ZenDropdown 
               label="Seek Votary (Client)" 
               options={clients.filter(c => c.status === 'Active').map(c => `${c.name || 'Unknown'} (${c.phone || 'No Phone'})`)} 
               value={(() => {
                  const client = clients.find(c => c._id === enrollData.clientId);
                  return client ? `${client.name} (${client.phone})` : '';
               })()}
               disabled={!!editingEnrollmentId} // Don't allow changing client on edit
               onChange={val => {
                  const client = clients.filter(c => c.status === 'Active').find(c => `${c.name} (${c.phone})` === val);
                  if (client) setEnrollData({...enrollData, clientId: client._id});
               }} 
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <ZenDropdown 
                  label="Selected Tier" 
                  options={plans.filter(p => p.isActive).map(p => p.name)} 
                  value={plans.find(p => p._id === enrollData.planId)?.name || ''} 
                  onChange={val => {
                     const plan = plans.find(p => p.name === val);
                     if (plan) setEnrollData({...enrollData, planId: plan._id});
                  }}
               />
               <ZenDropdown 
                  label="Sanctuary Node" 
                  options={branches.filter(b => b.isActive).map(b => b.name)} 
                  value={branches.find(b => b._id === enrollData.branchId)?.name || ''} 
                  onChange={val => {
                     const branch = branches.find(b => b.name === val);
                     if (branch) setEnrollData({...enrollData, branchId: branch._id});
                  }} 
               />
            </div>

            <ZenDatePicker label="Start Date" value={enrollData.startDate} onChange={val => setEnrollData({...enrollData, startDate: val})} />

            <div className="pt-10 flex gap-4">
               <ZenButton variant="secondary" onClick={() => setIsEnrollModalOpen(false)} className="flex-1" type="button">Discard</ZenButton>
               <ZenButton type="submit" className="flex-[2]">{editingEnrollmentId ? 'Apply Refinements' : 'Complete Initiation'}</ZenButton>
            </div>
         </form>
      </Modal>

      {/* Redemption Modal */}
      <Modal isOpen={isRedeemModalOpen} onClose={() => setIsRedeemModalOpen(false)} title="Divine Redemption" hideHeader maxWidth="max-w-xl" >
         <form onSubmit={handleRedeem} className="p-10 space-y-8">
            <div className="flex items-center gap-6">
               <div className="w-14 h-14 rounded-2xl bg-zen-leaf/10 text-zen-leaf flex items-center justify-center">
                  <Sparkles size={24} />
               </div>
               <div>
                  <h2 className="text-2xl font-serif font-bold text-zen-brown">Divine Redemption</h2>
               </div>
            </div>

            {activeMembershipForRedeem && (
               <div className="bg-zen-cream/30 p-6 rounded-3xl border border-zen-brown/15">
                  <p className="font-serif font-lg font-bold text-zen-brown">{activeMembershipForRedeem.client?.name}</p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-zen-brown/15">
                     <span className="text-xl font-serif font-bold text-zen-brown">{activeMembershipForRedeem.remainingSessions} / {activeMembershipForRedeem.totalSessions} Sessions</span>
                  </div>
               </div>
            )}

            <ZenDropdown 
               label="Ritual Service" 
               options={services.filter((s: any) => s.status === 'Active').map((s: any) => s.name)} 
               value={services.find((s: any) => s._id === redeemData.serviceId)?.name || ''} 
               onChange={(val: any) => {
                  const s = services.filter((s: any) => s.status === 'Active').find((serv: any) => serv.name === val);
                  if (s) setRedeemData({...redeemData, serviceId: s._id});
               }}
            />

            <ZenTextarea label="Redemption Notes" value={redeemData.notes} onChange={(e: any) => setRedeemData({...redeemData, notes: e.target.value})} />

            <div className="pt-6 flex gap-4">
               <ZenButton variant="secondary" onClick={() => setIsRedeemModalOpen(false)} className="flex-1" type="button">Discard</ZenButton>
               <ZenButton type="submit" className="flex-[2]">Redeem Sacred Essence</ZenButton>
            </div>
         </form>
      </Modal>

      {/* Usage History Modal */}
      <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Services Taken Registry" hideHeader maxWidth="max-w-4xl" >
         <div className="p-10 space-y-10">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                     <History size={24} />
                  </div>
                  <div>
                     <h2 className="text-2xl font-serif font-bold text-zen-brown">Services Taken Registry</h2>
                     <p className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mt-1">Detailed redemption records</p>
                  </div>
               </div>
               <div className="text-right">
                  <h3 className="font-serif text-lg font-bold text-zen-brown">{selectedHistory?.client?.name}</h3>
                  <ZenBadge variant="sand" className="mt-1">{selectedHistory?.plan?.name}</ZenBadge>
               </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-zen-brown/15 overflow-hidden shadow-sm">
               <table className="w-full text-left">
                  <thead className="bg-zen-cream/10 border-b border-zen-brown/15">
                     <tr>
                        <th className="px-8 py-5 text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest whitespace-nowrap">S No</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest">Date</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest">Branch</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest">Ritual (Massage)</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest">Slot</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-zen-brown/15">
                     {selectedHistory?.usageHistory?.length > 0 ? selectedHistory.usageHistory.map((usage: any, idx: number) => (
                        <tr key={idx} className="hover:bg-zen-cream/5 transition-colors duration-300">
                           <td className="px-8 py-5 text-[11px] font-serif font-bold text-zen-brown/40">{(idx + 1).toString().padStart(2, '0')}</td>
                           <td className="px-8 py-5 text-[11px] font-bold text-zen-brown">{new Date(usage.usedAt).toLocaleDateString()}</td>
                           <td className="px-8 py-5 text-[11px] font-bold text-zen-brown">
                              <div className="flex items-center gap-2">
                                 <MapPin size={10} className="text-zen-sand" />
                                 {usage.branch?.name || 'Sanctuary'}
                              </div>
                           </td>
                           <td className="px-8 py-5 text-[11px] font-bold text-zen-brown">{usage.service?.name || usage.serviceId}</td>
                           <td className="px-8 py-5 text-[10px] font-bold text-zen-brown/40 uppercase">{new Date(usage.usedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        </tr>
                     )) : (
                        <tr>
                           <td colSpan={5} className="px-8 py-12 text-center text-sm font-serif italic text-zen-brown/30">No redemption history found for this enrollment</td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>

            <div className="flex justify-center pt-4">
               <ZenButton variant="secondary" onClick={() => setIsHistoryModalOpen(false)} className="px-12">Close Registry</ZenButton>
            </div>
         </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
      />
    </ZenPageLayout>
  );
};

export default Memberships;
