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
import { ZenInput, ZenDropdown, ZenMultiSelect } from '../../components/zen/ZenInputs';
import { Modal } from '../../components/shared/Modal';
import { ExportPopup, ExportColumn } from '../../components/shared/ExportPopup';
import { notify } from '../../components/shared/ZenNotification';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { getPollIntervalMs, shouldPollNow } from '../../utils/polling';
import { getCachedJson, setCachedJson } from '../../utils/localCache';
import { getImageUrl } from '../../utils/imageUrl';

interface InventoryItem {
  _id: string;
  name: string;
  sectorCategory: string;
  stock: number;
  lowStock: number;
  vendor: string;
  unit: string;
  image?: string;
  branch?: {
    _id: string;
    name: string;
  } | string;
}

const Inventory = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { branches, selectedBranch, setSelectedBranch } = useBranches();
  const { getSectorCategories } = useCategories();
  const inventoryCategories = getSectorCategories();

  const [inventory, setInventory] = useState<InventoryItem[]>(() => getCachedJson('zen_page_inventory_list', []));
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [metrics, setMetrics] = useState(() => getCachedJson('zen_page_inventory_metrics', {
    totalItems: 0,
    lowStockCount: 0,
    categoryCount: 0
  }));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(() => getCachedJson<InventoryItem[]>('zen_page_inventory_list', []).length === 0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('zen_inventory_view') as 'grid' | 'table') || 'table';
  });

  const [formData, setFormData] = useState({
    name: '',
    sectorCategory: 'None',
    stock: 0,
    lowStock: 5,
    vendor: '',
    unit: 'Nos',
    image: '',
    branch: '',
    branches: [] as string[]
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    fetchInventory();

    const interval = setInterval(() => {
      if (!shouldPollNow()) return;
      fetchInventory(true);
    }, getPollIntervalMs(30000)); // default 30s

    return () => clearInterval(interval);
  }, [page, debouncedSearch, selectedBranch, selectedCategory, user?.token]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedBranch, selectedCategory]);

  useEffect(() => {
    localStorage.setItem('zen_inventory_view', viewMode);
    setPage(1);
  }, [viewMode]);

  const PAGE_LIMIT = 12;

  const inventoryExportColumns = useMemo<ExportColumn<InventoryItem>[]>(() => [
    { header: 'Material Name', accessor: 'name' },
    { header: 'Sector', accessor: 'sectorCategory' },
    { header: 'Current Stock', accessor: (item) => `${item.stock} ${item.unit || 'Nos'}` },
    { header: 'Minimum Level', accessor: (item) => `${item.lowStock} ${item.unit || 'Nos'}` },
    { header: 'Supplier', accessor: (item) => item.vendor || 'N/A' },
    { header: 'Branch Location', accessor: (item: any) => item.branch?.name || 'Main Registry' },
    { header: 'Inventory Status', accessor: (item) => item.stock <= item.lowStock ? 'REPLENISH' : 'STABLE' }
  ], []);

  const fetchAllInventoryForExport = async () => {
    try {
      const queryParams = new URLSearchParams({
        limit: '1000',
        search: debouncedSearch,
        branch: selectedBranch,
        sectorCategory: selectedCategory !== 'All' ? selectedCategory : ''
      });

      const response = await fetch(`${API_URL}/inventory?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      return data.data || (Array.isArray(data) ? data : []);
    } catch (error) {
      notify('error', 'Export Error', 'Could not retrieve full inventory list for export');
      return [];
    }
  };

  const fetchInventory = async (silent: boolean = false) => {
    try {
      if (!silent && inventory.length === 0) setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: PAGE_LIMIT.toString(),
        search: debouncedSearch,
        branch: selectedBranch,
        sectorCategory: selectedCategory !== 'All' ? selectedCategory : ''
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
       if (!silent) notify('error', 'Sync Failure', 'Failed to synchronize inventory records');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => setCachedJson('zen_page_inventory_list', inventory), [inventory]);
  useEffect(() => setCachedJson('zen_page_inventory_metrics', metrics), [metrics]);

  // Removed filteredInventory useMemo as filtering is now server-side
  const filteredInventory = inventory;

  const lowStockCount = metrics.lowStockCount;

  const handleOpenModal = (item: InventoryItem | null = null) => {
    setImageFile(null);
    setImagePreview(null);
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        sectorCategory: item.sectorCategory,
        stock: item.stock,
        lowStock: item.lowStock,
        vendor: item.vendor,
        unit: item.unit || 'Nos',
        image: item.image || '',
        branch: (item as any).branch?._id || (item as any).branch || '',
        branches: []
      });
    } else {
      setEditingItem(null);
      const initialBranch = selectedBranch !== 'all' ? selectedBranch : '';
      setFormData({
        name: '',
        sectorCategory: 'None',
        stock: 0,
        lowStock: 5,
        vendor: '',
        unit: 'Nos',
        image: '',
        branch: initialBranch,
        branches: initialBranch ? [initialBranch] : []
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

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Resource Name Required';
    } else {
      const isDuplicate = inventory.some(item =>
        item.name.toLowerCase() === formData.name.trim().toLowerCase() &&
        item._id !== editingItem?._id
      );
      if (isDuplicate) errors.name = 'Duplicate Resource Name';
    }

    if (formData.sectorCategory === 'None') {
      errors.sectorCategory = 'Sector Required';
    }

    if (formData.stock < 0) {
      errors.stock = 'Invalid Reserve Level';
    }

    if (formData.lowStock < 0) {
      errors.lowStock = 'Invalid Threshold';
    }

    if (editingItem) {
      if (!formData.branch) errors.branch = 'Branch Assignment Required';
    } else {
      if (formData.branches.length === 0) errors.branches = 'Target Branches Required';
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      notify('error', 'Validation Failure', 'Please refine the highlighted resource fields.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const url = editingItem ? `${API_URL}/inventory/${editingItem._id}` : `${API_URL}/inventory`;
    const method = editingItem ? 'PUT' : 'POST';

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('sectorCategory', formData.sectorCategory);
      data.append('stock', (formData.stock ?? 0).toString());
      data.append('lowStock', (formData.lowStock ?? 0).toString());
      data.append('vendor', formData.vendor);
      if (editingItem) {
        data.append('branch', formData.branch);
      } else {
        data.append('branches', JSON.stringify(formData.branches));
      }
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
      } else {
        const error = await response.json();
        notify('error', 'Update Error', error.message || 'Action failed');
      }
    } catch (error) {
      notify('error', 'Update Error', 'Connection failure');
    }
  };

  return (
    <ZenPageLayout
      title="Inventory"
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      addButtonLabel="Add Item"
      onAddClick={() => handleOpenModal()}
      searchActions={
        <div className="flex items-center gap-4">
          <ZenDropdown
            label="Sector Filter"
            hideLabel
            variant="pill"
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={['All', ...inventoryCategories]}
            className="w-48"
          />
          <ExportPopup
            data={filteredInventory}
            columns={inventoryExportColumns}
            fileName="inventory_report"
            title="Inventory"
            triggerLabel="Download"
            description="Generate a comprehensive report of your current stock levels, categories, and replenishment status across selected branches."
            resolveData={fetchAllInventoryForExport}
          />
        </div>
      }
      topContent={
        <div className="flex overflow-x-auto overflow-y-visible pt-2 pb-4 gap-6 lg:grid lg:grid-cols-4 lg:gap-8 lg:overflow-visible scrollbar-hide px-4 lg:px-2">
          {[
            { label: 'Inventory Volume', value: metrics.totalItems, trend: 'Items in workspace', icon: Boxes, color: 'text-blue-500', bg: 'bg-blue-500/10', glow: 'bg-blue-500/20' },
            { label: 'Critical Levels', value: metrics.lowStockCount, trend: 'Replenish required', icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10', glow: 'bg-rose-500/20' },
            { label: 'Flow Categories', value: metrics.categoryCount, trend: 'Resource types', icon: Truck, color: 'text-amber-500', bg: 'bg-amber-500/10', glow: 'bg-amber-500/20' },
            { label: 'Stock Health', value: metrics.lowStockCount === 0 ? 'Pure Harmony' : 'Replenish Required', trend: 'System status', icon: Sparkles, color: 'text-emerald-500', bg: 'bg-emerald-500/10', glow: 'bg-emerald-500/20' }
          ].map((stat, i) => (
            <ZenStatCard key={i} {...stat} delay={i * 0.05} />
          ))}
        </div>
      }
    >
      <div className="space-y-6 pb-20">

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
                          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zen-brown/30">{item.sectorCategory || (item as any).category || 'Uncategorized'}</span>
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
                               <ZenIconButton icon={Edit2} variant="sky" onClick={() => handleOpenModal(item)} />
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
            <div className="w-full bg-white rounded-xl border border-gray-200/60 shadow-none overflow-hidden animate-in fade-in duration-700">
               <div className="table-container">
                  <table className="w-full text-center border-collapse min-w-[760px] lg:min-w-[1000px]">
                     <thead>
                        <tr className="bg-zen-brown/[0.02]">
                           <th className="px-6 py-5 text-[10px] uppercase font-black tracking-[0.2em] text-zen-brown/40 text-center border-b border-zen-brown/5 w-[80px]">S No</th>
                           <th className="px-6 py-5 text-[10px] uppercase font-black tracking-[0.2em] text-zen-brown/40 text-center border-b border-zen-brown/5 w-[100px]">Visual</th>
                           <th className="px-6 py-5 text-[10px] uppercase font-black tracking-[0.2em] text-zen-brown/40 text-left border-b border-zen-brown/5">Resource Identity</th>
                           <th className="px-6 py-5 text-[10px] uppercase font-black tracking-[0.2em] text-zen-brown/40 text-center border-b border-zen-brown/5">Sector</th>
                           <th className="px-6 py-5 text-[10px] uppercase font-black tracking-[0.2em] text-zen-brown/40 text-center border-b border-zen-brown/5 w-[150px]">Branch</th>
                           <th className="px-6 py-5 text-[10px] uppercase font-black tracking-[0.2em] text-zen-brown/40 text-center border-b border-zen-brown/5 w-[150px]">Stock Level</th>
                           <th className="px-6 py-5 text-[10px] uppercase font-black tracking-[0.2em] text-zen-brown/40 text-center border-b border-zen-brown/5 w-[150px]">Actions</th>
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
                                 <td className="px-4 lg:px-6 py-4 lg:py-6">
                                    <span>{((page - 1) * PAGE_LIMIT + index + 1).toString().padStart(2, '0')}</span>
                                 </td>
                                 <td className="px-4 lg:px-6 py-4 lg:py-6">
                                    <div className="flex justify-center">
                                       <div className="w-12 h-10 zen-pointed-surface bg-zen-cream overflow-hidden border border-zen-brown/10 shadow-sm group-hover:scale-110 transition-transform duration-500 flex items-center justify-center shrink-0">
                                          {item.image ? (
                                          <img src={getImageUrl(item.image)} className="w-full h-full object-cover" />
                                          ) : (
                                          <Package size={16} className="text-zen-brown/20" />
                                          )}
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-4 lg:px-6 py-4 lg:py-6 text-left">
                                     <div className="flex flex-col items-start justify-center leading-none">
                                        <span className="text-sm font-serif font-black text-zen-brown leading-tight">{item.name}</span>
                                        <span className="zen-table-meta mt-1">{item.vendor || 'Inventory'}</span>
                                     </div>
                                 </td>
                                 <td className="px-4 lg:px-6 py-4 lg:py-6">
                                    <div className="flex justify-center">
                                       <ZenBadge variant="sand" className="text-[8px] font-black uppercase tracking-widest py-1 scale-90">{item.sectorCategory || (item as any).category || 'None'}</ZenBadge>
                                    </div>
                                 </td>
                                 <td className="px-4 lg:px-6 py-4 lg:py-6">
                                    <div className="flex justify-center">
                                       <ZenBadge variant="sand" className="text-[8px] font-black uppercase tracking-widest py-1 scale-90">{(item as any).branch?.name || 'Main Registry'}</ZenBadge>
                                    </div>
                                 </td>
                                 <td className="px-4 lg:px-6 py-4 lg:py-6">
                                    <div className="flex items-center justify-center gap-4">
                                     <div className="flex flex-col items-center justify-center leading-none">
                                           <span className={`zen-table-primary leading-none ${item.stock <= item.lowStock ? '!text-red-500' : ''}`}>
                                              {item.stock} <span className="text-[10px] font-sans opacity-40 uppercase font-bold">{item.unit || 'Nos'}</span>
                                           </span>
                                           <span className="zen-table-meta mt-1">In Reserve</span>
                                        </div>
                                       {item.stock <= item.lowStock && (
                                          <div className="p-1.5 bg-red-50 text-red-500 rounded-lg animate-pulse border border-red-100 shadow-sm">
                                             <AlertTriangle size={12} />
                                          </div>
                                       )}
                                    </div>
                                 </td>
                                 <td className="px-4 lg:px-6 py-4 lg:py-6">
                                    <div className="flex items-center justify-center gap-2">
                                       <ZenIconButton icon={Edit2} variant="sky" onClick={() => handleOpenModal(item)} size="md" />
                                       <ZenIconButton icon={Trash2} variant="danger" onClick={() => { setItemToDelete(item._id); setIsConfirmOpen(true); }} size="md" />
                                    </div>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                  </table>
               </div>
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
              <div className="relative w-24 h-24 zen-pointed-surface overflow-hidden bg-zen-cream flex items-center justify-center group shadow-sm border border-white transition-all duration-700 hover:scale-105">
                {(imagePreview || formData.image) ? (
                  <img src={imagePreview || getImageUrl(formData.image)} className="w-full h-full object-cover" />
                ) : (
                  <Package className="text-zen-brown/10" size={32} />
                )}
                <label htmlFor="inventory-image-upload" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer backdrop-blur-[2px]">
                   <Camera className="text-white" size={24} />
                </label>
                <input type="file" id="inventory-image-upload" className="hidden" onChange={e => {
                  const file = e.target.files?.[0] || null;
                  setImageFile(file);
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setImagePreview(reader.result as string);
                    reader.readAsDataURL(file);
                  } else {
                    setImagePreview(null);
                  }
                }} />
              </div>
              <div className="flex-1">
                 <ZenInput
                   label="Item Name"
                   required
                   placeholder="e.g. 24K Gold Facial Serum"
                   value={formData.name}
                   onChange={(e: any) => setFormData({...formData, name: e.target.value})}
                   error={formErrors.name}
                 />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-8">
              <ZenDropdown
                label="Sector"
                value={formData.sectorCategory}
                onChange={val => setFormData({...formData, sectorCategory: val})}
                options={['None', ...inventoryCategories]}
                error={!!formErrors.sectorCategory}
              />
              <ZenInput
                type="number"
                label="Opening Stock"
                required
                value={formData.stock}
                onChange={(e: any) => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                error={formErrors.stock}
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
                onChange={(e: any) => setFormData({...formData, lowStock: parseInt(e.target.value) || 0})}
                error={formErrors.lowStock}
              />
              {!editingItem && user?.role === 'Admin' ? (
                <ZenMultiSelect
                  label="Target Branches"
                  icon={MapPin}
                  options={(branches || []).map(b => ({ label: b.name, value: b._id }))}
                  value={formData.branches}
                  onChange={(vals) => setFormData({ ...formData, branches: vals })}
                  error={!!formErrors.branches}
                  placeholder="Select branches..."
                />
              ) : (
                <ZenDropdown
                  label="Assigned Branch"
                  value={branches.find(b => b._id === formData.branch)?.name || 'Select Branch'}
                  onChange={val => {
                    const b = (branches || []).find(branch => branch.name === val);
                    if (b) setFormData({...formData, branch: b._id});
                  }}
                  options={(branches || []).map(b => b.name)}
                  error={!!formErrors.branch}
                  disabled={user?.role !== 'Admin'}
                />
              )}
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
                <div className="flex items-center gap-2.5 px-4 py-1.5 bg-white border border-zen-brown/10 rounded-full shadow-sm relative group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-zen-sand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <Upload size={10} className="text-zen-sand animate-pulse" />
                  <span className="text-[9px] font-black text-zen-brown/60 uppercase tracking-[0.15em] relative z-10">
                    {settings?.upload.provider === 'cloudinary' ? 'Cloud Sync Active' : 'Local Registry'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label htmlFor="inventory-image-footer" className="flex-1 h-12 bg-white border border-zen-brown/25 rounded-xl flex items-center justify-center gap-3 cursor-pointer hover:bg-zen-brown hover:text-white hover:border-zen-brown transition-all group/btn shadow-sm">
                   <Camera size={16} className="text-zen-brown/30 group-hover/btn:text-white transition-colors" />
                   <span className="text-[10px] font-bold uppercase tracking-widest">Replace Image</span>
                </label>
                <input type="file" id="inventory-image-footer" className="hidden" onChange={e => {
                  const file = e.target.files?.[0] || null;
                  setImageFile(file);
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setImagePreview(reader.result as string);
                    reader.readAsDataURL(file);
                  } else {
                    setImagePreview(null);
                  }
                }} />

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
