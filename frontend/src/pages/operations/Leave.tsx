import React, { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { CalendarDays, CheckCircle2, XCircle, Clock, Plus, Trash2, Calendar, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenBadge, ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { ZenInput, ZenDropdown, ZenTextarea, ZenDatePicker } from '../../components/zen/ZenInputs';
import { Modal } from '../../components/shared/Modal';
import { notify } from '../../components/shared/ZenNotification';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { useBranches } from '../../context/BranchContext';

interface LeaveRequest {
  _id: string;
  employeeName: string;
  type: string;
  reason: string;
  date: string;
  status: string;
}

interface Employee {
  _id: string;
  name: string;
}

const Leave = () => {
  const { user } = useAuth();
  const { selectedBranch } = useBranches();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    employeeName: '',
    type: 'Full Day',
    reason: '',
    date: dayjs().format('YYYY-MM-DD')
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const authHeader = { 'Authorization': `Bearer ${user?.token}` };
      const [leavesRes, employeesRes] = await Promise.all([
        fetch(`${API_URL}/leaves`, { headers: authHeader }),
        fetch(`${API_URL}/employees`, { headers: authHeader })
      ]);
      const leavesData = await leavesRes.json();
      const employeesData = await employeesRes.json();
      
      if (Array.isArray(leavesData)) setRequests(leavesData);
      if (Array.isArray(employeesData)) setEmployees(employeesData.filter((e: any) => e.status === 'Active'));
    } catch (error) {
      notify('error', 'Error', 'Failed to synchronize workspace records');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    let filtered = requests;

    // Filter by branch (need to check employee branch)
    if (selectedBranch !== 'all') {
      filtered = filtered.filter(req => {
        const emp = employees.find(e => e.name === req.employeeName);
        return emp && ((emp as any).branch === selectedBranch || (emp as any).branch?._id === selectedBranch);
      });
    }

    return filtered.filter(req => 
      (req.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.reason || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [requests, searchTerm, selectedBranch, employees]);

  const filteredEmployees = useMemo(() => {
    if (selectedBranch === 'all') return employees;
    return employees.filter(e => (e as any).branch === selectedBranch || (e as any).branch?._id === selectedBranch);
  }, [employees, selectedBranch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/leaves`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        notify('success', 'Presence Pause Request', 'Your application has been logged for review.');
        setIsModalOpen(false);
        fetchData();
        setFormData({
          employeeName: '',
          type: 'Full Day',
          reason: '',
          date: dayjs().format('YYYY-MM-DD')
        });
      }
    } catch (error) {
      notify('error', 'Error', 'Submission failed');
    }
  };

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
      title="Workspace Absence"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      addButtonLabel="Apply for Absence"
      onAddClick={() => setIsModalOpen(true)}
      addButtonIcon={<Plus size={18} />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
         <div className="lg:col-span-1 space-y-8">
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl border border-zen-brown/15 shadow-sm group hover:translate-y-[-4px] transition-all duration-700 relative overflow-hidden">
               <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-zen-brown group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-1000">
                  <CalendarDays size={120} />
               </div>
               <h3 className="text-lg font-serif font-black text-zen-brown mb-6 flex items-center gap-3 relative z-10">
                  <CalendarDays size={20} className="text-zen-sand" />
                  Pause Balances
               </h3>
               <div className="space-y-4 relative z-10">
                  <div className="group p-5 bg-zen-cream/30 rounded-2xl border border-zen-brown/15 hover:bg-white transition-all duration-500">
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-[0.2em]">Service Leave</span>
                        <span className="text-base font-serif font-black text-zen-brown">08</span>
                     </div>
                     <div className="h-1 bg-zen-brown/5 rounded-full overflow-hidden">
                        <div className="h-full bg-zen-sand w-[60%] rounded-full" />
                     </div>
                  </div>
                  
                  <div className="group p-5 bg-zen-leaf/5 rounded-2xl border border-zen-leaf/10 hover:bg-white transition-all duration-500">
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-bold text-zen-leaf/40 uppercase tracking-[0.2em]">Wellness Period</span>
                        <span className="text-base font-serif font-black text-zen-leaf">04</span>
                     </div>
                     <div className="h-1 bg-zen-leaf/10 rounded-full overflow-hidden">
                        <div className="h-full bg-zen-leaf w-[30%] rounded-full" />
                     </div>
                  </div>

                  <div className="group p-5 bg-zen-brown/5 rounded-2xl border border-zen-brown/15 hover:bg-white transition-all duration-500">
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-[0.2em]">Casual Drift</span>
                        <span className="text-base font-serif font-black text-zen-brown">02</span>
                     </div>
                     <div className="h-1 bg-zen-brown/10 rounded-full overflow-hidden">
                        <div className="h-full bg-zen-brown w-[15%] rounded-full" />
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-zen-brown p-8 rounded-2xl text-white shadow-sm relative overflow-hidden group transition-all duration-700 hover:translate-y-[-4px]">
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-1000">
                  <Sparkles size={100} />
               </div>
               <p className="text-[9px] font-bold opacity-40 uppercase tracking-[0.4em] mb-4">Quick Fact</p>
               <h4 className="text-base font-serif font-black mb-2">Rest is Productive</h4>
               <p className="text-xs opacity-60 font-medium leading-relaxed">Sustainable presence requires periods of retreat. Use your balance to recharge the workspace's energy.</p>
            </div>
         </div>

         <div className="lg:col-span-3">
            <div className="table-container w-full bg-white rounded-xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in fade-in duration-700 h-fit">
                  <div className="hidden sm:block">
                  <table className="w-full text-center border-collapse min-w-[800px]">
                     <thead>
                        <tr>
                           <th>S No</th>
                           <th>Ambassador</th>
                           <th>Pause Type</th>
                           <th>Service Date</th>
                           <th>State</th>
                           <th>Actions</th>
                        </tr>
                     </thead>
                     <tbody>
                        {(!filteredRequests || filteredRequests.length === 0) && (
                           <tr>
                              <td colSpan={6} className="px-6 py-16 text-center text-[11px] font-sans text-gray-400 bg-gray-50/30">No registry data available</td>
                           </tr>
                        )}

                        {filteredRequests.map((req, idx) => (
                           <tr key={req._id} className="transition-all group border-b border-black/[0.02]">
                              <td className="text-center italic opacity-40 text-[11px]">
                                {(idx + 1).toString().padStart(2, '0')}
                              </td>
                              <td>
                                 <span className="zen-table-primary">{req.employeeName}</span>
                              </td>
                              <td>
                                 <div className="flex items-center justify-center gap-2">
                                    {req.type === 'Full Day' ? <Calendar size={12} className="text-zen-sand" /> : <Clock size={12} className="text-zen-brown/40" />}
                                    <span className="text-xs text-zen-brown/60 font-bold">{req.type}</span>
                                 </div>
                              </td>
                              <td>
                                 <span className="text-xs text-zen-brown/60 font-bold">{dayjs(req.date).format('MMM DD, YYYY')}</span>
                              </td>
                              <td>
                                 <div className="flex justify-center">
                                    <ZenBadge variant={
                                       req.status === 'Approved' ? 'leaf' : 
                                       req.status === 'Rejected' ? 'danger' : 'sand'
                                    } className="scale-90 font-bold uppercase tracking-widest px-4 py-1.5">
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
                                            onClick={() => handleStatusChange(req._id, 'Approved')}
                                          />
                                          <ZenIconButton 
                                            icon={XCircle} 
                                            variant="danger" 
                                            onClick={() => handleStatusChange(req._id, 'Rejected')}
                                          />
                                       </>
                                    )}
                                    {(user?.role === 'Admin' || user?.role === 'Manager') && (
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
                       {filteredRequests.length === 0 && (
                          <tr>
                             <td colSpan={5} className="py-20 text-center italic font-serif text-zen-brown/20 text-lg">
                                No absence records found in the current record
                             </td>
                          </tr>
                       )}
                    </tbody>
                 </table>
              </div>

              {/* Mobile Interaction Cards */}
              <div className="sm:hidden grid grid-cols-1 divide-y divide-zen-brown/15">
                 {filteredRequests.map((req) => (
                    <div key={req._id} className="p-8 space-y-6">
                       <div className="flex justify-between items-start">
                          <div>
                             <h4 className="text-lg font-serif font-bold text-zen-brown mb-1">{req.employeeName}</h4>
                             <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[.3em]">{dayjs(req.date).format('MMM DD, YYYY')}</p>
                          </div>
                          <ZenBadge variant={req.status === 'Approved' ? 'leaf' : req.status === 'Rejected' ? 'danger' : 'sand'}>
                             {req.status}
                          </ZenBadge>
                       </div>
                       
                       <div className="p-5 bg-zen-cream/20 rounded-[2rem] border border-zen-brown/15">
                          <p className="text-[9px] font-bold text-zen-brown/20 uppercase tracking-[.3em] mb-2">{req.type}</p>
                          <p className="text-sm text-zen-brown/60 italic leading-relaxed">"{req.reason}"</p>
                       </div>

                       {(req.status === 'Pending' && (user?.role === 'Admin' || user?.role === 'Manager')) && (
                          <div className="flex gap-4">
                             <ZenButton variant="primary" className="flex-1 py-3" onClick={() => handleStatusChange(req._id, 'Approved')}>Approve</ZenButton>
                             <ZenButton variant="outline" className="flex-1 py-3 bg-white" onClick={() => handleStatusChange(req._id, 'Rejected')}>Reject</ZenButton>
                          </div>
                       )}
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Apply for Absence"
      >
        <form onSubmit={handleSubmit} className="px-10 py-12 space-y-6">
           <ZenDropdown
             label="Ambassador"
             value={formData.employeeName}
             onChange={val => setFormData({...formData, employeeName: val})}
             placeholder="Select Ambassador"
             options={filteredEmployees.map(e => e.name)}
           />

           <div className="grid grid-cols-2 gap-6">
              <ZenDropdown
                label="Pause Type"
                value={formData.type}
                onChange={val => setFormData({...formData, type: val})}
                options={['Full Day', 'Half Day', 'Short Leave']}
              />
              <ZenInput
                type="date"
                label="Service Date"
                required
                value={formData.date}
                onChange={(e: any) => setFormData({...formData, date: e.target.value})}
              />
           </div>

           <ZenTextarea
             label="Purpose of Pause"
             required
             placeholder="Describe the nature of your retreat..."
             value={formData.reason}
             onChange={(e: any) => setFormData({...formData, reason: e.target.value})}
           />

           <div className="pt-4 flex gap-4">
              <ZenButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Discard</ZenButton>
              <ZenButton type="submit" className="flex-[2] py-5 rounded-[2rem] shadow-sm">
                 Dispatch Application
              </ZenButton>
           </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Purge Application?"
        message="Are you certain you wish to remove this absence record from the workspace's history?"
      />
    </ZenPageLayout>
  );
};

export default Leave;
