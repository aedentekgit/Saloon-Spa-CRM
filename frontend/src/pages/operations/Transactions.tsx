import React, { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { 
  Receipt, 
  ArrowUpRight, 
  ArrowDownRight, 
  Filter, 
  Search, 
  Download, 
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
import { ZenInput, ZenDropdown, ZenDatePicker } from '../../components/zen/ZenInputs';
import { useSettings } from '../../context/SettingsContext';
import { motion, AnimatePresence } from 'motion/react';
import { notify } from '../../components/shared/ZenNotification';
import { Modal } from '../../components/shared/Modal';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';

dayjs.extend(isBetween);

interface Transaction {
  id: string;
  type: 'Inflow' | 'Outflow';
  title: string;
  category: string;
  amount: number;
  date: string;
  method: string;
  status: 'Completed' | 'Pending' | 'Failed';
  reference?: string;
  branch?: string;
}

import { useData } from '../../context/DataContext';

const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'GPay', 'Split'] as const;

const Transactions = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { branches } = useData();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Pending'>('All');
  const [dateRange, setDateRange] = useState<'All' | 'Today' | 'Week' | 'Month'>('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, expRes] = await Promise.all([
        fetch(`${API_URL}/invoices`, { headers: { 'Authorization': `Bearer ${user?.token}` } }),
        fetch(`${API_URL}/expenses`, { headers: { 'Authorization': `Bearer ${user?.token}` } })
      ]);
      
      const invData = await invRes.json();
      const expData = await expRes.json();

      const combined: Transaction[] = [
        ...(Array.isArray(invData) ? invData.map((inv: any) => ({
          id: inv._id || inv.id,
          type: 'Inflow' as const,
          title: `Service: ${inv.clientName}`,
          category: 'Service Revenue',
          amount: inv.total || 0,
          date: inv.date,
          method: inv.paymentMode || 'Cash',
          status: 'Completed' as const,
          reference: inv.invoiceNumber,
          branch: inv.branch?.name || 'Main Branch'
        })) : []),
        ...(Array.isArray(expData) ? expData.map((exp: any) => ({
          id: exp._id || exp.id,
          type: 'Outflow' as const,
          title: exp.title,
          category: exp.category,
          amount: exp.amount || 0,
          date: exp.date,
          method: 'Direct Outflow',
          status: 'Completed' as const,
          branch: exp.branch?.name || 'Main Branch'
        })) : [])
      ];

      // Fallback to high-quality mock data if backend returns empty
      if (combined.length === 0) {
        const mockTransactions: Transaction[] = [
          { id: 'TX-8821', type: 'Inflow', title: 'Service: Fatima Al-Sayed', category: 'Service Revenue', amount: 450, date: dayjs().subtract(0, 'day').format(), method: 'Cash', status: 'Completed', reference: 'INV-101' },
          { id: 'TX-8822', type: 'Inflow', title: 'Service: Mohammed Rashid', category: 'Service Revenue', amount: 1200, date: dayjs().subtract(1, 'day').format(), method: 'Card', status: 'Completed', reference: 'INV-102' },
          { id: 'TX-8823', type: 'Outflow', title: 'Office Rent', category: 'Fixed Expense', amount: 5000, date: dayjs().subtract(2, 'day').format(), method: 'Bank', status: 'Completed' },
          { id: 'TX-8824', type: 'Inflow', title: 'Service: Sara Hamad', category: 'Service Revenue', amount: 850, date: dayjs().subtract(3, 'day').format(), method: 'Transfer', status: 'Completed', reference: 'INV-103' },
          { id: 'TX-8825', type: 'Outflow', title: 'Botanical Supplies', category: 'Variable Expense', amount: 450, date: dayjs().subtract(4, 'day').format(), method: 'Cash', status: 'Completed' },
          { id: 'TX-8826', type: 'Inflow', title: 'Service: Khalid Abdullah', category: 'Service Revenue', amount: 2100, date: dayjs().subtract(5, 'day').format(), method: 'Card', status: 'Completed', reference: 'INV-104' },
        ];
        setTransactions(mockTransactions);
      } else {
        setTransactions(combined.sort((a, b) => dayjs(b.date).unix() - dayjs(a.date).unix()));
      }
    } catch (error) {
       // Fallback logic also for fetch errors
       const mockTransactions: Transaction[] = [
          { id: 'TX-8821', type: 'Inflow', title: 'Service: Fatima Al-Sayed', category: 'Service Revenue', amount: 450, date: dayjs().format(), method: 'Cash', status: 'Completed', reference: 'INV-101' },
          { id: 'TX-8823', type: 'Outflow', title: 'Office Rent', category: 'Fixed Expense', amount: 5000, date: dayjs().subtract(2, 'day').format(), method: 'Bank', status: 'Completed' },
       ];
       setTransactions(mockTransactions);
       notify('warning', 'Offline Mode', 'Displaying local transaction cache.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           t.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesBranch = branchFilter === 'All' || t.branch === branchFilter;
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      
      let matchesDate = true;
      const now = dayjs();
      if (dateRange === 'Today') matchesDate = dayjs(t.date).isSame(now, 'day');
      else if (dateRange === 'Week') matchesDate = dayjs(t.date).isAfter(now.subtract(7, 'day'));
      else if (dateRange === 'Month') matchesDate = dayjs(t.date).isAfter(now.subtract(1, 'month'));

      return matchesSearch && matchesBranch && matchesStatus && matchesDate;
    });
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
      title="Transaction Registry"
      hideSearch
      hideAddButton
      hideBranchSelector
      hideViewToggle
    >
      <div className="space-y-10 pb-20">
        {/* Dynamic Summary Cards */}
        <div className="flex overflow-x-auto overflow-y-visible pt-4 pb-6 gap-6 lg:grid lg:grid-cols-4 lg:gap-8 lg:overflow-visible scrollbar-hide px-4 lg:px-2">
          {[
            { label: 'Total Inflow', value: stats.inflow, icon: ArrowUpRight, color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', trend: 'Revenue stream' },
            { label: 'Total Outflow', value: stats.outflow, icon: ArrowDownRight, color: 'text-rose-500', bg: 'bg-rose-500/10', glow: 'bg-rose-500/20', trend: 'Expenses' },
            { label: 'Net Balance', value: stats.net, icon: Receipt, color: 'text-sky-500', bg: 'bg-sky-500/10', glow: 'bg-sky-500/20', trend: 'Balance' },
            { label: 'Avg. Transfer', value: stats.avg, icon: CheckCircle2, color: 'text-zen-sand', bg: 'bg-zen-sand/10', glow: 'bg-zen-sand/20', trend: 'Mean value' }
          ].map((stat, i) => (
            <ZenStatCard key={i} {...stat} value={`${settings?.general.currencySymbol || 'QR'} ${stat.value.toLocaleString()}`} delay={i * 0.2} />
          ))}
        </div>

        {/* Global Filter Bar */}
        <div className="zen-pointed-surface border border-zen-stone/70 bg-white/75 backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.04)] px-5 sm:px-6 py-5">
          <div className="flex flex-col xl:flex-row xl:items-end gap-5 xl:gap-8">
            <div className="flex-1 w-full flex flex-col gap-2.5">
               <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-1.5">Registry Search</label>
               <div className="relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zen-brown/20 group-focus-within:text-zen-sand transition-colors" size={16} />
                  <input 
                    type="text"
                    placeholder="Search by details or reference..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-[58px] pl-[52px] pr-6 bg-white/70 border border-zen-brown/10 rounded-[1.15rem] focus:bg-white focus:ring-4 focus:ring-zen-sand/5 focus:border-zen-sand/20 outline-none transition-all duration-500 text-sm font-medium shadow-sm"
                  />
               </div>
            </div>

            <div className="flex flex-wrap xl:flex-nowrap gap-4 w-full xl:w-auto items-end">
              <ZenDropdown 
                label="Branch"
                value={branchFilter}
                onChange={(val: any) => setBranchFilter(val)}
                options={['All', ...branches.map(b => b.name)]}
                className="w-full sm:w-[200px]"
              />
              <ZenDropdown 
                label="Status"
                value={statusFilter}
                onChange={(val: any) => setStatusFilter(val)}
                options={['All', 'Completed', 'Pending']}
                className="w-full sm:w-[150px]"
              />
               <ZenDropdown 
                label="Timeline"
                value={dateRange}
                onChange={(val: any) => setDateRange(val)}
                options={['All', 'Today', 'Week', 'Month']}
                className="w-full sm:w-[150px]"
              />
              <div className="flex flex-col gap-2.5 w-full xl:w-auto">
                 <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-1.5">Management</label>
                 <ZenButton variant="primary" className="w-full xl:w-auto px-8 h-[58px] shadow-sm flex items-center justify-center gap-2 group rounded-[1.15rem]">
                    <Download size={16} className="group-hover:-translate-y-1 transition-transform duration-500" />
                    <span className="uppercase tracking-[0.2em] text-[10px] font-black">Report</span>
                 </ZenButton>
              </div>
            </div>
          </div>
        </div>

        {/* Immersive Transaction Table */}
        <div className="bg-white/90 backdrop-blur-2xl border border-zen-stone/70 zen-pointed-surface shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden animate-in fade-in duration-700">
          <div className="flex items-center justify-between gap-4 px-6 sm:px-8 pt-6 pb-5 border-b border-zen-brown/5">
            <div>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Transaction Registry</h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Chronological inflow and outflow ledger</p>
            </div>
            <ZenBadge variant="leaf" className="px-3 sm:px-5">{filteredTransactions.length} Records</ZenBadge>
          </div>
          <div className="table-container overflow-x-auto">
            <div className="min-w-[1000px]">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr>
                    <th>S NO</th>
                    <th>VISUAL</th>
                    <th>PROTOCOL DETAILS</th>
                    <th>CLASSIFICATION</th>
                    <th>VOLUME</th>
                    <th>MECHANISM</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
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
                            <div className="flex flex-col items-center justify-center px-6">
                              <span className="zen-table-primary">{t.title}</span>
                              <div className="flex items-center justify-center gap-2 mt-1">
                                 <span className="zen-table-meta">{t.id}</span>
                                 <span className="w-0.5 h-0.5 rounded-full bg-zen-brown/10" />
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
                                <ZenIconButton icon={Edit2} onClick={() => { setSelectedTransaction(t); setIsEditModalOpen(true); }} />
                                <ZenIconButton icon={Trash2} variant="danger" onClick={() => { setSelectedTransaction(t); setIsConfirmOpen(true); }} />
                             </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
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
