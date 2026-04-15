import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Edit2, 
  Trash2,
  Boxes,
  Truck,
  Zap,
  Sparkles,
  ChevronRight,
  Camera,
  Upload
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useBranches } from '../context/BranchContext';
import { useCategories } from '../context/CategoryContext';
import { ZenPageLayout } from '../components/zen/ZenLayout';
import { ZenPagination } from '../components/zen/ZenPagination';
import { ZenBadge, ZenButton, ZenIconButton } from '../components/zen/ZenButtons';
import { ZenInput, ZenDropdown } from '../components/zen/ZenInputs';
import { Modal } from '../components/Modal';
import { notify } from '../components/ZenNotification';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface InventoryItem {
  _id: string;
  name: string;
  category: string;
  stock: number;
  lowStock: number;
  vendor: string;
  image?: string;
}

const Inventory = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { branches, selectedBranch } = useBranches();
  const { getInventoryCategories } = useCategories();
  const inventoryCategories = getInventoryCategories();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('zen_inventory_view') as 'grid' | 'table') || 'table';
  });

  const [formData, setFormData] = useState({
    name: '',
    category: 'None',
    stock: 0,
    lowStock: 5,
    vendor: '',
    image: '',
    branch: ''
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100/api';

  useEffect(() => {
    fetchInventory();
  }, [page]);

  useEffect(() => {
    localStorage.setItem('zen_inventory_view', viewMode);
  }, [viewMode]);

  const fetchInventory = async () => {
    try {
      const response = await fetch(`${API_URL}/inventory?page=${page}&limit=10`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      if (data.data) {
        setInventory(data.data);
        setTotalPages(data.pagination.pages);
      } else if (Array.isArray(data)) {
        setInventory(data);
        setTotalPages(1);
      }
    } catch (error) {
      notify('error', 'Sync Failure', 'Failed to synchronize material sanctuary records');
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = useMemo(() => {
    let filtered = inventory;
    
    // Filter by Branch
    if (selectedBranch !== 'all') {
      filtered = filtered.filter(item => (item as any).branch === selectedBranch || (item as any).branch?._id === selectedBranch);
    }

    // Filter by Search Term
    return filtered.filter(item => 
      (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventory, searchTerm, selectedBranch]);

  const lowStockCount = useMemo(() => 
    filteredInventory.filter(item => item.stock <= item.lowStock).length
  , [filteredInventory]);

  const getImageUrl = (path: string | undefined) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.replace(/^\.?\//, '');
    return `${API_URL.replace('/api', '')}/${cleanPath}`;
  };

  const handleOpenModal = (item: InventoryItem | null = null) => {
    setImageFile(null);
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        stock: item.stock,
        lowStock: item.lowStock,
        vendor: item.vendor,
        image: item.image || '',
        branch: (item as any).branch?._id || (item as any).branch || ''
      });
    } else {
      setEditingItem(null);
      setFormData({ 
        name: '', 
        category: 'None', 
        stock: 0, 
        lowStock: 5, 
        vendor: '', 
        image: '',
        branch: selectedBranch !== 'all' ? selectedBranch : (branches[0]?._id || '')
      });
    }
    setIsModalOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
      const response = await fetch(`${API_URL}/inventory/${itemToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });

      if (response.ok) {
        notify('success', 'Resource Purged', 'The item has been removed from the material sanctuary.');
        setIsConfirmOpen(false);
        fetchInventory();
      }
    } catch (error) {
      notify('error', 'Removal Error', 'Failed to purge material record.');
    }
  };

  const handleAdjustStock = async (id: string, amount: number) => {
    const item = inventory.find(i => i._id === id);
    if (!item) return;

    try {
      const response = await fetch(`${API_URL}/inventory/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ stock: item.stock + amount })
      });

      if (response.ok) {
        notify('info', 'Stock Resonance', `Inventory adjusted by ${amount > 0 ? '+' : ''}${amount} units.`);
        fetchInventory();
      }
    } catch (error) {
      notify('error', 'Adjustment Error', 'Failed to synchronize stock levels.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingItem ? `${API_URL}/inventory/${editingItem._id}` : `${API_URL}/inventory`;
    const method = editingItem ? 'PUT' : 'POST';

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('category', formData.category);
      data.append('stock', (formData.stock ?? 0).toString());
      data.append('lowStock', (formData.lowStock ?? 0).toString());
      data.append('vendor', formData.vendor);
      data.append('branch', formData.branch);
      
      if (imageFile) {
        data.append('inventoryImage', imageFile);
      }

      const response = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${user?.token}`
        },
        body: data
      });

      if (response.ok) {
        notify('success', editingItem ? 'Record Refined' : 'Resource Recorded', editingItem ? 'Material details archived successfully.' : 'New material joined the sanctuary.');
        setIsModalOpen(false);
        fetchInventory();
      }
    } catch (error) {
      notify('error', 'Processing Error', 'Failed to conclude the material registration.');
    }
  };

  return (
    <ZenPageLayout
      title="Material Sanctuary"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      addButtonLabel="Enroll Material"
      onAddClick={() => handleOpenModal()}
      addButtonIcon={<Plus size={18} />}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[3.5rem] border border-white shadow-2xl shadow-zen-brown/15 group transition-all duration-700 hover:-translate-y-2">
           <div className="flex justify-between items-start mb-6">
              <div className="p-5 bg-zen-cream/50 text-zen-brown rounded-[1.5rem] group-hover:scale-110 transition-transform duration-500">
                 <Boxes size={28} />
              </div>
           </div>
           <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[.4em]">Resource Volume</p>
           <h3 className="text-3xl font-serif font-bold text-zen-brown mt-2">{inventory.length} <span className="text-lg font-sans opacity-20">Items</span></h3>
        </div>

        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[3.5rem] border border-white shadow-2xl shadow-zen-brown/15 group transition-all duration-700 hover:-translate-y-2">
           <div className="flex justify-between items-start mb-6">
              <div className="p-5 bg-orange-50 text-orange-600 rounded-[1.5rem] group-hover:scale-110 transition-transform duration-500">
                 <AlertTriangle size={28} />
              </div>
           </div>
           <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[.4em]">Critical Levels</p>
           <h3 className="text-3xl font-serif font-bold text-orange-600 mt-2">{lowStockCount} <span className="text-lg font-sans opacity-40">Alerts</span></h3>
        </div>

        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[3.5rem] border border-white shadow-2xl shadow-zen-brown/15 group transition-all duration-700 hover:-translate-y-2">
           <div className="flex justify-between items-start mb-6">
              <div className="p-5 bg-zen-leaf/10 text-zen-leaf rounded-[1.5rem] group-hover:scale-110 transition-transform duration-500">
                 <Truck size={28} />
              </div>
           </div>
           <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[.4em]">Flow Categories</p>
           <h3 className="text-3xl font-serif font-bold text-zen-brown mt-2">{new Set(inventory.map(i => i.category)).size} <span className="text-lg font-sans opacity-20">Sectors</span></h3>
        </div>

        <div className="bg-zen-brown p-10 rounded-[3.5rem] shadow-2xl shadow-zen-brown/20 relative overflow-hidden group transition-all duration-700 hover:-translate-y-2">
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-1000">
              <Sparkles size={120} />
           </div>
           <div className="relative z-10">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.4em] mb-4">Sanctuary Health</p>
              <h4 className="text-xl font-serif font-bold text-white mb-2">
                {lowStockCount === 0 ? 'Pure Harmony' : 'Urgent Replenish'}
              </h4>
              <p className="text-xs text-white/50 leading-relaxed font-medium capitalize prose">
                {lowStockCount === 0 
                  ? 'The material resonance is stable across all sectors.' 
                  : `Attention required for ${lowStockCount} critical materials.`}
              </p>
           </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {filteredInventory.map((item) => (
               <div key={item._id} className="group relative bg-white/90 backdrop-blur-2xl rounded-[4rem] p-10 border border-white shadow-2xl shadow-zen-brown/15 flex flex-col transition-all duration-700 hover:shadow-zen-brown/15 hover:-translate-y-3">
                  {/* Background Glow */}
                  <div className={`absolute -right-10 -bottom-10 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 ${
                     item.stock <= item.lowStock ? 'bg-red-500/10' : 'bg-zen-sand/10'
                  }`} />

                  <div className="relative mb-8 h-48 rounded-[2.5rem] overflow-hidden bg-zen-cream flex items-center justify-center border-4 border-white shadow-xl group-hover:scale-105 transition-transform duration-700">
                     {item.image ? (
                        <img src={getImageUrl(item.image)} className="w-full h-full object-cover" />
                     ) : (
                        <Package size={48} className="text-zen-brown/10" />
                     )}
                     <div className="absolute top-4 right-4">
                        <ZenBadge variant={item.stock <= item.lowStock ? 'danger' : 'sand'}>
                           {item.stock <= item.lowStock ? 'Critical' : 'Stable'}
                        </ZenBadge>
                     </div>
                  </div>

                  <div className="flex-1 space-y-4">
                     <div>
                        <h4 className="text-2xl font-serif font-black text-zen-brown tracking-tight group-hover:text-zen-sand transition-colors duration-500">{item.name}</h4>
                        <p className="text-[10px] font-black text-zen-brown/30 uppercase tracking-[0.3em] mt-1">{item.category} Registry</p>
                     </div>

                     <div className="flex items-center justify-between bg-zen-cream/10 p-5 rounded-[2rem] border border-zen-brown/15">
                        <div className="flex flex-col">
                           <span className="text-[9px] font-black text-zen-brown/20 uppercase tracking-widest">Available</span>
                           <span className={`text-2xl font-serif font-black ${item.stock <= item.lowStock ? 'text-red-500' : 'text-zen-brown'}`}>{item.stock}</span>
                        </div>
                        <div className="flex gap-2">
                           <ZenIconButton icon={ArrowUpRight} onClick={() => handleAdjustStock(item._id, 1)} />
                           <ZenIconButton icon={ArrowDownRight} onClick={() => handleAdjustStock(item._id, -1)} />
                        </div>
                     </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-zen-brown/15 flex items-center justify-between">
                     <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-black text-zen-brown/20 uppercase tracking-widest leading-none">Vendor</span>
                        <span className="text-xs font-black text-zen-brown/60 uppercase">{item.vendor || 'Private Label'}</span>
                     </div>
                     <div className="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-500">
                        <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(item)} />
                        <ZenIconButton icon={Trash2} variant="danger" onClick={() => { setItemToDelete(item._id); setIsConfirmOpen(true); }} />
                     </div>
                  </div>
               </div>
            ))}
            {filteredInventory.length === 0 && (
               <div className="col-span-full py-40 text-center opacity-20 italic font-serif text-2xl">
                  No materials found in the current sequence.
               </div>
            )}
         </div>
      ) : (
         <div className="bg-white/70 backdrop-blur-xl rounded-[4rem] border border-white overflow-hidden shadow-2xl shadow-zen-brown/15 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="overflow-x-auto custom-scrollbar">
               <table className="w-full text-center border-collapse min-w-[1000px]">
                  <thead>
                     <tr className="bg-zen-cream/10 border-b border-zen-brown/15">
                        <th className="px-10 py-8 text-[10px] font-black text-zen-brown/40 uppercase tracking-[0.3em]">Identity</th>
                        <th className="px-10 py-8 text-[10px] font-black text-zen-brown/40 uppercase tracking-[0.3em]">Visual</th>
                        <th className="px-10 py-8 text-[10px] font-black text-zen-brown/40 uppercase tracking-[0.3em]">Resonance Name</th>
                        <th className="px-10 py-8 text-[10px] font-black text-zen-brown/40 uppercase tracking-[0.3em]">Sector</th>
                        <th className="px-10 py-8 text-[10px] font-black text-zen-brown/40 uppercase tracking-[0.3em]">Stock Level</th>
                        <th className="px-10 py-8 text-[10px] font-black text-zen-brown/40 uppercase tracking-[0.3em] text-right">Sanctuary Controls</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-zen-brown/15">
                     {filteredInventory.map((item, index) => (
                        <tr key={item._id} className="group hover:bg-zen-cream/5 transition-all duration-500">
                           <td className="px-10 py-8">
                              <span className="font-serif text-xl text-zen-brown/40">{(index + 1).toString().padStart(2, '0')}</span>
                           </td>
                           <td className="px-10 py-8">
                              <div className="flex justify-center">
                                 <div className="w-16 h-12 rounded-2xl bg-zen-cream overflow-hidden border-2 border-white shadow-xl group-hover:scale-110 transition-transform duration-500 flex items-center justify-center">
                                    {item.image ? (
                                    <img src={getImageUrl(item.image)} className="w-full h-full object-cover" />
                                    ) : (
                                    <Package size={18} className="text-zen-brown/20" />
                                    )}
                                 </div>
                              </div>
                           </td>
                           <td className="px-10 py-8">
                              <div className="flex flex-col items-center">
                                 <p className="font-serif text-xl text-zen-brown font-black tracking-tight">{item.name}</p>
                                 <p className="text-[9px] font-black text-zen-brown/20 uppercase tracking-widest mt-1">{item.vendor || 'N/A'}</p>
                              </div>
                           </td>
                           <td className="px-10 py-8">
                              <ZenBadge variant="sand" className="px-5 py-1.5">{item.category}</ZenBadge>
                           </td>
                           <td className="px-10 py-8">
                              <div className="flex items-center justify-center gap-6">
                                 <div className="flex flex-col items-center">
                                    <span className={`text-2xl font-serif font-black ${item.stock <= item.lowStock ? 'text-red-500' : 'text-zen-brown'}`}>{item.stock}</span>
                                    <span className="text-[9px] font-black opacity-30 uppercase tracking-widest mt-1">Available</span>
                                 </div>
                                 {item.stock <= item.lowStock && (
                                    <div className="p-3 bg-red-50 text-red-500 rounded-xl animate-pulse border border-red-100 shadow-sm">
                                       <AlertTriangle size={18} />
                                    </div>
                                 )}
                              </div>
                           </td>
                           <td className="px-10 py-8 text-right">
                              <div className="flex items-center justify-end gap-3">
                                 <ZenIconButton icon={ArrowUpRight} variant="cream" onClick={() => handleAdjustStock(item._id, 1)} />
                                 <ZenIconButton icon={ArrowDownRight} variant="outline" onClick={() => handleAdjustStock(item._id, -1)} />
                                 <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(item)} />
                                 <ZenIconButton icon={Trash2} variant="danger" onClick={() => { setItemToDelete(item._id); setIsConfirmOpen(true); }} />
                              </div>
                           </td>
                        </tr>
                     ))}
                     {filteredInventory.length === 0 && (
                        <tr>
                           <td colSpan={6} className="py-40 text-center text-zen-brown/20 italic font-serif text-2xl border-none">
                              No materials found in the current resonance.
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      )}

      <ZenPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingItem ? 'Refine Material' : 'Enroll Material'}
      >
        <form onSubmit={handleSubmit} className="px-10 py-12 space-y-8">
           <div className="flex items-center gap-8 mb-4">
              <div className="relative w-24 h-24 rounded-3xl overflow-hidden bg-zen-cream flex items-center justify-center group shadow-xl border-4 border-white transition-all duration-700 hover:scale-105">
                {(imageFile || formData.image) ? (
                  <img src={imageFile ? URL.createObjectURL(imageFile) : getImageUrl(formData.image)} className="w-full h-full object-cover" />
                ) : (
                  <Package className="text-zen-brown/10" size={32} />
                )}
                <label htmlFor="inventory-image-upload" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer backdrop-blur-[2px]">
                   <Camera className="text-white" size={24} />
                </label>
                <input type="file" id="inventory-image-upload" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
              </div>
              <div className="flex-1">
                 <ZenInput
                   label="Material Identity"
                   required
                   placeholder="e.g. Essential Healing Essence"
                   value={formData.name}
                   onChange={(e: any) => setFormData({...formData, name: e.target.value})}
                 />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-8">
              <ZenDropdown
                label="Tactical Sector"
                value={formData.category}
                onChange={val => setFormData({...formData, category: val})}
                options={['None', ...inventoryCategories]}
              />
              <ZenInput
                type="number"
                label="Exchange Base"
                required
                value={formData.stock}
                onChange={(e: any) => setFormData({...formData, stock: parseInt(e.target.value)})}
              />
           </div>

           <div className="grid grid-cols-2 gap-8">
              <ZenInput
                type="number"
                label="Critical Threshold"
                required
                value={formData.lowStock}
                onChange={(e: any) => setFormData({...formData, lowStock: parseInt(e.target.value)})}
              />
              <ZenDropdown
                label="Assigned Branch"
                value={branches.find(b => b._id === formData.branch)?.name || 'Select Branch'}
                onChange={val => {
                  const b = branches.filter(b => b.isActive).find(branch => branch.name === val);
                  if (b) setFormData({...formData, branch: b._id});
                }}
                options={branches.filter(b => b.isActive).map(b => b.name)}
              />
           </div>
           <div className="grid grid-cols-1 gap-8">
              <ZenInput
                label="Resource Source (Branch)"
                placeholder="Vendor Identity"
                value={formData.vendor}
                onChange={(e: any) => setFormData({...formData, vendor: e.target.value})}
              />
           </div>

           <div className="space-y-4 bg-zen-cream/10 p-6 rounded-3xl border border-zen-brown/15">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest ml-1">Asset Management</label>
                  <h4 className="text-sm font-serif font-bold text-zen-brown mt-0.5">Physical Representation</h4>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-zen-brown/15">
                  <Upload size={10} className="text-zen-brown/40" />
                  <span className="text-[9px] font-bold text-zen-brown/40 uppercase tracking-widest">{settings?.upload.provider === 'cloudinary' ? 'Aether Sync' : 'Local Disk'}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <label htmlFor="inventory-image-footer" className="flex-1 h-12 bg-white border border-zen-brown/25 rounded-xl flex items-center justify-center gap-3 cursor-pointer hover:bg-zen-brown hover:text-white hover:border-zen-brown transition-all group/btn shadow-sm">
                   <Camera size={16} className="text-zen-brown/30 group-hover/btn:text-white transition-colors" />
                   <span className="text-[10px] font-bold uppercase tracking-widest">Update Visual</span>
                </label>
                <input type="file" id="inventory-image-footer" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                
                {imageFile && (
                  <div className="flex items-center gap-2 text-zen-leaf">
                    <Sparkles size={12} />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Ready</span>
                  </div>
                )}
              </div>
            </div>

           <div className="pt-4">
              <ZenButton type="submit" className="w-full py-5 rounded-[2rem] shadow-2xl shadow-zen-brown/20 flex items-center justify-center gap-3">
                 <span>{editingItem ? 'Archive Refinement' : 'Commit Resource'}</span>
                 <Sparkles size={18} />
              </ZenButton>
           </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Purge Resource?"
        message="Are you certain you wish to remove this material from the sanctuary's reserves?"
      />
    </ZenPageLayout>
  );
};

export default Inventory;
