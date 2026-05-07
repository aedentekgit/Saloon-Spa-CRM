import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Tag,
  DoorOpen, Sparkles, Package, X, Search
} from 'lucide-react';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenIconButton, ZenBadge, ZenButton } from '../../components/zen/ZenButtons';
import { ZenInput, ZenDropdown, ZenTextarea } from '../../components/zen/ZenInputs';
import { Modal } from '../../components/shared/Modal';
import { notify } from '../../components/shared/ZenNotification';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { useCategories } from '../../context/CategoryContext';

const Categories = () => {
  const {
    categories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory
  } = useCategories();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'room' as 'room' | 'inventory' | 'service' | 'sector',
    description: ''
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'room': return <DoorOpen size={18} />;
      case 'service': return <Sparkles size={18} />;
      case 'inventory': return <Package size={18} />;
      case 'sector': return <Tag size={18} />;
      default: return <Tag size={18} />;
    }
  };

  const handleOpenModal = (cat: any = null) => {
    if (cat) {
      setEditingCategory(cat);
      setFormData({
        name: cat.name,
        type: cat.type,
        description: cat.description || ''
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', type: 'room', description: '' });
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
      notify('success', 'Category saved', editingCategory ? 'Category details updated.' : 'New category created.');
      setIsModalOpen(false);
    } else {
      notify('error', 'Update Failed', 'Could not synchronize category records.');
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

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    c.type.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  return (
    <ZenPageLayout
      title="Categories"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      addButtonLabel="New Category"
      onAddClick={() => handleOpenModal()}
      hideBranchSelector
      hideViewToggle
    >
      <div className="space-y-6 pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-10 h-10 border-4 border-zen-brown border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (

          <div className="w-full bg-white rounded-xl border border-gray-200/60 shadow-none overflow-hidden animate-in fade-in duration-700">
            <div className="table-container">
              <table className="w-full text-center border-collapse min-w-[800px]">
            <thead>
              <tr>
                 <th>S NO</th>
                 <th>Identity</th>
                 <th>Category Type</th>
                 <th>Description</th>
                 <th>Actions</th>
              </tr>
            </thead>
            <tbody className="">
              {(!filteredCategories || filteredCategories.length === 0) && !loading && (
                 <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-[13px] font-sans text-gray-400 bg-gray-50/30">No records available.</td>
                 </tr>
              )}

              {filteredCategories.map((cat, index) => (
                <tr key={cat._id} className="transition-all group border-b border-black/[0.02]">
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <span>{(index + 1).toString().padStart(2, '0')}</span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <div className="flex items-center justify-center gap-4">
                       <div className="w-10 lg:w-12 h-10 lg:h-12 zen-pointed-surface overflow-hidden bg-zen-cream/30 border border-zen-brown/10 flex items-center justify-center text-zen-brown/40 group-hover:scale-110 transition-transform duration-500">
                          {getTypeIcon(cat.type)}
                       </div>
                       <div className="flex flex-col items-start leading-none">
                         <span className="zen-table-primary">{cat.name}</span>
                         <span className="zen-table-meta mt-1">Global Category</span>
                       </div>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                     <div className="flex justify-center">
                       <ZenBadge variant={cat.type === 'room' ? 'leaf' : cat.type === 'service' ? 'sand' : 'ocean'} className="capitalize text-[9px] tracking-widest">
                         {cat.type} Mastery
                       </ZenBadge>
                     </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <p className="text-sm text-zen-brown/50 italic max-w-xs truncate mx-auto">{cat.description || 'No description provided.'}</p>
                  </td>
                  <td className="px-4 lg:px-6 py-4 lg:py-6">
                    <div className="flex items-center justify-center gap-2">
                       <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(cat)} size="md" />
                       <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDeleteClick(cat._id)} size="md" />
                    </div>
                  </td>
                </tr>
              ))}

            </tbody>
          </table>
          </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="max-w-2xl"
        header={
          <div className="flex items-start justify-between gap-6 px-6 sm:px-10 py-6 sm:py-8">
            <div className="flex items-start gap-4 sm:gap-5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-zen-brown text-white flex items-center justify-center shadow-sm shrink-0">
                {getTypeIcon(formData.type)}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Category record</p>
                <h3 className="mt-1 text-xl sm:text-2xl font-semibold text-zen-brown truncate">
                  {editingCategory ? 'Edit category' : 'New category'}
                </h3>
                <p className="mt-2 text-sm text-zen-brown/60 max-w-2xl">
                  Define the category used across rooms, services, and inventory.
                </p>
              </div>
            </div>
            <ZenIconButton icon={X} onClick={() => setIsModalOpen(false)} size="md" />
          </div>
        }
        footer={
          <div className="flex items-center justify-end w-full gap-4">
            <ZenButton
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              className="rounded-full px-8 py-2.5 text-xs font-bold whitespace-nowrap"
            >
              Cancel
            </ZenButton>
            <ZenButton
              type="submit"
              form="category-modal-form"
              className="rounded-full px-10 py-2.5 text-xs font-bold whitespace-nowrap"
            >
              {editingCategory ? 'Save Category' : 'Create Category'}
            </ZenButton>
          </div>
        }
      >
        <form id="category-modal-form" onSubmit={handleSubmit} className="p-8">
          <div className="bg-white rounded-[2.5rem] border border-zen-brown/10 p-10 shadow-2xl shadow-zen-brown/5 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-zen-brown/[0.03] rounded-full blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-zen-sand/[0.05] rounded-full blur-3xl" />

            <div className="relative z-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ZenInput
                  label="Category Identity"
                  placeholder="e.g. Royal Suite"
                  required
                  value={formData.name}
                  onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                  variant="professional"
                />
                <ZenDropdown
                  label="Classification"
                  options={['Room', 'Inventory', 'Service', 'Sector']}
                  value={formData.type.charAt(0).toUpperCase() + formData.type.slice(1)}
                  onChange={(val) => setFormData({ ...formData, type: val.toLowerCase() as any })}
                  variant="pill"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 px-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-zen-brown/20" />
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zen-brown/30">Internal Reference</p>
                </div>
                <ZenTextarea
                  placeholder="Enter registry description..."
                  value={formData.description}
                  onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[140px] bg-white/40 border-zen-brown/10 rounded-3xl p-6 focus:border-zen-brown/30 transition-all text-sm leading-relaxed text-zen-brown/70"
                />
              </div>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Delete category?"
        message="Are you sure you want to delete this category? Items using it may need to be reassigned."
      />
    </ZenPageLayout>
  );
};

export default Categories;
