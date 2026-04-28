import React, { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Filter, 
  Trash2, 
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenBadge, ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { ZenStatCard } from '../../components/zen/ZenStatCard';
import { ZenInput, ZenDropdown, ZenDatePicker } from '../../components/zen/ZenInputs';
import { Modal } from '../../components/shared/Modal';
import { notify } from '../../components/shared/ZenNotification';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { useSettings } from '../../context/SettingsContext';
import { getCachedJson, setCachedJson } from '../../utils/localCache';
import { ExportPopup, ExportColumn } from '../../components/shared/ExportPopup';
import { useBranches } from '../../context/BranchContext';

interface BranchRef {
  _id?: string;
  name?: string;
}

interface Expense {
  _id: string;
  user?: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  branch?: BranchRef | string;
  createdAt?: string;
  updatedAt?: string;
}

interface InvoiceItem {
  name?: string;
  price?: number;
  duration?: number;
}

interface InvoicePayment {
  mode?: string;
  amount?: number;
}

interface Invoice {
  _id: string;
  clientId?: string;
  invoiceNumber?: string;
  clientName: string;
  items?: InvoiceItem[];
  subtotal?: number;
  gst?: number;
  discount?: number;
  total: number;
  date: string;
  paymentMode: string;
  payments?: InvoicePayment[];
  branch?: BranchRef | string;
  createdAt?: string;
  updatedAt?: string;
}

interface LedgerRow {
  id: string;
  sourceModel: 'Invoice' | 'Expense';
  kind: 'Income' | 'Expense';
  title: string;
  subtitle: string;
  date: string;
  amount: number;
  signedAmount: number;
  meta: string;
  sourceId: string;
  branchId: string;
  branchName: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  paymentMode: string;
  paymentsSummary: string;
  itemsCount: number;
  itemsSummary: string;
  subtotal: number;
  gst: number;
  discount: number;
  total: number;
  expenseTitle: string;
  expenseCategory: string;
  expenseUserId: string;
  createdAt: string;
  updatedAt: string;
}

const getBranchId = (branch?: BranchRef | string) => {
  if (!branch) return '';
  return typeof branch === 'string' ? branch : branch._id || '';
};

const getBranchName = (branch?: BranchRef | string) => {
  if (!branch) return 'Main Registry';
  return typeof branch === 'string' ? branch : branch.name || 'Main Registry';
};

const summarizeInvoiceItems = (items?: InvoiceItem[]) => {
  if (!items || items.length === 0) return '-';
  return items
    .map((item) => {
      const bits = [item.name || 'Item'];
      if (typeof item.price === 'number') bits.push(`${item.price}`);
      if (typeof item.duration === 'number') bits.push(`${item.duration}m`);
      return bits.join(' / ');
    })
    .join(' | ');
};

const summarizePayments = (payments?: InvoicePayment[]) => {
  if (!payments || payments.length === 0) return '-';
  return payments
    .map((payment) => `${payment.mode || 'Mode'}: ${payment.amount ?? 0}`)
    .join(' | ');
};

const formatExportDate = (value?: string) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : value;
};

const formatExportDateTime = (value?: string) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm') : value;
};

