import React, { useState, useEffect } from 'react';
import { Percent, Plus, Trash2, Edit2, BadgeDollarSign } from 'lucide-react';


import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenButton, ZenIconButton, ZenBadge } from '../../components/zen/ZenButtons';
import { ZenInput } from '../../components/zen/ZenInputs';
import { Modal } from '../../components/shared/Modal';
import { notify } from '../../components/shared/ZenNotification';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';

interface GSTRate {
  _id: string;
  name: string;
  percentage: number;
  isActive: boolean;
}

const GST = () => {
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [rates, setRates] = useState<GSTRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<GSTRate | null>(null);
  const [formData, setFormData] = useState({ name: '', percentage: 0 });
  const [confirmState, setConfirmState] = useState({ isOpen: false, id: '' });


  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch(`${API_URL}/gst`, {
          headers: { 'Authorization': `Bearer ${user?.token}` }
        });
        const data = await response.json();
        if (Array.isArray(data)) setRates(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchRates();
  }, [user, API_URL]);

  const handleToggleGST = async () => {
    try {
      const newState = !settings?.billing?.gstEnabled;
      await updateSettings({ billing: { gstEnabled: newState } });
      notify('success', 'Status Updated', `Taxation mode is now ${newState ? 'active' : 'paused'}.`);
    } catch (e) {
      notify('error', 'Error', 'Failed to update system settings.');
    }
  };



  const fetchRates = async () => {
    try {
      const response = await fetch(`${API_URL}/gst`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) setRates(data);
    } catch (e) {}
  };

  const handleSave = async () => {
    try {
      const url = editingRate ? `${API_URL}/gst/${editingRate._id}` : `${API_URL}/gst`;
      const method = editingRate ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        notify('success', 'Tax Rate Saved', editingRate ? 'Tax rate updated successfully.' : 'New tax rate created successfully.');
        setIsModalOpen(false);
        fetchRates();
      }
    } catch (e) {
      notify('error', 'Sync Failure', 'Failed to save tax rate.');
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`${API_URL}/gst/${confirmState.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (response.ok) {
        notify('success', 'Tax Rate Removed', 'Tax rate removed from the system.');
        setConfirmState({ isOpen: false, id: '' });
        fetchRates();
      }
    } catch (e) {
      notify('error', 'Error', 'Failed to remove rate.');
    }
  };

  const openModal = (rate: GSTRate | null = null) => {
    if (rate) {
      setEditingRate(rate);
      setFormData({ name: rate.name, percentage: rate.percentage });
    } else {
      setEditingRate(null);
      setFormData({ name: '', percentage: 0 });
    }
    setIsModalOpen(true);
  };


  return (
    <ZenPageLayout title="Tax Management" hideSearch hideBranchSelector hideViewToggle>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-zen-brown tracking-tight">Taxation Registry</h1>
          <p className="text-[10px] text-zen-brown/30 uppercase tracking-[0.4em] font-bold mt-2">Standardized Fiscal Control</p>
        </div>
        <ZenButton onClick={() => openModal()} className="w-full sm:w-auto flex items-center justify-center gap-3 shadow-lg shadow-zen-brown/5">
          <Plus size={18} /> 
          <span className="tracking-widest">Create Rate</span>
        </ZenButton>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[2rem] border border-zen-brown/10 shadow-sm">
            <h3 className="text-xl font-serif font-bold mb-4">Tax Control</h3>
            <div className="flex items-center justify-between p-4 bg-zen-cream rounded-2xl border border-zen-brown/5">
              <span className="font-bold text-sm">GST Status</span>
              <button 
                onClick={handleToggleGST}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings?.billing?.gstEnabled ? 'bg-zen-leaf' : 'bg-zen-brown/10'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings?.billing?.gstEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2rem] border border-zen-brown/10 shadow-sm overflow-x-auto custom-scrollbar min-h-[400px]">

             {loading ? (
               <div className="p-20 text-center italic opacity-20">Syncing registry...</div>
             ) : (
                <table className="w-full text-center border-collapse min-w-[700px]">

                  <thead>
                    <tr className="bg-slate-50 border-y border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                      <th className="px-6 py-6 text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em] text-center">S NO</th>
                      <th className="px-6 py-6 text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em] text-center">Rate Protocol</th>
                      <th className="px-6 py-6 text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em] text-center">Calculated Value</th>
                      <th className="px-6 py-6 text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em] text-center">Operational Status</th>
                      <th className="px-6 py-6 text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em] text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map((rate, index) => (
                      <tr key={rate._id} className="transition-all group border-b border-black/[0.02] hover:bg-zen-cream/10">
                        <td className="p-6 text-center italic opacity-30 text-[11px] font-medium tracking-widest">
                           {(index + 1).toString().padStart(2, '0')}
                        </td>
                        <td className="p-6">
                           <div className="flex flex-col items-center">
                              <span className="zen-table-primary">{rate.name}</span>
                              <span className="zen-table-meta">System Standard</span>
                           </div>
                        </td>
                        <td className="p-6 text-center">
                           <span className="text-lg font-serif font-black text-zen-brown">{rate.percentage}%</span>
                        </td>
                        <td className="p-6 text-center">
                          <ZenBadge variant={rate.isActive ? 'leaf' : 'sand'}>{rate.isActive ? 'Active' : 'Inactive'}</ZenBadge>
                        </td>
                        <td className="p-6 text-center">
                           <div className="flex items-center justify-center gap-2">
                             <ZenIconButton 
                               icon={Edit2} 
                               variant="outline" 
                               onClick={() => openModal(rate)} 
                             />

                             <ZenIconButton 
                               icon={Trash2} 
                               variant="danger" 
                               onClick={() => setConfirmState({ isOpen: true, id: rate._id })} 
                             />
                           </div>


                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             )}
          </div>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingRate ? "Edit Tax Rate" : "New Tax Rate"} 
        subtitle="Manage billing tax settings"
        maxWidth="max-w-4xl"
        headerIcon={Percent}
        footer={
          <div className="flex w-full gap-6">
            <ZenButton
              type="button"
              variant="secondary"
              className="flex-1 rounded-[2rem] py-5"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </ZenButton>
            <ZenButton
              type="submit"
              form="gst-rate-form"
              className="flex-[2] rounded-[2rem] py-5 shadow-sm shadow-zen-brown/20 flex items-center justify-center gap-3"
            >
              <span>{editingRate ? 'Save Tax Rate' : 'Create Tax Rate'}</span>
              <BadgeDollarSign size={18} />
            </ZenButton>
          </div>
        }
      >
        <form id="gst-rate-form" onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[1.5rem] border border-zen-brown/10 bg-zen-cream/50 p-6 sm:p-8 space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-zen-brown/10 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-zen-brown/50">
                <Percent size={12} />
                Tax registry note
              </div>
              <h3 className="text-2xl font-serif font-bold text-zen-brown">Billing tax controls</h3>
              <p className="text-sm leading-relaxed text-zen-brown/60">
                Use this panel to define the GST label and percentage used across billing, invoicing, and
                tax summaries. Keep the naming consistent with your accounting workflow.
              </p>

              <div className="flex flex-wrap gap-3">
                <ZenBadge variant={settings?.billing?.gstEnabled ? 'leaf' : 'inactive'}>
                  {settings?.billing?.gstEnabled ? 'GST Enabled' : 'GST Paused'}
                </ZenBadge>
                <ZenBadge variant="secondary">
                  {rates.length} {rates.length === 1 ? 'rate' : 'rates'} in registry
                </ZenBadge>
              </div>

              <div className="rounded-[1.25rem] border border-white/70 bg-white/80 p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/35">
                  Best practice
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zen-brown/65">
                  Prefer one active percentage per tax rule so billing outputs stay predictable and easy to
                  audit.
                </p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white/80 p-6 sm:p-8 space-y-8">
              <ZenInput
                label="Tax Name"
                required
                placeholder="e.g. Standard GST"
                value={formData.name}
                onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
              />
              <ZenInput
                label="Tax Percentage"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 16"
                value={formData.percentage}
                onChange={(e: any) => setFormData({ ...formData, percentage: Number(e.target.value) })}
              />
              <div className="rounded-[1.25rem] border border-zen-brown/10 bg-zen-cream/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/35">
                  Saved output
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zen-brown/60">
                  The tax label and percentage will appear in billing screens and invoice calculations after
                  saving.
                </p>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, id: '' })}
        onConfirm={handleDelete}
        title="Remove Tax Rate"
        message="Are you sure you want to permanently remove this tax protocol from the registry?"
      />

    </ZenPageLayout>
  );
};

export default GST;
