import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
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
import { useAuth } from '../../context/AuthContext';
import { notify } from '../../components/shared/ZenNotification';

// Zen Components
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { ZenButton, ZenIconButton, ZenBadge } from '../../components/zen/ZenButtons';
import { ZenStatCard } from '../../components/zen/ZenStatCard';
import { ZenInput, ZenDropdown, ZenTextarea, ZenDatePicker } from '../../components/zen/ZenInputs';
import { Modal } from '../../components/shared/Modal';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

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
       isUnlimited: false,
       benefits: '',
       icon: 'Sparkles',
       isPopular: false
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
       setPage(1);
    }, [viewMode]);

    const PAGE_LIMIT = 12;

    const fetchData = async (silent: boolean = false) => {
       if (!silent) setIsLoading(true);
       try {
          const headers = { 'Authorization': `Bearer ${user?.token}` };
          const [plansRes, enrollRes, servicesRes, branchRes, clientsRes, statsRes] = await Promise.all([
             fetch(`${API_URL}/memberships/plans`, { headers }),
             fetch(`${API_URL}/memberships/client/all?page=${page}&limit=${PAGE_LIMIT}`, { headers }),
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
          console.error('Error fetching membership data:', error);
          if (!silent) notify('error', 'Sync Failure', 'Failed to retrieve membership records');
       } finally {
          if (!silent) setIsLoading(false);
       }
    };

    useEffect(() => {
       fetchData();

       const interval = setInterval(() => {
          fetchData(true);
       }, 10000); // 10s sync

       return () => clearInterval(interval);
    }, [page, user?.token]);

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
                durationDays: planFormData.isUnlimited ? 36500 : planFormData.durationDays,
                benefits: typeof planFormData.benefits === 'string' 
                  ? (planFormData.benefits as string).split('\n').filter(b => b.trim()) 
                  : planFormData.benefits
             })
          });

          if (response.ok) {
             setIsPlanModalOpen(false);
             setEditingPlan(null);
             fetchData();
             notify('success', 'Plan Saved', 'Membership plan successfully synchronized');
          }
       } catch (error) {
          console.error('Error saving plan:', error);
          notify('error', 'Creation Error', 'Failed to create new tier');
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
             notify('success', editingEnrollmentId ? 'Enrollment Updated' : 'Enrollment Complete', 'Membership records updated successfully');
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
             notify('success', 'Details Redeemed', 'Service session recorded successfully');
          }
       } catch (error) {
          console.error('Error redeeming session:', error);
          notify('error', 'Redemption Error', 'Failed to record service usage');
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
             notify('success', 'Plan Disabled', 'Membership plan has been disabled');
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
            message: 'Are you sure you want to remove this client from the membership registry? This action cannot be undone.',
            onConfirm: () => deleteMembershipConfirmed(id),
            type: 'danger'
        });
    };

    const handleDeletePlan = (id: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Retire Tier',
            message: 'Are you sure you want to deactivate this membership plan? Existing members will retain their benefits, but no new enrollments will be possible.',
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
title="Membership Management" 
      addButtonLabel={user?.role === 'Client' ? "" : "New Enrollment"}
      addButtonIcon={user?.role === 'Client' ? null : <Crown size={18} />}
      onAddClick={user?.role === 'Client' ? () => {} : () => {
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
      <div className="flex items-center gap-4 sm:gap-8 mb-8 border-b border-zen-brown/15 px-2 overflow-x-auto scrollbar-none whitespace-nowrap">
         {[
           { id: 'registry', label: user?.role === 'Client' ? 'My Memberships' : 'Memberships', icon: Users },
           ...(user?.role !== 'Client' ? [{ id: 'plans', label: 'Tier Management', icon: Crown }] : [])
         ].map((tab) => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id as any)}
             className={`py-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] relative transition-all duration-500 ${activeTab === tab.id ? 'text-zen-brown' : 'text-zen-brown/30 hover:text-zen-brown/60'}`}
           >
            <tab.icon size={14} className="sm:w-4 sm:h-4" strokeWidth={activeTab === tab.id ? 2.5 : 2} />
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
                 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
                    <div>
                       <h3 className="text-lg sm:text-xl font-serif font-bold text-zen-brown">Membership Plan Setup</h3>
                       <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest mt-1">Global Service Structure</p>
                    </div>
                    <ZenButton onClick={() => { 
                      setEditingPlan(null);                       setPlanFormData({ name: '', price: 0, durationDays: 30, maxSessions: 0, applicableServices: [], description: '', branches: [], isActive: true, isUnlimited: false, benefits: '', icon: 'Sparkles', isPopular: false }); 
                      setIsPlanModalOpen(true); 
                    }} variant="secondary" type="button" className="w-full sm:w-auto">Define New Plan</ZenButton>
                 </div>
                 
                 {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                     {plans.map((plan) => (
                        <div key={plan._id} className="group relative bg-white/80 backdrop-blur-xl rounded-[2.5rem] sm:rounded-[3.5rem] p-6 sm:p-8 shadow-sm border border-white transition-all duration-700 hover:shadow-zen-brown/15 hover:-translate-y-2 hover:z-10 h-full flex flex-col justify-between">
                           {/* Background Glow */}
                           <div className="absolute top-0 right-0 w-32 h-32 bg-zen-sand/5 rounded-bl-[2.5rem] sm:rounded-bl-[3.5rem] rounded-tr-[2.5rem] sm:rounded-tr-[3.5rem] overflow-hidden -z-0 pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>
                           
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
                                                applicableServices: plan.applicableServices?.map((s: any) => typeof s === 'string' ? s : s._id) || [],
                                                isUnlimited: plan.durationDays >= 36500,
                                                benefits: Array.isArray(plan.benefits) ? plan.benefits.join('\n') : (plan.benefits || '')
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
                                    <span className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[0.2em]">Renewal Rate</span>
                                 </div>

                                 {/* Applicable Services List */}
                                 <div className="mb-8">
                                    <p className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[0.3em] mb-3 px-1">Included Services</p>
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
                                          <span className="text-[8px] text-zen-brown/20 italic font-serif">Universal Service Coverage</span>
                                       )}
                                    </div>
                                 </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-6 pt-8 border-t border-zen-brown/15 relative z-10">
                                 <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-black text-zen-brown/20 uppercase tracking-[0.3em]">Usage Limit</span>
                                    <span className="text-sm font-black text-zen-brown flex items-center gap-2">
                                       <div className="w-1.5 h-1.5 rounded-full bg-zen-sand" />
                                       {plan.maxSessions} Sessions
                                    </span>
                                 </div>
                                 <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-black text-zen-brown/20 uppercase tracking-[0.3em]">Validity Duration</span>
                                    <span className="text-sm font-black text-zen-brown flex items-center gap-2">
                                       <div className="w-1.5 h-1.5 rounded-full bg-zen-leaf" />
                                       {plan.durationDays >= 36500 ? 'Permanent' : `${plan.durationDays} Days`}
                                    </span>
                                 </div>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
                  ) : (
                    <div className="w-full bg-white rounded-xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden table-container animate-in fade-in slide-in-from-bottom-4 duration-700">
                       <div className="table-container">
                          <table className="w-full min-w-[900px]">
                          <thead>
                             <tr>
                                <th>S NO</th>
                                <th>VISUAL</th>
                                <th>IDENTITY</th>
                                <th>METRICS</th>
                                <th>DURATION</th>
                                <th>BENEFIT</th>
                                <th>STATUS</th>
                                <th>ACTIONS</th>
                             </tr>
                          </thead>
                          <tbody>
                             {plans.map((plan, idx) => (
                                <tr key={plan._id} className="transition-all group border-b border-black/[0.02]">
                                   <td className="text-center italic opacity-40 text-[11px]">{(idx + 1).toString().padStart(2, '0')}</td>
                                   <td>
                                       <div className="flex justify-center">
                                          <div className="w-10 h-10 rounded-xl bg-zen-sand/10 flex items-center justify-center text-zen-sand shadow-sm group-hover:scale-110 transition-transform">
                                             <Crown size={18} />
                                          </div>
                                       </div>
                                   </td>
                                   <td>
                                       <div className="flex flex-col items-center px-6">
                                          <span className="zen-table-primary">{plan.name}</span>
                                          <span className="zen-table-meta">Membership Plan</span>
                                       </div>
                                   </td>
                                   <td>
                                      <div className="flex flex-col items-center">
                                         <span className="zen-table-primary">QR {plan.price}</span>
                                         <span className="zen-table-meta">Renewal Rate</span>
                                      </div>
                                   </td>
                                   <td>
                                      <div className="flex flex-col items-center">
                                         <span className="text-sm font-serif font-black text-zen-brown leading-none">
                                            {plan.durationDays >= 36500 ? 'Infinite' : plan.durationDays}
                                         </span>
                                         <span className="text-[8px] font-black text-zen-brown/30 uppercase tracking-widest mt-1">Days</span>
                                      </div>
                                   </td>
                                   <td>
                                      <div className="flex flex-col items-center">
                                         <span className="text-sm font-serif font-black text-zen-brown leading-none">{plan.maxSessions}</span>
                                         <span className="text-[8px] font-black text-zen-brown/30 uppercase tracking-widest mt-1">Credits</span>
                                      </div>
                                   </td>
                                   <td>
                                      <div className="flex justify-center">
                                         <ZenBadge variant={plan.isActive ? 'sand' : 'default'}>{plan.isActive ? 'OPERATIONAL' : 'RETIRED'}</ZenBadge>
                                      </div>
                                   </td>
                                   <td>
                                      <div className="flex items-center justify-center gap-2">
                                         <ZenIconButton icon={Edit3} onClick={() => {
                                            setEditingPlan(plan);
                                            setPlanFormData({ 
                                               ...plan as any, 
                                               applicableServices: plan.applicableServices?.map((s: any) => typeof s === 'string' ? s : s._id) || [],
                                               isUnlimited: plan.durationDays >= 36500 
                                            });
                                            setIsPlanModalOpen(true);
                                         }} />
                                         <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDeletePlan(plan._id)} />
                                      </div>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                          </table>
                       </div>
                    </div>
                 )}
              </div>
            )}

            {activeTab === 'registry' && (
              <div className="space-y-12">
                  <div className="flex overflow-x-auto overflow-y-visible pt-4 pb-6 gap-6 lg:grid lg:grid-cols-4 lg:gap-8 lg:overflow-visible scrollbar-hide px-4 lg:px-2">
                     {[
                      { label: 'Total Clients', value: memberships.length.toString(), icon: Users, trend: `${stats?.totalActive || 0} active currently`, color: 'text-blue-500', bg: 'bg-blue-500/10', glow: 'bg-blue-500/20', delay: 0 },
                      { label: 'Plan Engagement', value: stats?.activeTiers?.toString() || '0', icon: BarChart3, trend: 'In membership', color: 'text-purple-500', bg: 'bg-purple-500/10', glow: 'bg-purple-500/20', delay: 0.2 },
                      { label: 'Available Sessions', value: stats?.totalSessionsRemaining?.toString() || '0', icon: Sparkles, trend: 'Unused credits', color: 'text-amber-500', bg: 'bg-amber-500/10', glow: 'bg-amber-500/20', delay: 0.4 },
                      { label: 'Completed Memberships', value: stats?.totalExpired?.toString() || '0', icon: AlertCircle, trend: 'History', color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', delay: 0.6 }
                    ].map((stat, i) => (
                      <ZenStatCard key={i} {...stat} />
                    ))}
                 </div>

                 <div className="space-y-6">


                    {viewMode === 'table' ? (
                       <div className="w-full bg-white rounded-xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden table-container">
                          <div className="table-container">
                          <table className="w-full min-w-[1000px]">
                             <thead>
                                 <tr>
                                   <th>S NO</th>
                                   <th>CLIENT IDENTITY</th>
                                   <th>PLAN SUBSCRIBED</th>
                                   <th>METRICS & CYCLE</th>
                                   <th>USAGE (SESS.)</th>
                                   <th>STATUS</th>
                                   {user?.role !== 'Client' && <th>ACTIONS</th>}
                                </tr>
                             </thead>
                             <tbody>
                                {filteredMemberships.map((m, index) => (
                                  <tr key={m._id} className="transition-all group border-b border-black/[0.02]">
                                     <td className="text-center italic opacity-40 text-[11px]">{((page - 1) * PAGE_LIMIT + index + 1).toString().padStart(2, '0')}</td>
                                     <td>
                                        <div className="flex flex-col items-center px-6">
                                           <span className="zen-table-primary">{m.client?.name}</span>
                                           <span className="zen-table-meta">{m.client?.phone}</span>
                                        </div>
                                     </td>
                                     <td>
                                        <div className="flex justify-center">
                                           <ZenBadge variant="sand" className="uppercase font-black tracking-widest px-4">{m.plan?.name}</ZenBadge>
                                        </div>
                                     </td>
                                     <td>
                                        <div className="flex flex-col items-center">
                                           <div className="flex items-center gap-2 text-[11px] font-black text-zen-brown uppercase tracking-widest">
                                              {dayjs(m.startDate).format('DD/MM')} — {dayjs(m.endDate).format('DD/MM')}
                                           </div>
                                           <span className="zen-table-meta mt-1">Validity Cycle</span>
                                        </div>
                                     </td>
                                     <td>
                                        <div className="flex flex-col items-center">
                                           <p className="zen-table-primary">{(m.totalSessions || 0) - (m.remainingSessions || 0)} / {m.totalSessions || 0}</p>
                                           <p className="zen-table-meta">Sessions Utilized</p>
                                        </div>
                                     </td>
                                     <td>
                                        <div className="flex justify-center">
                                           <ZenBadge variant={m.status === 'Active' ? 'leaf' : 'sand'} className="uppercase font-black tracking-widest">{m.status}</ZenBadge>
                                        </div>
                                     </td>
                                     {user?.role !== 'Client' && (
                                        <td>
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
                                     )}
                                  </tr>
                                ))}
                             </tbody>
                          </table>
                          </div>
                       </div>
                    ) : (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                          {filteredMemberships.map((m) => (
                             <div key={m._id} className="group relative bg-white/80 backdrop-blur-xl rounded-[2.5rem] sm:rounded-[3.5rem] p-6 sm:p-8 shadow-sm border border-white transition-all duration-700 hover:shadow-zen-brown/15 hover:-translate-y-2 h-full flex flex-col justify-between overflow-hidden">
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
                                      {user?.role !== 'Client' && (
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
                                      )}
                                   </div>

                                   <div className="space-y-4">
                                      <div className="flex items-center justify-between p-5 bg-white border border-zen-brown/15 rounded-[2rem] shadow-sm hover:shadow-lg transition-all duration-500 group/tier">
                                         <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-zen-sand/5 flex items-center justify-center text-zen-sand group-hover/tier:scale-110 transition-transform">
                                               <ShieldCheck size={18} />
                                            </div>
                                            <div className="flex flex-col">
                                               <span className="text-[9px] font-black text-zen-brown/20 uppercase tracking-[0.3em]">Service Tier</span>
                                               <span className="text-xs font-black text-zen-brown uppercase tracking-widest">{m.plan?.name}</span>
                                            </div>
                                         </div>
                                         <div className="flex flex-col items-end">
                                            <span className="text-2xl font-black text-zen-brown tracking-tighter">
                                               {Math.max(0, (m.totalSessions > 0 ? m.totalSessions : (m.plan?.maxSessions || 0)) - m.remainingSessions)}<span className="text-sm text-zen-brown/30 mx-1">/</span>{m.totalSessions > 0 ? m.totalSessions : (m.plan?.maxSessions || 0)}
                                            </span>
                                            <span className="text-[8px] font-black text-zen-brown/20 uppercase tracking-widest">Services Used</span>
                                         </div>
                                      </div>

                                      <div className="flex items-center justify-between px-2 pt-2">
                                         <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black text-zen-brown/20 uppercase tracking-widest">Record Cycle</span>
                                            <div className="flex items-center gap-2 text-zen-brown/60">
                                               <Calendar size={14} className="text-zen-sand" />
                                               <span className="text-[10px] font-serif font-black">{new Date(m.startDate).toLocaleDateString()}</span>
                                            </div>
                                         </div>
                                         <ZenBadge variant="leaf">Active Member</ZenBadge>
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
      <Modal 
        isOpen={isPlanModalOpen} 
        onClose={() => setIsPlanModalOpen(false)} 
        title={editingPlan ? 'Edit Membership Plan' : 'New Membership Plan'} 
        subtitle="Configure pricing, duration, and included services"
        maxWidth="max-w-4xl"
        headerIcon={CreditCard}
        footer={
          <div className="flex gap-6">
            <ZenButton variant="secondary" onClick={() => setIsPlanModalOpen(false)} className="flex-1" type="button">Cancel</ZenButton>
            <ZenButton type="submit" form="plan-form" className="flex-[2] flex items-center justify-center gap-3 shadow-sm">
               <span>{editingPlan ? 'Save Plan' : 'Create Plan'}</span>
               <CheckCircle2 size={18} />
            </ZenButton>
          </div>
        }
      >
        <form id="plan-form" onSubmit={handleCreatePlan} className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
               <ZenInput label="Plan Name" placeholder="E.g. Monthly Standard" value={planFormData.name} onChange={(e: any) => setPlanFormData({...planFormData, name: e.target.value})} />
               <ZenInput label="Total Sessions" icon={Hash} type="number" value={planFormData.maxSessions} onChange={(e: any) => setPlanFormData({...planFormData, maxSessions: Number(e.target.value)})} />
               <ZenInput label="Plan Price (QR)" icon={CreditCard} type="number" value={planFormData.price} onChange={(e: any) => setPlanFormData({...planFormData, price: Number(e.target.value)})} />
               <div className="space-y-4">
                  <ZenInput 
                     label="Duration (Days)" 
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
                     <span className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest">Unlimited duration</span>
                  </label>
               </div>

               <div className="flex flex-col justify-center">
                  <h4 className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mb-4">Plan Status</h4>
                  <div className="flex gap-8">
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={planFormData.isActive} onChange={e => setPlanFormData({...planFormData, isActive: e.target.checked})} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-zen-leaf after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        <span className="ms-3 text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest">{planFormData.isActive ? 'Active' : 'Inactive'}</span>
                     </label>
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={planFormData.isPopular} onChange={e => setPlanFormData({...planFormData, isPopular: e.target.checked})} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-zen-sand after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        <span className="ms-3 text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest">Mark Popular</span>
                     </label>
                  </div>
               </div>

               <ZenDropdown label="Thematic Icon" icon={Crown} options={['Sparkles', 'Gem', 'Crown', 'Star', 'ShieldCheck', 'Zap']} value={planFormData.icon} onChange={val => setPlanFormData({...planFormData, icon: val})} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
               <ZenTextarea label="Included Benefits (One per line)" placeholder="E.g. Unlimited Access&#10;Member Priority" value={planFormData.benefits as any} onChange={(e: any) => setPlanFormData({...planFormData, benefits: e.target.value})} />
               <ZenTextarea label="Internal Description" value={planFormData.description} onChange={(e: any) => setPlanFormData({...planFormData, description: e.target.value})} />
            </div>

            <div className="space-y-6">
                <h4 className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] px-2">Included Services</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                   {(services || []).map(service => {
                      const isSelected = planFormData.applicableServices.includes(service._id);
                      return (
                         <button
                           key={service._id}
                           type="button"
                           onClick={() => toggleService(service._id)}
                           className={`p-4 rounded-2xl border text-left transition-all duration-300 ${isSelected ? 'bg-zen-brown text-zen-cream border-zen-brown shadow-xl' : 'bg-white text-zen-brown/60 border-zen-brown/15 hover:border-zen-brown/35'}`}
                         >
                            <p className="font-serif font-bold text-sm leading-tight">{service.name}</p>
                            <div className="flex items-center justify-center mt-2">
                               <span className="text-[8px] uppercase tracking-widest opacity-60">
                                  {typeof service.category === 'object' ? (service.category as any)?.name : (service.category || 'Wellness')}
                               </span>
                               {isSelected && <CheckCircle2 size={12} className="ml-2" />}
                            </div>
                         </button>
                      );
                   })}
                </div>
            </div>
        </form>
      </Modal>

      <Modal 
         isOpen={isEnrollModalOpen} 
         onClose={() => setIsEnrollModalOpen(false)} 
         title={editingEnrollmentId ? 'Edit Enrollment' : 'New Enrollment'} 
         subtitle="Assign a client to a membership plan"
         maxWidth="max-w-2xl"
         headerIcon={Plus}
         footer={
            <div className="flex gap-4">
               <ZenButton variant="secondary" onClick={() => setIsEnrollModalOpen(false)} className="flex-1" type="button">Cancel</ZenButton>
               <ZenButton type="submit" form="enroll-form" className="flex-[2]">{editingEnrollmentId ? 'Save Enrollment' : 'Create Enrollment'}</ZenButton>
            </div>
         }
      >
         <form id="enroll-form" onSubmit={handleEnroll} className="space-y-10">
            <ZenDropdown 
               label="Select Client" 
               options={(clients || []).map(c => `${c.name || 'Unknown'} (${c.phone || 'No Phone'})`)} 
               value={(() => {
                  const client = (clients || []).find(c => c._id === enrollData.clientId);
                  return client ? `${client.name} (${client.phone})` : '';
               })()}
               disabled={!!editingEnrollmentId} // Don't allow changing client on edit
               onChange={val => {
                  const client = (clients || []).find(c => `${c.name} (${c.phone})` === val);
                  if (client) setEnrollData({...enrollData, clientId: client._id});
               }} 
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <ZenDropdown 
                  label="Membership Plan" 
                  options={(plans || []).map(p => p.name)} 
                  value={(plans || []).find(p => p._id === enrollData.planId)?.name || ''} 
                  onChange={val => {
                     const plan = (plans || []).find(p => p.name === val);
                     if (plan) setEnrollData({...enrollData, planId: plan._id});
                  }}
               />
               <ZenDropdown 
                  label="Assign Branch" 
                  options={(branches || []).map(b => b.name)} 
                  value={(branches || []).find(b => b._id === enrollData.branchId)?.name || ''} 
                  onChange={val => {
                     const branch = (branches || []).find(b => b.name === val);
                     if (branch) setEnrollData({...enrollData, branchId: branch._id});
                  }} 
               />
            </div>

            <ZenDatePicker label="Start Date" value={enrollData.startDate} onChange={val => setEnrollData({...enrollData, startDate: val})} />
         </form>
      </Modal>

      {/* Redemption Modal */}
      <Modal 
         isOpen={isRedeemModalOpen} 
         onClose={() => setIsRedeemModalOpen(false)} 
         title="Redeem Service" 
         maxWidth="max-w-xl" 
         headerIcon={Sparkles}
         footer={
            <div className="flex gap-4">
               <ZenButton variant="secondary" onClick={() => setIsRedeemModalOpen(false)} className="flex-1" type="button">Cancel</ZenButton>
               <ZenButton type="submit" form="redeem-form" className="flex-[2]">Confirm</ZenButton>
            </div>
         }
      >
         <form id="redeem-form" onSubmit={handleRedeem} className="space-y-8">
            {activeMembershipForRedeem && (
               <div className="bg-zen-cream/30 p-6 rounded-3xl border border-zen-brown/15">
                  <p className="font-serif font-lg font-bold text-zen-brown">{activeMembershipForRedeem.client?.name}</p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-zen-brown/15">
                     <span className="text-xl font-serif font-bold text-zen-brown">{activeMembershipForRedeem.remainingSessions} / {activeMembershipForRedeem.totalSessions} sessions</span>
                  </div>
               </div>
            )}

            <ZenDropdown 
               label="Service" 
               options={(services || []).map((s: any) => s.name)} 
               value={(services || []).find((s: any) => s._id === redeemData.serviceId)?.name || ''} 
               onChange={(val: any) => {
                  const s = (services || []).find((serv: any) => serv.name === val);
                  if (s) setRedeemData({...redeemData, serviceId: s._id});
               }}
            />

            <ZenTextarea label="Notes" value={redeemData.notes} onChange={(e: any) => setRedeemData({...redeemData, notes: e.target.value})} />
         </form>
      </Modal>

      {/* Usage History Modal */}
      <Modal 
         isOpen={isHistoryModalOpen} 
         onClose={() => setIsHistoryModalOpen(false)} 
         title="Membership History" 
         subtitle="Historical usage records"
         maxWidth="max-w-4xl" 
         headerIcon={History}
         footer={
            <div className="flex justify-between items-center">
               <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest">Client</span>
                  <p className="font-serif font-bold text-zen-brown">{selectedHistory?.client?.name}</p>
               </div>
               <ZenBadge variant="sand">{selectedHistory?.plan?.name}</ZenBadge>
            </div>
         }
      >
         <div className="space-y-10">

            <div className="bg-white/70 rounded-[2.5rem] border border-white overflow-hidden shadow-sm">
               <div className="table-container">
               <table className="w-full min-w-[760px]">
                  <thead>
                     <tr>
                        <th>S No</th>
                        <th>Date</th>
                        <th>Branch</th>
                        <th>Service</th>
                        <th>Time</th>
                     </tr>
                  </thead>
                  <tbody>
                     {selectedHistory?.usageHistory?.length > 0 ? selectedHistory.usageHistory.map((usage: any, idx: number) => (
                        <tr key={idx}>
                           <td>{(idx + 1).toString().padStart(2, '0')}</td>
                           <td>
                              <span className="zen-table-primary">{new Date(usage.usedAt).toLocaleDateString()}</span>
                           </td>
                           <td>
                              <div className="flex items-center gap-2">
                                 <MapPin size={10} className="text-zen-sand" />
                                 {usage.branch?.name || 'Main Branch'}
                              </div>
                           </td>
                           <td>
                              <span className="zen-table-primary">{usage.service?.name || usage.serviceId}</span>
                           </td>
                           <td>
                              <span className="zen-table-meta">{new Date(usage.usedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                           </td>
                        </tr>
                     )) : (
                        <tr>
                           <td colSpan={5} className="py-12 text-center text-sm font-serif italic text-zen-brown/30">No redemption records found for this membership</td>
                        </tr>
                     )}
                  </tbody>
               </table>
               </div>
            </div>

            <div className="flex justify-center pt-4">
               <ZenButton variant="secondary" onClick={() => setIsHistoryModalOpen(false)} className="px-12">Close History</ZenButton>
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