const buildLedgerRows = (expenses: Expense[], invoices: Invoice[]): LedgerRow[] => {
  const expenseRows = expenses.map((exp) => ({
    id: `expense-${exp._id}`,
    sourceModel: 'Expense' as const,
    kind: 'Expense' as const,
    title: exp.title,
    subtitle: exp.category,
    date: exp.date,
    amount: exp.amount || 0,
    signedAmount: -(exp.amount || 0),
    meta: 'Operational outflow',
    sourceId: exp._id,
    branchId: getBranchId(exp.branch),
    branchName: getBranchName(exp.branch),
    invoiceNumber: '-',
    clientId: '-',
    clientName: '-',
    paymentMode: '-',
    paymentsSummary: '-',
    itemsCount: 0,
    itemsSummary: '-',
    subtotal: 0,
    gst: 0,
    discount: 0,
    total: 0,
    expenseTitle: exp.title,
    expenseCategory: exp.category,
    expenseUserId: exp.user || '',
    createdAt: exp.createdAt || '',
    updatedAt: exp.updatedAt || ''
  }));

  const invoiceRows = invoices.map((inv) => ({
    id: `invoice-${inv._id}`,
    sourceModel: 'Invoice' as const,
    kind: 'Income' as const,
    title: `Service ${inv.clientName}`,
    subtitle: inv.paymentMode,
    date: inv.date,
    amount: inv.total || 0,
    signedAmount: inv.total || 0,
    meta: 'Completed invoice',
    sourceId: inv._id,
    branchId: getBranchId(inv.branch),
    branchName: getBranchName(inv.branch),
    invoiceNumber: inv.invoiceNumber || '-',
    clientId: inv.clientId || '-',
    clientName: inv.clientName || '-',
    paymentMode: inv.paymentMode || '-',
    paymentsSummary: summarizePayments(inv.payments),
    itemsCount: inv.items?.length || 0,
    itemsSummary: summarizeInvoiceItems(inv.items),
    subtotal: inv.subtotal || 0,
    gst: inv.gst || 0,
    discount: inv.discount || 0,
    total: inv.total || 0,
    expenseTitle: '-',
    expenseCategory: '-',
    expenseUserId: '-',
    createdAt: inv.createdAt || '',
    updatedAt: inv.updatedAt || ''
  }));

  return [...expenseRows, ...invoiceRows].sort(
    (a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
  );
};

const buildTrendFromRecords = (expenses: Expense[], invoices: Invoice[]) => {
  const trendPoints = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const current = dayjs().subtract(offset, 'day');
    const dateKey = current.format('YYYY-MM-DD');

    const revenue = invoices
      .filter((invoice) => invoice.date === dateKey)
      .reduce((sum, invoice) => sum + (invoice.total || 0), 0);

    const outflow = expenses
      .filter((expense) => expense.date === dateKey)
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);

    trendPoints.push({
      name: current.format('ddd'),
      revenue,
      expenses: outflow
    });
  }

  return trendPoints;
};

