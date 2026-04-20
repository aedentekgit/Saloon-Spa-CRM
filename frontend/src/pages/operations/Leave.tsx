import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { 
  CalendarDays, CheckCircle2, XCircle, Plus, Trash2, Calendar, 
  ArrowRight, Tag 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenBadge, ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { notify } from '../../components/shared/ZenNotification';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { useData } from '../../context/DataContext';
import { useBranches } from '../../context/BranchContext';

interface LeaveRequest {
  _id: string;
  employeeName: string;
  type: string;
  reason: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  status: string;
  user: string;
}

interface Employee {
  _id: string;
  name: string;
  branch: any;
}

const Leave = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { selectedBranch } = useBranches();
  const { leaves: requests, employees, refreshData, loading } = useData();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  const fetchData = async () => {
    refreshData();
  };

  const filteredRequests = useMemo(() => {
    let filtered = requests;

    // Filter by branch
    if (selectedBranch !== 'all' && user?.role === 'Admin') {
      filtered = filtered.filter(req => {
        const emp = employees.find(e => e.name === req.employeeName);
        return emp && (emp.branch === selectedBranch || emp.branch?._id === selectedBranch);
      });
    }

    return filtered.filter(req => 
      (req.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.reason || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.type || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [requests, searchTerm, selectedBranch, employees, user]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const response = await fetch(`${API_URL}/leaves/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        notify('info', 'Status Updated', `Request marked as ${status}`);
        fetchData();
      }
    } catch (error) {
      notify('error', 'Error', 'Action failed');
    }
  };

  const executeDelete = async () => {
    if (!requestToDelete) return;
    try {
      const response = await fetch(`${API_URL}/leaves/${requestToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });

      if (response.ok) {
        notify('success', 'Record Purged', 'Application has been removed');
        setIsConfirmOpen(false);
        fetchData();
      }
    } catch (error) {
      notify('error', 'Error', 'Removal failed');
    }
  };

  return (
    <ZenPageLayout
      title="Rest & Recharge"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      addButtonLabel="Apply for Leave"
      onAddClick={() => navigate('/leave/apply')}
      addButtonIcon={<Plus size={18} />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
         <div className="lg:col-span-1 space-y-8">
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-zen-brown/15 shadow-sm group hover:translate-y-[-4px] transition-all duration-700 relative overflow-hidden">
               <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-zen-brown group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-1000">
                  <CalendarDays size={120} />
               </div>
               <h3 className="text-lg font-serif font-black text-zen-brown mb-6 flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 rounded-2xl bg-zen-sand/10 flex items-center justify-center text-zen-sand">
                    <CalendarDays size={20} />
                  </div>
                  Retreat Balances
               </h3>
               <div className="space-y-4 relative z-10">
                  <div className="group p-5 bg-zen-cream/30 rounded-2xl border border-zen-brown/15 hover:bg-white transition-all duration-500">
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-[0.2em]">Annual Retreat</span>
                        <span className="text-base font-serif font-black text-zen-brown">14 Days</span>
                     </div>
                     <div className="h-1 bg-zen-brown/5 rounded-full overflow-hidden">
                        <div className="h-full bg-zen-sand w-[60%] rounded-full transition-all duration-1000" />
                     </div>
                  </div>
                  
                  <div className="group p-5 bg-zen-leaf/5 rounded-2xl border border-zen-leaf/10 hover:bg-white transition-all duration-500">
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-bold text-zen-leaf/40 uppercase tracking-[0.2em]">Wellness Buffer</span>
                        <span className="text-base font-serif font-black text-zen-leaf">05 Days</span>
                     </div>
                     <div className="h-1 bg-zen-leaf/10 rounded-full overflow-hidden">
                        <div className="h-full bg-zen-leaf w-[30%] rounded-full transition-all duration-1000" />
                     </div>
                  </div>

                  <div className="group p-5 bg-zen-brown/5 rounded-2xl border border-zen-brown/15 hover:bg-white transition-all duration-500">
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-[0.2em]">Casual Respite</span>
                        <span className="text-base font-serif font-black text-zen-brown">02 Days</span>
                     </div>
                     <div className="h-1 bg-zen-brown/10 rounded-full overflow-hidden">
                        <div className="h-full bg-zen-brown w-[15%] rounded-full transition-all duration-1000" />
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-zen-brown p-8 rounded-[2rem] text-white shadow-sm relative overflow-hidden group transition-all duration-700 hover:translate-y-[-4px]">
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-1000">
                  <CalendarDays size={100} className="rotate-12" />
               </div>
               <p className="text-[9px] font-bold opacity-40 uppercase tracking-[0.4em] mb-4">Zen Philosophy</p>
               <h4 className="text-base font-serif font-black mb-2 tracking-tight">Pause for Progress</h4>
               <p className="text-[11px] opacity-60 font-medium leading-relaxed italic">"Rest is the foundation of energy. A clear mind serves the sanctuary best."</p>
            </div>
         </div>

         <div className="lg:col-span-3">
            <div className="table-container w-full bg-white rounded-[2rem] border border-zen-brown/10 shadow-[0_20px_50px_rgba(0,0,0,0.03)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-1000 h-fit">
                  <div className="hidden sm:block">
                  <table className="w-full text-center border-collapse">
                     <thead>
                        <tr className="bg-zen-cream/30">
                           <th className="py-6 text-[10px] font-black text-zen-brown/30 uppercase tracking-[0.2em]">Ref No</th>
                           <th className="py-6 text-[10px] font-black text-zen-brown/30 uppercase tracking-[0.2em]">Sanctuary Ambassador</th>
                           <th className="py-6 text-[10px] font-black text-zen-brown/30 uppercase tracking-[0.2em]">Pause Nature</th>
                           <th className="py-6 text-[10px] font-black text-zen-brown/30 uppercase tracking-[0.2em]">Duration</th>
                           <th className="py-6 text-[10px] font-black text-zen-brown/30 uppercase tracking-[0.2em]">State</th>
                           <th className="py-6 text-[10px] font-black text-zen-brown/30 uppercase tracking-[0.2em]">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zen-brown/5">
                        {(!filteredRequests || filteredRequests.length === 0) && (
                           <tr>
                              <td colSpan={6} className="px-6 py-24 text-center">
                                <div className="flex flex-col items-center gap-4 opacity-20">
                                  <Calendar size={48} strokeWidth={1} />
                                  <p className="text-xs font-serif font-black tracking-widest uppercase">No Absence Registry Data</p>
                                </div>
                              </td>
                           </tr>
                        )}

                        {filteredRequests.map((req, idx) => (
                           <tr key={req._id} className="transition-all hover:bg-zen-cream/10 group">
                              <td className="text-center">
                                <span className="text-[10px] font-black text-zen-brown/20 bg-zen-cream/50 px-3 py-1 rounded-full">
                                  {(idx + 1).toString().padStart(2, '0')}
                                </span>
                              </td>
                              <td>
                                 <div className="flex items-center justify-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-zen-brown/5 flex items-center justify-center text-zen-brown/40 font-serif font-black text-[10px]">
                                     {req.employeeName?.[0]}
                                   </div>
                                   <span className="text-sm font-serif font-black text-zen-brown">{req.employeeName}</span>
                                 </div>
                              </td>
                              <td>
                                 <div className="flex flex-col items-center">
                                    <span className="text-xs text-zen-brown font-bold flex items-center gap-1.5">
                                      <Tag size={10} className="text-zen-sand" />
                                      {req.type}
                                    </span>
                                    <span className="text-[9px] text-zen-brown/30 italic truncate max-w-[150px]">{req.reason}</span>
                                 </div>
                              </td>
                              <td>
                                 <div className="flex flex-col items-center py-4">
                                    <div className="flex items-center gap-2 text-xs font-black text-zen-brown/60">
                                      <span>{dayjs(req.startDate).format('MMM DD')}</span>
                                      <ArrowRight size={10} className="text-zen-brown/20" />
                                      <span>{dayjs(req.endDate).format('MMM DD')}</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-zen-sand uppercase tracking-widest mt-1">
                                      {req.daysCount} {req.daysCount === 1 ? 'Day' : 'Days'} Pause
                                    </span>
                                 </div>
                              </td>
                              <td>
                                 <div className="flex justify-center">
                                    <ZenBadge variant={
                                       req.status === 'Approved' ? 'leaf' : 
                                       req.status === 'Rejected' ? 'danger' : 'sand'
                                    } className="scale-90 font-black uppercase tracking-[0.2em] px-5 py-2 rounded-full">
                                       {req.status}
                                    </ZenBadge>
                                 </div>
                              </td>
                              <td>
                                 <div className="flex items-center justify-center gap-2">
                                    {(req.status === 'Pending' && (user?.role === 'Admin' || user?.role === 'Manager')) && (
                                       <>
                                          <ZenIconButton 
                                            icon={CheckCircle2} 
                                            variant="leaf"
                                            onClick={() => handleStatusChange(req._id, 'Approved')}
                                          />
                                          <ZenIconButton 
                                            icon={XCircle} 
                                            variant="danger" 
                                            onClick={() => handleStatusChange(req._id, 'Rejected')}
                                          />
                                       </>
                                    )}
                                    {((user?.role === 'Admin' || user?.role === 'Manager') || (req.user === user?._id && req.status === 'Pending')) && (
                                       <ZenIconButton 
                                         icon={Trash2} 
                                         variant="danger" 
                                         onClick={() => { setRequestToDelete(req._id); setIsConfirmOpen(true); }}
                                       />
                                    )}
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>

               {/* Mobile Friendly Cards */}
               <div className="sm:hidden grid grid-cols-1 divide-y divide-zen-brown/5">
                  {filteredRequests.map((req) => (
                     <div key={req._id} className="p-8 space-y-6">
                        <div className="flex justify-between items-start">
                           <div className="flex gap-4">
                             <div className="w-12 h-12 rounded-2xl bg-zen-cream/50 flex items-center justify-center text-zen-brown font-serif font-black">
                               {req.employeeName?.[0]}
                             </div>
                             <div>
                                <h4 className="text-lg font-serif font-black text-zen-brown mb-0.5 tracking-tight">{req.employeeName}</h4>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-zen-brown/30 uppercase tracking-[.2em]">
                                  {dayjs(req.startDate).format('MMM DD')}
                                  <ArrowRight size={8} />
                                  {dayjs(req.endDate).format('MMM DD')}
                                </div>
                             </div>
                           </div>
                           <ZenBadge variant={req.status === 'Approved' ? 'leaf' : req.status === 'Rejected' ? 'danger' : 'sand'} className="rounded-full px-4 text-[9px] tracking-widest">
                              {req.status}
                           </ZenBadge>
                        </div>
                        
                        <div className="p-5 bg-zen-cream/20 rounded-[1.5rem] border border-zen-brown/5 relative">
                           <div className="flex justify-between items-center mb-3">
                              <span className="text-[9px] font-black text-zen-brown/40 uppercase tracking-[.2em]">{req.type}</span>
                              <span className="text-[9px] font-black text-zen-sand uppercase tracking-[.2em]">{req.daysCount} Days</span>
                           </div>
                           <p className="text-sm font-serif text-zen-brown/60 italic leading-relaxed">"{req.reason}"</p>
                        </div>

                        {(req.status === 'Pending' && (user?.role === 'Admin' || user?.role === 'Manager')) && (
                           <div className="flex gap-4">
                              <ZenButton variant="primary" className="flex-1 py-4 rounded-2xl" onClick={() => handleStatusChange(req._id, 'Approved')}>Grant Pause</ZenButton>
                              <ZenButton variant="outline" className="flex-1 py-4 bg-white rounded-2xl" onClick={() => handleStatusChange(req._id, 'Rejected')}>Decline</ZenButton>
                           </div>
                        )}
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Purge Application?"
        message="Are you certain you wish to remove this absence record from the workspace's history? This action cannot be reversed."
      />
    </ZenPageLayout>
  );
};

export default Leave;


