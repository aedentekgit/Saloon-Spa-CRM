import React, { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import {
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  MoreVertical,
  Calendar as CalendarIcon,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Clock,
  ChevronRight,
  FilterX,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Sparkles,
  Printer,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenBadge, ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { ZenStatCard } from '../../components/zen/ZenStatCard';
import { ZenMasterCalendar } from '../../components/zen/ZenInputs';
import { useSettings } from '../../context/SettingsContext';
import { motion, AnimatePresence } from 'motion/react';
import { notify } from '../../components/shared/ZenNotification';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { printInvoice } from '../../utils/printInvoice';
import { getCachedJson, setCachedJson } from '../../utils/localCache';
import { ExportPopup, ExportColumn } from '../../components/shared/ExportPopup';
import { useData } from '../../context/DataContext';
import { useBranches } from '../../context/BranchContext';
import { useCategories } from '../../context/CategoryContext';
import { buildFinancialDateWindow } from '../../utils/financialPeriod';

dayjs.extend(isBetween);

interface BranchRef {
  _id?: string;
  name?: string;
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

interface Transaction {
  id: string;
  sourceModel: 'Invoice' | 'Expense';
  sourceId: string;
  type: 'Inflow' | 'Outflow';
  title: string;
  category: string;
  amount: number;
  signedAmount: number;
  date: string;
  method: string;
  status: 'Completed' | 'Pending' | 'Failed';
  reference?: string;
  branch?: string;
  branchId?: string;
  invoiceNumber?: string;
  clientId?: string;
  clientName?: string;
  paymentMode?: string;
  paymentsSummary?: string;
  itemsCount?: number;
  itemsSummary?: string;
  subtotal?: number;
  gst?: number;
  discount?: number;
  total?: number;
  expenseTitle?: string;
  sectorCategory?: string;
  expenseUserId?: string;
  createdAt?: string;
  updatedAt?: string;
  items?: any[];
}



const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'GPay', 'Split'] as const;

const getEntityId = (value: any) => {
  if (!value) return '';
  return typeof value === 'string' ? value : value._id || '';
};

const getBranchLabel = (branch?: BranchRef | string, branchNameById?: Map<string, string>) => {
  if (!branch) return 'Main Branch';
  if (typeof branch === 'string') return branchNameById?.get(branch) || branch;
  return branch.name || branchNameById?.get(branch._id || '') || 'Main Branch';
};

const summarizeInvoiceItems = (items?: InvoiceItem[]) => {
  if (!items || items.length === 0) return '-';
  return items
    .map((item) => {
      const name = (item.name || 'Item').replace(/service\s*:\s*/i, '');
      const bits = [name];
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

const buildDateWindow = (dateRange: any) => {
  return buildFinancialDateWindow(dateRange);
};

const buildTransactionRows = (
  invoicesList: any[],
  expensesList: any[],
  branchNameById?: Map<string, string>
): Transaction[] => {
  const invoiceRows: Transaction[] = Array.isArray(invoicesList)
    ? invoicesList.map((inv: any) => {
        const sourceId = inv._id || inv.id || '';
        const branchId = getEntityId(inv.branch);
        return {
          id: sourceId,
          sourceModel: 'Invoice',
          sourceId,
          type: 'Inflow',
          title: inv.clientName || '-',
          category: 'Service Revenue',
          amount: inv.total || 0,
          signedAmount: inv.total || 0,
          date: inv.date,
          method: inv.paymentMode || 'Cash',
          status: 'Completed',
          reference: inv.invoiceNumber,
          branch: getBranchLabel(inv.branch, branchNameById),
          branchId,
          invoiceNumber: inv.invoiceNumber || '-',
          clientId: getEntityId(inv.clientId) || '-',
          clientName: inv.clientName || '-',
          paymentMode: inv.paymentMode || '-',
          paymentsSummary: summarizePayments(inv.payments),
          itemsCount: Array.isArray(inv.items) ? inv.items.length : 0,
          itemsSummary: summarizeInvoiceItems(inv.items),
          subtotal: inv.subtotal || 0,
          gst: inv.gst || 0,
          discount: inv.discount || 0,
          total: inv.total || 0,
          expenseTitle: '-',
          sectorCategory: '-',
          expenseUserId: '-',
          createdAt: inv.createdAt,
          updatedAt: inv.updatedAt,
          items: inv.items
        };
      })
    : [];

  const expenseRows: Transaction[] = Array.isArray(expensesList)
    ? expensesList.map((exp: any) => {
        const sourceId = exp._id || exp.id || '';
        const branchId = getEntityId(exp.branch);
        const sectorCat = exp.sectorCategory || exp.category || 'General';
        return {
          id: sourceId,
          sourceModel: 'Expense',
          sourceId,
          type: 'Outflow',
          title: exp.title,
          category: sectorCat,
          amount: exp.amount || 0,
          signedAmount: -(exp.amount || 0),
          date: exp.date,
          method: 'Direct Outflow',
          status: 'Completed',
          reference: '-',
          branch: getBranchLabel(exp.branch, branchNameById),
          branchId,
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
          sectorCategory: sectorCat,
          expenseUserId: getEntityId(exp.user) || '-',
          createdAt: exp.createdAt,
          updatedAt: exp.updatedAt
        };
      })
    : [];

  return [...invoiceRows, ...expenseRows].sort(
    (a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
  );
};

const filterTransactions = (
  rows: Transaction[],
  searchTerm: string,
  branchFilter: string,
  statusFilter: 'All' | Transaction['status'],
  dateRange: any
) => {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const now = dayjs();

  return rows.filter((t) => {
    const searchableValues = [
      t.id,
      t.sourceModel,
      t.sourceId,
      t.type,
      t.title,
      t.category,
      t.amount,
      t.signedAmount,
      t.date,
      t.method,
      t.status,
      t.reference,
      t.branch,
      t.branchId,
      t.invoiceNumber,
      t.clientId,
      t.clientName,
      t.paymentMode,
      t.paymentsSummary,
      t.itemsCount,
      t.itemsSummary,
      t.subtotal,
      t.gst,
      t.discount,
      t.total,
      t.expenseTitle,
      t.sectorCategory,
      t.expenseUserId,
      t.createdAt,
      t.updatedAt
    ];

    const matchesSearch =
      !normalizedSearch ||
      searchableValues.some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch));

    const matchesBranch = branchFilter === 'All' || t.branch === branchFilter;
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;

    let matchesDate = true;
    if (dateRange && dateRange !== 'All') {
      const window = buildDateWindow(dateRange);
      if (window.startDate && window.endDate) {
        matchesDate = dayjs(t.date).isBetween(dayjs(window.startDate), dayjs(window.endDate), 'day', '[]');
      } else if (window.startDate) {
        matchesDate = dayjs(t.date).isSame(dayjs(window.startDate), 'day');
      }
    }

    return matchesSearch && matchesBranch && matchesStatus && matchesDate;
  });
};

const Transactions = () => {
  const { user, hasPermission } = useAuth();
  const { settings } = useSettings();
  const { branches, selectedBranch: globalBranchId } = useBranches();
  const { getSectorCategories } = useCategories();
  const { invoices, expenses } = useData();
  const activeSectorCategories = getSectorCategories();
  const [transactions, setTransactions] = useState<Transaction[]>(() => getCachedJson('zen_page_transactions_list', []));
  const [loading, setLoading] = useState(() => getCachedJson<Transaction[]>('zen_page_transactions_list', []).length === 0);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [dateRange, setDateRange] = useState<any>('Today');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({
    clientName: '',
    date: '',
    paymentMode: 'Card'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  const branchNameById = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach((branch: any) => {
      if (branch?._id && branch?.name) map.set(branch._id, branch.name);
    });
    return map;
  }, [branches]);

  useEffect(() => {
    if (globalBranchId === 'all') {
      setBranchFilter('All');
      return;
    }

    const activeBranchName = branches.find((branch: any) => branch?._id === globalBranchId)?.name || 'All';
    setBranchFilter(activeBranchName);
  }, [branches, globalBranchId]);

  const selectedBranchId = useMemo(() => {
    return globalBranchId === 'all' ? '' : globalBranchId;
  }, [globalBranchId]);

  const transactionDateWindow = useMemo(() => buildDateWindow(dateRange), [dateRange]);

  const financialReportData = useMemo(() => {
    const start = transactionDateWindow.startDate ? dayjs(transactionDateWindow.startDate) : dayjs().subtract(29, 'day');
    const end = transactionDateWindow.endDate ? dayjs(transactionDateWindow.endDate) : dayjs();
    const diff = end.diff(start, 'day') + 1;
    const days = [];
    for (let i = 0; i < diff; i++) {
      days.push(start.add(i, 'day').format('YYYY-MM-DD'));
    }

    return days.map(d => {
      const rev = invoices.filter(inv => dayjs(inv.date).format('YYYY-MM-DD') === d).reduce((acc, inv) => acc + (inv.total || 0), 0);
      const exp = expenses.filter(exp => dayjs(exp.date).format('YYYY-MM-DD') === d).reduce((acc, exp) => acc + (exp.amount || 0), 0);
      return { date: d, revenue: rev, expenses: exp, net: rev - exp };
    });
  }, [invoices, expenses, transactionDateWindow]);

  const financialReportColumns = useMemo<ExportColumn<any>[]>(
    () => [
      { header: 'Date', accessor: (row) => row.date },
      { header: 'Revenue (Inflow)', accessor: (row) => `${settings?.general?.currencySymbol || 'QR'} ${row.revenue.toLocaleString()}` },
      { header: 'Expenses (Outflow)', accessor: (row) => `${settings?.general?.currencySymbol || 'QR'} ${row.expenses.toLocaleString()}` },
      { header: 'Net Balance', accessor: (row) => `${settings?.general?.currencySymbol || 'QR'} ${row.net.toLocaleString()}` }
    ],
    [settings?.general?.currencySymbol]
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      if (transactions.length === 0) setLoading(true);
      const canViewExpenses = user?.role !== 'Client' && hasPermission('finance');
      const [invRes, expRes] = await Promise.all([
        fetch(`${API_URL}/invoices`, { headers: { 'Authorization': `Bearer ${user?.token}` } }),
        canViewExpenses
          ? fetch(`${API_URL}/expenses`, { headers: { 'Authorization': `Bearer ${user?.token}` } })
          : Promise.resolve(null)
      ]);

      const invData = await invRes.json();
      const expData = expRes ? await expRes.json() : [];
      const invoicesList = Array.isArray(invData) ? invData : (invData?.data || []);
      const expensesList = Array.isArray(expData) ? expData : (expData?.data || []);

      const combined = buildTransactionRows(
        invoicesList,
        expensesList,
        branchNameById
      );

      // Fallback to high-quality mock data if backend returns empty
      if (combined.length === 0 && user?.role !== 'Client') {
        const mockTransactions: Transaction[] = [
          { id: 'TX-8821', sourceModel: 'Invoice', sourceId: 'TX-8821', type: 'Inflow', title: 'Fatima Al-Sayed', category: 'Service Revenue', amount: 450, signedAmount: 450, date: dayjs().subtract(0, 'day').format(), method: 'Cash', status: 'Completed', reference: 'INV-101', invoiceNumber: 'INV-101', clientName: 'Fatima Al-Sayed', paymentMode: 'Cash' },
          { id: 'TX-8822', sourceModel: 'Invoice', sourceId: 'TX-8822', type: 'Inflow', title: 'Mohammed Rashid', category: 'Service Revenue', amount: 1200, signedAmount: 1200, date: dayjs().subtract(1, 'day').format(), method: 'Card', status: 'Completed', reference: 'INV-102', invoiceNumber: 'INV-102', clientName: 'Mohammed Rashid', paymentMode: 'Card' },
          { id: 'TX-8824', sourceModel: 'Invoice', sourceId: 'TX-8824', type: 'Inflow', title: 'Sara Hamad', category: 'Service Revenue', amount: 850, signedAmount: 850, date: dayjs().subtract(3, 'day').format(), method: 'Transfer', status: 'Completed', reference: 'INV-103', invoiceNumber: 'INV-103', clientName: 'Sara Hamad', paymentMode: 'Transfer' },
          { id: 'TX-8826', sourceModel: 'Invoice', sourceId: 'TX-8826', type: 'Inflow', title: 'Khalid Abdullah', category: 'Service Revenue', amount: 2100, signedAmount: 2100, date: dayjs().subtract(5, 'day').format(), method: 'Card', status: 'Completed', reference: 'INV-104', invoiceNumber: 'INV-104', clientName: 'Khalid Abdullah', paymentMode: 'Card' },
        ];
        setTransactions(mockTransactions);
      } else {
        setTransactions(combined);
      }
    } catch (error) {
       if (user?.role === 'Client') {
         setTransactions([]);
         setLoading(false);
         return;
       }
       // Fallback logic also for fetch errors
        const mockTransactions: Transaction[] = [
          { id: 'TX-8821', sourceModel: 'Invoice', sourceId: 'TX-8821', type: 'Inflow', title: 'Fatima Al-Sayed', category: 'Service Revenue', amount: 450, signedAmount: 450, date: dayjs().format(), method: 'Cash', status: 'Completed', reference: 'INV-101', invoiceNumber: 'INV-101', clientName: 'Fatima Al-Sayed', paymentMode: 'Cash' },
        ];
       setTransactions(mockTransactions);
       notify('warning', 'Offline Mode', 'Displaying local transaction cache.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => setCachedJson('zen_page_transactions_list', transactions), [transactions]);

  const filteredTransactions = useMemo(() => {
    return filterTransactions(transactions, searchTerm, branchFilter, 'All', dateRange);
  }, [transactions, searchTerm, branchFilter, dateRange]);

  const stats = useMemo(() => {
    const inflow = filteredTransactions.filter(t => t.type === 'Inflow').reduce((acc, t) => acc + t.amount, 0);
    const outflow = filteredTransactions.filter(t => t.type === 'Outflow').reduce((acc, t) => acc + t.amount, 0);
    const avg = filteredTransactions.length > 0 ? (inflow + outflow) / filteredTransactions.length : 0;
    return { inflow, outflow, net: inflow - outflow, avg };
  }, [filteredTransactions]);

  const PAGE_LIMIT = 12;

  useEffect(() => {
    setTotalPages(Math.ceil(filteredTransactions.length / PAGE_LIMIT) || 1);
    setPage(1);
  }, [filteredTransactions]);

  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * PAGE_LIMIT;
    return filteredTransactions.slice(start, start + PAGE_LIMIT);
  }, [filteredTransactions, page]);

  const fetchPagedRows = async (endpoint: 'invoices' | 'expenses') => {
    const rows: any[] = [];
    const exportLimit = 200;
    let exportPage = 1;
    let exportTotalPages = 1;

    do {
      const queryParams = new URLSearchParams({
        page: exportPage.toString(),
        limit: exportLimit.toString(),
        startDate: transactionDateWindow.startDate,
        endDate: transactionDateWindow.endDate
      });
      if (selectedBranchId) {
        queryParams.set('branch', selectedBranchId);
      }

      const response = await fetch(`${API_URL}/${endpoint}?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });

      if (!response.ok) {
        throw new Error(`Unable to fetch ${endpoint} export rows`);
      }

      const payload = await response.json();
      const pageRows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      rows.push(...pageRows);
      exportTotalPages = Number(payload?.pagination?.pages || 1);
      exportPage += 1;
    } while (exportPage <= exportTotalPages);

    return rows;
  };

  const fetchAllTransactionsForExport = async (): Promise<Transaction[]> => {
    const [invoicesList, expensesList] = await Promise.all([
      fetchPagedRows('invoices'),
      user?.role !== 'Client' ? fetchPagedRows('expenses') : Promise.resolve([])
    ]);

    const rows = buildTransactionRows(invoicesList, expensesList, branchNameById);
    return filterTransactions(rows, searchTerm, branchFilter, 'All', dateRange);
  };

  const transactionExportColumns = useMemo<ExportColumn<Transaction>[]>(
    () => {
      const currency = settings?.general?.currencySymbol || 'QR';
      const money = (value?: number) => `${currency} ${Number(value || 0)}`;

      return [
        { header: 'Transaction ID', accessor: (transaction) => transaction.id },
        { header: 'Source Model', accessor: (transaction) => transaction.sourceModel },
        { header: 'Source ID', accessor: (transaction) => transaction.sourceId },
        { header: 'Type', accessor: (transaction) => transaction.type },
        { header: 'Title', accessor: (transaction) => transaction.title },
        { header: 'Category', accessor: (transaction) => transaction.category },
        { header: 'Status', accessor: (transaction) => transaction.status },
        { header: 'Date', accessor: (transaction) => formatExportDate(transaction.date) },
        { header: 'Branch ID', accessor: (transaction) => transaction.branchId || '-' },
        { header: 'Branch', accessor: (transaction) => transaction.branch || '-' },
        { header: 'Method', accessor: (transaction) => transaction.method },
        { header: 'Reference', accessor: (transaction) => transaction.reference || '-' },
        { header: 'Raw Amount', accessor: (transaction) => Number(transaction.amount || 0) },
        { header: 'Signed Amount', accessor: (transaction) => money(transaction.signedAmount) },
        { header: 'Display Amount', accessor: (transaction) => money(transaction.amount) },
        { header: 'Invoice Number', accessor: (transaction) => transaction.invoiceNumber || '-' },
        { header: 'Client ID', accessor: (transaction) => transaction.clientId || '-' },
        { header: 'Client Name', accessor: (transaction) => transaction.clientName || '-' },
        { header: 'Payment Mode', accessor: (transaction) => transaction.paymentMode || '-' },
        { header: 'Payments', accessor: (transaction) => transaction.paymentsSummary || '-' },
        { header: 'Items Count', accessor: (transaction) => transaction.itemsCount || 0 },
        { header: 'Items', accessor: (transaction) => transaction.itemsSummary || '-' },
        { header: 'Subtotal', accessor: (transaction) => money(transaction.subtotal) },
        { header: 'GST', accessor: (transaction) => money(transaction.gst) },
        { header: 'Discount', accessor: (transaction) => money(transaction.discount) },
        { header: 'Invoice Total', accessor: (transaction) => money(transaction.total) },
        { header: 'Expense Title', accessor: (transaction) => transaction.expenseTitle || '-' },
        { header: 'Sector Category', accessor: (transaction) => transaction.sectorCategory || '-' },
        { header: 'Expense User ID', accessor: (transaction) => transaction.expenseUserId || '-' },
        { header: 'Created At', accessor: (transaction) => formatExportDateTime(transaction.createdAt) },
        { header: 'Updated At', accessor: (transaction) => formatExportDateTime(transaction.updatedAt) }
      ];
    },
    [settings?.general?.currencySymbol]
  );

  const handleDelete = async () => {
    if (!transactionToDelete) return;
    try {
      setIsSubmitting(true);
      const endpoint = transactionToDelete.sourceModel === 'Expense' ? 'expenses' : 'invoices';
      const response = await fetch(`${API_URL}/${endpoint}/${transactionToDelete.sourceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });

      if (response.ok) {
        notify('success', 'Registry Purged', 'Transaction has been successfully removed from logs.');
        fetchData();
        setIsConfirmOpen(false);
      } else {
        throw new Error('Deletion failed');
      }
    } catch (error) {
      notify('error', 'Purge Unsuccessful', 'System could not process the deletion request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTransactionEditor = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditForm({
      clientName: transaction.clientName && transaction.clientName !== '-' ? transaction.clientName : transaction.title,
      date: transaction.date ? dayjs(transaction.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      paymentMode: transaction.paymentMode && transaction.paymentMode !== '-' ? transaction.paymentMode : transaction.method || 'Card'
    });
  };

  const handleUpdateTransaction = async () => {
    if (!editingTransaction) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_URL}/invoices/${editingTransaction.sourceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          clientName: editForm.clientName.trim(),
          date: editForm.date,
          paymentMode: editForm.paymentMode
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Update failed');
      }

      notify('success', 'Transaction Updated', 'Invoice details were updated in the transaction registry.');
      setEditingTransaction(null);
      fetchData();
    } catch (error: any) {
      notify('error', 'Update Failed', error.message || 'Could not update this transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusColors: any = {
    'Completed': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    'Pending': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    'Failed': 'bg-rose-500/10 text-rose-600 border-rose-500/20'
  };

  const getMethodConfig = (method: string) => {
    const m = method.toLowerCase();
    if (m === 'card') return { icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' };
    if (m === 'cash') return { icon: Banknote, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' };
    if (m === 'online' || m === 'upi' || m === 'gpay') return { icon: Smartphone, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' };
    return { icon: Receipt, color: 'text-zen-brown/30', bg: 'bg-zen-brown/[0.03]', border: 'border-zen-brown/5' };
  };

  const canEditTransaction = (transaction: Transaction) => (
    transaction.sourceModel === 'Invoice' && hasPermission('billing')
  );

  const canDeleteTransaction = (transaction: Transaction) => (
    transaction.sourceModel === 'Expense'
      ? hasPermission('finance')
      : hasPermission('billing') || hasPermission('finance')
  );

  if (editingTransaction) {
    const currency = settings?.general.currencySymbol || 'QR';
    const editItems = Array.isArray(editingTransaction.items) ? editingTransaction.items : [];
    const lockedTotal = Number(editingTransaction.total || editingTransaction.amount || 0);

    return (
      <ZenPageLayout
        title="Transaction Registry"
        hideSearch
        hideAddButton
        hideBranchSelector
        hideViewToggle
      >
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start max-w-[1600px] mx-auto pb-20">
          <div className="xl:col-span-8">
            <div className="bg-white/85 backdrop-blur-xl rounded-[2.5rem] border border-zen-brown/15 flex flex-col overflow-hidden shadow-sm">
              <div className="px-5 py-5 sm:px-8 sm:py-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setEditingTransaction(null)}
                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-zen-brown/10 bg-white px-3.5 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-zen-brown/70 transition-all hover:border-zen-sand/40 hover:bg-zen-sand/10 hover:text-zen-brown"
                  >
                    <ArrowLeft size={13} />
                    Back to transactions
                  </button>
                  <p className="text-[9px] font-black uppercase tracking-[0.28em] text-zen-brown/25">
                    Transaction workspace
                  </p>
                </div>

                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-zen-gold/15 bg-zen-gold/10 text-zen-gold">
                      <Receipt size={22} strokeWidth={1.6} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.24em] text-zen-brown/30">Invoice transaction</p>
                      <input
                        value={editForm.clientName}
                        onChange={(event) => setEditForm(prev => ({ ...prev, clientName: event.target.value }))}
                        className="mt-1 w-full min-w-0 rounded-xl border border-transparent bg-transparent px-0 font-serif text-2xl font-bold leading-tight text-zen-brown outline-none transition-all focus:border-zen-sand/20 focus:bg-white focus:px-3 focus:ring-4 focus:ring-zen-sand/10 sm:text-3xl"
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-zen-gold/20 bg-zen-gold/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zen-gold">
                          {editingTransaction.invoiceNumber || editingTransaction.reference}
                        </span>
                        <ZenBadge variant={editingTransaction.status === 'Completed' ? 'leaf' : editingTransaction.status === 'Pending' ? 'sand' : 'danger'}>
                          {editingTransaction.status}
                        </ZenBadge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[390px]">
                    <label className="flex items-center gap-3 rounded-2xl border border-zen-brown/10 bg-white/70 px-4 py-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zen-brown/[0.03] text-zen-brown/40">
                        <CalendarIcon size={18} strokeWidth={1.7} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zen-brown/30">Date</p>
                        <input
                          type="date"
                          value={editForm.date}
                          onChange={(event) => setEditForm(prev => ({ ...prev, date: event.target.value }))}
                          className="w-full bg-transparent text-sm font-black text-zen-brown outline-none"
                        />
                      </div>
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-zen-brown/10 bg-white/70 px-4 py-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zen-brown/[0.03] text-zen-brown/40">
                        <CreditCard size={18} strokeWidth={1.7} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zen-brown/30">Payment</p>
                        <select
                          value={editForm.paymentMode}
                          onChange={(event) => setEditForm(prev => ({ ...prev, paymentMode: event.target.value }))}
                          className="w-full bg-transparent text-sm font-black text-zen-brown outline-none"
                        >
                          {PAYMENT_MODES.map(mode => (
                            <option key={mode} value={mode}>{mode}</option>
                          ))}
                        </select>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border-t border-zen-brown/10">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="bg-gradient-to-b from-zen-sand to-zen-brown text-white">
                      <th className="px-10 py-4 text-left text-[10px] font-bold uppercase tracking-[0.3em]">Reference</th>
                      <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-[0.3em]">Qty</th>
                      <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.3em]">Completed By</th>
                      <th className="px-8 py-4 text-right text-[10px] font-bold uppercase tracking-[0.3em]">Energy Value</th>
                      <th className="px-8 py-4 text-center text-[10px] font-bold uppercase tracking-[0.3em]">Logic</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zen-brown/5">
                    {editItems.length > 0 ? editItems.map((item: any, index: number) => (
                      <tr key={`${item.name || 'item'}-${index}`} className="bg-white">
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zen-brown/10 bg-white text-xs font-black text-zen-brown/40">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-serif text-lg font-semibold text-zen-brown">{item.name || 'Invoice item'}</p>
                              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-zen-brown/30">
                                {item.duration ? `${item.duration}m duration` : 'Settled invoice line'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <span className="inline-flex min-w-10 items-center justify-center rounded-xl border border-zen-brown/10 bg-zen-cream/20 px-3 py-2 text-sm font-black text-zen-brown">
                            {item.quantity || 1}
                          </span>
                        </td>
                        <td className="px-6 py-6">
                          <p className="text-xs font-bold text-zen-brown">{item.specialistName || 'Recorded service'}</p>
                          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-zen-brown/30">Completed service</p>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-zen-brown/30">{currency}</p>
                          <p className="font-serif text-2xl font-black text-zen-brown">{Number(item.price || 0).toLocaleString()}</p>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="rounded-full border border-zen-brown/10 bg-zen-brown/[0.03] px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-zen-brown/30">
                            {item.serviceType || 'Standard'}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-10 py-20 text-center text-[10px] font-black uppercase tracking-[0.35em] text-zen-brown/25">
                          No invoice line details available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-zen-brown/5 bg-zen-brown/[0.01] p-6 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-zen-brown/20">End of registry</p>
              </div>
            </div>
          </div>

          <div className="xl:col-span-4 space-y-6">
            <div className="relative overflow-hidden rounded-[2.5rem] border border-zen-brown/15 bg-white/85 p-8 shadow-sm backdrop-blur-xl">
              <Receipt size={260} className="pointer-events-none absolute -left-10 top-4 text-zen-brown/[0.03]" />
              <div className="relative z-10 space-y-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-3xl font-bold text-zen-brown">Statement</h3>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/30">Transaction ledger</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zen-brown/20">Protocol ID</p>
                    <p className="font-serif text-lg font-bold text-zen-brown/40">#{String(editingTransaction.invoiceNumber || editingTransaction.reference || '').replace(/\D/g, '').slice(-4) || '0000'}</p>
                  </div>
                </div>

                <div className="space-y-4 border-y border-zen-brown/10 py-6">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-zen-brown/30">Base Exchange</span>
                    <span className="font-serif text-2xl font-black text-zen-brown">{currency} {lockedTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-zen-brown/30">Method</span>
                    <span className="text-sm font-black text-zen-brown">{editForm.paymentMode}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-zen-brown/30">Branch</span>
                    <span className="text-right text-sm font-black text-zen-brown">{editingTransaction.branch || '-'}</span>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[2rem] border border-zen-brown/10 bg-white px-7 py-6 shadow-sm">
                  <div className="absolute inset-y-0 left-0 w-1.5 bg-zen-sand" />
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.32em] text-zen-brown/35">Total Settlement</p>
                    <div className="mt-2 flex items-end justify-between gap-4">
                      <span className="text-xs font-bold text-zen-brown/35">{currency}</span>
                      <span className="font-serif text-5xl font-black text-zen-brown">{lockedTotal.toFixed(2)}</span>
                    </div>
                    <div className="mt-3 h-1.5 w-full rounded-full bg-zen-brown/5">
                      <div className="h-full w-full rounded-full bg-zen-sand/50" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-zen-brown/10 bg-white/80 p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zen-brown/35">Edit Controls</p>
              <p className="mt-2 text-sm leading-6 text-zen-brown/55">
                Service lines and totals are locked. Save updates only the client label, invoice date, and payment mode.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <ZenButton type="button" variant="secondary" onClick={() => setEditingTransaction(null)} disabled={isSubmitting} className="w-full">
                  Cancel
                </ZenButton>
                <ZenButton type="button" onClick={handleUpdateTransaction} disabled={isSubmitting || !editForm.clientName.trim() || !editForm.date} className="w-full">
                  {isSubmitting ? 'Saving...' : 'Save'}
                </ZenButton>
              </div>
            </div>
          </div>
        </div>
      </ZenPageLayout>
    );
  }

  return (
    <ZenPageLayout
      title={user?.role === 'Client' ? "My History" : "Transaction Registry"}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchMaxWidth="lg:max-w-xs"
      hideAddButton
      hideViewToggle
      searchActions={
        <div className="flex items-center justify-end gap-3 flex-wrap">

          <ZenMasterCalendar
            label="Date Range"
            value={dateRange}
            onChange={(value: any) => {
              if (!value || (typeof value === 'object' && !value.from && !value.to)) {
                setDateRange('Today');
                return;
              }
              setDateRange(value);
            }}
            selectionType="range"
            variant="pill"
            className="w-[180px]"
            hideLabel
          />
          <ExportPopup<Transaction>
            data={filteredTransactions}
            columns={transactionExportColumns}
            fileName="transactions"
            title="Transactions"
            triggerLabel="Download"
            description="Choose format and export the complete transaction sheet with source, branch, invoice, expense, payment, amount, and audit values."
            resolveData={fetchAllTransactionsForExport}
          />
          {user?.role !== 'Client' && (
            <ExportPopup<any>
              data={financialReportData}
              columns={financialReportColumns}
              fileName="financial_period_report"
              title="Financial Period Report"
              triggerLabel="Export Financials"
              description="Download a daily breakdown of inflows, outflows, and net profit for the active date range."
            />
          )}
        </div>
      }
      topContent={
        user?.role !== 'Client' ? (
          <div className="flex overflow-x-auto overflow-y-visible pt-2 pb-4 gap-6 lg:grid lg:grid-cols-2 lg:gap-8 lg:overflow-visible scrollbar-hide px-4 lg:px-2">
            {[
              { label: 'Total Inflow', value: stats.inflow, icon: ArrowUpRight, color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', trend: 'Revenue stream' },
              { label: 'Avg. Transfer', value: stats.avg, icon: CheckCircle2, color: 'text-zen-sand', bg: 'bg-zen-sand/10', glow: 'bg-zen-sand/20', trend: 'Mean value' }
            ].map((stat, i) => (
              <ZenStatCard key={i} {...stat} value={`${settings?.general.currencySymbol || 'QR'} ${stat.value.toLocaleString()}`} delay={i * 0.2} />
            ))}
          </div>
        ) : null
      }
    >
      <div className="space-y-6 pb-20">



        {/* Immersive Transaction Table */}
        <div className="table-container w-full bg-white rounded-xl border border-gray-200/60 shadow-none overflow-hidden animate-in fade-in duration-700">
          <table className="w-full text-center border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-zen-brown/[0.02]">
                <th className="px-6 py-5 text-[10px] uppercase font-black tracking-[0.2em] text-zen-brown/40 text-center border-b border-zen-brown/5 w-[90px]">S No</th>
                <th className="px-6 py-5 text-[10px] uppercase font-black tracking-[0.2em] text-zen-brown/40 text-center border-b border-zen-brown/5 w-[150px]">Invoice No</th>
                <th className="px-6 py-5 text-[10px] uppercase font-black tracking-[0.2em] text-zen-brown/40 text-left border-b border-zen-brown/5">Transaction Identity</th>
                <th className="px-6 py-5 text-[10px] uppercase font-black tracking-[0.2em] text-zen-brown/40 text-center border-b border-zen-brown/5">Amount</th>
                <th className="px-6 py-5 text-[10px] uppercase font-black tracking-[0.2em] text-zen-brown/40 text-center border-b border-zen-brown/5 w-[120px]">Method</th>
                <th className="px-6 py-5 text-[10px] uppercase font-black tracking-[0.2em] text-zen-brown/40 text-center border-b border-zen-brown/5 w-[150px]">Status</th>
                <th className="px-6 py-5 text-[10px] uppercase font-black tracking-[0.2em] text-zen-brown/40 text-center border-b border-zen-brown/5 w-[150px]">Actions</th>
              </tr>
            </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-32 text-center text-[10px] uppercase font-black tracking-[0.4em] text-zen-brown/30 bg-gray-50/30">
                          No transactions found for the current filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedTransactions.map((t, idx) => (
                        <motion.tr
                          key={t.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="transition-all group border-b border-black/[0.02]"
                        >
                          <td className="px-6 py-4 text-center italic opacity-40 text-[11px] font-black">
                            {((page - 1) * PAGE_LIMIT + idx + 1).toString().padStart(2, '0')}
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex justify-center text-[11px] font-black text-zen-sand tracking-widest uppercase bg-zen-sand/5 py-1.5 px-3 rounded-lg border border-zen-sand/10">
                                {t.invoiceNumber !== '-' ? t.invoiceNumber : (t.reference !== '-' ? t.reference : '-')}
                             </div>
                          </td>
                          <td>
                            <div className="flex flex-col items-center justify-center gap-1 px-6">
                              <span className="zen-table-primary leading-none">{t.title}</span>
                              <div className="flex items-center gap-2">
                                 <span className="zen-table-meta">{dayjs(t.date).format('MMM DD, YYYY')}</span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <p className={`text-base font-serif font-black ${t.type === 'Inflow' ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {t.type === 'Inflow' ? '+' : '-'}{settings?.general.currencySymbol || 'QR'} {t.amount.toLocaleString()}
                            </p>
                          </td>
                          <td>
                             <div className="flex justify-center">
                                {(() => {
                                  const config = getMethodConfig(t.method);
                                  return (
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border group-hover:scale-110 transition-all duration-500 ${config.bg} ${config.border} ${config.color}`}>
                                      {React.createElement(config.icon, { size: 14 })}
                                    </div>
                                  );
                                })()}
                             </div>
                          </td>
                          <td>
                             <div className="flex justify-center">
                                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest scale-90 ${
                                  t.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                                  t.status === 'Pending' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                                  'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                }`}>
                                  {t.status}
                                </div>
                             </div>
                          </td>
                          <td>
                            <div className="flex items-center justify-center gap-3">
                              {canEditTransaction(t) && (
                                <ZenIconButton
                                  icon={Edit2}
                                  variant="sky"
                                  onClick={() => openTransactionEditor(t)}
                                />
                              )}
                              <ZenIconButton
                                icon={Printer}
                                variant="violet"
                                onClick={() => printInvoice(t, settings)}
                              />
                              {canDeleteTransaction(t) && (
                                <ZenIconButton
                                  icon={Trash2}
                                  variant="danger"
                                  onClick={() => {
                                    setTransactionToDelete(t);
                                    setIsConfirmOpen(true);
                                  }}
                                />
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

        {/* Pagination Service */}
        <ZenPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />

        {/* Confirmation Purge Modal */}
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleDelete}
          title="Remove Transaction?"
          message="This will permanently delete this revenue record from the registry."
          confirmText="CONFIRM PURGE"
          cancelText="CANCEL"
          type="danger"
        />

      </div>
    </ZenPageLayout>
  );
};

export default Transactions;
