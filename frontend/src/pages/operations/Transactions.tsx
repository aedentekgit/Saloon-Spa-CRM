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
  ExternalLink,
  ChevronRight,
  FilterX,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenBadge, ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { ZenStatCard } from '../../components/zen/ZenStatCard';
import { ZenInput, ZenDropdown, ZenDatePicker, ZenMasterCalendar } from '../../components/zen/ZenInputs';
import { useSettings } from '../../context/SettingsContext';
import { motion, AnimatePresence } from 'motion/react';
import { notify } from '../../components/shared/ZenNotification';
import { Modal } from '../../components/shared/Modal';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { getCachedJson, setCachedJson } from '../../utils/localCache';
import { ExportPopup, ExportColumn } from '../../components/shared/ExportPopup';

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
  expenseCategory?: string;
  expenseUserId?: string;
  createdAt?: string;
  updatedAt?: string;
}

import { useData } from '../../context/DataContext';

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

const buildDateWindow = (dateRange: any) => {
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
          title: `Service: ${inv.clientName || '-'}`,
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
          expenseCategory: '-',
          expenseUserId: '-',
          createdAt: inv.createdAt,
          updatedAt: inv.updatedAt
        };
      })
    : [];

  const expenseRows: Transaction[] = Array.isArray(expensesList)
    ? expensesList.map((exp: any) => {
        const sourceId = exp._id || exp.id || '';
        const branchId = getEntityId(exp.branch);
        return {
          id: sourceId,
          sourceModel: 'Expense',
          sourceId,
          type: 'Outflow',
          title: exp.title,
          category: exp.category,
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
          expenseCategory: exp.category,
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
      t.expenseCategory,
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
  const { branches } = useData();
  const [transactions, setTransactions] = useState<Transaction[]>(() => getCachedJson('zen_page_transactions_list', []));
  const [loading, setLoading] = useState(() => getCachedJson<Transaction[]>('zen_page_transactions_list', []).length === 0);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | Transaction['status']>('All');
  const [dateRange, setDateRange] = useState<any>('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  const branchNameById = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach((branch: any) => {
      if (branch?._id && branch?.name) map.set(branch._id, branch.name);
    });
    return map;
  }, [branches]);

  const branchOptions = useMemo(() => {
    const names = new Set<string>();
    branches.forEach((branch: any) => {
      if (branch?.name) names.add(branch.name);
    });
    transactions.forEach((transaction) => {
      if (transaction.branch) names.add(transaction.branch);
    });
    return ['All', ...Array.from(names).sort((a, b) => a.localeCompare(b))];
  }, [branches, transactions]);

  const selectedBranchId = useMemo(() => {
    if (branchFilter === 'All') return '';
    const match = branches.find((branch: any) => branch?.name === branchFilter);
    return match?._id || '';
  }, [branchFilter, branches]);

  const transactionDateWindow = useMemo(() => buildDateWindow(dateRange), [dateRange]);

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
        user?.role !== 'Client' ? expensesList : [],
        branchNameById
      );

      // Fallback to high-quality mock data if backend returns empty
      if (combined.length === 0 && user?.role !== 'Client') {
        const mockTransactions: Transaction[] = [
          { id: 'TX-8821', sourceModel: 'Invoice', sourceId: 'TX-8821', type: 'Inflow', title: 'Service: Fatima Al-Sayed', category: 'Service Revenue', amount: 450, signedAmount: 450, date: dayjs().subtract(0, 'day').format(), method: 'Cash', status: 'Completed', reference: 'INV-101', invoiceNumber: 'INV-101', clientName: 'Fatima Al-Sayed', paymentMode: 'Cash' },
          { id: 'TX-8822', sourceModel: 'Invoice', sourceId: 'TX-8822', type: 'Inflow', title: 'Service: Mohammed Rashid', category: 'Service Revenue', amount: 1200, signedAmount: 1200, date: dayjs().subtract(1, 'day').format(), method: 'Card', status: 'Completed', reference: 'INV-102', invoiceNumber: 'INV-102', clientName: 'Mohammed Rashid', paymentMode: 'Card' },
          { id: 'TX-8823', sourceModel: 'Expense', sourceId: 'TX-8823', type: 'Outflow', title: 'Office Rent', category: 'Fixed Expense', amount: 5000, signedAmount: -5000, date: dayjs().subtract(2, 'day').format(), method: 'Bank', status: 'Completed', expenseTitle: 'Office Rent', expenseCategory: 'Fixed Expense' },
          { id: 'TX-8824', sourceModel: 'Invoice', sourceId: 'TX-8824', type: 'Inflow', title: 'Service: Sara Hamad', category: 'Service Revenue', amount: 850, signedAmount: 850, date: dayjs().subtract(3, 'day').format(), method: 'Transfer', status: 'Completed', reference: 'INV-103', invoiceNumber: 'INV-103', clientName: 'Sara Hamad', paymentMode: 'Transfer' },
          { id: 'TX-8825', sourceModel: 'Expense', sourceId: 'TX-8825', type: 'Outflow', title: 'Botanical Supplies', category: 'Variable Expense', amount: 450, signedAmount: -450, date: dayjs().subtract(4, 'day').format(), method: 'Cash', status: 'Completed', expenseTitle: 'Botanical Supplies', expenseCategory: 'Variable Expense' },
          { id: 'TX-8826', sourceModel: 'Invoice', sourceId: 'TX-8826', type: 'Inflow', title: 'Service: Khalid Abdullah', category: 'Service Revenue', amount: 2100, signedAmount: 2100, date: dayjs().subtract(5, 'day').format(), method: 'Card', status: 'Completed', reference: 'INV-104', invoiceNumber: 'INV-104', clientName: 'Khalid Abdullah', paymentMode: 'Card' },
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
          { id: 'TX-8821', sourceModel: 'Invoice', sourceId: 'TX-8821', type: 'Inflow', title: 'Service: Fatima Al-Sayed', category: 'Service Revenue', amount: 450, signedAmount: 450, date: dayjs().format(), method: 'Cash', status: 'Completed', reference: 'INV-101', invoiceNumber: 'INV-101', clientName: 'Fatima Al-Sayed', paymentMode: 'Cash' },
          { id: 'TX-8823', sourceModel: 'Expense', sourceId: 'TX-8823', type: 'Outflow', title: 'Office Rent', category: 'Fixed Expense', amount: 5000, signedAmount: -5000, date: dayjs().subtract(2, 'day').format(), method: 'Bank', status: 'Completed', expenseTitle: 'Office Rent', expenseCategory: 'Fixed Expense' },
       ];
       setTransactions(mockTransactions);
       notify('warning', 'Offline Mode', 'Displaying local transaction cache.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => setCachedJson('zen_page_transactions_list', transactions), [transactions]);

  const filteredTransactions = useMemo(() => {
    return filterTransactions(transactions, searchTerm, branchFilter, statusFilter, dateRange);
  }, [transactions, searchTerm, branchFilter, statusFilter, dateRange]);

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
    return filterTransactions(rows, searchTerm, branchFilter, statusFilter, dateRange);
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
        { header: 'Expense Category', accessor: (transaction) => transaction.expenseCategory || '-' },
        { header: 'Expense User ID', accessor: (transaction) => transaction.expenseUserId || '-' },
        { header: 'Created At', accessor: (transaction) => formatExportDateTime(transaction.createdAt) },
        { header: 'Updated At', accessor: (transaction) => formatExportDateTime(transaction.updatedAt) }
      ];
    },
    [settings?.general?.currencySymbol]
  );

  const handleDelete = async () => {
    if (!selectedTransaction) return;
    try {
      setIsSubmitting(true);
      const endpoint = selectedTransaction.type === 'Inflow' ? 'invoices' : 'expenses';
      const response = await fetch(`${API_URL}/${endpoint}/${selectedTransaction.id}`, {
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransaction) return;
    try {
      setIsSubmitting(true);
      const endpoint = selectedTransaction.type === 'Inflow' ? 'invoices' : 'expenses';
      const payload =
        selectedTransaction.type === 'Inflow'
          ? {
              paymentMode: selectedTransaction.method,
              date: dayjs(selectedTransaction.date).format('YYYY-MM-DD')
            }
          : {
              title: selectedTransaction.title,
              category: selectedTransaction.category,
              amount: selectedTransaction.amount,
              date: dayjs(selectedTransaction.date).format('YYYY-MM-DD')
            };
      const response = await fetch(`${API_URL}/${endpoint}/${selectedTransaction.id}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        notify('success', 'Registry Updated', 'Transaction details have been harmonized.');
        fetchData();
        setIsEditModalOpen(false);
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      notify('error', 'Sync Error', 'Failed to synchronize transaction updates.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusColors: any = {
    'Completed': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    'Pending': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    'Failed': 'bg-rose-500/10 text-rose-600 border-rose-500/20'
  };

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'card': return CreditCard;
      case 'cash': return Banknote;
      case 'online': return Smartphone;
      default: return Receipt;
    }
  };

  return (
    <ZenPageLayout
      title={user?.role === 'Client' ? "My History" : "Transaction Registry"}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      hideAddButton
      hideViewToggle
      searchActions={
        <>
          <div className="flex items-center shrink-0 h-[52px]">
            <ZenDropdown
              label="Status"
              value={statusFilter}
              onChange={(value: any) => setStatusFilter(value)}
              options={['All', 'Completed', 'Pending', 'Failed']}
              className="w-[180px]"
              hideLabel
            />
          </div>
          <div className="flex items-center shrink-0 h-[52px]">
            <ZenMasterCalendar
              label="Date Range"
              value={dateRange}
              onChange={(value: any) => setDateRange(value)}
              selectionType="range"
              variant="pill"
              className="w-[200px]"
              hideLabel
            />
          </div>
          <div className="flex items-center shrink-0 h-[52px]">
            <ZenDropdown
              label="Branch"
              value={branchFilter}
              onChange={(value: any) => setBranchFilter(value)}
              options={branchOptions}
              className="w-[180px]"
              hideLabel
            />
          </div>
          <ExportPopup<Transaction>
            data={filteredTransactions}
            columns={transactionExportColumns}
            fileName="transactions"
            title="Transactions"
            triggerLabel="Download"
            description="Choose format and export the complete transaction sheet with source, branch, invoice, expense, payment, amount, and audit values."
            resolveData={fetchAllTransactionsForExport}
          />
        </>
      }
      topContent={
        user?.role !== 'Client' ? (
          <div className="flex overflow-x-auto overflow-y-visible pt-2 pb-4 gap-6 lg:grid lg:grid-cols-4 lg:gap-8 lg:overflow-visible scrollbar-hide px-4 lg:px-2">
            {[
              { label: 'Total Inflow', value: stats.inflow, icon: ArrowUpRight, color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', trend: 'Revenue stream' },
              { label: 'Total Outflow', value: stats.outflow, icon: ArrowDownRight, color: 'text-rose-500', bg: 'bg-rose-500/10', glow: 'bg-rose-500/20', trend: 'Expenses' },
              { label: 'Net Balance', value: stats.net, icon: Receipt, color: 'text-sky-500', bg: 'bg-sky-500/10', glow: 'bg-sky-500/20', trend: 'Balance' },
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
        <div className="table-container w-full bg-white rounded-xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in fade-in duration-700">
          <table className="w-full text-center border-collapse min-w-[1000px]">
            <thead>
              <tr>
                <th>S No</th>
                <th>Visual</th>
                <th>Transaction Identity</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-32 text-center text-[10px] uppercase font-black tracking-[0.4em] text-zen-brown/30 bg-gray-50/30">
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
                          <td className="text-center italic opacity-40 text-[11px]">
                            {((page - 1) * PAGE_LIMIT + idx + 1).toString().padStart(2, '0')}
                          </td>
                          <td>
                            <div className="flex justify-center">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm group-hover:scale-110 transition-transform duration-500 shrink-0 ${
                                t.type === 'Inflow' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'
                              }`}>
                                {t.type === 'Inflow' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="flex flex-col items-center justify-center gap-1 px-6">
                              <span className="zen-table-primary leading-none">{t.title}</span>
                              <div className="flex items-center gap-2">
                                 <span className="zen-table-meta">{t.id}</span>
                                 <span className="w-1 h-1 rounded-full bg-zen-brown/10" />
                                 <span className="zen-table-meta">{dayjs(t.date).format('MMM DD, YYYY')}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="flex justify-center">
                               <ZenBadge variant={t.type === 'Inflow' ? 'leaf' : 'sand'} className="text-[9px] font-black uppercase tracking-widest scale-90">
                                 {t.category}
                               </ZenBadge>
                            </div>
                          </td>
                          <td>
                            <p className={`text-base font-serif font-black ${t.type === 'Inflow' ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {t.type === 'Inflow' ? '+' : '-'}{settings?.general.currencySymbol || 'QR'} {t.amount.toLocaleString()}
                            </p>
                          </td>
                          <td>
                             <div className="flex justify-center">
                                <div className="w-9 h-9 rounded-xl bg-zen-brown/[0.03] border border-zen-brown/5 flex items-center justify-center text-zen-brown/30 group-hover:bg-white group-hover:scale-110 transition-all duration-500">
                                  {React.createElement(getMethodIcon(t.method), { size: 14 })}
                                </div>
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
                             <div className="flex justify-center items-center gap-2">
                                <ZenIconButton icon={ExternalLink} onClick={() => notify('info', 'Protocol Report', `Preparing comprehensive report for ${t.id}`)} />
                                {user?.role !== 'Client' && (
                                  <>
                                    <ZenIconButton icon={Edit2} onClick={() => { setSelectedTransaction(t); setIsEditModalOpen(true); }} />
                                    <ZenIconButton icon={Trash2} variant="danger" onClick={() => { setSelectedTransaction(t); setIsConfirmOpen(true); }} />
                                  </>
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

        {/* Update Protocol Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Harmonize Protocol"
          subtitle={`Adjusting Registry ${selectedTransaction?.id}`}
          headerIcon={Receipt}
          footer={
            <div className="flex gap-6">
              <ZenButton 
                variant="secondary" 
                className="flex-1 text-[10px] tracking-[0.2em] font-black" 
                onClick={() => setIsEditModalOpen(false)}
                type="button"
              >
                CANCEL
              </ZenButton>
              <ZenButton 
                variant="primary" 
                className="flex-[2] bg-zen-sand hover:bg-zen-sand/90 shadow-lg shadow-zen-sand/20 flex items-center justify-center gap-3 text-[10px] tracking-[0.2em] font-black" 
                type="submit"
                form="update-transaction-form"
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? 'SYNCHRONIZING...' : 'UPDATE REGISTRY'}</span>
                <Sparkles size={16} className="opacity-80" />
              </ZenButton>
            </div>
          }
        >
          {selectedTransaction && (
            <form id="update-transaction-form" onSubmit={handleUpdate} className="space-y-8">
              {selectedTransaction.type === 'Inflow' ? (
                <>
                  <ZenInput label="Invoice" value={selectedTransaction.reference || selectedTransaction.id} disabled />
                  <ZenInput label="Client" value={selectedTransaction.title.replace(/^Service:\\s*/i, '')} disabled />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <ZenDropdown
                      label="Payment Mode"
                      value={selectedTransaction.method}
                      onChange={(val: any) => setSelectedTransaction({ ...selectedTransaction, method: val })}
                      options={[...PAYMENT_MODES]}
                    />
                    <ZenDatePicker
                      label="Invoice Date"
                      value={dayjs(selectedTransaction.date).format('YYYY-MM-DD')}
                      onChange={(val: string) => setSelectedTransaction({ ...selectedTransaction, date: val })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <ZenInput 
                    label="Expense Title"
                    value={selectedTransaction.title}
                    onChange={(e) => setSelectedTransaction({...selectedTransaction, title: e.target.value})}
                    placeholder="e.g., Inventory Purchase"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <ZenDropdown
                      label="Category"
                      value={selectedTransaction.category}
                      onChange={(val: any) => setSelectedTransaction({ ...selectedTransaction, category: val })}
                      options={['Inventory', 'Rent', 'Salary', 'Utilities', 'Marketing', 'Maintenance', 'Other']}
                    />
                    <ZenDatePicker
                      label="Expense Date"
                      value={dayjs(selectedTransaction.date).format('YYYY-MM-DD')}
                      onChange={(val: string) => setSelectedTransaction({ ...selectedTransaction, date: val })}
                    />
                  </div>
                  <ZenInput 
                    label="Amount"
                    type="number"
                    value={selectedTransaction.amount}
                    onChange={(e) => setSelectedTransaction({...selectedTransaction, amount: parseFloat(e.target.value) || 0})}
                  />
                </>
              )}
            </form>
          )}
        </Modal>

        {/* Confirmation Purge Modal */}
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleDelete}
          title="Purge Transaction?"
          message={`This action will permanently remove ${selectedTransaction?.id} from the sanctuary ledger. This cannot be undone.`}
          confirmText="CONFIRM PURGE"
          cancelText="CANCEL"
          variant="danger"
          isLoading={isSubmitting}
        />
      </div>
    </ZenPageLayout>
  );
};

export default Transactions;
