import React, { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { 
  UserPlus, Mail, Phone, Edit2, Trash2, User,
  UserCircle, Lock, Eye, EyeOff, Sparkles, X, Calendar, Info,
  FileText, Upload, Download, File, Loader2, Cloud, Clock, Zap, Shield
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { validatePhoneNumber, getPhoneValidationProtocol } from '../../utils/validation';
import { Modal } from '../../components/shared/Modal';
import { notify } from '../../components/shared/ZenNotification';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

// Global Zen Components
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { ZenDropdown, ZenInput, ZenTextarea, ZenDatePicker } from '../../components/zen/ZenInputs';
import { ZenIconButton, ZenBadge, ZenButton } from '../../components/zen/ZenButtons';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { useBranches } from '../../context/BranchContext';
import { useData } from '../../context/DataContext';


interface Role {
  _id: string;
  name: string;
}

interface Branch {
  _id: string;
  name: string;
}

interface ZenDocument {
  _id: string;
  name: string;
  url: string;
  fileType: string;
  uploadedAt: string;
}

interface Payroll {
  type: 'Monthly' | 'Hourly';
  baseAmount: number;
  otRate: number;
  shiftHours: number;
}

interface Employee {
  _id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  address: string;
  salary: number;
  profilePic?: string;
  services: string[];
  attendance: number;
  earnings: number;
  status: string;
  branch?: Branch;
  joiningDate: string;
  shift?: string;
  shiftType: 'Day' | 'Week' | 'Month';
  documents: ZenDocument[];
  payroll: Payroll;
  createdAt: string;
}

const Employees = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { branches, selectedBranch } = useBranches();
  const { services, appointments: allAppointments } = useData();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('zen_specialist_view') as 'grid' | 'table') || 'grid';
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    address: '',
    salary: 0,
    password: '',
    confirmPassword: '',
    joiningDate: new Date().toISOString().split('T')[0],
    branch: '',
    status: 'Active',
    shift: '',
    shiftType: 'Day' as 'Day' | 'Week' | 'Month',
    payroll: {
      type: 'Monthly' as const,
      baseAmount: 0,
      otRate: 0,
      shiftHours: 8,
      commissionBasis: true
    }
  });

  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'payroll' | 'documents' | 'activity'>('profile');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docName, setDocName] = useState('');
  const [employeeAttendance, setEmployeeAttendance] = useState<any[]>([]);
  const [historyView, setHistoryView] = useState<'calendar' | 'list'>('calendar');
  const [historyMonth, setHistoryMonth] = useState(dayjs().format('YYYY-MM'));
  const [editingAttendance, setEditingAttendance] = useState<any>(null);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceFormData, setAttendanceFormData] = useState({
    checkIn: '',
    checkOut: ''
  });

  const payrollResonance = useMemo(() => {
    if (!formData.name) return { commissionTotal: 0, totalEarnings: 0, monthApts: [] };

    const monthApts = allAppointments.filter(a => a.employee === formData.name && a.date?.startsWith(historyMonth));
    let commissionTotal = 0;
    monthApts.forEach(apt => {
       const service = services.find(s => s.name === apt.service);
       if (service && service.commissionValue) {
          if (service.commissionType === 'Fixed') {
             commissionTotal += service.commissionValue;
          } else {
             commissionTotal += ((service.price || 0) * service.commissionValue) / 100;
          }
       }
    });

    const otRecords = employeeAttendance.filter(log => log.date?.startsWith(historyMonth) && log.overtimeMinutes > 0);
    const totalOtMinutes = otRecords.reduce((acc, log) => acc + log.overtimeMinutes, 0);
    const otEarnings = (totalOtMinutes / 60) * (formData.payroll.otRate || 0);
    
    const baseAmount = formData.payroll.type === 'Monthly' ? (formData.payroll.baseAmount || formData.salary || 0) : 0;
    const totalEarnings = baseAmount + commissionTotal + otEarnings;

    return { commissionTotal, totalEarnings, monthApts };
  }, [allAppointments, services, formData.name, formData.payroll, formData.salary, historyMonth, employeeAttendance]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

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

  const openConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'danger') => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm,
      type
    });
  };

  useEffect(() => {
    fetchEmployees();
  }, [selectedBranch, page]);

  useEffect(() => {
    fetchRoles();
    fetchShifts();
  }, [selectedBranch]);

  const fetchShifts = async () => {
    try {
      const url = new URL(`${API_URL}/shifts`);
      if (selectedBranch && selectedBranch !== 'all') {
        url.searchParams.append('branch', selectedBranch);
      }
      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setShifts(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    localStorage.setItem('zen_specialist_view', viewMode);
    setPage(1); // Reset to first page when changing view mode to ensure correct limits
  }, [viewMode]);

  const PAGE_LIMIT = 12;

  const simulateAttendance = async () => {
    if (!editingEmp) return;
    
    // Find the shift details for this employee to get accurate timings
    const empShift = shifts.find(s => s.name === editingEmp.shift);
    const shiftStart = empShift?.startTime || "09:00 AM";
    const shiftEnd = empShift?.endTime || "06:00 PM";

    setLoading(true);
    try {
      const anchorDate = dayjs(formData.joiningDate);
      const startOfMonth = dayjs(historyMonth).startOf('month');
      
      // Start simulation either from joining date or from month start, whichever is later in the current month
      let startDate = startOfMonth;
      if (anchorDate.format('YYYY-MM') === historyMonth && anchorDate.isAfter(startOfMonth)) {
         startDate = anchorDate;
      }

      const promises = [];
      const cycleDays = formData.shiftType === 'Week' ? 7 : 
                        formData.shiftType === 'Month' ? 30 : 
                        formData.shiftType === 'Day' ? 5 :
                        startDate.daysInMonth();

      for (let d = 0; d < cycleDays; d++) {
        const date = startDate.add(d, 'day');
        // Prevent simulating across month boundaries if we only want this month
        if (date.format('YYYY-MM') !== historyMonth) break;
        // We still don't want to simulate future if they are logging real attendance, 
        // but for "Establish Flow" we might want the whole month.
        // Let's allow full month for simulation.

        const dateStr = date.format('YYYY-MM-DD');
        
        // Use shift timings with small random variations for realism
        const checkIn = dayjs(shiftStart, 'hh:mm A')
          .add(Math.floor(Math.random() * 21) - 10, 'minute') // +/- 10 mins variation
          .format('hh:mm A');
          
        const checkOut = dayjs(shiftEnd, 'hh:mm A')
          .add(Math.floor(Math.random() * 41) - 5, 'minute') // -5 to +35 mins variation (often stays late)
          .format('hh:mm A');
        
        promises.push(fetch(`${API_URL}/attendance`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.token}` 
          },
          body: JSON.stringify({
            date: dateStr,
            checkIn,
            checkOut,
            shift: editingEmp.shift,
            targetUserId: editingEmp._id,
            status: 'Present'
          })
        }));
      }
      await Promise.all(promises);
      notify('success', 'Roster Established', `Generated ${cycleDays} nodes based on ${editingEmp.shiftType} sequence`);
      
      // Force refresh activity data
      const res = await fetch(`${API_URL}/attendance`, { headers: { 'Authorization': `Bearer ${user?.token}` } });
      const data = await res.json();
      if (Array.isArray(data)) {
        const history = data.filter((item: any) => item.user?._id === editingEmp._id || item.user === editingEmp._id);
        history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setEmployeeAttendance(history);
      }
    } catch (e) {
      notify('error', 'Simulation Failed', 'Could not establish temporal sequence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'activity' && editingEmp) {
      const getAttendanceHistory = async () => {
        try {
          const res = await fetch(`${API_URL}/attendance`, { headers: { 'Authorization': `Bearer ${user?.token}` } });
          const data = await res.json();
          if (Array.isArray(data)) {
            const history = data.filter((item: any) => item.user?._id === editingEmp._id || item.user === editingEmp._id);
            history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setEmployeeAttendance(history);
          }
        } catch (e) {}
      };
      getAttendanceHistory();
    }
  }, [activeTab, editingEmp]);

   const deleteAttendance = async (id: string) => {
     openConfirm(
       'Obliterate Record?',
       'This action will permanently remove this temporal node from the registry.',
       async () => {
         try {
           setLoading(true);
           await fetch(`${API_URL}/attendance/${id}`, {
             method: 'DELETE',
             headers: { 'Authorization': `Bearer ${user?.token}` }
           });
           notify('success', 'Registry Purged', 'The node has been removed');
           setEmployeeAttendance(prev => prev.filter(a => a._id !== id));
         } catch (e) {
           notify('error', 'Erasure Failed', 'Could not remove the record');
         } finally {
           setLoading(false);
         }
       }
     );
   };

   const updateAttendance = async () => {
     if (!editingAttendance) return;
     try {
       setLoading(true);
       await fetch(`${API_URL}/attendance/${editingAttendance._id}`, {
         method: 'PUT',
         headers: { 
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${user?.token}` 
         },
         body: JSON.stringify(attendanceFormData)
       });
       notify('success', 'Sequence Updated', 'Temporal node refined');
       setEmployeeAttendance(prev => prev.map(a => a._id === editingAttendance._id ? { ...a, ...attendanceFormData } : a));
       setIsAttendanceModalOpen(false);
     } catch (e) {
       notify('error', 'Adjustment Failed', 'Could not refine the record');
     } finally {
       setLoading(false);
     }
   };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_URL}/employees?page=${page}&limit=${PAGE_LIMIT}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      if (data.data) {
        setEmployees(data.data);
        setTotalPages(data.pagination.pages);
      } else if (Array.isArray(data)) {
        setEmployees(data);
        setTotalPages(1);
      }
    } catch (error) {
      notify('error', 'Error', 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    let filtered = employees;
    if (selectedBranch !== 'all') {
      filtered = filtered.filter(emp => emp.branch?._id === selectedBranch || (emp as any).branch === selectedBranch);
    }
    return filtered.filter(emp => 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm, selectedBranch]);

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_URL}/roles`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      setRoles(data);
    } catch (error) {
      console.error('Failed to load roles');
    }
  };

  const toggleStatus = async (emp: Employee) => {
    const newStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const response = await fetch(`${API_URL}/employees/${emp._id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        notify('success', 'Refined', `Specialist ${newStatus}`);
        fetchEmployees();
      }
    } catch (error) {
      notify('error', 'Error', 'Toggle failed');
    }
  };

  const handleOpenModal = (emp: Employee | null = null) => {
    if (emp) {
      setEditingEmp(emp);
      const dialingCode = settings?.general.dialingCode || '+974';
      const cleanPhone = emp.phone.startsWith(dialingCode) ? emp.phone.slice(dialingCode.length) : emp.phone;

      setFormData({
        name: emp.name,
        role: emp.role,
        email: emp.email,
        phone: cleanPhone,
        address: emp.address,
        salary: emp.salary,
        password: '',
        confirmPassword: '',
        joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        branch: emp.branch?._id || '',
        status: emp.status || 'Active',
        shift: emp.shift || '',
        shiftType: emp.shiftType || 'Day',
        payroll: emp.payroll || { type: 'Monthly', baseAmount: 0, otRate: 0, shiftHours: 8, commissionBasis: true }
      });
    } else {
      setEditingEmp(null);
      setFormData({
        name: '',
        role: roles.length > 0 ? roles[0].name : '',
        email: '',
        phone: '',
        address: '',
        salary: 3000,
        password: '',
        confirmPassword: '',
        joiningDate: new Date().toISOString().split('T')[0],
        branch: branches.length > 0 ? branches[0]._id : '',
        status: 'Active',
        shift: '',
        shiftType: 'Day',
        payroll: { type: 'Monthly', baseAmount: 0, otRate: 0, shiftHours: 8, commissionBasis: true }
      });
    }
    setProfilePicFile(null);
    setActiveTab('profile');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return notify('error', 'Validation Error', 'Full Identity is required');
    }
    if (!editingEmp && formData.password !== formData.confirmPassword) {
      return notify('error', 'Validation', 'Passwords do not match');
    }
    const phoneValidation = validatePhoneNumber(formData.phone, settings?.general?.countryIso || 'QA');
    if (!phoneValidation.isValid) {
      notify('error', 'Validation Error', phoneValidation.message || 'Invalid phone number');
      return;
    }

    const data = new FormData();
    const fullPhone = `${settings?.general?.dialingCode || '+974'}${formData.phone}`;

    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'confirmPassword') return;
      if (key === 'phone') {
        data.append(key, fullPhone);
      } else if (key === 'payroll') {
        data.append(key, JSON.stringify(value));
      } else {
        data.append(key, value !== undefined && value !== null ? value.toString() : '');
      }
    });
    if (profilePicFile) data.append('profilePic', profilePicFile);

    try {
      const url = editingEmp ? `${API_URL}/employees/${editingEmp._id}` : `${API_URL}/employees`;
      const method = editingEmp ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${user?.token}` },
        body: data
      });
      if (response.ok) {
        notify('success', 'Refined', `Specialist record updated`);
        setIsModalOpen(false);
        fetchEmployees();
      } else {
        const error = await response.json();
        notify('error', 'Error', error.message || 'Action failed');
      }
    } catch (error) {
      notify('error', 'Error', 'Connection failed');
    }
  };

  const handleDelete = async (id: string) => {
    openConfirm(
      'Archive Specialist',
      'Archive this specialist profile? They will be moved to the historical registry.',
      async () => {
        try {
          const response = await fetch(`${API_URL}/employees/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${user?.token}` }
          });
          if (response.ok) {
            notify('success', 'Archived', 'Profile removed from active registry');
            fetchEmployees();
          }
        } catch (error) {
          notify('error', 'Error', 'Action failed');
        }
      }
    );
  };

  const getImageUrl = (path: string | undefined) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.replace(/^\.?\//, '');
    return `${API_URL.replace('/api', '')}/${cleanPath}`;
  };

  return (
    <ZenPageLayout
      title="Specialists"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      addButtonLabel="Add Specialist"
      addButtonIcon={<UserPlus size={18} />}
      onAddClick={() => handleOpenModal()}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-zen-brown border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-10" : "bg-white/70 backdrop-blur-xl rounded-[2.5rem] sm:rounded-[3.5rem] shadow-sm border border-white overflow-hidden overflow-x-auto"}>
          {viewMode === 'grid' ? (
            filteredEmployees.map((emp) => (
              <div key={emp._id} className={`group relative bg-white/80 backdrop-blur-xl rounded-[2.5rem] sm:rounded-[3.5rem] p-6 sm:p-8 shadow-sm border border-white transition-all duration-700 hover:shadow-zen-brown/15 hover:-translate-y-2 h-full flex flex-col justify-between overflow-hidden ${emp.status === 'Inactive' ? 'opacity-60 saturate-0' : ''}`}>
                 <div className="absolute top-0 right-0 w-32 h-32 bg-zen-sand/5 rounded-bl-full -z-0 pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>
                 <div className="relative z-10">
                    <div className="flex items-center gap-4 lg:gap-6 mb-4 lg:mb-6">
                       <div className="relative w-16 lg:w-20 h-16 lg:h-20 rounded-full overflow-hidden border-4 border-zen-cream bg-zen-cream flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-700 shadow-xl">
                          {emp.profilePic ? (<img src={getImageUrl(emp.profilePic)} alt={emp.name} className="w-full h-full object-cover" />) : (<User size={32} className="text-zen-brown/10" strokeWidth={1} />)}
                       </div>
                       <div className="min-w-0 flex-1">
                          <h3 className="text-2xl sm:text-3xl font-serif font-black text-zen-brown tracking-tighter leading-none mb-1 truncate">{emp.name}</h3>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                             <p className="text-[10px] font-black text-zen-brown/30 uppercase tracking-[0.4em]">{emp.role}</p>
                             {(emp as any).branch?.name && (
                               <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md">
                                 {(emp as any).branch.name}
                               </span>
                             )}
                          </div>
                          <div className="mt-2 text-[9px] font-serif font-black uppercase tracking-widest text-zen-brown/20 flex items-center gap-1.5">
                             <Zap size={10} className="text-zen-sand" /> {emp.payroll?.type || 'Monthly'} Sequence
                          </div>
                       </div>
                       <div className="flex flex-col sm:flex-row gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all lg:translate-x-4 lg:group-hover:translate-x-0 duration-500">
                          <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(emp)} size="sm" />
                          <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDelete(emp._id)} size="sm" />
                       </div>
                    </div>
                 </div>
                 <div className="relative z-10 pt-4 border-t border-zen-brown/15 flex items-center justify-between">
                    <ZenBadge variant={emp.status === 'Active' ? 'leaf' : 'inactive'}>{emp.status === 'Inactive' ? 'Deactive' : emp.status}</ZenBadge>
                    <div className="flex items-center gap-2 text-zen-brown/20 italic text-[10px] font-medium font-serif">
                       Earnings: {settings?.general?.currencySymbol || 'QR'} {emp.earnings?.toLocaleString() || 0}
                    </div>
                 </div>
              </div>
            ))
          ) : (
            <table className="w-full text-center border-collapse min-w-[800px]">
               <thead>
                  <tr className="bg-zen-brown border-b border-zen-brown/15">
                     <th className="px-10">S No</th>
                     <th className="px-10">Specialist</th>
                     <th>Payroll</th>
                     <th>Shift</th>
                     <th>Earnings</th>
                     <th className="text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-zen-brown/15">
                  {filteredEmployees.map((emp, idx) => (
                    <tr key={emp._id} className="transition-all group">
                      <td className="text-center italic opacity-40">
                        {((page - 1) * PAGE_LIMIT + idx + 1).toString().padStart(2, '0')}
                      </td>
                     <td>
                        <div className="flex flex-col items-center">
                           <span className="zen-table-primary">{emp.name}</span>
                           <span className="zen-table-meta">{emp.role}</span>
                        </div>
                     </td>
                      <td>
                         <div className="flex items-center justify-center gap-2 text-[10px] text-zen-brown/40 italic font-black uppercase tracking-widest">
                            <Zap size={10} className="text-zen-sand" />
                            {emp.payroll?.type || 'Monthly'}
                         </div>
                      </td>
                      <td>
                         <div className="flex items-center justify-center gap-2 text-[10px] text-zen-brown/40 font-black uppercase tracking-widest">
                            {emp.shifts && emp.shifts.length > 0 ? (
                               <span>{emp.shifts[0].startTime} - {emp.shifts[0].endTime}</span>
                            ) : (
                               <span>No Shift</span>
                            )}
                         </div>
                      </td>
                      <td>
                         <ZenBadge variant="sand" className="scale-90 font-black tracking-widest">
                            {settings?.general?.currencySymbol || 'QR'} {emp.earnings?.toLocaleString() || 0}
                         </ZenBadge>
                      </td>
                      <td className="px-10 py-8 text-right">
                         <div className="flex items-center justify-end gap-3">
                            <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(emp)} />
                            <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDelete(emp._id)} />
                         </div>
                      </td>
                   </tr>
                 ))}
               </tbody>
            </table>
          )}
        </div>
      )}

      <ZenPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        maxWidth="max-w-4xl"
        header={
          <div className="flex flex-col shrink-0">
            <div className="flex items-center justify-between px-6 sm:px-10 py-6 sm:py-10 border-b border-zen-brown/15 bg-white/95 backdrop-blur-sm z-[60]">
               <div className="flex items-center gap-4 sm:gap-8 flex-1">
                  <div className="relative w-20 sm:w-28 h-20 sm:h-28 group cursor-pointer shrink-0">
                     <div className="w-full h-full rounded-full ring-4 ring-zen-cream overflow-hidden bg-zen-cream flex items-center justify-center transition-all group-hover:ring-zen-brown/20 shadow-xl">
                        {(profilePicFile || (editingEmp && editingEmp.profilePic)) ? (
                          <img src={profilePicFile ? URL.createObjectURL(profilePicFile) : getImageUrl(editingEmp?.profilePic)} className="w-full h-full object-cover" />
                        ) : <UserCircle className="text-zen-brown/10" size={56} />}
                     </div>
                     <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => setProfilePicFile(e.target.files?.[0] || null)} />
                  </div>
                  <div className="flex-1">
                     <ZenInput label="Full Identity" placeholder="e.g. Alexander Pierce" value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} className="font-serif text-xl sm:text-3xl pb-2 sm:pb-4 focus:border-zen-brown transition-all duration-500" />
                     <div className="w-full sm:w-72 mt-1 sm:mt-2">
                        <ZenDropdown label="Vocation" options={roles.filter(r => r.status === 'Active' || r.isActive).map(r => r.name)} value={formData.role} onChange={(val) => setFormData({...formData, role: val})} />
                     </div>
                  </div>
               </div>
               <ZenIconButton icon={X} onClick={() => setIsModalOpen(false)} className="self-start mt-2" />
            </div>

            <div className="flex items-center gap-4 sm:gap-8 px-6 sm:px-12 border-b border-zen-brown/15 bg-white/50 backdrop-blur-sm z-50 overflow-x-auto scrollbar-hide">
               {['profile', 'config', 'payroll', 'activity', 'documents'].map(tab => (
                  <button key={tab} type="button" onClick={() => setActiveTab(tab as any)} className={`py-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] relative transition-all min-w-max ${activeTab === tab ? 'text-zen-brown' : 'text-zen-brown/30 hover:text-zen-brown/60'}`}>
                     {tab === 'profile' ? 'Matrix' : tab === 'config' ? 'Logic' : tab === 'payroll' ? 'Resonance' : tab === 'activity' ? 'History' : 'Archives'}
                     {activeTab === tab && <motion.div layoutId="modalTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zen-brown" />}
                  </button>
               ))}
            </div>
          </div>
        }
        footer={
          <div className="flex gap-6">
             <ZenButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Discard</ZenButton>
             <ZenButton type="submit" form="employee-form" className="flex-[2] py-5">
                <span>Save Configuration</span>
                <Sparkles size={18} />
             </ZenButton>
          </div>
        }
      >
        <form id="employee-form" onSubmit={handleSubmit} className="w-full relative">
          <div className={`space-y-6 ${activeTab === 'activity' ? 'overflow-hidden' : ''}`}>
              {activeTab === 'profile' ? (
                 <div className="grid grid-cols-2 gap-x-16 gap-y-10 animate-in fade-in duration-500 py-12">
                     <ZenInput label="Email Port" icon={Mail} value={formData.email} onChange={(e: any) => setFormData({...formData, email: e.target.value})} />
                     <ZenInput label="Contact Line" icon={Phone} prefix={settings?.general?.dialingCode} value={formData.phone} onChange={(e: any) => setFormData({...formData, phone: e.target.value})} />
                     <ZenInput label={`Security Key ${editingEmp ? '(Optional)' : ''}`} icon={Lock} type="password" value={formData.password} onChange={(e: any) => setFormData({...formData, password: e.target.value})} />
                     <ZenInput label="Confirm Key" icon={Lock} type="password" value={formData.confirmPassword} onChange={(e: any) => setFormData({...formData, confirmPassword: e.target.value})} />
                     <ZenDropdown label="Branch Node" options={['None', ...branches.filter(b => b.isActive).map(b => b.name)]} value={branches.find(b => b._id === formData.branch)?.name || 'None'} onChange={(val) => setFormData({...formData, branch: branches.filter(b => b.isActive).find(b => b.name === val)?._id || ''})} />
                     <ZenDropdown label="Operational Status" options={['Active', 'Deactive']} value={formData.status === 'Inactive' ? 'Deactive' : formData.status} onChange={(val) => setFormData({...formData, status: val === 'Deactive' ? 'Inactive' : val})} />
                     <div className="col-span-2">
                        <ZenDatePicker label="Commencement Date" value={formData.joiningDate} onChange={val => setFormData({...formData, joiningDate: val})} />
                     </div>
                      <div className="col-span-2"><ZenTextarea label="Resident Residence" value={formData.address} onChange={(e: any) => setFormData({...formData, address: e.target.value})} /></div>
                 </div>
              ) : activeTab === 'config' ? (
                <div className="grid grid-cols-2 gap-x-16 gap-y-10 animate-in fade-in duration-500 h-full py-12">
                    <div className="col-span-1">
                      <ZenDropdown 
                        label="Calculation Mode" 
                        options={['Monthly', 'Hourly']} 
                        value={formData.payroll.type} 
                        onChange={(val: any) => setFormData({...formData, payroll: {...formData.payroll, type: val}})} 
                        icon={Zap}
                      />
                    </div>

                    <div className="col-span-1">
                       <ZenDropdown 
                         label="Assigned Shift" 
                         options={['None', ...shifts.filter(s => s.status === 'Active').map(s => s.name)]} 
                         value={formData.shift || 'None'} 
                         onChange={(val) => {
                            const selectedShift = shifts.find(s => s.name === val);
                            setFormData({
                               ...formData, 
                               shift: val === 'None' ? '' : val,
                               payroll: {
                                  ...formData.payroll,
                                  shiftHours: selectedShift ? selectedShift.durationHours : formData.payroll.shiftHours
                               }
                            });
                         }} 
                         icon={Clock}
                       />
                    </div>
                    
                    <div className="col-span-1">
                       <ZenDropdown 
                          label="Sequence Cycle" 
                          options={['Day', 'Week', 'Month']} 
                          value={formData.shiftType} 
                          onChange={(val: any) => setFormData({...formData, shiftType: val})} 
                          icon={Zap}
                       />
                    </div>
                    
                    <div className="flex items-center justify-between p-6 bg-zen-sand/5 rounded-2xl border border-zen-sand/10">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-zen-brown uppercase tracking-widest">Reward Eligibility</span>
                        <span className="text-xs text-zen-brown/40 mt-0.5">Allow automated commissions</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, payroll: {...formData.payroll, commissionBasis: !formData.payroll.commissionBasis}})}
                        className={`w-12 h-6 rounded-full transition-all duration-500 relative ${formData.payroll.commissionBasis ? 'bg-amber-400' : 'bg-zen-brown/10'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-500 ${formData.payroll.commissionBasis ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

                    <ZenInput 
                      label={formData.payroll.type === 'Monthly' ? "Retainer Salary" : "Hourly Resonance Rate"} 
                      prefix={settings?.general?.currencySymbol || 'QR'} 
                      type="number" 
                      value={formData.payroll.baseAmount || formData.salary} 
                      onChange={(e: any) => setFormData({...formData, payroll: {...formData.payroll, baseAmount: parseInt(e.target.value)}})} 
                    />
                    <ZenInput label="Overtime Premium (Rate/Hr)" icon={Zap} type="number" value={formData.payroll.otRate} onChange={(e: any) => setFormData({...formData, payroll: {...formData.payroll, otRate: parseInt(e.target.value)}})} />
                    <ZenInput label="Shift Duration (Hours)" icon={Clock} type="number" value={formData.payroll.shiftHours} onChange={(e: any) => setFormData({...formData, payroll: {...formData.payroll, shiftHours: parseInt(e.target.value)}})} disabled />
                    
                    <div className="p-8 bg-zen-leaf/5 rounded-[2rem] border border-zen-leaf/10 flex flex-col justify-center">
                       <h5 className="text-[10px] font-bold text-zen-leaf uppercase tracking-widest">Projection Logic</h5>
                       <p className="font-serif italic text-zen-brown/60 text-sm mt-3 leading-relaxed">
                          Staff will be paid {settings?.general?.currencySymbol} {formData.payroll.baseAmount} {formData.payroll.type === 'Monthly' ? 'per month' : 'per hour'}. 
                          Work exceeding {formData.payroll.shiftHours} hours will earn {settings?.general?.currencySymbol} {formData.payroll.otRate}/hr bonus.
                       </p>
                    </div>
                </div>
              ) : activeTab === 'payroll' ? (
                 <div className="flex-1 pb-10 custom-scrollbar animate-in slide-in-from-right-4 duration-500 py-6 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="bg-zen-cream/30 p-8 rounded-[2.5rem] border border-zen-brown/15">
                          <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest mb-1">Base Retainer</p>
                          <h4 className="text-2xl font-serif font-black text-zen-brown">{settings?.general?.currencySymbol} {(formData.payroll.baseAmount || 0).toLocaleString()}</h4>
                          <span className="text-[9px] font-bold text-zen-brown/20 uppercase tracking-widest leading-none italic">{formData.payroll.type === 'Monthly' ? 'FIXED MONTHLY' : 'ESTIMATED HOURLY'}</span>
                       </div>

                        <div className="bg-zen-sand/10 p-8 rounded-[2.5rem] border border-zen-sand/20">
                           <p className="text-[10px] font-bold text-zen-sand uppercase tracking-widest mb-1">Accrued Rewards</p>
                           <h4 className="text-2xl font-serif font-black text-zen-sand">{settings?.general?.currencySymbol} {payrollResonance.commissionTotal.toLocaleString()}</h4>
                           <span className="text-[9px] font-bold text-zen-sand/40 uppercase tracking-widest leading-none italic">{payrollResonance.monthApts.length} SERVICES COMPLETED</span>
                        </div>
                        <div className="bg-zen-brown p-8 rounded-[2.5rem] shadow-xl shadow-zen-brown/20 text-white relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-4 opacity-5"><Zap size={40} /></div>
                           <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Total Resonance</p>
                           <h4 className="text-2xl font-serif font-black">{settings?.general?.currencySymbol} {payrollResonance.totalEarnings.toLocaleString()}</h4>
                           <div className="flex items-center gap-2 mt-2">
                              <div className={`w-1.5 h-1.5 rounded-full bg-white animate-pulse`} />
                              <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Estimated for {dayjs(historyMonth).format('MMMM')}</span>
                           </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                       <h5 className="text-[11px] font-bold text-zen-brown uppercase tracking-[0.3em] px-2 flex items-center justify-between">
                          <span>Service Reward Registry</span>
                          <span className="text-zen-brown/20 italic font-serif normal-case tracking-normal">Breakdown per ritual</span>
                       </h5>
                       <div className="bg-white/40 rounded-[2rem] border border-zen-brown/15 overflow-hidden">
                          <table className="w-full text-left">
                             <thead>
                                <tr className="bg-zen-cream/10 text-[9px] font-black text-zen-brown/30 uppercase tracking-widest border-b border-zen-brown/15">
                                   <th className="px-8 py-4">Temporal Node</th>
                                   <th className="px-8 py-4">Ritual</th>
                                   <th className="px-8 py-4">Client</th>
                                   <th className="px-8 py-4 text-right">Reward</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-zen-brown/15">
                                {allAppointments
                                   .filter(a => a.employee === formData.name && a.date.startsWith(historyMonth))
                                   .sort((a, b) => dayjs(b.date).unix() - dayjs(a.date).unix())
                                   .map((apt, idx) => {
                                      const service = services.find(s => s.name === apt.service);
                                      let earnings = 0;
                                      if (service) {
                                         earnings = service.commissionType === 'Fixed' 
                                            ? service.commissionValue 
                                            : (service.price * service.commissionValue) / 100;
                                      }
                                      return (
                                         <tr key={idx} className="hover:bg-white/40 transition-all text-xs font-medium text-zen-brown/70">
                                            <td className="px-8 py-4">{dayjs(apt.date).format('DD MMM')}</td>
                                            <td className="px-8 py-4 font-serif italic">{apt.service}</td>
                                            <td className="px-8 py-4">{apt.client}</td>
                                            <td className="px-8 py-4 text-right font-bold text-zen-sand">
                                               {settings?.general?.currencySymbol} {earnings.toFixed(2)}
                                            </td>
                                         </tr>
                                      );
                                   })}
                                {allAppointments.filter(a => a.employee === formData.name && a.date.startsWith(historyMonth)).length === 0 && (
                                   <tr>
                                      <td colSpan={4} className="py-12 text-center text-zen-brown/20 italic font-serif">No rewards recorded for this resonance period.</td>
                                   </tr>
                                )}
                             </tbody>
                          </table>
                       </div>
                    </div>
                 </div>
              ) : activeTab === 'activity' ? (
                <div className="animate-in fade-in duration-500 py-6 space-y-6">
                         <div className="w-full">
                             <div className="flex items-center justify-between bg-white/40 p-6 rounded-[2rem] border border-zen-brown/15 mb-6">
                                <div className="flex items-center gap-6">
                                   <ZenDropdown 
                                     label="Analysis Period" 
                                     options={Array.from({ length: 12 }, (_, i) => dayjs().subtract(i, 'month').format('MMMM YYYY'))} 
                                     value={dayjs(historyMonth, 'YYYY-MM').format('MMMM YYYY')} 
                                     onChange={(val) => setHistoryMonth(dayjs(val, 'MMMM YYYY').format('YYYY-MM'))}
                                     icon={Calendar}
                                   />
                                </div>
                                <div className="flex items-center gap-2">
                                   {employeeAttendance.length === 0 && (
                                     <ZenButton onClick={simulateAttendance} variant="ghost" className="text-[10px] py-4 px-8 rounded-2xl border-dashed border-zen-brown/25">Establish Flow</ZenButton>
                                   )}
                                </div>
                             </div>

                            <div className="flex items-center justify-between gap-6 mb-4 shrink-0">
                               <div className="flex bg-zen-cream/30 p-1.5 rounded-[1.5rem] border border-zen-brown/15 shadow-inner">
                                  <button 
                                    type="button"
                                    onClick={() => setHistoryView('calendar')}
                                    className={`px-8 py-3 rounded-xl text-[10px] font-extrabold uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-2 ${historyView === 'calendar' ? 'bg-white text-zen-brown shadow-xl' : 'text-zen-brown/30 hover:text-zen-brown/50'}`}
                                  >
                                     <Calendar size={12} />
                                     Monthly Pulse
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => setHistoryView('list')}
                                    className={`px-8 py-3 rounded-xl text-[10px] font-extrabold uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-2 ${historyView === 'list' ? 'bg-white text-zen-brown shadow-xl' : 'text-zen-brown/30 hover:text-zen-brown/50'}`}
                                  >
                                     <Shield size={12} />
                                     History Logs
                                  </button>
                               </div>
                               
                            </div>
                         </div>

                    {historyView === 'calendar' ? (
                       employeeAttendance.length > 0 ? (
                          <div className="p-6 bg-white/40 rounded-[2rem] border border-zen-brown/15 animate-in zoom-in-95 duration-700 shadow-sm">
                             <div className="flex items-center justify-between mb-6">
                                <h4 className="text-[10px] font-black text-zen-brown/40 uppercase tracking-[0.3em]">Temporal Matrix · {dayjs(historyMonth).format('MMM YYYY')}</h4>
                                <div className="flex gap-4">
                                   <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-zen-leaf shadow-sm shadow-zen-leaf/40" />
                                      <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Normal Cycles</span>
                                   </div>
                                   <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-red-400 shadow-sm shadow-red-400/40" />
                                      <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Extended Hours</span>
                                   </div>
                                </div>
                             </div>
                             
                             <div className="grid grid-cols-7 gap-2 lg:gap-3">
                                {['S','M','T','W','T','F','S'].map((d, i) => (
                                   <div key={i} className="text-center text-[9px] font-black text-zen-brown/10 uppercase mb-2">{d}</div>
                                ))}
                                 {Array.from({ length: dayjs(historyMonth).startOf('month').day() }).map((_, i) => (
                                   <div key={`empty-${i}`} />
                                ))}
                                 {Array.from({ length: dayjs(historyMonth).daysInMonth() }).map((_, i) => {
                                    const day = i + 1;
                                    const date = dayjs(historyMonth).date(day);
                                    const dateStr = date.format('YYYY-MM-DD');
                                    const record = employeeAttendance.find(a => a.date === dateStr);
                                    const isToday = dayjs().format('YYYY-MM-DD') === dateStr;
                                    
                                    // High-precision cycle logic:
                                    const anchorDate = dayjs(formData.joiningDate);
                                    const isJoinMonth = anchorDate.format('YYYY-MM') === historyMonth;
                                    const isFutureMonth = dayjs(historyMonth).isAfter(anchorDate, 'month');
                                    
                                    let isInCycle = false;
                                    let startDay = -1;
                                    
                                    if (isJoinMonth) {
                                       startDay = anchorDate.date();
                                    } else if (isFutureMonth) {
                                       startDay = 1;
                                    }

                                    if (startDay !== -1) {
                                       const cycleDuration = formData.shiftType === 'Day' ? 5 : (formData.shiftType === 'Week' ? 7 : 40);
                                       const cycleDiff = day - startDay;
                                       
                                       if (formData.shiftType === 'Month') {
                                          isInCycle = day >= startDay;
                                       } else {
                                          isInCycle = cycleDiff >= 0 && cycleDiff < cycleDuration;
                                       }
                                    }

                                    return (
                                       <div key={day} className={`aspect-square rounded-xl border flex flex-col p-2 relative transition-all duration-500 group cursor-default shadow-sm ${
                                          record 
                                             ? record.overtimeMinutes > 0 ? 'bg-red-50/30 border-red-100 text-red-500 hover:shadow-red-200/50' : 'bg-zen-leaf/5 border-zen-leaf/10 text-zen-leaf hover:shadow-zen-leaf/20'
                                             : isToday ? 'bg-zen-cream border-zen-brown/35 text-zen-brown' : 'bg-white/10 border-zen-brown/15 text-zen-brown/20'
                                       } ${isInCycle && !record ? 'ring-2 ring-indigo-200/30 border-indigo-200 bg-indigo-50/10' : ''} hover:scale-105 hover:shadow-xl hover:z-10`}>
                                          <span className={`text-[10px] font-bold tracking-widest relative z-10 ${record ? 'opacity-90' : isToday ? 'text-zen-brown' : 'text-zen-brown/60'}`}>{day}</span>
                                          {record?.overtimeMinutes > 0 && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shadow-sm" />}
                                          {isInCycle && !record && <div className="absolute bottom-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-sm" />}
                                          
                                          <div className={`absolute inset-0 transition-all duration-500 bg-white/5 rounded-xl flex items-center justify-center p-1.5 pointer-events-none backdrop-blur-sm border border-zen-brown/15 shadow-sm z-0 ${isInCycle || record ? 'opacity-100' : 'opacity-0'}`}>
                                             <p className="text-[8px] font-black uppercase tracking-widest text-zen-brown leading-relaxed text-center whitespace-pre-line">
                                                 {record ? `${record.checkIn}\n—\n${record.checkOut}` : isInCycle ? (formData.shift || 'Full Shift') + '\nScheduled' : ''}
                                             </p>
                                          </div>
                                       </div>
                                    );
                                 })}
                             </div>
                          </div>
                       ) : (
                          <div className="flex-1 flex flex-col items-center justify-center p-20 animate-in fade-in zoom-in-95 duration-1000">
                             <div className="w-24 h-24 rounded-full border-2 border-dashed border-zen-brown/25 flex items-center justify-center text-zen-brown/20 mb-6">
                                <Calendar size={40} strokeWidth={1} />
                             </div>
                             <p className="font-serif italic text-lg text-zen-brown/40">No celestial activity recorded for this lunar phase</p>
                          </div>
                       )
                     ) : (
                       <div className="bg-white/40 rounded-[2.5rem] border border-zen-brown/15 overflow-hidden shadow-sm animate-in slide-in-from-bottom-10 duration-700">
                          <table className="w-full text-left border-collapse">
                             <thead>
                                <tr className="bg-zen-cream/20 border-b border-zen-brown/15">
                                    <th className="px-8 py-5 text-[9px] font-black text-zen-brown/40 uppercase tracking-[0.3em] w-[25%]">Temporal Node</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-zen-brown/40 uppercase tracking-[0.3em] text-center w-[25%]">Sequence / Status</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-zen-brown/40 uppercase tracking-[0.3em] text-center w-[30%]">Execution / Overtime</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-zen-brown/40 uppercase tracking-[0.3em] text-right w-[20%]">Actions</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-zen-brown/15">
                                {employeeAttendance
                                   .filter(log => log.date.startsWith(historyMonth))
                                   .map((log: any, idx: number) => (
                                      <tr key={idx} className="hover:bg-zen-cream/10 transition-all group">
                                         <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                               <span className="font-serif font-black text-zen-brown text-sm">{dayjs(log.date).format('DD MMM YYYY')}</span>
                                               <span className="text-[8px] font-bold text-zen-brown/30 uppercase tracking-widest">{dayjs(log.date).format('dddd')}</span>
                                            </div>
                                         </td>
                                         <td className="px-8 py-5 text-center">
                                            <div className="flex flex-col items-center gap-1.5">
                                               <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-50/50 px-2 py-0.5 rounded-md border border-indigo-100/50 w-fit">{log.shift || "None"}</span>
                                               <ZenBadge variant={log.checkOut ? "leaf" : "danger"} className="scale-[0.85] origin-center py-0.5">{log.checkOut ? "COMPLETED" : "ACTIVE"}</ZenBadge>
                                            </div>
                                         </td>
                                         <td className="px-8 py-5 text-center">
                                            <div className="flex flex-col items-center gap-1.5">
                                               <div className="flex items-center justify-center gap-2 text-[10px] font-black text-zen-brown/60 uppercase">
                                                  <span>{log.checkIn}</span>
                                                  <span className="text-zen-brown/10">—</span>
                                                  <span>{log.checkOut || "--"}</span>
                                               </div>
                                               {log.overtimeMinutes > 0 ? (
                                                  <div className="flex items-center gap-1 text-red-400">
                                                     <Zap size={10} className="fill-red-400" />
                                                     <span className="text-[9px] font-black font-mono">+{Math.round((log.overtimeMinutes/60)*10)/10}h</span>
                                                  </div>
                                               ) : (
                                                  <span className="text-[9px] font-bold text-zen-brown/10 uppercase tracking-tighter italic">Standard</span>
                                               )}
                                            </div>
                                         </td>
                                         <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2 transition-opacity">
                                               <ZenIconButton 
                                                  icon={Edit2} 
                                                  size="sm" 
                                                  onClick={(e) => {
                                                     e.stopPropagation();
                                                     setEditingAttendance(log);
                                                     setAttendanceFormData({ checkIn: log.checkIn, checkOut: log.checkOut });
                                                     setIsAttendanceModalOpen(true);
                                                  }}
                                               />
                                               <ZenIconButton 
                                                  icon={Trash2} 
                                                  size="sm" 
                                                  variant="danger"
                                                  onClick={(e) => {
                                                     e.stopPropagation();
                                                     deleteAttendance(log._id);
                                                  }}
                                               />
                                            </div>
                                         </td>
                                      </tr>
                                   ))}
                             </tbody>
                          </table>
                          {employeeAttendance.filter(log => log.date.startsWith(historyMonth)).length === 0 && (
                             <div className="flex flex-col items-center justify-center py-24 text-zen-brown/10 space-y-6">
                                <div className="w-20 h-20 rounded-[2.5rem] border border-dashed border-zen-brown/25 flex items-center justify-center">
                                   <Shield size={28} strokeWidth={1} />
                                 </div>
                                <p className="font-serif italic text-base opacity-50">Log registry empty for this cycle</p>
                             </div>
                          )}
                       </div>
                    )}
                 </div>
              ) : (
                 <div className="space-y-8 animate-in fade-in duration-500 py-12">

                    {/* Upload Area — only when editing an existing employee */}
                    {editingEmp ? (
                      <div className="border-2 border-dashed border-zen-brown/25 rounded-[2.5rem] p-8 flex flex-col items-center gap-4 hover:border-zen-brown/35 transition-all group/upload">
                        <div className="w-14 h-14 rounded-2xl bg-zen-cream flex items-center justify-center text-zen-brown/20 group-hover/upload:text-zen-brown/40 transition-colors">
                          <Upload size={28} />
                        </div>
                        <div className="text-center">
                          <p className="font-serif font-bold text-zen-brown/60">Upload a Document</p>
                          <p className="text-[10px] font-bold text-zen-brown/20 uppercase tracking-widest mt-1">Contracts, IDs, Certifications, etc.</p>
                        </div>
                        <div className="flex items-center gap-4 w-full max-w-sm">
                          <input
                            type="text"
                            placeholder="Document name..."
                            value={docName}
                            onChange={e => setDocName(e.target.value)}
                            className="flex-1 pb-2 bg-transparent border-b border-zen-brown/25 outline-none text-sm font-medium text-zen-brown placeholder:text-zen-brown/20"
                          />
                        </div>
                        <label className={`flex items-center gap-3 px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all ${uploadingDoc ? 'bg-zen-brown/20 text-zen-brown/40' : 'bg-zen-brown text-white hover:bg-black shadow-xl'}`}>
                          {uploadingDoc ? (
                            <><Loader2 size={14} className="animate-spin" /> Uploading...</>
                          ) : (
                            <><Cloud size={14} /> Select & Upload</>
                          )}
                          <input
                            type="file"
                            className="hidden"
                            disabled={uploadingDoc}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file || !editingEmp) return;
                              setUploadingDoc(true);
                              try {
                                const data = new FormData();
                                data.append('document', file);
                                data.append('name', docName || file.name);
                                data.append('fileType', file.name.split('.').pop() || 'file');
                                const res = await fetch(`${API_URL}/employees/${editingEmp._id}/documents`, {
                                  method: 'POST',
                                  headers: { 'Authorization': `Bearer ${user?.token}` },
                                  body: data
                                });
                                if (res.ok) {
                                  notify('success', 'Document Archived', 'File has been secured in the registry');
                                  setDocName('');
                                  fetchEmployees();
                                  // Refresh editing emp documents
                                  const updatedEmp = await fetch(`${API_URL}/employees`, { headers: { 'Authorization': `Bearer ${user?.token}` } });
                                  const allEmps = await updatedEmp.json();
                                  const fresh = allEmps.find((emp: any) => emp._id === editingEmp._id);
                                  if (fresh) setEditingEmp(fresh);
                                } else {
                                  notify('error', 'Upload Failed', 'Could not archive the document');
                                }
                              } catch {
                                notify('error', 'Error', 'Connection failed');
                              } finally {
                                setUploadingDoc(false);
                                e.target.value = '';
                              }
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="p-8 bg-zen-cream/20 rounded-[2rem] border border-zen-brown/15 text-center">
                        <p className="text-sm font-serif italic text-zen-brown/40">Save the employee profile first to enable document management.</p>
                      </div>
                    )}

                    {/* Document List */}
                    {editingEmp?.documents && editingEmp.documents.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest px-1">
                          Archived Records · {editingEmp.documents.length} File{editingEmp.documents.length !== 1 ? 's' : ''}
                        </p>
                        {editingEmp.documents.map((doc: any) => (
                          <div key={doc._id} className="group flex items-center justify-between p-5 bg-white rounded-[1.5rem] border border-zen-brown/15 shadow-sm hover:shadow-md transition-all duration-300">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-zen-cream flex items-center justify-center text-zen-brown/30 shrink-0">
                                <File size={22} />
                              </div>
                              <div>
                                <p className="font-serif font-bold text-zen-brown text-sm">{doc.name}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest bg-zen-cream px-2 py-0.5 rounded-md">
                                    {doc.fileType || 'file'}
                                  </span>
                                  <span className="text-[9px] text-zen-brown/20 uppercase tracking-widest">
                                    {new Date(doc.uploadedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <a
                                href={doc.url?.startsWith('http') ? doc.url : `${API_URL.replace('/api', '')}/${doc.url?.replace(/^\.?\//, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="w-9 h-9 rounded-xl bg-zen-cream flex items-center justify-center text-zen-brown/40 hover:text-zen-brown transition-colors"
                              >
                                <Download size={15} />
                              </a>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!editingEmp) return;
                                  try {
                                    const res = await fetch(`${API_URL}/employees/${editingEmp._id}/documents/${doc._id}`, {
                                      method: 'DELETE',
                                      headers: { 'Authorization': `Bearer ${user?.token}` }
                                    });
                                    if (res.ok) {
                                      notify('success', 'Document Removed', 'File purged from the registry');
                                      fetchEmployees();
                                      setEditingEmp(prev => prev ? { ...prev, documents: prev.documents.filter((d: any) => d._id !== doc._id) } : null);
                                    }
                                  } catch {
                                    notify('error', 'Error', 'Could not remove document');
                                  }
                                }}
                                className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : editingEmp ? (
                      <div className="text-center py-8 text-zen-brown/20 italic font-serif text-sm">
                        No documents archived yet.
                      </div>
                    ) : null}

                 </div>
              )}
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={confirmState.isOpen} onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmState.onConfirm} title={confirmState.title} message={confirmState.message} />

       <Modal isOpen={isAttendanceModalOpen} onClose={() => setIsAttendanceModalOpen(false)} title="Refine Attendance">
          <div className="space-y-8 p-4">
             <div className="grid grid-cols-2 gap-8">
                <ZenInput 
                  label="Arrival (Check-In)" 
                  icon={Clock}
                  placeholder="09:00 AM"
                  value={attendanceFormData.checkIn}
                  onChange={(e: any) => setAttendanceFormData(prev => ({ ...prev, checkIn: e.target.value }))}
                />
                <ZenInput 
                  label="Departure (Check-Out)" 
                  icon={Clock}
                  placeholder="06:00 PM"
                  value={attendanceFormData.checkOut}
                  onChange={(e: any) => setAttendanceFormData(prev => ({ ...prev, checkOut: e.target.value }))}
                />
             </div>
             
             <div className="flex items-center gap-4 pt-4">
                <ZenButton onClick={() => setIsAttendanceModalOpen(false)} variant="secondary" className="flex-1 py-5">
                   Abandon
                </ZenButton>
                <ZenButton onClick={updateAttendance} className="flex-[2] py-5">
                   Refine Node
                </ZenButton>
             </div>
          </div>
       </Modal>
    </ZenPageLayout>
  );
};

export default Employees;
