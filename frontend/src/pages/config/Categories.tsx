import React, { useState } from 'react';
import { 
  Plus, Edit2, Trash2, Tag, 
  DoorOpen, Sparkles, Package, X
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'room' as 'room' | 'inventory' | 'service',
    description: ''
  });

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'room': return <DoorOpen size={18} />;
      case 'service': return <Sparkles size={18} />;
      case 'inventory': return <Package size={18} />;
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
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ZenPageLayout
      title="Category Registry"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      addButtonLabel="New Category"
      onAddClick={() => handleOpenModal()}
      addButtonIcon={<Plus size={18} />}
    >
      <div className="bg-white/60 backdrop-blur-sm rounded-[3rem] border border-zen-brown/15 overflow-hidden shadow-sm">
        <div className="w-full bg-white rounded-xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden overflow-x-auto custom-scrollbar animate-in fade-in duration-700">
          <table className="w-full text-center border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-y border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                 <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">S NO</th>
                 <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Identity</th>
                 <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Category Type</th>
                 <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Description</th>
                 <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="">
              {(!filteredCategories || filteredCategories.length === 0) && (

                 <tr>

                    <td colSpan={12} className="px-6 py-16 text-center text-[13px] font-sans text-gray-400 bg-gray-50/30">No records available.</td>

                 </tr>

              )}

              {filteredCategories.map((cat, index) => (
                <tr key={cat._id} className="hover:bg-white transition-all duration-500">
                  <td className="px-10 py-8">
                    <span className="font-serif text-lg text-zen-brown/40">{(index + 1).toString().padStart(2, '0')}</span>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-zen-cream/30 rounded-xl text-zen-brown/40">
                          {getTypeIcon(cat.type)}
                       </div>
                       <p className="font-serif text-lg text-zen-brown font-bold tracking-tight">{cat.name}</p>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <ZenBadge variant={cat.type === 'room' ? 'leaf' : cat.type === 'service' ? 'sand' : 'ocean'} className="capitalize">
                      {cat.type} Mastery
                    </ZenBadge>
                  </td>
                  <td className="px-10 py-8">
                    <p className="text-sm text-zen-brown/50 italic max-w-xs truncate">{cat.description || 'No description provided.'}</p>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex items-center justify-end gap-3">
                       <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(cat)} />
                       <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDeleteClick(cat._id)} />
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCategories.length === 0 && !loading && (
                <tr>
                   <td colSpan={5} className="py-24 text-center text-zen-brown/20 italic font-serif text-xl border-none">
                      No categories found in the current registry.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="max-w-3xl"
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
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-xs text-zen-brown/40">
              {editingCategory
                ? 'Changes update category usage across the CRM immediately.'
                : 'New categories become available in selection lists after saving.'}
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
                form="category-modal-form"
                className="w-full sm:w-auto"
              >
                {editingCategory ? 'Save category' : 'Create category'}
              </ZenButton>
            </div>
          </div>
        }
      >
        <form id="category-modal-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Category details</p>
                <h4 className="mt-1 text-lg font-semibold text-zen-brown">Identity and type</h4>
              </div>
              <ZenBadge
                variant={formData.type === 'room' ? 'leaf' : formData.type === 'service' ? 'sand' : 'ocean'}
                className="capitalize"
              >
                {formData.type}
              </ZenBadge>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <ZenInput
                label="Category name"
                placeholder="e.g. Royal Suite"
                required
                value={formData.name}
                onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
              />
              <ZenDropdown
                label="Category type"
                options={['Room', 'Inventory', 'Service']}
                value={formData.type.charAt(0).toUpperCase() + formData.type.slice(1)}
                onChange={(val) => setFormData({ ...formData, type: val.toLowerCase() as any })}
              />
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white p-6 sm:p-8 shadow-sm">
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/40">Description</p>
              <h4 className="mt-1 text-lg font-semibold text-zen-brown">Internal reference note</h4>
            </div>
            <ZenTextarea
              label="Category description"
              placeholder="Add a short internal description for this category."
              value={formData.description}
              onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
              className="mt-0 h-36"
            />
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
