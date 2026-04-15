import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Edit2, Trash2, Sparkles, 
  X, Search, LayoutGrid, List, Tag
} from 'lucide-react';
import { ZenPageLayout } from '../components/zen/ZenLayout';
import { ZenIconButton, ZenBadge, ZenButton } from '../components/zen/ZenButtons';
import { ZenInput, ZenTextarea } from '../components/zen/ZenInputs';
import { Modal } from '../components/Modal';
import { notify } from '../components/ZenNotification';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useCategories } from '../context/CategoryContext';

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
    description: '',
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
        description: cat.description || '',
        isActive: cat.isActive !== undefined ? cat.isActive : true
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', type: 'service', description: '', isActive: true });
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
      notify('success', 'Registry Updated', editingCategory ? 'Service category refined.' : 'New service category established.');
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
      notify('success', 'Record Purged', 'Category removed from the sanctuary.');
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
      title="Service Experience Registry"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      addButtonLabel="Add Service Category"
      onAddClick={() => handleOpenModal()}
      addButtonIcon={<Plus size={18} />}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-zen-brown border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
          {filteredCategories.map((cat) => (
            <div key={cat._id} className="group relative bg-white rounded-[2rem] p-6 lg:p-8 shadow-2xl shadow-zen-brown/15 border border-zen-brown/15 transition-all duration-700 hover:shadow-zen-brown/15 hover:-translate-y-2 h-full flex flex-col justify-between overflow-hidden">
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
                    <p className="text-xs text-zen-brown/60 leading-relaxed line-clamp-3 italic">
                      {cat.description || "No specialized essence defined for this therapeutic category."}
                    </p>
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
        <div className="bg-white/60 backdrop-blur-sm rounded-[3rem] border border-zen-brown/15 overflow-hidden shadow-2xl shadow-zen-brown/15">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-zen-cream/10">
                  <th className="px-10 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center w-24 whitespace-nowrap">S NO</th>
                  <th className="px-10 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Identity</th>
                  <th className="px-10 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Essence Description</th>
                  <th className="px-10 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Status</th>
                  <th className="px-10 py-6 text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zen-brown/15">
                {filteredCategories.map((cat, index) => (
                  <tr key={cat._id} className="group hover:bg-white transition-all duration-500">
                    <td className="px-10 py-8 text-center">
                      <span className="font-serif text-lg text-zen-brown/40">{(index + 1).toString().padStart(2, '0')}</span>
                    </td>
                    <td className="px-10 py-8 text-center">
                      <p className="font-serif text-lg text-zen-brown font-bold tracking-tight">{cat.name}</p>
                    </td>
                    <td className="px-10 py-8 text-center">
                        <p className="text-[10px] text-zen-brown/30 italic truncate max-w-[200px]">{cat.description || 'General offering'}</p>
                    </td>
                    <td className="px-10 py-8 text-center text-sm font-medium">
                       <ZenBadge variant={cat.isActive ? 'leaf' : 'inactive'}>{cat.isActive ? 'Active' : 'Inactive'}</ZenBadge>
                    </td>
                    <td className="px-10 py-8 text-center">
                      <div className="flex items-center justify-center gap-3 transition-all duration-500">
                         <ZenIconButton 
                           icon={Sparkles} 
                           variant={cat.isActive ? 'leaf' : 'sand'} 
                           onClick={() => toggleStatus(cat)} 
                         />
                         <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(cat)} />
                         <ZenIconButton icon={Trash2} variant="danger" onClick={() => handleDeleteClick(cat._id)} />
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCategories.length === 0 && (
                  <tr>
                     <td colSpan={5} className="py-24 text-center text-zen-brown/20 italic font-serif text-xl border-none">
                        No service categories found in the registry.
                     </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingCategory ? 'Refine Service Category' : 'Enroll Service Category'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-auto w-full relative bg-white">
           <div className="px-10 py-8 border-b border-zen-brown/15 flex justify-between items-center">
              <div>
                <h3 className="font-serif text-2xl text-zen-brown">{editingCategory ? 'Refine Experience' : 'New Ritual Category'}</h3>
                <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest mt-1">Service Registry Configuration</p>
              </div>
              <ZenIconButton icon={X} onClick={() => setIsModalOpen(false)} />
           </div>

           <div className="px-10 py-12 space-y-10">
              <ZenInput 
                label="Category Identity" 
                placeholder="e.g. Holistic Massages" 
                required 
                value={formData.name}
                onChange={(e: any) => setFormData({...formData, name: e.target.value})}
              />
              
              <ZenTextarea 
                label="Treatment Philosopy" 
                placeholder="Describe the therapeutic intent and sensory journey of this category..." 
                value={formData.description}
                onChange={(e: any) => setFormData({...formData, description: e.target.value})}
              />

              <div className="flex items-center gap-4 p-6 bg-zen-cream/20 rounded-[1.5rem] border border-zen-brown/15">
                 <div className={`w-3 h-3 rounded-full ${formData.isActive ? 'bg-zen-leaf shadow-[0_0_10px_rgba(107,138,122,0.5)]' : 'bg-zen-sand'}`}></div>
                 <div className="flex-1">
                    <p className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest">Enrollment Status</p>
                    <p className="text-sm font-serif text-zen-brown italic">{formData.isActive ? 'Currently available in the sanctuary menu' : 'Temporarily suspended from the offering'}</p>
                 </div>
                 <button 
                   type="button" 
                   onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                   className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${formData.isActive ? 'bg-zen-leaf text-white' : 'bg-zen-sand text-zen-brown/60'}`}
                 >
                    {formData.isActive ? 'Active' : 'Deactive'}
                 </button>
              </div>
           </div>

           <div className="px-10 py-8 border-t border-zen-brown/15 bg-zen-cream/5 flex gap-4">
              <ZenButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
                Discard
              </ZenButton>
              <ZenButton type="submit" className="flex-[2] py-5 shadow-2xl shadow-zen-brown/10">
                 <span>{editingCategory ? 'Update Category' : 'Establish Registry'}</span>
                 <Sparkles size={18} className="ml-2" />
              </ZenButton>
           </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Delete Category?"
        message="Are you sure you want to remove this category? All services tied to it will lose their category indexing."
      />
    </ZenPageLayout>
  );
};

export default ServiceCategories;
