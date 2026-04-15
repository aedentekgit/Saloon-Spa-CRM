import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, Zap, Wallet2,
  Download, Filter, Calendar, TrendingUp
} from 'lucide-react';
import { ZenPageLayout } from '../components/zen/ZenLayout';
import { ZenIconButton, ZenBadge, ZenButton } from '../components/zen/ZenButtons';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { notify } from '../components/ZenNotification';
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
  payType: string;
}

const Payroll = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [payrollData, setPayrollData] = useState<PayrollRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchPayroll();
  }, [selectedMonth]);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      // Fetch both employees and attendance to aggregate
      const [empRes, attRes] = await Promise.all([
        fetch(`${API_URL}/employees`, { headers: { 'Authorization': `Bearer ${user?.token}` } }),
        fetch(`${API_URL}/attendance`, { headers: { 'Authorization': `Bearer ${user?.token}` } })
      ]);
      
      const employeesData = await empRes.json();
      const attendanceData = await attRes.json();
      
      const employees = Array.isArray(employeesData) ? employeesData : [];
      const attendance = Array.isArray(attendanceData) ? attendanceData : [];
      
      // Filter attendance for the selected month
      const monthAtt = attendance.filter((a: any) => a.date && typeof a.date === 'string' && a.date.startsWith(selectedMonth));
      
      // Aggregate data per employee
      const aggregated: PayrollRecord[] = employees.map((emp: any) => {
        const empAtt = monthAtt.filter((a: any) => a.user === emp._id || a.employeeName === emp.name);
        
        let otPay = 0;
        let basePay = 0;
        let totalHours = 0;
        let otMin = 0;
        
        empAtt.forEach((a: any) => {
          totalHours += (a.duration || 0) / 60;
          otMin += (a.overtimeMinutes || 0);
          
          if (emp.payroll?.type === 'Monthly') {
              basePay = emp.payroll?.baseAmount || emp.salary || 0;
              otPay += ((a.overtimeMinutes || 0) / 60) * (emp.payroll?.otRate || 0);
          } else {
              // Hourly: Total Base = (Regular Hours * Rate)
              const regMin = (a.duration || 0) - (a.overtimeMinutes || 0);
              basePay += (regMin / 60) * (emp.payroll?.baseAmount || 0);
              otPay += ((a.overtimeMinutes || 0) / 60) * (emp.payroll?.otRate || 0);
          }
        });

        return {
          employeeId: emp._id,
          name: emp.name,
          role: emp.role,
          basePay: Math.round(basePay),
          otPay: Math.round(otPay),
          totalPay: Math.round(basePay + otPay),
          totalHours: Math.round(totalHours * 10) / 10,
          otHours: Math.round((otMin / 60) * 10) / 10,
          daysWorked: empAtt.length,
          payType: emp.payroll?.type || 'Monthly'
        };
      });

      setPayrollData(aggregated);
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
    const hours = filteredData.reduce((acc, curr) => acc + curr.totalHours, 0);
    return { total, ot, hours };
  }, [filteredData]);

  return (
    <ZenPageLayout
      title="Payroll Sanctuary"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      addButtonLabel="Export Ledger"
      onAddClick={handleExport}
      addButtonIcon={<Download size={18} />}
      hideBranchSelector
      hideViewToggle
    >
      <div className="flex overflow-x-auto pb-8 gap-6 md:grid md:grid-cols-3 md:gap-8 mb-12 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
        <div className="flex-shrink-0 w-[280px] sm:w-auto bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] border border-zen-brown/15 shadow-xl flex items-center gap-6">
           <div className="w-16 h-16 rounded-2xl bg-zen-brown text-white flex items-center justify-center shadow-lg"><Wallet2 size={32} /></div>
           <div>
              <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest">Total Monthly Disbursement</p>
              <h4 className="text-2xl sm:text-3xl font-serif font-bold text-zen-brown">{settings?.general.currencySymbol} {stats.total.toLocaleString()}</h4>
           </div>
        </div>
        <div className="flex-shrink-0 w-[280px] sm:w-auto bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] border border-zen-brown/15 shadow-xl flex items-center gap-6">
           <div className="w-16 h-16 rounded-2xl bg-red-400 text-white flex items-center justify-center shadow-lg"><Zap size={32} /></div>
           <div>
              <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest">Overtime Premiums</p>
              <h4 className="text-2xl sm:text-3xl font-serif font-bold text-zen-brown">{settings?.general.currencySymbol} {stats.ot.toLocaleString()}</h4>
           </div>
        </div>
        <div className="flex-shrink-0 w-[280px] sm:w-auto bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] border border-zen-brown/15 shadow-xl flex items-center gap-6">
           <div className="w-16 h-16 rounded-2xl bg-zen-leaf text-white flex items-center justify-center shadow-lg"><Clock size={32} /></div>
           <div>
              <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest">Accumulated Labor Hours</p>
              <h4 className="text-2xl sm:text-3xl font-serif font-bold text-zen-brown">{stats.hours.toLocaleString()} hrs</h4>
           </div>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-sm rounded-[2rem] sm:rounded-[3rem] border border-zen-brown/15 overflow-hidden shadow-2xl">
         <div className="p-6 sm:p-10 border-b border-zen-brown/15 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/40">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10 w-full md:w-auto">
               <div>
                  <h3 className="text-xl sm:text-2xl font-serif font-bold text-zen-brown tracking-tight">Financial Ledger</h3>
                  <p className="text-[9px] sm:text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest mt-1 sm:mt-2">{dayjs(selectedMonth).format('MMMM YYYY')} Disbursement Records</p>
               </div>
               
               <div className="flex bg-zen-cream/30 p-1 rounded-xl sm:rounded-2xl border border-zen-brown/15 w-full sm:w-auto">
                  <input 
                    type="month" 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent border-none outline-none font-serif text-sm text-zen-brown px-4 py-2 w-full"
                  />
               </div>
            </div>
            
            <div className="flex gap-3 sm:gap-4 self-end md:self-auto">
               <ZenIconButton icon={Filter} />
               <ZenIconButton icon={Download} />
            </div>
         </div>

          <div className="overflow-x-auto min-h-[500px]">
             <table className="w-full text-center border-separate border-spacing-0 min-w-[1000px]">
                <thead>
                   <tr className="bg-zen-cream/10 border-b border-zen-brown/15">
                      <th className="px-8 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest text-center w-[20%]">Specialist</th>
                      <th className="px-8 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest text-center w-[15%]">Protocol</th>
                      <th className="px-8 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest text-center w-[15%]">Attendance</th>
                      <th className="px-8 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest text-center w-[15%]">Base Remuneration</th>
                      <th className="px-8 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest text-center w-[15%]">OT Premium</th>
                      <th className="px-8 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest text-center w-[20%]">Final Payout</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-zen-brown/15">
                   {filteredData.map((row) => (
                      <tr key={row.employeeId} className="hover:bg-zen-cream/5 transition-all duration-500 group">
                         <td className="px-8 py-8">
                            <div className="flex flex-col items-center">
                               <span className="font-serif text-lg text-zen-brown font-bold tracking-tight">{row.name}</span>
                               <span className="text-[10px] text-zen-brown/30 uppercase tracking-widest">{row.role}</span>
                            </div>
                         </td>
                         <td className="px-8 py-8">
                            <div className="flex justify-center">
                               <ZenBadge variant="sand" className="italic tracking-widest uppercase text-[8px]">{row.payType} Logic</ZenBadge>
                            </div>
                         </td>
                         <td className="px-8 py-8">
                            <div className="flex flex-col items-center">
                               <span className="font-serif font-bold text-zen-brown">{row.daysWorked} Days</span>
                               <span className="text-[10px] text-zen-brown/30 uppercase tracking-widest">{row.totalHours} Total Hrs</span>
                            </div>
                         </td>
                         <td className="px-8 py-8">
                            <span className="font-serif text-lg text-zen-brown/60 font-medium">{settings?.general.currencySymbol} {row.basePay.toLocaleString()}</span>
                         </td>
                         <td className="px-8 py-8">
                            <div className="flex flex-col items-center">
                               <span className="font-serif text-lg text-red-400 font-bold">+{settings?.general.currencySymbol} {row.otPay.toLocaleString()}</span>
                               <p className="text-[9px] text-zen-brown/20 uppercase tracking-[0.2em] font-bold mt-1">{row.otHours} OT Hrs</p>
                            </div>
                         </td>
                         <td className="px-8 py-8">
                            <div className="flex justify-center">
                               <div className="bg-zen-leaf/10 py-5 px-8 rounded-2xl border border-zen-leaf/20 shadow-sm shadow-zen-leaf/5">
                                  <span className="font-serif text-2xl text-zen-leaf font-bold tracking-tighter">{settings?.general.currencySymbol} {row.totalPay.toLocaleString()}</span>
                               </div>
                            </div>
                         </td>
                      </tr>
                   ))}
                  {filteredData.length === 0 && (
                     <tr>
                        <td colSpan={6} className="py-24 text-center text-zen-brown/20 italic font-serif text-2xl">
                           No financial records found for the selected lunar cycle.
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </ZenPageLayout>
  );
};

export default Payroll;
