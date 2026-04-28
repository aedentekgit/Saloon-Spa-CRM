import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  ArrowDownRight,
  Filter,
  Plus,
  Search,
  Edit2,
  Trash2
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useBranches } from '../../context/BranchContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { ZenStatCard } from '../../components/zen/ZenStatCard';
import { ZenBadge, ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { ZenInput, ZenDropdown, ZenMasterCalendar } from '../../components/zen/ZenInputs';
import { BranchSelector } from '../../components/zen/BranchSelector';
import { Modal } from '../../components/shared/Modal';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { notify } from '../../components/shared/ZenNotification';
import { ExportPopup, ExportColumn } from '../../components/shared/ExportPopup';
import { getPollIntervalMs, shouldPollNow } from '../../utils/polling';
import { getCachedJson, setCachedJson } from '../../utils/localCache';
import { useCategories } from '../../context/CategoryContext';

interface BranchRef {
  _id?: string;
  name?: string;
}

interface UserRef {
  _id?: string;
  name?: string;
  email?: string;
}

interface Expense {
  _id: string;
  user?: string | UserRef;
  title: string;
  category: string;
  amount: number;
  date: string;
  branch?: BranchRef | string;
  createdAt?: string;
  updatedAt?: string;
}



const getExpenseBranchId = (expense: Expense) => {
  if (!expense.branch) return '';
  return typeof expense.branch === 'string' ? expense.branch : expense.branch._id || '';
};

const getExpenseBranchName = (expense: Expense) => {
  if (!expense.branch) return 'Main Registry';
  return typeof expense.branch === 'string' ? expense.branch : expense.branch.name || 'Main Registry';
};

const getExpenseUserId = (expense: Expense) => {
  if (!expense.user) return '';
  return typeof expense.user === 'string' ? expense.user : expense.user._id || '';
};

const getExpenseUserLabel = (expense: Expense) => {
  if (!expense.user) return '-';
  if (typeof expense.user === 'string') return expense.user;
  return expense.user.name || expense.user.email || expense.user._id || '-';
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

const Expenses = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { branches, selectedBranch } = useBranches();
  const { getExpenseCategories } = useCategories();

  const dynamicCategories = useMemo(() => ['All', ...getExpenseCategories()], [getExpenseCategories]);
  const activeCategories = useMemo(() => getExpenseCategories(), [getExpenseCategories]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
  const PAGE_LIMIT = 12;

  const [expenses, setExpenses] = useState<Expense[]>(() => getCachedJson('zen_page_expenses_list', []));
  const [loading, setLoading] = useState(() => getCachedJson<Expense[]>('zen_page_expenses_list', []).length === 0);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [dateRange, setDateRange] = useState<any>('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    amount: 0,
    date: dayjs().format('YYYY-MM-DD'),
    branch: selectedBranch !== 'all' ? selectedBranch : ''
  });

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

  const buildExpenseQueryParams = (targetPage: number, limit: number) => {
    const queryParams = new URLSearchParams({
      page: String(targetPage),
      limit: String(limit),
      search: searchTerm,
      category: category !== 'All' ? category : '',
      startDate: dateWindow.startDate,
      endDate: dateWindow.endDate
    });
    if (selectedBranch && selectedBranch !== 'all') {
      queryParams.set('branch', selectedBranch);
    }
    return queryParams;
  };

  const fetchExpenses = async (silent: boolean = false) => {
    if (!user?.token) return;
    try {
      if (!silent && expenses.length === 0) setLoading(true);
      const queryParams = buildExpenseQueryParams(page, PAGE_LIMIT);

      const res = await fetch(`${API_URL}/expenses?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await res.json();

      if (data?.data) {
        setExpenses(data.data);
        setTotalPages(data.pagination?.pages || 1);
      } else if (Array.isArray(data)) {
        setExpenses(data);
        setTotalPages(1);
      } else {
        setExpenses([]);
        setTotalPages(1);
      }
    } catch (e) {
      if (!silent) notify('error', 'Sync Failure', 'Failed to retrieve expenses.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => setCachedJson('zen_page_expenses_list', expenses), [expenses]);

  useEffect(() => {
    fetchExpenses();
    const interval = setInterval(() => {
      if (!shouldPollNow()) return;
      fetchExpenses(true);
    }, getPollIntervalMs(30000));
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedBranch, user?.token, category, dateRange, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [selectedBranch, category, dateRange, searchTerm]);

  const totals = useMemo(() => {
    const total = expenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
    return { total };
  }, [expenses]);

  const fetchAllExpensesForExport = async (): Promise<Expense[]> => {
    if (!user?.token) return [];

    const allExpenses: Expense[] = [];
    const exportLimit = 200;
    let exportPage = 1;
    let exportTotalPages = 1;

    do {
      const queryParams = buildExpenseQueryParams(exportPage, exportLimit);
      const response = await fetch(`${API_URL}/expenses?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });

      if (!response.ok) {
        throw new Error('Unable to fetch expenses for export');
      }

      const payload = await response.json();
      const pageRows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      allExpenses.push(...pageRows);
      exportTotalPages = Number(payload?.pagination?.pages || 1);
      exportPage += 1;
    } while (exportPage <= exportTotalPages);

    const unique = new Map<string, Expense>();
    allExpenses.forEach((expense, index) => {
      const key = expense?._id || `${expense.title}-${expense.date}-${index}`;
      unique.set(key, expense);
    });

    return Array.from(unique.values());
  };

  const expenseExportColumns = useMemo<ExportColumn<Expense>[]>(
    () => {
      const currency = settings?.general?.currencySymbol || 'QR';

      return [
        { header: 'Expense ID', accessor: (expense) => expense._id },
        { header: 'Title', accessor: (expense) => expense.title },
        { header: 'Category', accessor: (expense) => expense.category },
        { header: 'Amount', accessor: (expense) => Number(expense.amount || 0) },
        { header: 'Display Amount', accessor: (expense) => `${currency} ${Number(expense.amount || 0)}` },
        { header: 'Currency', accessor: () => currency },
        { header: 'Date', accessor: (expense) => formatExportDate(expense.date) },
        { header: 'Branch ID', accessor: (expense) => getExpenseBranchId(expense) || '-' },
        { header: 'Branch', accessor: (expense) => getExpenseBranchName(expense) },
        { header: 'User ID', accessor: (expense) => getExpenseUserId(expense) || '-' },
        { header: 'Recorded By', accessor: (expense) => getExpenseUserLabel(expense) },
        { header: 'Created At', accessor: (expense) => formatExportDateTime(expense.createdAt) },
        { header: 'Updated At', accessor: (expense) => formatExportDateTime(expense.updatedAt) }
      ];
    },
    [settings?.general?.currencySymbol]
  );

  const openCreateModal = () => {
    setEditingExpense(null);
    setFormData({
      title: '',
      category: '',
      amount: 0,
      date: dayjs().format('YYYY-MM-DD'),
      branch: selectedBranch !== 'all' ? selectedBranch : ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setFormData({
      title: exp.title || '',
      category: exp.category || '',
      amount: Number(exp.amount) || 0,
      date: exp.date ? dayjs(exp.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      branch: getExpenseBranchId(exp) || (selectedBranch !== 'all' ? selectedBranch : '')
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;

    if (!formData.title?.trim()) {
      notify('error', 'Missing Title', 'Please provide an expense title.');
      return;
    }
    if (!formData.category) {
      notify('error', 'Category Required', 'Please select an expense category.');
      return;
    }
    if (!Number.isFinite(Number(formData.amount)) || Number(formData.amount) <= 0) {
      notify('error', 'Invalid Amount', 'Amount must be greater than zero.');
      return;
    }
    if (!formData.branch) {
      notify('error', 'Branch Required', 'Please assign this expense to a branch.');
      return;
    }

    try {
      setIsSubmitting(true);
      const url = editingExpense ? `${API_URL}/expenses/${editingExpense._id}` : `${API_URL}/expenses`;
      const method = editingExpense ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          amount: Number(formData.amount),
          date: dayjs(formData.date).format('YYYY-MM-DD')
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Save failed');
      }

      notify('success', editingExpense ? 'Expense Updated' : 'Expense Logged', 'Expense record saved successfully.');
      setIsModalOpen(false);
      fetchExpenses();
    } catch (err: any) {
      notify('error', 'Save Failed', err?.message || 'Could not save expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDelete = async () => {
    if (!expenseToDelete || !user?.token) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_URL}/expenses/${expenseToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Delete failed');
      }
      notify('success', 'Expense Removed', 'Expense entry deleted.');
      setIsConfirmOpen(false);
      setExpenseToDelete(null);
      fetchExpenses();
    } catch (err: any) {
      notify('error', 'Removal Failed', err?.message || 'Could not delete expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ZenPageLayout
      title="Expenses"
      hideSearch
      hideViewToggle
      hideAddButton
      hideBranchSelector
    >
      <div className="space-y-6 pb-20 mt-4">
        <div className="flex overflow-x-auto overflow-y-visible pt-2 pb-4 gap-6 lg:grid lg:grid-cols-3 lg:gap-8 lg:overflow-visible scrollbar-hide px-4 lg:px-2">
          {[
            {
              label: 'Total Outflow',
              value: `${settings?.general?.currencySymbol || 'QR'} ${totals.total.toLocaleString()}`,
              icon: ArrowDownRight,
              color: 'text-rose-500',
              bg: 'bg-rose-500/10',
              glow: 'bg-rose-500/20',
              trend: 'Summed for current view'
            },
            {
              label: 'Filter',
              value: category === 'All' ? 'All Categories' : category,
              icon: Filter,
              color: 'text-sky-500',
              bg: 'bg-sky-500/10',
              glow: 'bg-sky-500/20',
              trend: dateRange === 'All' ? 'All dates' : `Last ${dateRange.toLowerCase()}`
            },
            {
              label: 'Entries',
              value: expenses.length,
              icon: Search,
              color: 'text-emerald-500',
              bg: 'bg-emerald-500/10',
              glow: 'bg-emerald-500/20',
              trend: 'Loaded for this page'
            }
          ].map((stat, i) => (
            <ZenStatCard key={stat.label} {...stat} delay={i * 0.15} />
          ))}
        </div>

        {/* Global Filter Bar (match /clients, /finance visual language) */}
        <div className="zen-pointed-surface border border-zen-stone bg-white shadow-none px-5 sm:px-6 py-4">
          <div className="flex flex-col xl:flex-row xl:items-end gap-5 xl:gap-8">
            <div className="flex-1 w-full flex flex-col gap-2.5">
              <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-1.5">Registry Search</label>
              <div className="relative group">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zen-brown/20 group-focus-within:text-zen-sand transition-colors">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Search expenses by title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-[52px] pl-[52px] pr-6 bg-white/70 border border-zen-brown/10 rounded-[1.15rem] focus:bg-white focus:ring-4 focus:ring-zen-sand/5 focus:border-zen-sand/20 outline-none transition-all duration-500 text-sm font-medium shadow-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2.5 w-full xl:w-auto">
              <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-1.5">Category</label>
              <ZenDropdown
                label="Category"
                value={category}
                onChange={(v: any) => setCategory(v)}
                options={dynamicCategories}
                className="w-full sm:min-w-[220px]"
                hideLabel
              />
            </div>

            <div className="flex flex-col gap-2.5 w-full sm:w-[220px]">
              <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-1.5">Date Horizon</label>
              <ZenMasterCalendar
                label="Date Range"
                value={dateRange}
                onChange={(v: any) => setDateRange(v)}
                selectionType="range"
                variant="pill"
                className="w-full"
                hideLabel
              />
            </div>

            <div className="flex flex-col gap-2.5 w-full xl:w-auto">
              <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-1.5">Branch</label>
              <BranchSelector className="w-full sm:min-w-[220px]" />
            </div>

            <ExportPopup<Expense>
              data={expenses}
              columns={expenseExportColumns}
              fileName="expenses"
              title="Expenses"
              triggerLabel="Download"
              description="Choose format and export the complete expense sheet with title, category, amount, branch, date, user, and audit values."
              resolveData={fetchAllExpensesForExport}
              className="xl:w-auto"
            />

            <div className="flex flex-col gap-2.5 w-full xl:w-auto">
              <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-1.5">Management</label>
              <ZenButton
                onClick={openCreateModal}
                variant="primary"
                className="w-full xl:w-auto px-8 h-[52px] shadow-sm flex items-center justify-center gap-2 group rounded-[1.15rem]"
              >
                <Plus size={16} className="group-hover:rotate-12 transition-transform duration-500" />
                <span className="uppercase tracking-[0.2em] text-[10px] font-black">Add Expense</span>
              </ZenButton>
            </div>
          </div>
        </div>

        <div className="table-container w-full bg-white rounded-xl border border-gray-200/60 shadow-none overflow-hidden animate-in fade-in duration-700">
          <table className="w-full text-center border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th>S No</th>
                <th>Expense Identity</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white/40">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20">
                    <div className="flex flex-col items-center gap-4 opacity-40">
                      <div className="w-8 h-8 border-2 border-zen-brown/15 border-t-zen-brown rounded-full animate-spin" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-zen-brown/40">Syncing…</span>
                    </div>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-zen-brown/25 font-serif italic text-xl">
                    No expenses found for this filter.
                  </td>
                </tr>
              ) : (
                expenses.map((exp, idx) => (
                  <tr key={exp._id} className="group hover:bg-white/80 transition-all duration-300">
                    <td className="text-center italic opacity-40">
                      {((page - 1) * PAGE_LIMIT + idx + 1).toString().padStart(2, '0')}
                    </td>
                    <td>
                      <div className="flex flex-col items-center justify-center leading-none">
                        <span className="zen-table-primary">{exp.title}</span>
                        <span className="zen-table-meta">{getExpenseBranchName(exp)} • {getExpenseUserLabel(exp)}</span>
                      </div>
                    </td>
                    <td>
                      <ZenBadge variant="sand" className="scale-90 font-black tracking-widest">{exp.category}</ZenBadge>
                    </td>
                    <td>
                      <span className="text-base font-serif font-black text-zen-brown leading-none">
                        {settings?.general?.currencySymbol || 'QR'} {Number(exp.amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className="text-[11px] font-bold text-zen-brown/40 uppercase tracking-widest">
                        {exp.date ? dayjs(exp.date).format('DD MMM, YYYY') : '—'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-3">
                        <ZenIconButton
                          icon={Edit2}
                          onClick={() => openEditModal(exp)}
                        />
                        <ZenIconButton
                          icon={Trash2}
                          variant="danger"
                          onClick={() => {
                            setExpenseToDelete(exp._id);
                            setIsConfirmOpen(true);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <ZenPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExpense ? 'Edit Expense' : 'New Expense'}
        subtitle="Record operational outflow"
        maxWidth="max-w-3xl"
        headerIcon={ArrowDownRight}
        footer={
          <div className="flex w-full gap-4">
            <ZenButton type="button" variant="secondary" className="flex-1 rounded-[1.5rem] py-4" onClick={() => setIsModalOpen(false)}>
              Cancel
            </ZenButton>
            <ZenButton
              type="button"
              className="flex-[2] rounded-[1.5rem] py-4"
              onClick={(e: any) => handleSave(e)}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving…' : 'Save Expense'}
            </ZenButton>
          </div>
        }
      >
        <form onSubmit={handleSave} className="space-y-8">
          <ZenInput
            label="Title"
            value={formData.title}
            onChange={(e: any) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="e.g. Office Rent"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ZenDropdown
              label="Category"
              options={activeCategories}
              value={formData.category}
              onChange={(val) => setFormData({ ...formData, category: val })}
              placeholder="Select Category"
            />
            <ZenInput
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e: any) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
              placeholder="0"
            />
          </div>
          <ZenInput
            label="Date"
            type="date"
            value={formData.date}
            onChange={(e: any) => setFormData(prev => ({ ...prev, date: e.target.value }))}
          />

          <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Location Assignment</p>
                <h4 className="mt-1 text-lg font-semibold text-zen-brown">Assign to Branch</h4>
              </div>
            </div>
            <ZenDropdown
              label="Branch"
              hideLabel
              value={branches.find(b => b._id === formData.branch)?.name || ''}
              onChange={(name: string) => {
                const b = branches.find(branch => branch.name === name);
                if (b) setFormData(prev => ({ ...prev, branch: b._id }));
              }}
              options={branches.map(b => b.name)}
              disabled={user?.role !== 'Admin'}
            />
          </div>

        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Delete Expense"
        message="Are you sure you want to delete this expense entry?"
        confirmText={isSubmitting ? 'Deleting…' : 'Delete'}
        cancelText="Cancel"
        type="danger"
      />
    </ZenPageLayout>
  );
};

export default Expenses;
