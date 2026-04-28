import React, { useState, useEffect, useMemo } from 'react';
import {
  Edit2, Trash2, Sparkles,
  X, Tag, Zap
} from 'lucide-react';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenIconButton, ZenBadge, ZenButton } from '../../components/zen/ZenButtons';
import { ZenInput } from '../../components/zen/ZenInputs';
import { Modal } from '../../components/shared/Modal';
import { notify } from '../../components/shared/ZenNotification';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { useCategories } from '../../context/CategoryContext';
import { ZenStatCard } from '../../components/zen/ZenStatCard';
import { ExportPopup, ExportColumn } from '../../components/shared/ExportPopup';

interface ExpenseCategory {
  _id: string;
  name: string;
  type: 'room' | 'inventory' | 'service' | 'expense';
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const formatExportDateTime = (value?: string) => {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().slice(0, 16).replace('T', ' ');
};

const categoryMatchesSearch = (category: ExpenseCategory, searchTerm: string) => {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) return true;

  return [
    category._id,
    category.name,
    category.type,
    category.description,
    category.isActive ? 'Active' : 'Inactive'
  ].some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch));
};

const ExpenseCategories = () => {
  const {
    categories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory
  } = useCategories();

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('zen_expense_cat_view') as 'grid' | 'table') || 'grid';
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as const,
    isActive: true
  });

  useEffect(() => {
    localStorage.setItem('zen_expense_cat_view', viewMode);
  }, [viewMode]);

  const handleOpenModal = (cat: any = null) => {
    if (cat) {
      setEditingCategory(cat);
      setFormData({
        name: cat.name,
        type: 'expense',
        isActive: cat.isActive !== undefined ? cat.isActive : true
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', type: 'expense', isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let success;
    if (editingCategory) {
      success = await updateCategory(editingCategory._id, formData);
    } else {
      success = await createCategory(formData);
    }

    if (success) {
      notify('success', 'Category saved', editingCategory ? 'Expense category updated.' : 'New expense category created.');
      setIsModalOpen(false);
    } else {
      notify('error', 'Update Failed', 'Could not synchronize category records.');
    }
  };

  const toggleStatus = async (cat: any) => {
    const success = await updateCategory(cat._id, { ...cat, isActive: !cat.isActive });
    if (success) {
      notify('success', 'Status Switched', `${cat.name} is now ${!cat.isActive ? 'Active' : 'Inactive'}`);
    }
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    const success = await deleteCategory(itemToDelete);
    if (success) {
      notify('success', 'Category deleted', 'Category removed from the registry.');
      setIsConfirmOpen(false);
    } else {
      notify('error', 'Purge Failed', 'Could not remove category record.');
    }
  };

  const filteredCategories = useMemo<ExpenseCategory[]>(() => {
    return (categories as ExpenseCategory[]).filter(c =>
      c.type === 'expense' && categoryMatchesSearch(c, searchTerm)
    );
  }, [categories, searchTerm]);

  const expenseCategoryExportColumns = useMemo<ExportColumn<ExpenseCategory>[]>(
    () => [
      { header: 'Category ID', accessor: (category) => category._id },
      { header: 'Name', accessor: (category) => category.name },
      { header: 'Type', accessor: (category) => category.type },
      { header: 'Description', accessor: (category) => category.description || '-' },
      { header: 'Status', accessor: (category) => (category.isActive ? 'Active' : 'Inactive') },
      { header: 'Is Active', accessor: (category) => category.isActive },
      { header: 'Created At', accessor: (category) => formatExportDateTime(category.createdAt) },
      { header: 'Updated At', accessor: (category) => formatExportDateTime(category.updatedAt) }
    ],
    []
  );

  return (
    <ZenPageLayout
      title="Expense Categories"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      addButtonLabel="Add Expense Category"
      onAddClick={() => handleOpenModal()}
      hideBranchSelector
      searchActions={
        <ExportPopup<ExpenseCategory>
          data={filteredCategories}
          columns={expenseCategoryExportColumns}
          fileName="expense_categories"
          title="Expense Categories"
          triggerLabel="Download"
          description="Choose format and export the complete expense category sheet."
        />
      }
      topContent={
        <div className="flex overflow-x-auto overflow-y-visible pt-4 pb-6 gap-6 lg:grid lg:grid-cols-4 lg:gap-8 lg:overflow-visible scrollbar-hide px-4 lg:px-2">
          {[
            { label: 'Total Categories', value: filteredCategories.length, icon: Sparkles, color: 'text-rose-600', bg: 'bg-rose-600/10', glow: 'bg-rose-600/20', trend: 'Finance types' },
            { label: 'Active Types', value: filteredCategories.filter(c => c.isActive).length, icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', trend: 'Available' },
            { label: 'System Inactive', value: filteredCategories.filter(c => !c.isActive).length, icon: X, color: 'text-rose-500', bg: 'bg-rose-500/10', glow: 'bg-rose-500/20', trend: 'Disabled' },
            { label: 'Registry Health', value: filteredCategories.length > 0 ? 'Verified' : 'None', icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-500/10', glow: 'bg-purple-500/20', trend: 'Operational' }
          ].map((stat, i) => (
            <ZenStatCard key={i} {...stat} delay={i * 0.05} />
          ))}
        </div>
      }
    >
      <div className="space-y-6 pb-20">
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-zen-brown border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
          {filteredCategories.map((cat) => (
            <div key={cat._id} className="group relative bg-white rounded-[2rem] p-6 lg:p-8 shadow-sm border border-zen-brown/15 transition-all duration-700 hover:shadow-zen-brown/15 hover:-translate-y-2 h-full flex flex-col justify-between overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-bl-full -z-0 pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>

               <div className="relative z-10">
                 <div className="flex items-start justify-between mb-6">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-4 border-zen-cream bg-zen-cream flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-700 shadow-xl">
                        <div className="w-full h-full flex items-center justify-center bg-rose-500/10 text-rose-600 font-serif text-2xl uppercase font-bold">
                          {cat.name.charAt(0)}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-500">
                      <ZenIconButton
                        icon={Sparkles}
                        variant={cat.isActive ? 'leaf' : 'sand'}
                        onClick={() => toggleStatus(cat)}
                        className={cat.isActive ? 'text-zen-leaf' : 'text-zen-sand'}
                      />
                      <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(cat)} />
                      <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDeleteClick(cat._id)} />
                    </div>
                 </div>

                 <div className="mb-6">
                    <h3 className="text-xl lg:text-2xl font-serif text-zen-brown tracking-tight mb-2">{cat.name}</h3>
                 </div>
               </div>

               <div className="relative z-10 pt-6 border-t border-zen-brown/15 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <ZenBadge variant={cat.isActive ? 'leaf' : 'inactive'}>{cat.isActive ? 'Active' : 'Inactive'}</ZenBadge>
                  </div>
                  <div className="text-[10px] font-bold text-zen-brown/20 uppercase tracking-widest font-sans">
                     CODE: {cat._id.slice(-4).toUpperCase()}
                  </div>
               </div>
            </div>
          ))}
          {filteredCategories.length === 0 && (
             <div className="col-span-full py-32 text-center text-zen-brown/20 italic font-serif text-2xl border-2 border-dashed border-zen-brown/15 rounded-[3rem]">
                No expense categories defined in the registry.
             </div>
          )}
        </div>
      ) : (
        <div className="table-container w-full bg-white rounded-xl border border-gray-200/60 shadow-none overflow-hidden animate-in fade-in duration-700">
          <table className="w-full text-center border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th>S No</th>
                <th>Category Identity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(!filteredCategories || filteredCategories.length === 0) && (
                 <tr>
                    <td colSpan={4}>
                       <span className="text-[13px] font-sans text-gray-400 italic">No records available.</span>
                    </td>
                 </tr>
              )}

              {filteredCategories.map((cat, index) => (
                <tr key={cat._id} className="transition-all group border-b border-black/[0.02]">
                  <td className="text-center italic opacity-40 text-[11px]">
                    {(index + 1).toString().padStart(2, '0')}
                  </td>
                  <td>
                     <div className="flex flex-col items-center justify-center leading-none px-6">
                        <span className="zen-table-primary">{cat.name}</span>
                        <span className="zen-table-meta">Expense Category</span>
                     </div>
                  </td>
                  <td>
                     <div className="flex justify-center">
                        <button
                          onClick={() => toggleStatus(cat)}
                          className="group/status transition-transform active:scale-95"
                        >
                           <ZenBadge variant={cat.isActive ? 'leaf' : 'sand'}>
                             <div className={`w-1 h-1 rounded-full mr-1.5 ${cat.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-zen-sand'}`}></div>
                             {cat.isActive ? 'Active' : 'Paused'}
                           </ZenBadge>
                        </button>
                     </div>
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-3">
                       <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(cat)} />
                       <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDeleteClick(cat._id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="max-w-2xl"
        header={
          <div className="flex items-center justify-between gap-6 px-6 sm:px-10 py-5 sm:py-6 border-b border-zen-brown/5">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm shrink-0">
                <Tag size={20} strokeWidth={2} />
              </div>
              <div className="flex items-baseline gap-3 min-w-0">
                <h3 className="text-xl font-bold text-zen-brown truncate">
                  {editingCategory ? 'Edit Category' : 'New Category'}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600/40 whitespace-nowrap">Expense Category</span>
              </div>
            </div>
            <ZenIconButton icon={X} onClick={() => setIsModalOpen(false)} size="sm" />
          </div>
        }
        footer={
          <div className="flex items-center justify-between w-full gap-8">
            <p className="text-[11px] font-medium text-zen-brown/40 truncate max-w-[50%]">
              {editingCategory
                ? 'Updates apply to all related expenses.'
                : 'New category available immediately.'}
            </p>
            <div className="flex items-center gap-3 shrink-0">
              <ZenButton
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full px-6"
              >
                Cancel
              </ZenButton>
              <ZenButton
                type="submit"
                form="expense-category-modal-form"
                className="bg-rose-600 hover:bg-rose-700 rounded-full px-8 shadow-sm shadow-rose-600/20"
              >
                {editingCategory ? 'Save' : 'Create'}
              </ZenButton>
            </div>
          </div>
        }
      >
        <form id="expense-category-modal-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl border border-zen-brown/10 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zen-brown/30">Registry Details</span>
                <h4 className="text-md font-bold text-zen-brown">Basic Configuration</h4>
              </div>
              <ZenBadge variant={formData.isActive ? 'leaf' : 'inactive'} className="scale-90">
                {formData.isActive ? 'Active' : 'Inactive'}
              </ZenBadge>
            </div>

            <ZenInput
              label="Category Name"
              placeholder="e.g. Utility Bills"
              required
              value={formData.name}
              onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
              hideLabel={false}
            />
          </div>

          <div className="rounded-2xl border border-zen-brown/10 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zen-brown/30">Availability</span>
                <p className="text-sm font-medium text-zen-brown/70 truncate">
                  {formData.isActive ? 'Visible in logs' : 'Hidden from logs'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all shadow-sm ${
                  formData.isActive ? 'bg-zen-leaf text-white shadow-zen-leaf/10' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {formData.isActive ? 'Active' : 'Inactive'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Delete category?"
        message="Are you sure you want to delete this expense category?"
      />
      </div>
    </ZenPageLayout>
  );
};

export default ExpenseCategories;
