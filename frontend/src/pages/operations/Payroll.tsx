import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, Zap, Wallet2,
  Download, Search
} from 'lucide-react';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenStatCard } from '../../components/zen/ZenStatCard';
import { ZenIconButton, ZenBadge, ZenButton } from '../../components/zen/ZenButtons';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { notify } from '../../components/shared/ZenNotification';
import { ZenMonthPicker } from '../../components/zen/ZenInputs';
import dayjs from 'dayjs';

interface PayrollRecord {
  employeeId: string;
  name: string;
  role: string;
  basePay: number;
  otPay: number;
  totalPay: number;
  totalHours: number;
  otHours: number;
  daysWorked: number;
  leavesCount: number;
  deduction: number;
  payType: string;
}

const Payroll = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [payrollData, setPayrollData] = useState<PayrollRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  useEffect(() => {
    fetchPayroll();
  }, [selectedMonth]);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/payroll?month=${selectedMonth}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      setPayrollData(Array.isArray(data) ? data : []);
    } catch (error) {
      notify('error', 'Error', 'Failed to generate payroll report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // Placeholder for future export functionality
    notify('info', 'Export Initiated', 'Generating financial transcript...');
  };

  const filteredData = useMemo(() => {
    return payrollData.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [payrollData, searchTerm]);

  const stats = useMemo(() => {
    const total = filteredData.reduce((acc, curr) => acc + curr.totalPay, 0);
    const ot = filteredData.reduce((acc, curr) => acc + curr.otPay, 0);
    const deductions = filteredData.reduce((acc, curr) => acc + curr.deduction, 0);
    const hours = filteredData.reduce((acc, curr) => acc + curr.totalHours, 0);
    return { total, ot, deductions, hours };
  }, [filteredData]);

  return (
    <ZenPageLayout
      title="Payroll"
      hideSearch
      hideBranchSelector
      hideViewToggle
      hideAddButton
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8 mb-8 px-4 lg:px-0 w-full">
         {[
           { label: 'Payroll Disbursement', value: `${settings?.general?.currencySymbol || 'QR'} ${stats.total.toLocaleString()}`, unit: '', icon: Wallet2, color: 'text-zen-brown', bg: 'bg-zen-brown/[0.03]', watermark: Wallet2 },
           { label: 'Total Deductions', value: `${settings?.general?.currencySymbol || 'QR'} ${stats.deductions.toLocaleString()}`, unit: '', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/[0.03]', watermark: Clock },
           { label: 'Overtime', value: `${settings?.general?.currencySymbol || 'QR'} ${stats.ot.toLocaleString()}`, unit: '', icon: Zap, color: 'text-red-500', bg: 'bg-red-500/[0.03]', watermark: Zap },
           { label: 'Total Hours', value: `${stats.hours.toLocaleString()}`, unit: 'Hrs', icon: Clock, color: 'text-slate-500', bg: 'bg-slate-500/[0.03]', watermark: Clock }
         ].map((stat, i) => (
           <ZenStatCard key={stat.label} {...stat} index={i} />
         ))}
      </div>

       {/* Global Filter Bar */}
       <div className="rounded-[2.25rem] border border-zen-stone/70 bg-white/75 backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.04)] px-5 sm:px-6 py-5 mb-8">
          <div className="flex flex-col xl:flex-row xl:items-end gap-5 xl:gap-8">
             <div className="flex-1 w-full flex flex-col gap-2.5">
                <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-1.5">Employee Search</label>
                <div className="relative group">
                   <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zen-brown/20 group-focus-within:text-zen-sand transition-colors" size={16} />
                   <input 
                     type="text"
                     placeholder="Search by specialist..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full h-[58px] pl-[52px] pr-6 bg-white/70 border border-zen-brown/10 rounded-[1.15rem] focus:bg-white focus:ring-4 focus:ring-zen-sand/5 focus:border-zen-sand/20 outline-none transition-all duration-500 text-sm font-medium shadow-sm"
                   />
                </div>
             </div>

             <div className="flex flex-wrap xl:flex-nowrap gap-4 w-full xl:w-auto items-end">
                <div className="flex flex-col gap-2.5 w-full xl:w-auto">
                   <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-1.5">Time Window</label>
                   <div className="flex items-center h-[58px] bg-white/70 rounded-[1.15rem] border border-zen-brown/10 shadow-sm shrink-0">
                      <ZenMonthPicker
                        value={selectedMonth}
                        onChange={setSelectedMonth}
                        className="w-52 sm:w-56 h-full !border-none !shadow-none !bg-transparent"
                        hideLabel
                      />
                   </div>
                </div>

                <div className="flex flex-col gap-2.5 w-full xl:w-auto">
                   <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-1.5">Management</label>
                   <ZenButton onClick={handleExport} variant="primary" className="w-full xl:w-auto px-8 h-[58px] shadow-sm flex items-center justify-center gap-2 group rounded-[1.15rem]">
                      <Download size={16} className="group-hover:rotate-12 transition-transform duration-500" />
                      <span className="uppercase tracking-[0.2em] text-[10px] font-black">Export Report</span>
                   </ZenButton>
                </div>
             </div>
          </div>
       </div>

      <div className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] border border-zen-stone/70 shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden animate-in fade-in duration-700">
           <div className="flex items-center justify-between gap-4 px-6 sm:px-8 pt-6 pb-5 border-b border-zen-brown/5">
             <div>
               <h3 className="text-xl font-bold text-gray-900 tracking-tight">Payroll Registry</h3>
               <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Specialist compensation and attendance summary</p>
             </div>
             <ZenBadge variant="leaf" className="px-3 sm:px-5">{filteredData.length} Records</ZenBadge>
           </div>
           <div className="table-container overflow-x-auto">
           <table className="w-full text-center border-collapse min-w-[1000px]">
              <thead>
                 <tr>
                    <th>S No</th>
                    <th>Specialist</th>
                    <th>Protocol</th>
                    <th>Attendance</th>
                    <th>Exceptions</th>
                    <th>Base Reward</th>
                    <th>Adjustment</th>
                    <th>Final Payout</th>
                 </tr>
              </thead>
              <tbody>
                 {(!filteredData || filteredData.length === 0) && (
                    <tr>
                       <td colSpan={8} className="px-6 py-16 text-center text-[11px] font-sans text-gray-400 bg-gray-50/30">No financial nodes found for this cycle</td>
                    </tr>
                 )}

                 {filteredData.map((row, index) => (
                    <tr key={row.employeeId} className="transition-all group border-b border-black/[0.02]">
                       <td className="text-center italic opacity-40 text-[11px]">
                         {(index + 1).toString().padStart(2, '0')}
                       </td>
                       <td>
                          <div className="flex flex-col items-center">
                             <span className="zen-table-primary">{row.name}</span>
                             <span className="zen-table-meta">{row.role}</span>
                          </div>
                       </td>
                       <td>
                          <div className="flex justify-center">
                             <ZenBadge variant="sand" className="font-black tracking-widest uppercase text-[8px] scale-90">{row.payType}</ZenBadge>
                          </div>
                       </td>
                       <td>
                          <div className="flex flex-col items-center">
                             <span className="font-bold text-zen-brown text-sm">{row.daysWorked} Days</span>
                             <span className="text-[8px] text-zen-brown/30 font-bold uppercase tracking-widest">{row.totalHours} Hours</span>
                          </div>
                       </td>
                       <td>
                          <div className="flex flex-col items-center">
                             <span className={`font-bold text-sm ${row.leavesCount > 0 ? 'text-amber-600' : 'text-zen-brown/20'}`}>
                                {row.leavesCount} {row.payType === 'Monthly' ? 'Day' : 'Hr'}{row.leavesCount !== 1 ? 's' : ''}
                             </span>
                             <span className="text-[7px] font-bold uppercase tracking-widest opacity-40 whitespace-nowrap">Leave Balance</span>
                          </div>
                       </td>
                       <td>
                          <span className="text-sm text-zen-brown/60 font-bold">{settings?.general?.currencySymbol} {row.basePay.toLocaleString()}</span>
                       </td>
                       <td>
                          <div className="flex flex-col items-center gap-1">
                             <div className="flex items-center gap-1.5">
                                <span className={`text-[11px] font-black ${row.deduction > 0 ? 'text-red-500' : 'text-slate-300'}`}>-{settings?.general?.currencySymbol}{row.deduction.toLocaleString()}</span>
                                <span className={`text-[11px] font-black ${row.otPay > 0 ? 'text-emerald-500' : 'text-slate-300'}`}>+{settings?.general?.currencySymbol}{row.otPay.toLocaleString()}</span>
                             </div>
                             <div className="flex items-center gap-4 opacity-30">
                                <span className="text-[7px] uppercase font-bold tracking-tighter">Penalty</span>
                                <span className="text-[7px] uppercase font-bold tracking-tighter">Premium</span>
                             </div>
                          </div>
                       </td>
                       <td>
                          <div className="flex justify-center">
                             <div className="bg-zen-leaf/5 py-2.5 px-5 rounded-xl border border-zen-leaf/10 shadow-sm transition-transform group-hover:scale-105">
                                <span className="font-black text-zen-leaf text-base tracking-tight">{settings?.general?.currencySymbol} {row.totalPay.toLocaleString()}</span>
                             </div>
                          </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
           </div>
        </div>
    </ZenPageLayout>
  );
};

export default Payroll;
