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
  Box,
  Truck,
  Zap,
  Sparkles,
  ChevronRight,
  Camera,
  Upload,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useBranches } from '../../context/BranchContext';
import { useCategories } from '../../context/CategoryContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { ZenBadge, ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { ZenInput, ZenDropdown } from '../../components/zen/ZenInputs';
import { Modal } from '../../components/shared/Modal';
import { notify } from '../../components/shared/ZenNotification';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';

interface InventoryItem {
  _id: string;
  name: string;
  category: string;
  stock: number;
  lowStock: number;
  vendor: string;
  unit: string;
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
  const [metrics, setMetrics] = useState({
    totalItems: 0,
    lowStockCount: 0,
    categoryCount: 0
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
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
    unit: 'Nos',
    image: '',
    branch: ''
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchInventory();
    }, 300);
    return () => clearTimeout(handler);
  }, [page, searchTerm, selectedBranch, selectedCategory]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedBranch, selectedCategory]);

  useEffect(() => {
    localStorage.setItem('zen_inventory_view', viewMode);
    setPage(1);
  }, [viewMode]);

  const PAGE_LIMIT = 12;

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: PAGE_LIMIT.toString(),
        search: searchTerm,
        branch: selectedBranch,
        category: selectedCategory !== 'All' ? selectedCategory : ''
      });

      const response = await fetch(`${API_URL}/inventory?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      
      if (data.data) {
        setInventory(data.data);
        setTotalPages(data.pagination.pages);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
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

  // Removed filteredInventory useMemo as filtering is now server-side
  const filteredInventory = inventory;

  const lowStockCount = metrics.lowStockCount;

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
        unit: item.unit || 'Nos',
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
        unit: 'Nos',
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
      data.append('unit', formData.unit);
      
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
      headerActions={
        <div className="shrink-0 min-w-[200px]">
           <ZenDropdown
             label="Sector Filter"
             options={[
               { value: 'All', label: 'All Sectors' },
               ...inventoryCategories.map((c: string) => ({ value: c, label: c }))
             ]}
             value={selectedCategory}
             onChange={setSelectedCategory}
             icon={Boxes}
           />
        </div>
      }
    >

      <div className="flex overflow-x-auto lg:grid lg:grid-cols-4 gap-4 sm:gap-8 mb-8 sm:mb-12 pb-4 group/metrics custom-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="min-w-[280px] lg:min-w-0 flex-1 bg-white/80 backdrop-blur-xl p-8 rounded-[3.5rem] border border-white shadow-sm group transition-all duration-700 hover:-translate-y-2">
           <div className="flex justify-between items-start mb-6">
              <div className="p-4 sm:p-5 bg-zen-cream/50 text-zen-brown rounded-2xl sm:rounded-[1.5rem] group-hover:scale-110 transition-transform duration-500">
                 <Boxes size={24} className="sm:w-7 sm:h-7" />
              </div>
           </div>
           <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[.4em]">Resource Volume</p>
           <h3 className="text-3xl font-serif font-bold text-zen-brown mt-2">{metrics.totalItems} <span className="text-lg font-sans opacity-20">Items</span></h3>
        </div>

        <div className="min-w-[280px] lg:min-w-0 flex-1 bg-white/80 backdrop-blur-xl p-8 rounded-[3.5rem] border border-white shadow-sm group transition-all duration-700 hover:-translate-y-2">
           <div className="flex justify-between items-start mb-6">
              <div className="p-4 sm:p-5 bg-orange-50 text-orange-600 rounded-2xl sm:rounded-[1.5rem] group-hover:scale-110 transition-transform duration-500">
                 <AlertTriangle size={24} className="sm:w-7 sm:h-7" />
              </div>
           </div>
           <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[.4em]">Critical Levels</p>
           <h3 className="text-3xl font-serif font-bold text-orange-600 mt-2">{metrics.lowStockCount} <span className="text-lg font-sans opacity-40">Alerts</span></h3>
        </div>

        <div className="min-w-[280px] lg:min-w-0 flex-1 bg-white/80 backdrop-blur-xl p-8 rounded-[3.5rem] border border-white shadow-sm group transition-all duration-700 hover:-translate-y-2">
           <div className="flex justify-between items-start mb-6">
              <div className="p-4 sm:p-5 bg-zen-leaf/10 text-zen-leaf rounded-2xl sm:rounded-[1.5rem] group-hover:scale-110 transition-transform duration-500">
                 <Truck size={24} className="sm:w-7 sm:h-7" />
              </div>
           </div>
           <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[.4em]">Flow Categories</p>
           <h3 className="text-3xl font-serif font-bold text-zen-brown mt-2">{metrics.categoryCount} <span className="text-lg font-sans opacity-20">Sectors</span></h3>
        </div>

        <div className="min-w-[280px] lg:min-w-0 flex-1 bg-zen-brown p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-sm border border-white relative overflow-hidden group transition-all duration-700 hover:-translate-y-2">
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
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10">
            {filteredInventory.map((item, i) => {
              const imgUrl = getImageUrl(item.image);
              const branchName = (item as any).branch?.name || 'Main Sanctuary';

              return (
                <div 
                  key={item._id} 
                  className="group relative bg-white/80 backdrop-blur-xl rounded-[2.5rem] sm:rounded-[4rem] shadow-sm border border-white overflow-hidden flex flex-col transition-all duration-700 hover:shadow-zen-brown/15 hover:-translate-y-2 animate-in fade-in slide-in-from-bottom-8"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {/* Visual Frame */}
                  <div className="aspect-[16/9] sm:aspect-[4/3] relative overflow-hidden bg-white">
                    {imgUrl ? (
                      <img 
                        src={imgUrl} 
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale-[0.2] group-hover:grayscale-0"
                      />
                    ) : (
                      <div className="w-full h-full bg-zen-cream flex items-center justify-center text-zen-brown/10">
                        <Package size={48} strokeWidth={0.5} />
                      </div>
                    )}

                    {/* Dynamic Badges */}
                    <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex flex-col items-end gap-2">
                      <div className={`px-3 py-1 sm:px-5 sm:py-2 backdrop-blur-3xl rounded-full text-[9px] sm:text-[10px] font-bold tracking-widest flex items-center gap-2 shadow-lg border border-white/20 ${
                        item.status === 'Low Stock' ? 'bg-red-400 text-white' : 'bg-white/80 text-zen-brown'
                      }`}>
                        {item.status === 'Low Stock' ? <AlertTriangle size={10} className="sm:w-3 sm:h-3" /> : <Box size={10} className="sm:w-3 sm:h-3" />}
                        {item.status === 'Low Stock' ? 'CRITICAL' : 'STABLE'}
                      </div>
                      <div className="px-3 py-1 sm:px-5 sm:py-2 backdrop-blur-3xl bg-zen-brown/90 rounded-full text-[9px] sm:text-[10px] font-bold tracking-widest text-white flex items-center gap-1.5 shadow-lg">
                        <span className="text-white/40">AVAILABLE</span>
                        {item.stock} {item.unit || 'Nos'}
                      </div>
                    </div>

                    {/* Branch Label */}
                    <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 flex flex-col gap-2">
                      <span className="px-3 py-1 sm:px-4 sm:py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[8px] sm:text-[9px] font-bold tracking-widest text-white uppercase border border-white/40 shadow-sm">
                         {branchName}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-6 sm:p-8 flex flex-col flex-1 gap-4 sm:gap-6">
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex items-center gap-2 text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.3em] text-zen-brown/40">
                        <Zap size={10} />
                        {item.category} Registry
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-serif font-bold text-zen-brown leading-tight truncate-2-lines">{item.name}</h3>
                    </div>

                    <div className="bg-zen-cream/5 rounded-3xl p-4 sm:p-6 border border-zen-brown/5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest">Resonance Stability</span>
                          <span className="text-[10px] font-serif italic text-zen-brown/60">Material levels monitored</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-4 sm:pt-6 flex items-center justify-between border-t border-zen-brown/5">
                      <div>
                        <p className="text-[9px] font-bold text-zen-brown/20 uppercase tracking-widest mb-0.5">Primary Source</p>
                        <p className="text-[10px] font-bold text-zen-brown/60 uppercase">{item.vendor || 'Aris Sanctuary'}</p>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3">
                        <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(item)} size="sm" title="Refine Material" />
                        <ZenIconButton icon={Trash2} variant="danger" onClick={() => { setItemToDelete(item._id); setIsConfirmOpen(true); }} size="sm" title="Deplete" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredInventory.length === 0 && (
               <div className="col-span-full py-40 text-center opacity-20 italic font-serif text-2xl">
                  No materials found in the current sequence.
               </div>
            )}
         </div>
      ) : (
         <div className="bg-white/70 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[3.5rem] shadow-2xl shadow-zen-brown/15 border border-white overflow-hidden overflow-x-auto custom-scrollbar animate-in fade-in duration-700">
            <table className="w-full text-center border-collapse min-w-[1000px]">
               <thead>
                  <tr className="bg-zen-brown border-b border-zen-brown/15">
                     <th className="px-10">S No</th>
                     <th className="px-10">Image</th>
                     <th className="text-left">Item Name</th>
                     <th>Category</th>
                     <th>Branch</th>
                     <th>Stock</th>
                     <th className="text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-zen-brown/15">
                     {filteredInventory.map((item, index) => (
                        <tr key={item._id} className="group transition-all duration-500">
                           <td className="text-center italic opacity-40">
                              {((page - 1) * PAGE_LIMIT + index + 1).toString().padStart(2, '0')}
                           </td>
                           <td>
                              <div className="flex justify-center">
                                 <div className="w-14 h-10 rounded-2xl bg-zen-cream overflow-hidden border-2 border-white shadow-sm group-hover:scale-110 transition-transform duration-500 flex items-center justify-center">
                                    {item.image ? (
                                    <img src={getImageUrl(item.image)} className="w-full h-full object-cover" />
                                    ) : (
                                    <Package size={16} className="text-zen-brown/20" />
                                    )}
                                 </div>
                              </div>
                           </td>
                           <td>
                              <div className="flex flex-col items-start text-left">
                                 <span className="zen-table-primary">{item.name}</span>
                                 <span className="zen-table-meta">{item.vendor || 'N/A'}</span>
                              </div>
                           </td>
                           <td className="px-8 py-5 text-center">
                              <ZenBadge variant="sand" className="px-4 py-1">{item.category}</ZenBadge>
                           </td>
                           <td className="px-8 py-5 text-center">
                              <ZenBadge variant="sand" className="px-4 py-1 font-bold">{(item as any).branch?.name || 'Main Registry'}</ZenBadge>
                           </td>
                           <td className="px-8 py-5 text-center">
                              <div className="flex items-center justify-center gap-4">
                                 <div className="flex flex-col items-center">
                                    <span className={`text-xl font-serif font-black leading-none ${item.stock <= item.lowStock ? 'text-red-500' : 'text-zen-brown'}`}>{item.stock} <span className="text-[10px] font-sans opacity-40 ml-0.5">{item.unit || 'Nos'}</span></span>
                                    <span className="text-[8px] font-black opacity-30 uppercase tracking-widest mt-1">Available</span>
                                 </div>
                                 {item.stock <= item.lowStock && (
                                    <div className="p-2 bg-red-50 text-red-500 rounded-lg animate-pulse border border-red-100 shadow-sm">
                                       <AlertTriangle size={14} />
                                    </div>
                                 )}
                              </div>
                           </td>
                           <td className="px-8 py-5 text-right">
                              <div className="flex items-center justify-end gap-2.5">
                                 <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(item)} size="sm" />
                                 <ZenIconButton icon={Trash2} variant="danger" onClick={() => { setItemToDelete(item._id); setIsConfirmOpen(true); }} size="sm" />
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
               <div className="flex justify-center p-4">
                 <ZenPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
               </div>
         </div>
      )}


      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingItem ? 'Refine Material' : 'Enroll Material'}
        subtitle="Material Sanctuary Record"
        maxWidth="max-w-4xl"
        headerIcon={Sparkles}
        footer={
          <div className="flex gap-6">
            <ZenButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Discard</ZenButton>
            <ZenButton 
              type="submit" 
              form="inventory-form"
              className="flex-[2] shadow-sm shadow-zen-brown/20 flex items-center justify-center gap-3"
            >
               <span>{editingItem ? 'Archive Refinement' : 'Commit Resource'}</span>
               <Sparkles size={18} />
            </ZenButton>
          </div>
        }
      >
        <form id="inventory-form" onSubmit={handleSubmit} className="space-y-8">
           <div className="flex items-center gap-8 mb-4">
              <div className="relative w-24 h-24 rounded-3xl overflow-hidden bg-zen-cream flex items-center justify-center group shadow-sm border border-white transition-all duration-700 hover:scale-105">
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
              <ZenDropdown
                label="Unit Descriptor"
                value={formData.unit}
                onChange={val => setFormData({...formData, unit: val})}
                options={['Nos', 'kg', 'gm', 'L', 'ml', 'Pack', 'Bottle']}
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
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{settings?.upload.provider === 'cloudinary' ? 'Aether Sync' : 'Local Disk'}</span>
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