const Finance = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { selectedBranch } = useBranches();
  const [invoices, setInvoices] = useState<Invoice[]>(() => getCachedJson('zen_page_finance_invoices', []));
  const [expenses, setExpenses] = useState<Expense[]>(() => getCachedJson('zen_page_finance_expenses', []));
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => {
    const cachedInvoices = getCachedJson<Invoice[]>('zen_page_finance_invoices', []);
    const cachedExpenses = getCachedJson<Expense[]>('zen_page_finance_expenses', []);
    return cachedInvoices.length === 0 && cachedExpenses.length === 0;
  });

  const [formData, setFormData] = useState({
    title: '',
    category: 'Inventory',
    amount: 0,
    date: dayjs().format('YYYY-MM-DD')
  });

  const [trendData, setTrendData] = useState<any[]>(() => getCachedJson('zen_page_finance_trend', []));

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    fetchData();
  }, [selectedBranch, debouncedSearch, user?.token]);

  const fetchData = async () => {
    try {
      const hasVisibleData = invoices.length > 0 || expenses.length > 0;
      if (!hasVisibleData) setLoading(true);
      const invoiceParams = new URLSearchParams({
        search: debouncedSearch,
        branch: selectedBranch !== 'all' ? selectedBranch : ''
      });
      const expenseParams = new URLSearchParams({
        search: debouncedSearch,
        branch: selectedBranch !== 'all' ? selectedBranch : ''
      });
      const statsParams = new URLSearchParams({
        branch: selectedBranch !== 'all' ? selectedBranch : ''
      });

      const [invRes, expRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/invoices?${invoiceParams.toString()}`, { headers: { 'Authorization': `Bearer ${user?.token}` } }),
        fetch(`${API_URL}/expenses?${expenseParams.toString()}`, { headers: { 'Authorization': `Bearer ${user?.token}` } }),
        fetch(`${API_URL}/stats/dashboard?${statsParams.toString()}`, { headers: { 'Authorization': `Bearer ${user?.token}` } })
      ]);
      const invData = await invRes.json();
      const expData = await expRes.json();
      const statsData = await statsRes.json();
      
      const invoicesList = Array.isArray(invData) ? invData : (invData.data || []);
      const expensesList = Array.isArray(expData) ? expData : (expData.data || []);
      
      setInvoices(invoicesList);
      setExpenses(expensesList);
      
      if (statsData.revenue?.trend) {
        setTrendData(statsData.revenue.trend);
      }
    } catch (error) {
      console.error('Finance Sync Error:', error);
      notify('error', 'Sync Failure', 'Failed to retrieve finance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => setCachedJson('zen_page_finance_invoices', invoices), [invoices]);
  useEffect(() => setCachedJson('zen_page_finance_expenses', expenses), [expenses]);
  useEffect(() => setCachedJson('zen_page_finance_trend', trendData), [trendData]);

  const totalIncome = useMemo(() => invoices.reduce((acc, inv) => acc + (inv.total || 0), 0), [invoices]);
  const totalExpenses = useMemo(() => expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0), [expenses]);
  const netProfit = totalIncome - totalExpenses;

  const ledgerRows = useMemo<LedgerRow[]>(() => buildLedgerRows(expenses, invoices), [expenses, invoices]);

  const chartData = useMemo(() => {
    if (debouncedSearch) {
      return buildTrendFromRecords(expenses, invoices);
    }
    if (trendData.length > 0) return trendData;
    if (invoices.length > 0 || expenses.length > 0) {
      return buildTrendFromRecords(expenses, invoices);
    }
    // Fallback if no trend data
    return [
      { name: '...', revenue: 0, expenses: 0 },
    ];
  }, [debouncedSearch, expenses, invoices, trendData]);

  const hasChartPoints = useMemo(
    () => chartData.some(point => Number(point.revenue || 0) > 0 || Number(point.expenses || 0) > 0),
    [chartData]
  );

  const fetchAllFinanceRowsForExport = async (): Promise<LedgerRow[]> => {
    const invoiceParams = new URLSearchParams({
      search: debouncedSearch,
      branch: selectedBranch !== 'all' ? selectedBranch : ''
    });
    const expenseParams = new URLSearchParams({
      search: debouncedSearch,
      branch: selectedBranch !== 'all' ? selectedBranch : ''
    });

    const [invoiceResponse, expenseResponse] = await Promise.all([
      fetch(`${API_URL}/invoices?${invoiceParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      }),
      fetch(`${API_URL}/expenses?${expenseParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      })
    ]);

    if (!invoiceResponse.ok || !expenseResponse.ok) {
      throw new Error('Unable to fetch finance export rows');
    }

    const [invoicePayload, expensePayload] = await Promise.all([
      invoiceResponse.json(),
      expenseResponse.json()
    ]);

    const fullInvoices = Array.isArray(invoicePayload?.data)
      ? invoicePayload.data
      : Array.isArray(invoicePayload)
        ? invoicePayload
        : [];

    const fullExpenses = Array.isArray(expensePayload?.data)
      ? expensePayload.data
      : Array.isArray(expensePayload)
        ? expensePayload
        : [];

    return buildLedgerRows(fullExpenses, fullInvoices);
  };

  const financeExportColumns = useMemo<ExportColumn<LedgerRow>[]>(
    () => {
      const currency = settings?.general?.currencySymbol || 'QR';
      const money = (value?: number) =>
        typeof value === 'number' ? `${currency} ${value}` : '-';

      return [
        { header: 'Ledger ID', accessor: (row) => row.id },
        { header: 'Source Model', accessor: (row) => row.sourceModel },
        { header: 'Entry Type', accessor: (row) => row.kind },
        { header: 'Source ID', accessor: (row) => row.sourceId },
        { header: 'Title', accessor: (row) => row.title },
        { header: 'Subtitle', accessor: (row) => row.subtitle },
        { header: 'Meta', accessor: (row) => row.meta },
        { header: 'Branch ID', accessor: (row) => row.branchId || '-' },
        { header: 'Branch', accessor: (row) => row.branchName || 'Main Registry' },
        { header: 'Date', accessor: (row) => formatExportDate(row.date) },
        { header: 'Signed Amount', accessor: (row) => money(row.signedAmount) },
        { header: 'Display Amount', accessor: (row) => money(row.amount) },
        { header: 'Invoice Number', accessor: (row) => row.invoiceNumber || '-' },
        { header: 'Client ID', accessor: (row) => row.clientId || '-' },
        { header: 'Client Name', accessor: (row) => row.clientName || '-' },
        { header: 'Payment Mode', accessor: (row) => row.paymentMode || '-' },
        { header: 'Payments', accessor: (row) => row.paymentsSummary || '-' },
        { header: 'Items Count', accessor: (row) => row.itemsCount || 0 },
        { header: 'Items', accessor: (row) => row.itemsSummary || '-' },
        { header: 'Subtotal', accessor: (row) => money(row.subtotal) },
        { header: 'GST', accessor: (row) => money(row.gst) },
        { header: 'Discount', accessor: (row) => money(row.discount) },
        { header: 'Invoice Total', accessor: (row) => money(row.total) },
        { header: 'Expense Title', accessor: (row) => row.expenseTitle || '-' },
        { header: 'Expense Category', accessor: (row) => row.expenseCategory || '-' },
        { header: 'Expense User ID', accessor: (row) => row.expenseUserId || '-' },
        { header: 'Created At', accessor: (row) => formatExportDateTime(row.createdAt) },
        { header: 'Updated At', accessor: (row) => formatExportDateTime(row.updatedAt) }
      ];
    },
    [settings?.general?.currencySymbol]
  );


  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        notify('success', 'Expense Recorded', 'The entry has been recorded.');
        setIsModalOpen(false);
        fetchData();
        setFormData({ title: '', category: 'Inventory', amount: 0, date: dayjs().format('YYYY-MM-DD') });
      }
    } catch (error) {
      notify('error', 'Save Error', 'Failed to update tactical record.');
    }
  };

  const executeDelete = async () => {
    if (!expenseToDelete) return;
    try {
      const response = await fetch(`${API_URL}/expenses/${expenseToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });

      if (response.ok) {
        notify('success', 'Entry Deleted', 'The entry has been removed from history.');
        setIsConfirmOpen(false);
        fetchData();
      }
    } catch (error) {
      notify('error', 'Removal Error', 'Failed to delete ledger entry.');
    }
  };

  return (
    <ZenPageLayout
      title="Finance Ledger"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      hideViewToggle
      addButtonLabel="Log Expenditure"
      onAddClick={() => setIsModalOpen(true)}
      searchActions={
        <ExportPopup<LedgerRow>
          data={ledgerRows}
          columns={financeExportColumns}
          fileName="finance_ledger"
          title="Finance Ledger"
          triggerLabel="Download"
          description="Choose format and export the complete combined ledger with invoice, expense, branch, payment, tax, and timing values."
          resolveData={fetchAllFinanceRowsForExport}
        />
      }
      topContent={
        <div className="flex overflow-x-auto overflow-y-visible pt-2 pb-4 gap-6 lg:grid lg:grid-cols-3 lg:gap-8 lg:overflow-visible scrollbar-hide px-4 lg:px-2">
          {[
            { label: 'Internal Inflow', value: `${settings?.general?.currencySymbol || 'QR'} ${totalIncome.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', trend: 'Total Revenue Generated' },
            { label: 'External Outflow', value: `${settings?.general?.currencySymbol || 'QR'} ${totalExpenses.toLocaleString()}`, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10', glow: 'bg-red-500/20', trend: 'Operational Expenditure' },
            { label: 'Net Balance', value: `${settings?.general?.currencySymbol || 'QR'} ${netProfit.toLocaleString()}`, icon: Coins, color: 'text-zen-sand', bg: 'bg-zen-sand/10', glow: 'bg-zen-sand/20', trend: 'Liquid Asset Position' }
          ].map((stat, i) => (
            <ZenStatCard key={stat.label} {...stat} delay={i * 0.2} />
          ))}
        </div>
      }
    >
      <div className="space-y-6 pb-20 mt-0">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans">
        {/* Left Side: Chart */}
        <div className="lg:col-span-7 w-full flex flex-col">
           <div className="bg-white border border-zen-stone zen-pointed-surface shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-6 sm:p-8 lg:p-10 min-h-[360px] sm:min-h-[420px] relative overflow-hidden">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-zen-brown/5">
                <div>
                   <h3 className="text-xl font-bold text-gray-900 tracking-tight">Financial Status</h3>
                   <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Income vs expenditure dynamics</p>
                </div>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Revenue</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Expenses</span>
                   </div>
                </div>
             </div>

             {!hasChartPoints && (
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="text-center max-w-xs opacity-20">
                   <Coins size={46} strokeWidth={0.8} className="mx-auto mb-4" />
                   <p className="italic font-serif text-lg text-gray-500">No revenue trend data is available yet.</p>
                 </div>
               </div>
             )}
             <div className="h-[320px] w-full relative z-10" style={{ minWidth: 0, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                 <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                       <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                       </linearGradient>
                       <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '1.5rem', 
                        border: 'none', 
                        boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
                        padding: '1.5rem'
                      }} 
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} strokeDasharray="10 10" fillOpacity={1} fill="url(#colorExpense)" />
                 </AreaChart>
              </ResponsiveContainer>
             </div>
           </div>
        </div>

        {/* Right Side: Ledger */}
        <div className="lg:col-span-5 w-full flex flex-col">
           <div className="bg-white border border-zen-stone zen-pointed-surface shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="flex justify-between items-center gap-4 px-6 sm:px-8 py-4 border-b border-zen-brown/5">
                 <div>
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">Recent Activity</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Combined transaction registry</p>
                 </div>
                 <ZenBadge variant="leaf" className="px-3 sm:px-5">Ledger</ZenBadge>
              </div>

               <div className="table-container overflow-x-auto">
                 <div className="min-w-[680px] sm:min-w-[800px]">
                   <table className="w-full text-center border-collapse">
                     <colgroup>
                       <col className="w-[10%]" />
                       <col className="w-[15%]" />
                       <col className="w-[30%]" />
                       <col className="w-[15%]" />
                       <col className="w-[15%]" />
                       <col className="w-[15%]" />
                     </colgroup>
                     <thead>
                       <tr>
                         <th>S NO</th>
                         <th>VISUAL</th>
                         <th>ENTRY DETAILS</th>
                         <th>DATE</th>
                         <th>VOLUME</th>
                         <th>ACTIONS</th>
                       </tr>
                     </thead>
                     <tbody>
                       <AnimatePresence mode="popLayout">
                         {ledgerRows.length === 0 ? (
                           <tr>
                             <td colSpan={6} className="px-6 py-24 text-center text-[11px] font-sans text-gray-400 bg-gray-50/30">
                                {loading ? (
                                  <div className="flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest text-zen-brown/30">
                                    <div className="w-4 h-4 border-2 border-zen-sand border-t-transparent rounded-full animate-spin" />
                                    Synchronizing ledger...
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-4 opacity-20">
                                     <Coins size={60} strokeWidth={0.5} />
                                     <p className="italic font-serif text-xl">Ledger is currently quiet.</p>
                                  </div>
                                )}
                             </td>
                           </tr>
                         ) : (
                           ledgerRows.map((row, idx) => {
                             const isExpense = row.kind === 'Expense';
                             return (
                               <motion.tr 
                                 key={row.id} 
                                 initial={{ opacity: 0 }}
                                 animate={{ opacity: 1 }}
                                 exit={{ opacity: 0 }}
                                 className="transition-all group border-b border-black/[0.02]"
                               >
                                 <td className="text-center italic opacity-40 text-[11px]">
                                   {(idx + 1).toString().padStart(2, '0')}
                                 </td>
                                 <td>
                                   <div className="flex justify-center">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm group-hover:scale-110 transition-transform duration-500 shrink-0 ${isExpense ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'}`}>
                                        {isExpense ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                                      </div>
                                   </div>
                                 </td>
                                 <td>
                                   <div className="flex flex-col items-center justify-center gap-0.5 px-4">
                                     <span className="zen-table-primary leading-none">{row.title}</span>
                                     <span className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[0.2em]">{row.subtitle}</span>
                                   </div>
                                 </td>
                                 <td>
                                   <div className="flex flex-col items-center justify-center gap-0.5">
                                     <span className="zen-table-primary !text-[14px] leading-none">{dayjs(row.date).format('MMM DD, YYYY')}</span>
                                     <span className="text-[9px] font-black text-zen-brown/30 uppercase tracking-widest">{row.meta}</span>
                                   </div>
                                 </td>
                                 <td>
                                   <p className={`text-base font-serif font-black ${isExpense ? 'text-rose-500' : 'text-emerald-500'}`}>
                                     {isExpense ? '-' : '+'}{settings?.general?.currencySymbol || 'QR'} {row.amount?.toLocaleString()}
                                   </p>
                                 </td>
                                 <td>
                                   <div className="flex items-center justify-center gap-3">
                                     {isExpense ? (
                                       <ZenIconButton
                                         icon={Trash2}
                                         variant="danger"
                                         onClick={() => {
                                           setExpenseToDelete(row.sourceId);
                                           setIsConfirmOpen(true);
                                         }}
                                       />
                                     ) : (
                                       <ZenBadge variant="leaf" className="px-4">Settled</ZenBadge>
                                     )}
                                   </div>
                                 </td>
                               </motion.tr>
                             );
                           })
                         )}
                       </AnimatePresence>
                     </tbody>
                   </table>
                 </div>
               </div>
           </div>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Log Expenditure"
        subtitle="Record an external outflow"
        headerIcon={TrendingDown}
        footer={
          <div className="flex gap-6">
            <ZenButton 
               type="button" 
               variant="secondary" 
               onClick={() => setIsModalOpen(false)} 
               className="flex-1 text-[10px] tracking-[0.2em] font-black"
            >
               DISCARD
            </ZenButton>
            <ZenButton 
               type="submit" 
               form="log-expenditure-form" 
               className="flex-[2] bg-zen-sand hover:bg-zen-sand/90 shadow-lg shadow-zen-sand/20 text-[10px] tracking-[0.2em] font-black"
            >
               SAVE ENTRY
            </ZenButton>
          </div>
        }
      >
        <form id="log-expenditure-form" onSubmit={handleAddExpense} className="space-y-8">
           <ZenInput
             label="Resource Identity"
             required
             placeholder="e.g. Monthly Retainer"
             value={formData.title}
             onChange={(e: any) => setFormData({...formData, title: e.target.value})}
           />

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <ZenDropdown
                label="Tactical Category"
                value={formData.category}
                onChange={(val: any) => setFormData({...formData, category: val})}
                options={['Inventory', 'Utilities', 'Staff', 'Marketing', 'Rent', 'Misc']}
              />
              <ZenInput
                type="number"
                label={`Exchange Volume (${settings?.general?.currencySymbol || 'QR'})`}
                required
                value={formData.amount}
                onChange={(e: any) => setFormData({...formData, amount: parseInt(e.target.value) || 0})}
              />
           </div>

           <ZenDatePicker
             label="Ledger Entry Date"
             value={formData.date}
             onChange={(val: any) => setFormData({...formData, date: val})}
           />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Purge Entry?"
        message="Are you sure you want to remove this entry from the ledger?"
      />
      </div>
    </ZenPageLayout>
  );
};

export default Finance;
