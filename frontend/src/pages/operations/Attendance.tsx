import React, { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import {
  Clock, Shield, TrendingUp, Search, User, LogIn, LogOut,
  Trash2, Calendar as CalendarIcon, Sparkles, Grid, List, Users, Edit2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { ZenBadge, ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { notify } from '../../components/shared/ZenNotification';
import { useSettings } from '../../context/SettingsContext';
import { ZenDropdown, ZenInput, ZenMasterCalendar } from '../../components/zen/ZenInputs';
import { Modal } from '../../components/shared/Modal';
import { useBranches } from '../../context/BranchContext';
import { ZenStatCard } from '../../components/zen/ZenStatCard';

interface AttendanceRecord {
  _id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
  employeeName: string;
  duration?: number;
  overtimeMinutes?: number;
  dailyEarnings?: number;
  shift?: string;
  user?: any;
}

const Attendance = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const primaryColor = settings?.theme?.primaryColor || '#332766';
  const { selectedBranch } = useBranches();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [manualFormData, setManualFormData] = useState({
    employeeId: '',
    date: dayjs().format('YYYY-MM-DD'),
    checkIn: '09:00 AM',
    checkOut: '06:00 PM',
    status: 'Present'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateRange, setDateRange] = useState<any>('All');
  const [shifts, setShifts] = useState<any[]>([]);

  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Manager';
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  useEffect(() => {
    fetchHistory();
  }, [selectedBranch, page, dateRange]);

  const dateWindow = useMemo(() => {
    if (!dateRange || dateRange === 'All') return { startDate: '', endDate: '' };
    
    const now = dayjs();
    if (typeof dateRange === 'string') {
      if (dateRange === 'Today') return { startDate: now.format('YYYY-MM-DD'), endDate: now.format('YYYY-MM-DD') };
      if (dateRange === 'Week') return { startDate: now.subtract(7, 'day').format('YYYY-MM-DD'), endDate: now.format('YYYY-MM-DD') };
      if (dateRange === 'Month') return { startDate: now.subtract(1, 'month').format('YYYY-MM-DD'), endDate: now.format('YYYY-MM-DD') };
      
      if (dateRange.length === 7) { // YYYY-MM
        const m = dayjs(dateRange + '-01');
        return { startDate: m.startOf('month').format('YYYY-MM-DD'), endDate: m.endOf('month').format('YYYY-MM-DD') };
      }
      
      if (dateRange.length === 10) { // YYYY-MM-DD
        return { startDate: dateRange, endDate: dateRange };
      }
      
      return { startDate: '', endDate: '' };
    }

    if (dateRange.from || dateRange.to) {
      return { 
        startDate: dateRange.from || dateRange.to || '', 
        endDate: dateRange.to || dateRange.from || '' 
      };
    }

    return { startDate: '', endDate: '' };
  }, [dateRange]);

  useEffect(() => {
    if (isAdminOrManager) {
      fetchEmployees();
      fetchShifts();
    }
  }, [user]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_URL}/employees`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      const empData = Array.isArray(data) ? data : (data.data || []);
      setEmployees(empData.filter((e: any) => e.status === 'Active'));
    } catch (e) {}
  };

  const fetchShifts = async () => {
    try {
      const response = await fetch(`${API_URL}/shifts`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      const shiftList = Array.isArray(data) ? data : (data?.data || []);
      if (Array.isArray(shiftList)) setShifts(shiftList);
    } catch (e) {}
  };

  const fetchHistory = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '12'
      });
      if (selectedBranch && selectedBranch !== 'all') queryParams.append('branch', selectedBranch);
      if (dateWindow.startDate) queryParams.append('startDate', dateWindow.startDate);
      if (dateWindow.endDate) queryParams.append('endDate', dateWindow.endDate);

      const response = await fetch(`${API_URL.replace(/\/$/, '')}/attendance?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const resData = await response.json();
      const data = resData.data || resData;
      if (resData.pagination) setTotalPages(resData.pagination.pages);

      if (Array.isArray(data)) {
        setAttendance(data);
      }
    } catch (error) {
      if (!silent) notify('error', 'Sync Failed', 'Could not refresh attendance registry');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      const resp = await fetch(`${API_URL}/attendance/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (resp.ok) {
        notify('info', 'Registry Cleaned', 'Attendance record removed');
        fetchHistory();
      }
    } catch (e) {}
  };

  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('zen_attendance_view') as 'grid' | 'table') || 'table';
  });

  useEffect(() => {
    localStorage.setItem('zen_attendance_view', viewMode);
  }, [viewMode]);

  const stats = useMemo(() => {
    const present = attendance.filter(a => a.status === 'Present').length;
    const avgDuration = attendance.reduce((acc, curr) => acc + (curr.duration || 0), 0) / (attendance.length || 1);
    return [
      { label: 'Active Specialists', value: present, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', trend: 'Currently present' },
      { label: 'Total Registry', value: attendance.length, icon: Sparkles, color: 'text-blue-500', bg: 'bg-blue-500/10', glow: 'bg-blue-500/20', trend: 'Historical verify' },
      { label: 'Avg Ritual Span', value: `${Math.floor(avgDuration / 60)}h ${Math.floor(avgDuration % 60)}m`, icon: Clock, color: 'text-zen-sand', bg: 'bg-zen-sand/10', glow: 'bg-zen-sand/20', trend: 'Persistence avg' },
      { label: 'Atomic Sync', value: 'Live', icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10', glow: 'bg-amber-500/20', trend: 'Real-time feed' }
    ];
  }, [attendance]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter(record =>
      record.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.shift?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.date?.includes(searchTerm)
    );
  }, [attendance, searchTerm]);

  const handleEditRecord = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setManualFormData({
      employeeId: record.user?._id || record.user || '',
      date: dayjs(record.date).format('YYYY-MM-DD'),
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      status: record.status
    });
    setIsManualModalOpen(true);
  };

  const handleManualEntrySubmit = async () => {
    if (!manualFormData.employeeId) return notify('warning', 'Missing Selection', 'Please select a specialist first');

    try {
      setIsSubmitting(true);
      const selectedEmp = employees.find(e => e._id === manualFormData.employeeId);
      const payload = {
        ...manualFormData,
        targetUserId: manualFormData.employeeId,
        employeeName: selectedEmp?.name || editingRecord?.employeeName,
        shift: selectedEmp?.shift || editingRecord?.shift
      };

      const url = editingRecord
        ? `${API_URL}/attendance/${editingRecord._id}`
        : `${API_URL}/attendance`;

      const method = editingRecord ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        notify('success', editingRecord ? 'Registry Updated' : 'Registry Synchronized', editingRecord ? 'Attendance record has been corrected' : 'Manual attendance record has been verified and committed');
        setIsManualModalOpen(false);
        setEditingRecord(null);
        fetchHistory();
      } else {
        const error = await response.json();
        notify('error', 'Commit Failed', error.message || 'Verification protocol rejected');
      }
    } catch (error) {
      notify('error', 'Network Failure', 'Could not establish connection with orchestration layer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ZenPageLayout
      title="Ritual Presence"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={(mode) => setViewMode(mode as any)}
      addButtonLabel={isAdminOrManager ? "Manual Entry" : undefined}
      onAddClick={() => setIsManualModalOpen(true)}
      searchActions={
        <div className="flex items-center shrink-0 h-[52px]">
          <ZenMasterCalendar
            label="Date Range"
            value={dateRange}
            onChange={(v: any) => setDateRange(v)}
            selectionType="range"
            variant="pill"
            className="w-[200px]"
            hideLabel
          />
        </div>
      }
      topContent={
        <div className="flex overflow-x-auto overflow-y-visible pt-2 pb-4 gap-6 lg:grid lg:grid-cols-4 lg:gap-8 lg:overflow-visible scrollbar-hide px-4 lg:px-2">
          {stats.map((stat, i) => (
            <ZenStatCard key={i} {...stat} delay={i * 0.15} />
          ))}
        </div>
      }
    >
      <div style={{ '--zen-primary': primaryColor } as React.CSSProperties} className="space-y-6 pb-20">

        {/* Registry Content */}
        {loading ? (
             <div className="flex flex-col items-center justify-center min-h-[400px]">
               <div className="w-10 h-10 border-4 border-zen-brown border-t-transparent rounded-full animate-spin"></div>
             </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 px-4 lg:px-2">
             {filteredAttendance.map((row, index) => (
                <div key={row._id} className="group relative bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-zen-brown/15 flex flex-col transition-all duration-500 hover:shadow-xl hover:translate-y-[-4px]">
                   <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                         <div className="w-14 h-14 rounded-2xl bg-zen-cream border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                            <span className="font-serif text-xl text-zen-brown uppercase">{row.employeeName?.charAt(0)}</span>
                         </div>
                         <div>
                            <h4 className="text-lg font-black text-zen-brown tracking-tight">{row.employeeName}</h4>
                            <p className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest">{row.shift || 'Standard'} Artisan</p>
                         </div>
                      </div>
                      <ZenBadge variant={row.status === 'Present' && row.checkOut !== '--' ? 'leaf' : 'sand'} className="text-[8px] font-black">
                         {row.status === 'Present' && row.checkOut !== '--' ? 'COMPLETED' : row.status.toUpperCase()}
                      </ZenBadge>
                   </div>

                   <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-zen-cream/30 rounded-2xl border border-zen-stone/40">
                         <div>
                            <p className="text-[8px] font-bold text-zen-brown/40 uppercase tracking-widest mb-1">Ritual Date</p>
                            <p className="text-xs font-bold text-zen-brown">{dayjs(row.date).format('DD MMM, YYYY')}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[8px] font-bold text-zen-brown/40 uppercase tracking-widest mb-1">Time Span</p>
                            <p className="text-xs font-bold text-zen-brown">{row.checkIn} — {row.checkOut}</p>
                         </div>
                      </div>

                      <div className="flex items-center justify-between px-2">
                         <div className="flex items-center gap-2">
                            <Clock size={14} className="text-zen-sand" />
                            <span className="text-sm font-serif font-bold italic">{Math.floor((row.duration || 0) / 60)}h {(row.duration || 0) % 60}m</span>
                         </div>
                         <div className="text-right">
                            <p className="text-lg font-black text-zen-brown">{settings?.general?.currencySymbol} {row.dailyEarnings?.toLocaleString()}</p>
                         </div>
                      </div>
                   </div>

                   {isAdminOrManager && (
                      <div className="mt-8 pt-6 border-t border-zen-stone/20 flex justify-end gap-2">
                         <ZenIconButton icon={Edit2} onClick={() => handleEditRecord(row)} />
                         <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDeleteRecord(row._id)} />
                      </div>
                   )}
                </div>
             ))}
          </div>
        ) : (
          <>
            <div className="table-container w-full bg-white rounded-xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in fade-in duration-700 mx-4 lg:mx-2">
               <table className="w-full text-center border-collapse min-w-[680px] sm:min-w-[800px]">
                 <thead>
                   <tr>
                      <th>S No</th>
                      {isAdminOrManager && <th>Specialist</th>}
                      <th>Date / Time</th>
                      <th>Duration</th>
                      <th>Value Created</th>
                      <th>Status</th>
                      {isAdminOrManager && <th>Actions</th>}
                   </tr>
                </thead>
                     <tbody>
                        {(!filteredAttendance || filteredAttendance.length === 0) && (
                           <tr>
                              <td colSpan={isAdminOrManager ? 7 : 6} className="py-32 text-center text-[11px] font-sans text-gray-400">
                                 <div className="flex flex-col items-center gap-6 opacity-[0.08]">
                                    <Shield size={100} strokeWidth={0.5} />
                                    <p className="italic font-serif text-2xl tracking-tight">The registry remains undisturbed.</p>
                                 </div>
                              </td>
                           </tr>
                        )}

                        {filteredAttendance.map((row, index) => (
                           <tr key={row._id}>
                              <td>
                                {((page - 1) * 12 + index + 1).toString().padStart(2, '0')}
                              </td>
                              {isAdminOrManager && (
                                 <td>
                                    <div className="flex flex-col items-center justify-center leading-none">
                                       <span className="zen-table-primary">{row.employeeName}</span>
                                       <span className="zen-table-meta">{row.shift || 'Sanctuary'} Artisan</span>
                                    </div>
                                 </td>
                              )}
                              <td>
                                 <div className="flex flex-col items-center justify-center leading-none">
                                    <span className="zen-table-primary">{dayjs(row.date).format('DD MMM, YYYY')}</span>
                                    <span className="zen-table-meta mt-1">{row.checkIn} — {row.checkOut}</span>
                                 </div>
                              </td>
                              <td>
                                 <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zen-stone/40 rounded-full border border-zen-stone">
                                    <span className="text-xs font-serif font-bold text-zen-brown italic">{Math.floor((row.duration || 0) / 60)}h {(row.duration || 0) % 60}m</span>
                                 </div>
                              </td>
                              <td>
                                 <span className="zen-table-primary">
                                    {settings?.general?.currencySymbol} {row.dailyEarnings?.toLocaleString() || '0'}
                                 </span>
                              </td>
                              <td>
                                 <div className="flex items-center justify-center">
                                    <ZenBadge variant={row.status === 'Present' && row.checkOut !== '--' ? 'leaf' : 'sand'} className="text-[9px] font-black px-6 py-2">
                                       {row.status === 'Present' && row.checkOut !== '--' ? 'COMPLETED' : row.status.toUpperCase()}
                                    </ZenBadge>
                                 </div>
                              </td>
                              {isAdminOrManager && (
                                 <td className="px-6">
                                    <div className="flex justify-center gap-2">
                                       <ZenIconButton icon={Edit2} onClick={() => handleEditRecord(row)} />
                                       <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDeleteRecord(row._id)} />
                                    </div>
                                 </td>
                              )}
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>

               <div className="p-8 border-t border-zen-stone/10 mt-auto">
                  <ZenPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
               </div>
          </>
        )}
      </div>

      <Modal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          setEditingRecord(null);
          setManualFormData({
            employeeId: '',
            date: dayjs().format('YYYY-MM-DD'),
            checkIn: '09:00 AM',
            checkOut: '06:00 PM',
            status: 'Present'
          });
        }}
        title={editingRecord ? "Registry Correction" : "Registry Override"}
        maxWidth="max-w-2xl"
        footer={(
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <ZenButton
              type="button"
              variant="secondary"
              onClick={() => {
                setIsManualModalOpen(false);
                setEditingRecord(null);
                setManualFormData({
                  employeeId: '',
                  date: dayjs().format('YYYY-MM-DD'),
                  checkIn: '09:00 AM',
                  checkOut: '06:00 PM',
                  status: 'Present'
                });
              }}
              className="flex-1 !rounded-[1.35rem] !py-4"
            >
              Cancel
            </ZenButton>
            <ZenButton
              type="button"
              onClick={handleManualEntrySubmit}
              className="flex-[2] !rounded-[1.35rem] !py-4 text-white shadow-xl"
              style={{ backgroundColor: primaryColor }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (editingRecord ? 'Correcting...' : 'Committing...') : (editingRecord ? 'Update Record' : 'Commit Registry Change')}
            </ZenButton>
          </div>
        )}
      >
         <form onSubmit={(e) => e.preventDefault()} className="space-y-8 p-0">
            <div className="zen-pointed-surface bg-white/80 backdrop-blur-2xl p-6 sm:p-8 border border-zen-brown/10 shadow-sm">
               <div className="flex items-center gap-5">
                  <div
                    className="w-14 h-14 rounded-[1.25rem] border flex items-center justify-center shadow-sm"
                    style={{
                      backgroundColor: `${primaryColor}15`,
                      borderColor: `${primaryColor}25`,
                      color: primaryColor
                    }}
                  >
                     <Sparkles size={24} />
                  </div>
                  <div>
                     <h4 className="font-serif text-2xl font-black text-zen-brown">{editingRecord ? 'Record Correction' : 'Manual Verification'}</h4>
                     <p className="text-[10px] font-black uppercase tracking-[0.35em] mt-1.5" style={{ color: `${primaryColor}80` }}>{editingRecord ? 'Modify historical entry details' : 'Direct registry modification protocol'}</p>
                  </div>
               </div>

               <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                     <ZenDropdown
                        label="Select Specialist"
                        disabled={!!editingRecord}
                        options={employees
                           .filter(e => editingRecord || !attendance.some(a => (a.user === e._id || a.user?._id === e._id) && a.date === manualFormData.date))
                           .map(e => e.name)}
                        value={employees.find(e => e._id === manualFormData.employeeId)?.name || ''}
                        onChange={(val) => {
                           const emp = employees.find(e => e.name === val);
                           if (emp) {
                              const shiftInfo = shifts.find(s => s.name === emp.shift);
                              setManualFormData({
                                 ...manualFormData,
                                 employeeId: emp._id,
                                 checkIn: shiftInfo?.startTime || '09:00 AM',
                                 checkOut: shiftInfo?.endTime || '06:00 PM'
                              });
                           }
                        }}
                        icon={User}
                     />
                  </div>
                  <ZenInput label="Record Date" type="date" icon={CalendarIcon} value={manualFormData.date} onChange={(e: any) => setManualFormData({...manualFormData, date: e.target.value})} disabled={!!editingRecord} />
                  <ZenDropdown label="Presence Status" options={['Present', 'Absent', 'Half Day', 'On Leave']} value={manualFormData.status} onChange={(val) => setManualFormData({...manualFormData, status: val})} icon={Shield} />
                  <ZenInput label="Clock In" placeholder="09:00 AM" icon={LogIn} value={manualFormData.checkIn} onChange={(e: any) => setManualFormData({...manualFormData, checkIn: e.target.value})} />
                  <ZenInput label="Clock Out" placeholder="06:00 PM" icon={LogOut} value={manualFormData.checkOut} onChange={(e: any) => setManualFormData({...manualFormData, checkOut: e.target.value})} />
               </div>
            </div>
         </form>
      </Modal>
    </ZenPageLayout>
  );
};

export default Attendance;
