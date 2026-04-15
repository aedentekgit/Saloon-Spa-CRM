import React, { useState } from 'react';
import { 
  Plus, Edit2, Trash2, Tag, 
  DoorOpen, Sparkles, Package, Info, X
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
      notify('success', 'Registry Updated', editingCategory ? 'Category details refined.' : 'New category joined the resonance.');
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
      notify('success', 'Record Purged', 'Category removed from the sanctuary.');
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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-zen-cream/10">
                <th className="px-10 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] whitespace-nowrap">S NO</th>
                <th className="px-10 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em]">Identity</th>
                <th className="px-10 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em]">Resonance Type</th>
                <th className="px-10 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em]">Soulful Essence</th>
                <th className="px-10 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-right">Ritual Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zen-brown/15">
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
                    <p className="text-sm text-zen-brown/50 italic max-w-xs truncate">{cat.description || 'No specialized essence defined.'}</p>
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
                      No categories found in the current resonance.
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
        title={editingCategory ? 'Refine Category' : 'Enroll Category'}
      >
        <form onSubmit={handleSubmit} className="px-10 py-12 space-y-10">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <ZenInput 
                label="Category Identity" 
                placeholder="e.g. Royal Suite" 
                required 
                value={formData.name}
                onChange={(e: any) => setFormData({...formData, name: e.target.value})}
              />
              <ZenDropdown 
                label="Registry Type"
                options={['Room', 'Inventory', 'Service']}
                value={formData.type.charAt(0).toUpperCase() + formData.type.slice(1)}
                onChange={(val) => setFormData({...formData, type: val.toLowerCase() as any})}
              />
           </div>
           
           <ZenTextarea 
             label="Essence Description" 
             placeholder="Define the soulful purpose of this category..." 
             value={formData.description}
             onChange={(e: any) => setFormData({...formData, description: e.target.value})}
           />

           <div className="pt-6">
              <ZenButton type="submit" className="w-full py-5 rounded-[2rem] shadow-sm flex items-center justify-center gap-3">
                 <span>{editingCategory ? 'Archiving Refinement' : 'Establish Category'}</span>
                 <Sparkles size={18} />
              </ZenButton>
           </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Purge Category?"
        message="Are you certain you wish to remove this category identity? Entities assigned to this category will need reassignment."
      />
    </ZenPageLayout>
  );
};

export default Categories;
