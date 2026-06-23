import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock, Zap, Wallet2,
  Download, Search, Edit3, Trash2, ShieldCheck, FilePlus2, Save
} from 'lucide-react';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenStatCard } from '../../components/zen/ZenStatCard';
import { ZenIconButton, ZenBadge, ZenButton } from '../../components/zen/ZenButtons';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { notify } from '../../components/shared/ZenNotification';
import { ZenDropdown, ZenInput, ZenMonthPicker, ZenTextarea } from '../../components/zen/ZenInputs';
import dayjs from 'dayjs';
import { getCachedJson, setCachedJson } from '../../utils/localCache';
import { ExportPopup, ExportColumn } from '../../components/shared/ExportPopup';
import { useBranches } from '../../context/BranchContext';
import { Modal } from '../../components/shared/Modal';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { getPollIntervalMs, shouldPollNow } from '../../utils/polling';
import { subscribeToDataChanges } from '../../utils/realtimeSync';

// Local high-performance debounce utility to avoid external dependency issues
const debounce = (fn: Function, ms: number) => {
  let timeoutId: any;
  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

interface PayrollRecord {
  employeeId: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  status?: string;
  branchId?: string;
  branch?: string;
  month?: string;
  monthLabel?: string;
  salary?: number;
  configuredBaseAmount?: number;
  overtimeRate?: number;
  shiftHours?: number;
  shift?: string;
  commissionBasis?: string;
  basePay: number;
  basePayBeforeDeduction?: number;
  regularPay?: number;
  paidLeavePay?: number;
  otPay: number;
  totalPay: number;
  totalHours: number;
  regularHours?: number;
  otHours: number;
  daysWorked: number;
  presentCount?: number;
  halfDayCount?: number;
  absentCount?: number;
  onLeaveCount?: number;
  completedCheckouts?: number;
  leavesCount: number;
  paidLeaveAllowance?: number;
  paidLeaveApplied?: number;
  unpaidLeaveUnits?: number;
  leaveUnit?: string;
  deduction: number;
  payType: string;
  joiningDate?: string;
  manualAddition?: number;
  manualDeduction?: number;
  finalPay?: number;
  payoutStatus?: 'Included' | 'Hold' | 'Excluded';
  notes?: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

interface PayrollRun {
  _id: string;
  runNumber: string;
  month: string;
  monthLabel?: string;
  branch?: string;
  branchName?: string;
  status: 'Draft' | 'Approved' | 'Paid' | 'Voided';
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const Payroll = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { selectedBranch } = useBranches();
  const [loading, setLoading] = useState(() => getCachedJson<PayrollRecord[]>('zen_page_payroll_records', []).length === 0);
  const [payrollData, setPayrollData] = useState<PayrollRecord[]>(() => getCachedJson('zen_page_payroll_records', []));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));

  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(() => getCachedJson<PaginationMeta | null>('zen_page_payroll_pagination', null));
  const [stats, setStats] = useState(() => getCachedJson('zen_page_payroll_stats', { total: 0, calculatedTotal: 0, additions: 0, deductions: 0, ot: 0, hours: 0, includedCount: 0, holdCount: 0, excludedCount: 0 }));
  const [payrollRun, setPayrollRun] = useState<PayrollRun | null>(() => getCachedJson<PayrollRun | null>('zen_page_payroll_run', null));
  const [saving, setSaving] = useState(false);
  const [editingRow, setEditingRow] = useState<PayrollRecord | null>(null);
  const [adjustmentForm, setAdjustmentForm] = useState({
    manualAddition: 0,
    manualDeduction: 0,
    payoutStatus: 'Included',
    notes: ''
  });
  const [confirmState, setConfirmState] = useState<{
    type: 'create' | 'approve' | 'delete';
    title: string;
    message: string;
    confirmText: string;
  } | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
  const PAGE_LIMIT = 10;

  const fetchPayroll = async (page = 1, search = '') => {
    if (payrollData.length === 0) setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        month: selectedMonth,
        page: page.toString(),
        limit: PAGE_LIMIT.toString(),
        search,
        branch: selectedBranch !== 'all' ? selectedBranch : ''
      });

      const response = await fetch(`${API_URL}/payroll?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const result = await response.json();

      if (result.data) {
        setPayrollData(result.data);
        setStats(result.stats || { total: 0, calculatedTotal: 0, additions: 0, deductions: 0, ot: 0, hours: 0, includedCount: 0, holdCount: 0, excludedCount: 0 });
        setPayrollRun(result.run || null);
        setPagination(result.pagination || null);
      } else {
        setPayrollData(Array.isArray(result) ? result : []);
        setPayrollRun(null);
        setPagination(null);
      }
    } catch (error) {
      notify('error', 'Error', 'Failed to generate payroll report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => setCachedJson('zen_page_payroll_records', payrollData), [payrollData]);
  useEffect(() => setCachedJson('zen_page_payroll_pagination', pagination), [pagination]);
  useEffect(() => setCachedJson('zen_page_payroll_stats', stats), [stats]);
  useEffect(() => setCachedJson('zen_page_payroll_run', payrollRun), [payrollRun]);

  useEffect(() => {
    fetchPayroll(1, searchTerm);
    setCurrentPage(1);
  }, [selectedMonth, selectedBranch, user?.token]);

  useEffect(() => {
    if (!user?.token) return;
    const refresh = () => {
      if (!shouldPollNow()) return;
      fetchPayroll(currentPage, searchTerm);
    };
    const interval = setInterval(refresh, getPollIntervalMs(30000));
    const unsubscribe = subscribeToDataChanges(refresh);
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [user?.token, selectedMonth, selectedBranch, currentPage, searchTerm]);

  const debouncedSearch = useMemo(
    () => debounce((nextValue: string) => {
      fetchPayroll(1, nextValue);
      setCurrentPage(1);
    }, 500),
    [selectedMonth, selectedBranch, user?.token]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchPayroll(page, searchTerm);
  };

  const branchQueryValue = selectedBranch !== 'all' ? selectedBranch : '';

  const createPayrollDraft = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/payroll/runs?branch=${branchQueryValue}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ month: selectedMonth })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Unable to create payroll draft');
      notify('success', 'Payroll Draft Created', 'The generated payroll is now saved for review.');
      await fetchPayroll(currentPage, searchTerm);
    } catch (error: any) {
      notify('error', 'Draft Failed', error.message || 'Unable to create payroll draft.');
    } finally {
      setSaving(false);
    }
  };

  const approvePayrollDraft = async () => {
    if (!payrollRun) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/payroll/runs/${payrollRun._id}/approve`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Unable to approve payroll');
      notify('success', 'Payroll Approved', 'This payroll run is locked for the cycle.');
      await fetchPayroll(currentPage, searchTerm);
    } catch (error: any) {
      notify('error', 'Approval Failed', error.message || 'Unable to approve payroll.');
    } finally {
      setSaving(false);
    }
  };

  const deletePayrollDraft = async () => {
    if (!payrollRun) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/payroll/runs/${payrollRun._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Unable to delete payroll draft');
      notify('success', 'Draft Deleted', 'Payroll returned to live preview mode.');
      await fetchPayroll(1, searchTerm);
      setCurrentPage(1);
    } catch (error: any) {
      notify('error', 'Delete Failed', error.message || 'Unable to delete payroll draft.');
    } finally {
      setSaving(false);
    }
  };

  const openRowEditor = (row: PayrollRecord) => {
    setEditingRow(row);
    setAdjustmentForm({
      manualAddition: row.manualAddition || 0,
      manualDeduction: row.manualDeduction || 0,
      payoutStatus: row.payoutStatus || 'Included',
      notes: row.notes || ''
    });
  };

  const saveRowAdjustment = async () => {
    if (!payrollRun || !editingRow) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/payroll/runs/${payrollRun._id}/rows/${editingRow.employeeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(adjustmentForm)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Unable to save adjustment');
      notify('success', 'Payroll Updated', 'Adjustment saved to the draft payroll run.');
      setEditingRow(null);
      await fetchPayroll(currentPage, searchTerm);
    } catch (error: any) {
      notify('error', 'Save Failed', error.message || 'Unable to save adjustment.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAction = () => {
    if (!confirmState) return;
    if (confirmState.type === 'create') createPayrollDraft();
    if (confirmState.type === 'approve') approvePayrollDraft();
    if (confirmState.type === 'delete') deletePayrollDraft();
  };

  const fetchAllPayrollForExport = async (): Promise<PayrollRecord[]> => {
    const allRows: PayrollRecord[] = [];
    const exportLimit = 200;
    let exportPage = 1;
    let exportTotalPages = 1;

    do {
      const queryParams = new URLSearchParams({
        month: selectedMonth,
        page: exportPage.toString(),
        limit: exportLimit.toString(),
        search: searchTerm,
        branch: selectedBranch !== 'all' ? selectedBranch : ''
      });

      const response = await fetch(`${API_URL}/payroll?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });

      if (!response.ok) {
        throw new Error('Unable to fetch payroll export rows');
      }

      const payload = await response.json();
      const pageRows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      allRows.push(...pageRows);
      exportTotalPages = Number(payload?.pagination?.pages || 1);
      exportPage += 1;
    } while (exportPage <= exportTotalPages);

    const unique = new Map<string, PayrollRecord>();
    allRows.forEach((row) => {
      const key = `${row.employeeId}-${row.month || selectedMonth}`;
      unique.set(key, row);
    });

    return Array.from(unique.values());
  };

  const payrollExportColumns = useMemo<ExportColumn<PayrollRecord>[]>(
    () => {
      const currency = settings?.general?.currencySymbol || 'QR';
      const money = (value?: number) =>
        typeof value === 'number' ? `${currency} ${value}` : '-';
      const dateValue = (value?: string) => {
        if (!value) return '-';
        const parsed = dayjs(value);
        return parsed.isValid() ? parsed.format('YYYY-MM-DD') : value;
      };

      return [
        { header: 'Month', accessor: (row) => row.month || selectedMonth },
        { header: 'Month Label', accessor: (row) => row.monthLabel || dayjs(selectedMonth).format('MMMM YYYY') },
        { header: 'Employee ID', accessor: (row) => row.employeeId },
        { header: 'Employee Name', accessor: (row) => row.name },
        { header: 'Role', accessor: (row) => row.role },
        { header: 'Email', accessor: (row) => row.email || '-' },
        { header: 'Phone', accessor: (row) => row.phone || '-' },
        { header: 'Employee Status', accessor: (row) => row.status || '-' },
        { header: 'Branch ID', accessor: (row) => row.branchId || '-' },
        { header: 'Branch', accessor: (row) => row.branch || 'Main Registry' },
        { header: 'Joining Date', accessor: (row) => dateValue(row.joiningDate) },
        { header: 'Payroll Type', accessor: (row) => row.payType },
        { header: 'Salary', accessor: (row) => money(row.salary) },
        { header: 'Configured Base Amount', accessor: (row) => money(row.configuredBaseAmount) },
        { header: 'Overtime Rate', accessor: (row) => money(row.overtimeRate) },
        { header: 'Shift Hours', accessor: (row) => row.shiftHours ?? '-' },
        { header: 'Shift', accessor: (row) => row.shift || 'Flexible' },
        { header: 'Commission Basis', accessor: (row) => row.commissionBasis || '-' },
        { header: 'Attendance Records', accessor: (row) => row.daysWorked },
        { header: 'Present Count', accessor: (row) => row.presentCount ?? 0 },
        { header: 'Half Day Count', accessor: (row) => row.halfDayCount ?? 0 },
        { header: 'Absent Count', accessor: (row) => row.absentCount ?? 0 },
        { header: 'On Leave Count', accessor: (row) => row.onLeaveCount ?? 0 },
        { header: 'Completed Checkouts', accessor: (row) => row.completedCheckouts ?? 0 },
        { header: 'Total Hours', accessor: (row) => row.totalHours },
        { header: 'Regular Hours', accessor: (row) => row.regularHours ?? 0 },
        { header: 'Overtime Hours', accessor: (row) => row.otHours },
        { header: 'Leave Unit', accessor: (row) => row.leaveUnit || (row.payType === 'Monthly' ? 'Days' : 'Hours') },
        { header: 'Leave Count', accessor: (row) => row.leavesCount },
        { header: 'Paid Leave Allowance', accessor: (row) => row.paidLeaveAllowance ?? 0 },
        { header: 'Paid Leave Applied', accessor: (row) => row.paidLeaveApplied ?? 0 },
        { header: 'Unpaid Leave Units', accessor: (row) => row.unpaidLeaveUnits ?? 0 },
        { header: 'Base Pay Before Deduction', accessor: (row) => money(row.basePayBeforeDeduction) },
        { header: 'Regular Pay', accessor: (row) => money(row.regularPay) },
        { header: 'Paid Leave Pay', accessor: (row) => money(row.paidLeavePay) },
        { header: 'Base Reward', accessor: (row) => money(row.basePay) },
        { header: 'Overtime Pay', accessor: (row) => money(row.otPay) },
        { header: 'Deduction', accessor: (row) => money(row.deduction) },
        { header: 'Final Payout', accessor: (row) => money(row.totalPay) }
      ];
    },
    [selectedMonth, settings?.general?.currencySymbol]
  );

  return (
    <ZenPageLayout
      title="Payroll"
      searchTerm={searchTerm}
      onSearchChange={(val) => {
        setSearchTerm(val);
        debouncedSearch(val);
      }}
      hideViewToggle
      hideAddButton
      searchMaxWidth="lg:max-w-xs"
      headerActions={
        <>
          {!payrollRun && (
            <ZenButton
              onClick={() => setConfirmState({
                type: 'create',
                title: 'Create payroll draft?',
                message: 'This saves the current payroll calculation for review, adjustments, holds, exclusions, and approval.',
                confirmText: 'Create Draft'
              })}
              disabled={saving || payrollData.length === 0}
              className="!py-4 !px-6"
            >
              <FilePlus2 size={16} />
              Create Draft
            </ZenButton>
          )}
          {payrollRun?.status === 'Draft' && (
            <>
              <ZenButton
                variant="outline"
                onClick={() => setConfirmState({
                  type: 'delete',
                  title: 'Delete draft?',
                  message: 'This removes only the draft review copy. Employee, attendance, and leave data remain untouched.',
                  confirmText: 'Delete Draft'
                })}
                disabled={saving}
                className="!py-4 !px-6"
              >
                <Trash2 size={16} />
                Delete Draft
              </ZenButton>
              <ZenButton
                onClick={() => setConfirmState({
                  type: 'approve',
                  title: 'Approve payroll?',
                  message: 'Approval locks this payroll run. Further edits will be blocked to protect the official record.',
                  confirmText: 'Approve Payroll'
                })}
                disabled={saving}
                className="!py-4 !px-6"
              >
                <ShieldCheck size={16} />
                Approve
              </ZenButton>
            </>
          )}
          <ZenMonthPicker
            value={selectedMonth}
            onChange={setSelectedMonth}
            className="w-[180px]"
            hideLabel
            variant="pill"
          />
          <ExportPopup<PayrollRecord>
            data={payrollData}
            columns={payrollExportColumns}
            fileName={`payroll_${selectedMonth}`}
            title="Payroll"
            triggerLabel="Export Report"
            description="Choose format and export the complete payroll ledger with attendance, leave, deduction, overtime, and payout values."
            resolveData={fetchAllPayrollForExport}
          />
        </>
      }
      topContent={
        <div className="flex overflow-x-auto overflow-y-visible pt-4 pb-6 gap-6 lg:grid lg:grid-cols-4 lg:gap-8 lg:overflow-visible scrollbar-hide px-4 lg:px-2 w-full">
          {[
            { label: payrollRun ? 'Approved Payout' : 'Payroll Preview', value: `${settings?.general?.currencySymbol || 'QR'} ${stats.total.toLocaleString()}`, icon: Wallet2, color: 'text-zen-brown', bg: 'bg-zen-brown/[0.03]', watermark: Wallet2 },
            { label: 'Total Deductions', value: `${settings?.general?.currencySymbol || 'QR'} ${stats.deductions.toLocaleString()}`, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/[0.03]', watermark: Clock },
            { label: 'Overtime', value: `${settings?.general?.currencySymbol || 'QR'} ${stats.ot.toLocaleString()}`, icon: Zap, color: 'text-red-500', bg: 'bg-red-500/[0.03]', watermark: Zap },
            { label: payrollRun ? 'Held / Excluded' : 'Total Hours', value: payrollRun ? `${stats.holdCount || 0} / ${stats.excludedCount || 0}` : `${stats.hours.toLocaleString()}`, icon: Clock, color: 'text-slate-500', bg: 'bg-slate-500/[0.03]', watermark: Clock }
          ].map((stat, i) => (
            <ZenStatCard key={stat.label} {...stat} delay={i * 0.05} />
          ))}
        </div>
      }
    >
      <div className="space-y-10 pb-20">
        <div className="mx-4 lg:mx-2 rounded-2xl border border-zen-brown/10 bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <ZenBadge variant={payrollRun?.status === 'Approved' ? 'leaf' : payrollRun ? 'sand' : 'secondary'}>
                  {payrollRun ? payrollRun.status : 'Live Preview'}
                </ZenBadge>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zen-brown/35">
                  {payrollRun?.runNumber || 'Unsaved generated calculation'}
                </p>
              </div>
              <p className="mt-2 text-sm font-semibold text-zen-brown/55">
                {payrollRun
                  ? `${payrollRun.branchName || 'Selected Branch'} payroll for ${payrollRun.monthLabel || dayjs(selectedMonth).format('MMMM YYYY')}`
                  : 'Create a draft before making adjustments, holding payouts, excluding rows, or approving payroll.'}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center sm:min-w-[360px]">
              <div className="rounded-xl bg-zen-leaf/5 px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-zen-brown/30">Included</p>
                <p className="mt-1 font-serif text-xl font-black text-zen-leaf">{stats.includedCount || payrollData.length}</p>
              </div>
              <div className="rounded-xl bg-amber-50 px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-zen-brown/30">Hold</p>
                <p className="mt-1 font-serif text-xl font-black text-amber-600">{stats.holdCount || 0}</p>
              </div>
              <div className="rounded-xl bg-rose-50 px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-zen-brown/30">Excluded</p>
                <p className="mt-1 font-serif text-xl font-black text-rose-500">{stats.excludedCount || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="table-container w-full bg-white rounded-xl border border-gray-200/60 shadow-none overflow-hidden animate-in fade-in duration-700 mx-4 lg:mx-2">
            <table className="w-full text-center border-collapse min-w-[760px] lg:min-w-[1000px]">
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
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {(!payrollData || payrollData.length === 0) && (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center text-[11px] font-sans text-gray-400 bg-gray-50/30">
                      {loading ? (
                         <div className="flex items-center justify-center gap-3">
                            <div className="w-4 h-4 border-2 border-zen-sand border-t-transparent rounded-full animate-spin" />
                            Synchronizing ledger...
                         </div>
                      ) : 'No financial nodes found for this cycle'}
                    </td>
                  </tr>
                )}

                {payrollData.map((row, index) => {
                  const sNo = pagination ? (pagination.page - 1) * pagination.limit + index + 1 : index + 1;
                  const finalPay = row.finalPay ?? row.totalPay;
                  const isLocked = payrollRun?.status !== 'Draft';
                  return (
                    <tr key={row.employeeId} className={`transition-all group border-b border-black/[0.02] ${row.payoutStatus === 'Excluded' ? 'opacity-45 bg-rose-50/20' : row.payoutStatus === 'Hold' ? 'bg-amber-50/20' : ''}`}>
                      <td className="text-center italic opacity-40 text-[11px]">
                        {sNo.toString().padStart(2, '0')}
                      </td>
                      <td>
                        <div className="flex flex-col items-center justify-center leading-none">
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
                        <div className="flex flex-col items-center justify-center leading-none">
                          <span className="font-bold text-zen-brown text-sm">{row.daysWorked} Days</span>
                          <span className="text-[8px] text-zen-brown/30 font-bold uppercase tracking-widest mt-1">{row.totalHours} Hours</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col items-center justify-center leading-none">
                          <span className={`font-bold text-sm ${row.leavesCount > 0 ? 'text-amber-600' : 'text-zen-brown/20'}`}>
                            {row.leavesCount} {row.payType === 'Monthly' ? 'Day' : 'Hr'}{row.leavesCount !== 1 ? 's' : ''}
                          </span>
                          <span className="text-[7px] font-bold uppercase tracking-widest opacity-40 whitespace-nowrap mt-1">Leave Balance</span>
                        </div>
                      </td>
                      <td>
                        <span className="text-sm text-zen-brown/60 font-bold">{settings?.general?.currencySymbol} {row.basePay.toLocaleString()}</span>
                      </td>
                      <td>
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[11px] font-black ${(row.deduction + (row.manualDeduction || 0)) > 0 ? 'text-red-500' : 'text-slate-300'}`}>-{settings?.general?.currencySymbol}{(row.deduction + (row.manualDeduction || 0)).toLocaleString()}</span>
                            <span className={`text-[11px] font-black ${(row.otPay + (row.manualAddition || 0)) > 0 ? 'text-emerald-500' : 'text-slate-300'}`}>+{settings?.general?.currencySymbol}{(row.otPay + (row.manualAddition || 0)).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-4 opacity-30">
                            <span className="text-[7px] uppercase font-bold tracking-tighter">Penalty</span>
                            <span className="text-[7px] uppercase font-bold tracking-tighter">Premium</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex justify-center">
                          <div className={`${row.payoutStatus === 'Excluded' ? 'bg-rose-50 border-rose-100' : row.payoutStatus === 'Hold' ? 'bg-amber-50 border-amber-100' : 'bg-zen-leaf/5 border-zen-leaf/10'} py-2.5 px-5 rounded-xl border shadow-sm transition-transform group-hover:scale-105`}>
                            <span className={`font-black text-base tracking-tight ${row.payoutStatus === 'Excluded' ? 'text-rose-500 line-through' : row.payoutStatus === 'Hold' ? 'text-amber-600' : 'text-zen-leaf'}`}>{settings?.general?.currencySymbol} {finalPay.toLocaleString()}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-2">
                          <ZenBadge variant={row.payoutStatus === 'Excluded' ? 'danger' : row.payoutStatus === 'Hold' ? 'sand' : 'leaf'} className="scale-90">
                            {row.payoutStatus || 'Included'}
                          </ZenBadge>
                          {payrollRun && (
                            <ZenIconButton
                              icon={Edit3}
                              variant={isLocked ? 'secondary' : 'outline'}
                              disabled={isLocked}
                              onClick={() => openRowEditor(row)}
                              className={isLocked ? 'opacity-30 cursor-not-allowed' : ''}
                              size="sm"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        {pagination && pagination.pages > 1 && (
          <div className="px-4 lg:px-2">
            <ZenPagination
              currentPage={currentPage}
              totalPages={pagination.pages}
              onPageChange={handlePageChange}
            />
          </div>
        )}

        <Modal
          isOpen={Boolean(editingRow)}
          onClose={() => setEditingRow(null)}
          title="Payroll Adjustment"
          subtitle={editingRow?.name}
          headerIcon={Edit3}
          maxWidth="max-w-2xl"
          footer={
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <ZenButton variant="outline" onClick={() => setEditingRow(null)} disabled={saving}>
                Cancel
              </ZenButton>
              <ZenButton onClick={saveRowAdjustment} disabled={saving}>
                <Save size={16} />
                Save Review
              </ZenButton>
            </div>
          }
        >
          {editingRow && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-zen-brown/10 bg-zen-cream/30 p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zen-brown/30">Calculated</p>
                  <p className="mt-2 font-serif text-2xl font-black text-zen-brown">{settings?.general?.currencySymbol} {editingRow.totalPay.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zen-brown/30">Addition</p>
                  <p className="mt-2 font-serif text-2xl font-black text-emerald-600">+{settings?.general?.currencySymbol} {Number(adjustmentForm.manualAddition || 0).toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zen-brown/30">Deduction</p>
                  <p className="mt-2 font-serif text-2xl font-black text-rose-500">-{settings?.general?.currencySymbol} {Number(adjustmentForm.manualDeduction || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <ZenInput
                  label="Manual Addition"
                  type="number"
                  value={adjustmentForm.manualAddition}
                  onChange={(e: any) => setAdjustmentForm(prev => ({ ...prev, manualAddition: Number(e.target.value) || 0 }))}
                />
                <ZenInput
                  label="Manual Deduction"
                  type="number"
                  value={adjustmentForm.manualDeduction}
                  onChange={(e: any) => setAdjustmentForm(prev => ({ ...prev, manualDeduction: Number(e.target.value) || 0 }))}
                />
              </div>

              <ZenDropdown
                label="Payout Decision"
                options={[
                  { label: 'Included in payout', value: 'Included' },
                  { label: 'Hold payout', value: 'Hold' },
                  { label: 'Exclude from this payroll', value: 'Excluded' }
                ]}
                value={adjustmentForm.payoutStatus}
                onChange={(value) => setAdjustmentForm(prev => ({ ...prev, payoutStatus: value }))}
              />

              <ZenTextarea
                label="Review Notes"
                value={adjustmentForm.notes}
                onChange={(e: any) => setAdjustmentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Reason for adjustment, hold, or exclusion..."
              />
            </div>
          )}
        </Modal>

        <ConfirmDialog
          isOpen={Boolean(confirmState)}
          onClose={() => setConfirmState(null)}
          onConfirm={handleConfirmAction}
          title={confirmState?.title || ''}
          message={confirmState?.message || ''}
          confirmText={confirmState?.confirmText || 'Confirm'}
          type={confirmState?.type === 'delete' ? 'danger' : 'warning'}
        />
      </div>
    </ZenPageLayout>
  );
};

export default Payroll;
