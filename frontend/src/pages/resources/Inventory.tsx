import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
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
  X,
  MapPin,
  Grid,
  List
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useBranches } from '../../context/BranchContext';
import { useCategories } from '../../context/CategoryContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenPagination } from '../../components/zen/ZenPagination';
import { ZenStatCard } from '../../components/zen/ZenStatCard';
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
  const { branches, selectedBranch, setSelectedBranch } = useBranches();
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
      notify('error', 'Sync Failure', 'Failed to synchronize inventory records');
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
        notify('success', 'Item Removed', 'The item has been removed from inventory.');
        setIsConfirmOpen(false);
        fetchInventory();
      }
    } catch (error) {
      notify('error', 'Removal Error', 'Failed to delete inventory record.');
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
        notify('info', 'Stock Update', `Inventory adjusted by ${amount > 0 ? '+' : ''}${amount} units.`);
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
        notify('success', editingItem ? 'Inventory Updated' : 'Resource Recorded', editingItem ? 'Item details saved successfully.' : 'New item added to inventory.');
        setIsModalOpen(false);
        fetchInventory();
      }
    } catch (error) {
      notify('error', 'Processing Error', 'Failed to conclude the material registration.');
    }
  };

  return (
    <ZenPageLayout
      title="Inventory"
      hideSearch
      hideBranchSelector
      hideViewToggle
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    >
      <div className="space-y-10 pb-20">
        {/* Dynamic Summary Cards */}
        <div className="flex overflow-x-auto pt-4 pb-6 gap-6 lg:grid lg:grid-cols-4 lg:gap-8 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-2">
          {[
            { label: 'Inventory Volume', value: metrics.totalItems, trend: 'Items in workspace', icon: Boxes, color: 'text-blue-500', bg: 'bg-blue-500/10', glow: 'bg-blue-500/20' },
            { label: 'Critical Levels', value: metrics.lowStockCount, trend: 'Replenish required', icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10', glow: 'bg-rose-500/20' },
            { label: 'Flow Categories', value: metrics.categoryCount, trend: 'Resource types', icon: Truck, color: 'text-amber-500', bg: 'bg-amber-500/10', glow: 'bg-amber-500/20' },
            { label: 'Stock Health', value: metrics.lowStockCount === 0 ? 'Pure Harmony' : 'Replenish Required', trend: 'System status', icon: Sparkles, color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20' }
          ].map((stat, i) => (
            <ZenStatCard key={i} {...stat} delay={i * 0.2} />
          ))}
        </div>

        {/* Global Filter Bar */}
        <div className="bg-white/80 backdrop-blur-xl px-4 sm:px-6 py-4 sm:py-5 rounded-2xl border border-zen-brown/15 shadow-sm">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
            {/* Search */}
            <div className="relative group flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zen-brown/20 group-focus-within:text-zen-sand transition-colors" size={15} />
              <input 
                type="text"
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-zen-cream/30 border border-zen-brown/10 rounded-xl focus:bg-white focus:ring-4 focus:ring-zen-sand/5 focus:border-zen-sand/20 outline-none transition-all duration-500 text-sm font-medium shadow-sm"
              />
            </div>

            {/* Right Controls */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full lg:w-auto mt-4 lg:mt-0">

            {/* Branch Filter */}
            <div className="w-[170px] shrink-0">
              <ZenDropdown
                label=""
                options={['All Branches', ...branches.filter(b => b.isActive).map(b => b.name)]}
                value={branches.find(b => b._id === selectedBranch)?.name || 'All Branches'}
                onChange={(val) => {
                  if (val === 'All Branches') {
                    setSelectedBranch('all');
                  } else {
                    const branch = branches.find(b => b.name === val);
                    if (branch) setSelectedBranch(branch._id);
                  }
                }}
                icon={MapPin}
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-3">
               <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-2">Perspective</label>
               {/* View Mode Toggle */}
               <div className="flex items-center h-[48px] bg-zen-cream/50 p-1 rounded-xl border border-zen-brown/10 shadow-inner shrink-0">
                 <button 
                   onClick={() => setViewMode('grid')}
                   className={`h-full aspect-square flex items-center justify-center rounded-lg transition-all duration-500 ${viewMode === 'grid' ? 'bg-zen-brown text-white shadow-lg' : 'text-zen-brown/30 hover:text-zen-brown hover:bg-white'}`}
                 >
                   <Grid size={15} />
                 </button>
                 <button 
                   onClick={() => setViewMode('table')}
                   className={`h-full aspect-square flex items-center justify-center rounded-lg transition-all duration-500 ${viewMode === 'table' ? 'bg-zen-brown text-white shadow-lg' : 'text-zen-brown/30 hover:text-zen-brown hover:bg-white'}`}
                 >
                   <List size={15} />
                 </button>
               </div>
            </div>

            <div className="flex flex-col gap-3 w-full lg:w-auto">
               <label className="text-[9px] font-black text-zen-brown/30 uppercase tracking-[.3em] ml-2">Management</label>
               {/* Enroll Button */}
               <ZenButton onClick={() => handleOpenModal()} variant="primary" className="w-full sm:w-auto px-6 h-[48px] shadow-sm flex items-center justify-center gap-2 group">
                 <Plus size={15} className="group-hover:rotate-90 transition-transform duration-500" />
                 <span className="uppercase tracking-[0.2em] text-[10px] font-black whitespace-nowrap">Enroll Material</span>
               </ZenButton>
            </div>
            </div>
          </div>
        </div>

        {viewMode === 'grid' ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredInventory.map((item, i) => {
                const imgUrl = getImageUrl(item.image);
                const branchName = (item as any).branch?.name || 'Main Registry';

                return (
                  <div 
                    key={item._id} 
                    className="group relative bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-zen-brown/15 overflow-hidden flex flex-col transition-all duration-700 hover:shadow-xl hover:translate-y-[-4px]"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    {/* Visual Frame */}
                    <div className="aspect-[16/10] relative overflow-hidden bg-zen-cream/50">
                      {imgUrl ? (
                        <img 
                          src={imgUrl} 
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zen-brown/10">
                          <Package size={48} strokeWidth={0.5} />
                        </div>
                      )}

                      {/* Status Badges */}
                      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                        <div className={`px-3 py-1 rounded-full text-[8px] font-black tracking-widest border border-white/20 shadow-lg ${
                          item.status === 'Low Stock' ? 'bg-red-500 text-white' : 'bg-white/90 text-zen-brown'
                        }`}>
                          {item.status === 'Low Stock' ? 'CRITICAL' : 'STABLE'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 flex flex-col flex-1">
                      <div className="mb-4">
                         <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zen-brown/30">{item.category}</span>
                         <h3 className="text-xl font-serif font-black text-zen-brown leading-tight truncate-2-lines">{item.name}</h3>
                      </div>

                      <div className="mt-auto pt-4 flex flex-col gap-4">
                         <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                               <span className="text-[18px] font-serif font-black text-zen-brown leading-none">
                                  {item.stock} <span className="text-[10px] font-sans opacity-40 uppercase font-bold">{item.unit || 'Nos'}</span>
                               </span>
                               <span className="text-[8px] font-black text-zen-brown/30 uppercase tracking-widest mt-1">On Hand</span>
                            </div>
                            <ZenBadge variant="sand" className="text-[8px] font-bold uppercase py-1">{branchName}</ZenBadge>
                         </div>
                         
                         <div className="flex items-center justify-between gap-2 pt-4 border-t border-black/[0.03]">
                            <span className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-wider">{item.vendor || 'Inventory'}</span>
                            <div className="flex items-center gap-2">
                               <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(item)} />
                               <ZenIconButton icon={Trash2} variant="danger" onClick={() => { setItemToDelete(item._id); setIsConfirmOpen(true); }} />
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredInventory.length === 0 && (
                <div className="col-span-full py-40 text-center italic font-serif text-zen-brown/20 text-2xl">
                   No items found for the current filters.
                </div>
              )}
           </div>
        ) : (
           <div className="w-full bg-white rounded-xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden overflow-x-auto custom-scrollbar animate-in fade-in duration-700">
              <table className="w-full text-center border-collapse min-w-[1000px]">
                 <thead>
                    <tr className="bg-slate-50 border-y border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                       <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">S No</th>
                       <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Visual</th>
                       <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Material</th>
                       <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Sector</th>
                       <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Branch</th>
                       <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Stock Level</th>
                       <th className="px-6 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Actions</th>
                    </tr>
                 </thead>
                 <tbody>
                       {(!filteredInventory || filteredInventory.length === 0) && (
                          <tr>
                             <td colSpan={7} className="px-6 py-16 text-center text-[11px] font-sans text-gray-400 bg-gray-50/30">No items recorded yet</td>
                          </tr>
                       )}

                       {filteredInventory.map((item, index) => (
                          <tr key={item._id} className="transition-all group border-b border-black/[0.02]">
                             <td className="text-center italic opacity-40 text-[11px]">
                                {((page - 1) * PAGE_LIMIT + index + 1).toString().padStart(2, '0')}
                             </td>
                             <td>
                                <div className="flex justify-center">
                                   <div className="w-12 h-10 rounded-xl bg-zen-cream overflow-hidden border border-zen-brown/10 shadow-sm group-hover:scale-110 transition-transform duration-500 flex items-center justify-center shrink-0">
                                      {item.image ? (
                                      <img src={getImageUrl(item.image)} className="w-full h-full object-cover" />
                                      ) : (
                                      <Package size={16} className="text-zen-brown/20" />
                                      )}
                                   </div>
                                </div>
                             </td>
                             <td>
                                <div className="flex flex-col items-center px-6">
                                   <span className="zen-table-primary">{item.name}</span>
                                   <span className="zen-table-meta">{item.vendor || 'Inventory'}</span>
                                </div>
                             </td>
                             <td>
                                <div className="flex justify-center">
                                   <ZenBadge variant="sand" className="text-[8px] font-black uppercase tracking-widest py-1 scale-90">{item.category}</ZenBadge>
                                </div>
                             </td>
                             <td>
                                <div className="flex justify-center">
                                   <ZenBadge variant="sand" className="text-[8px] font-black uppercase tracking-widest py-1 scale-90">{(item as any).branch?.name || 'Main Registry'}</ZenBadge>
                                </div>
                             </td>
                             <td>
                                <div className="flex items-center justify-center gap-4">
                                   <div className="flex flex-col items-center">
                                      <span className={`text-base font-serif font-black leading-none ${item.stock <= item.lowStock ? 'text-red-500' : 'text-zen-brown'}`}>
                                         {item.stock} <span className="text-[10px] font-sans opacity-40 uppercase font-bold">{item.unit || 'Nos'}</span>
                                      </span>
                                      <span className="text-[8px] font-black opacity-30 uppercase tracking-widest mt-1">In Reserve</span>
                                   </div>
                                   {item.stock <= item.lowStock && (
                                      <div className="p-1.5 bg-red-50 text-red-500 rounded-lg animate-pulse border border-red-100 shadow-sm">
                                         <AlertTriangle size={12} />
                                      </div>
                                   )}
                                </div>
                             </td>
                             <td>
                                <div className="flex items-center justify-center gap-2">
                                   <ZenIconButton icon={Edit2} onClick={() => handleOpenModal(item)} />
                                   <ZenIconButton icon={Trash2} variant="danger" onClick={() => { setItemToDelete(item._id); setIsConfirmOpen(true); }} />
                                </div>
                             </td>
                          </tr>
                       ))}
                    </tbody>
              </table>
           </div>
        )}

        <div className="flex justify-center pt-8">
           <ZenPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>


      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingItem ? 'Edit Inventory Item' : 'New Inventory Item'}
        subtitle="Manage stock records"
        maxWidth="max-w-4xl"
        headerIcon={Sparkles}
        footer={
          <div className="flex gap-6">
            <ZenButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Cancel</ZenButton>
            <ZenButton 
              type="submit" 
              form="inventory-form"
              className="flex-[2] shadow-sm shadow-zen-brown/20 flex items-center justify-center gap-3"
            >
               <span>{editingItem ? 'Save Item' : 'Create Item'}</span>
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
                   label="Item Name"
                   required
                   placeholder="e.g. 24K Gold Facial Serum"
                   value={formData.name}
                   onChange={(e: any) => setFormData({...formData, name: e.target.value})}
                 />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-8">
              <ZenDropdown
                label="Category"
                value={formData.category}
                onChange={val => setFormData({...formData, category: val})}
                options={['None', ...inventoryCategories]}
              />
              <ZenInput
                type="number"
                label="Opening Stock"
                required
                value={formData.stock}
                onChange={(e: any) => setFormData({...formData, stock: parseInt(e.target.value)})}
              />
              <ZenDropdown
                label="Unit"
                value={formData.unit}
                onChange={val => setFormData({...formData, unit: val})}
                options={['Nos', 'kg', 'gm', 'L', 'ml', 'Pack', 'Bottle']}
              />
           </div>

           <div className="grid grid-cols-2 gap-8">
              <ZenInput
                type="number"
                label="Reorder Level"
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
                label="Supplier / Source"
                placeholder="Supplier name"
                value={formData.vendor}
                onChange={(e: any) => setFormData({...formData, vendor: e.target.value})}
              />
           </div>

           <div className="space-y-4 bg-zen-cream/10 p-6 rounded-3xl border border-zen-brown/15">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest ml-1">Visual Asset</label>
                  <h4 className="text-sm font-serif font-bold text-zen-brown mt-0.5">Item image</h4>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-zen-brown/15">
                  <Upload size={10} className="text-zen-brown/40" />
                  <span className="text-[9px] font-bold text-zen-brown/40 uppercase tracking-widest">{settings?.upload.provider === 'cloudinary' ? 'Cloud Storage' : 'Local Storage'}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <label htmlFor="inventory-image-footer" className="flex-1 h-12 bg-white border border-zen-brown/25 rounded-xl flex items-center justify-center gap-3 cursor-pointer hover:bg-zen-brown hover:text-white hover:border-zen-brown transition-all group/btn shadow-sm">
                   <Camera size={16} className="text-zen-brown/30 group-hover/btn:text-white transition-colors" />
                   <span className="text-[10px] font-bold uppercase tracking-widest">Replace Image</span>
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
        title="Delete item?"
        message="Are you sure you want to remove this item from inventory?"
      />
    </ZenPageLayout>
  );
};

export default Inventory;
