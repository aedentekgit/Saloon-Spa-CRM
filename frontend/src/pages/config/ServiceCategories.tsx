import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Edit2, Trash2, Sparkles, 
  X, Search, Grid, List, Tag, Zap
} from 'lucide-react';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenIconButton, ZenBadge, ZenButton } from '../../components/zen/ZenButtons';
import { ZenInput, ZenTextarea } from '../../components/zen/ZenInputs';
import { Modal } from '../../components/shared/Modal';
import { notify } from '../../components/shared/ZenNotification';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { useCategories } from '../../context/CategoryContext';
import { ZenStatCard } from '../../components/zen/ZenStatCard';

const ServiceCategories = () => {
  const { 
    categories, 
    loading, 
    createCategory, 
    updateCategory, 
    deleteCategory 
  } = useCategories();

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('zen_service_cat_view') as 'grid' | 'table') || 'grid';
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'service' as const,
    isActive: true
  });

  useEffect(() => {
    localStorage.setItem('zen_service_cat_view', viewMode);
  }, [viewMode]);

  const handleOpenModal = (cat: any = null) => {
    if (cat) {
      setEditingCategory(cat);
      setFormData({
        name: cat.name,
        type: 'service',
        isActive: cat.isActive !== undefined ? cat.isActive : true
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', type: 'service', isActive: true });
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
      notify('success', 'Category saved', editingCategory ? 'Service category updated.' : 'New service category created.');
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

  const filteredCategories = useMemo(() => {
    return categories.filter(c => 
      c.type === 'service' && 
      (c.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [categories, searchTerm]);

  return (
    <ZenPageLayout
      title="Service Categories"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      addButtonLabel="Add Service Category"
      onAddClick={() => handleOpenModal()}
      hideBranchSelector
      topContent={
        <div className="flex overflow-x-auto overflow-y-visible pt-4 pb-6 gap-6 lg:grid lg:grid-cols-4 lg:gap-8 lg:overflow-visible scrollbar-hide px-4 lg:px-2">
          {[
            { label: 'Total Categories', value: filteredCategories.length, icon: Sparkles, color: 'text-yellow-600', bg: 'bg-yellow-600/10', glow: 'bg-yellow-600/20', trend: 'Global types' },
            { label: 'Active Types', value: filteredCategories.filter(c => c.isActive).length, icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20', trend: 'Operational' },
            { label: 'System Inactive', value: filteredCategories.filter(c => !c.isActive).length, icon: X, color: 'text-rose-500', bg: 'bg-rose-500/10', glow: 'bg-rose-500/20', trend: 'Paused registry' },
            { label: 'Registry Integrity', value: filteredCategories.length > 0 ? 'Verified' : 'None', icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-500/10', glow: 'bg-purple-500/20', trend: 'System health' }
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
               <div className="absolute top-0 right-0 w-32 h-32 bg-zen-sand/5 rounded-bl-full -z-0 pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>

               <div className="relative z-10">
                 <div className="flex items-start justify-between mb-6">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-4 border-zen-cream bg-zen-cream flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-700 shadow-xl">
                        <div className="w-full h-full flex items-center justify-center bg-zen-sand/20 text-zen-brown font-serif text-2xl uppercase font-bold">
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
                No service categories defined in the registry.
             </div>
          )}
        </div>
      ) : (
        <div className="table-container w-full bg-white rounded-xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in fade-in duration-700">
          <table className="w-full text-center border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th>S NO</th>
                <th>Identity</th>
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
                     <div className="flex items-center justify-center gap-2 px-6">
                        <span className="zen-table-primary">{cat.name}</span>
                        <span className="text-zen-brown/20 text-[10px]">|</span>
                        <span className="zen-table-meta">Service Category</span>
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
          <div className="flex items-start justify-between gap-6 px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-start gap-4 sm:gap-5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-zen-brown text-white flex items-center justify-center shadow-sm shrink-0">
                <Sparkles size={22} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Service category</p>
                <h3 className="mt-1 text-xl sm:text-2xl font-semibold text-zen-brown truncate">
                  {editingCategory ? 'Edit service category' : 'New service category'}
                </h3>
                <p className="mt-2 text-sm text-zen-brown/60 max-w-2xl">
                  Group services cleanly so scheduling and reporting stay consistent.
                </p>
              </div>
            </div>
            <ZenIconButton icon={X} onClick={() => setIsModalOpen(false)} size="md" />
          </div>
        }
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-xs text-zen-brown/40">
              {editingCategory
                ? 'Updates apply to all services using this category.'
                : 'The new category will be available when creating services.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <ZenButton
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </ZenButton>
              <ZenButton
                type="submit"
                form="service-category-modal-form"
                className="w-full sm:w-auto"
              >
                {editingCategory ? 'Save category' : 'Create category'}
              </ZenButton>
            </div>
          </div>
        }
      >
        <form id="service-category-modal-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Category details</p>
                <h4 className="mt-1 text-lg font-semibold text-zen-brown">Name and availability</h4>
              </div>
              <ZenBadge variant={formData.isActive ? 'leaf' : 'inactive'}>
                {formData.isActive ? 'Active' : 'Inactive'}
              </ZenBadge>
            </div>

            <ZenInput
              label="Category name"
              placeholder="e.g. Holistic massages"
              required
              value={formData.name}
              onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Availability</p>
                <h4 className="mt-1 text-lg font-semibold text-zen-brown">Category status</h4>
                <p className="mt-2 text-sm text-zen-brown/55">
                  {formData.isActive
                    ? 'Visible in service creation and scheduling.'
                    : 'Hidden from new service assignments until reactivated.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                  formData.isActive ? 'bg-zen-leaf text-white' : 'bg-slate-200 text-slate-600'
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
        message="Are you sure you want to delete this category? Services using it may need to be updated."
      />
      </div>
    </ZenPageLayout>
  );
};

export default ServiceCategories;
