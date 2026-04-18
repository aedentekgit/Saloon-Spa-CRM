import React, { useState, useEffect } from 'react';
import { Percent, Plus, Trash2, CheckCircle2, ShieldCheck, Info, Landmark } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [rateToDelete, setRateToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', percentage: 0, isActive: false });

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

  const handleActivate = async (id: string) => {
    try {
      await fetch(`${API_URL}/gst/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ isActive: true })
      });
      fetchRates();
    } catch (e) {
      notify('error', 'Error', 'Failed to activate rate.');
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

  return (
    <ZenPageLayout title="Tax Management" hideSearch hideBranchSelector>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-serif font-bold text-zen-brown">Taxation Registry</h1>
          <p className="text-xs text-zen-brown/40 uppercase tracking-widest font-bold">Standardized Fiscal Control</p>
        </div>
        <ZenButton onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus size={16} /> Create Rate
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
          <div className="bg-white rounded-[2rem] border border-zen-brown/10 shadow-sm overflow-hidden min-h-[400px]">
             {loading ? (
               <div className="p-20 text-center italic opacity-20">Syncing registry...</div>
             ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-zen-cream border-b border-zen-brown/5">
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-zen-brown/40">Rate Name</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-zen-brown/40 text-center">Value</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-zen-brown/40 text-center">Status</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-zen-brown/40 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map(rate => (
                      <tr key={rate._id} className="border-b border-zen-brown/5">
                        <td className="p-6 font-bold text-zen-brown">{rate.name}</td>
                        <td className="p-6 text-center font-black">{rate.percentage}%</td>
                        <td className="p-6 text-center">
                          <ZenBadge variant={rate.isActive ? 'leaf' : 'secondary'}>{rate.isActive ? 'Active' : 'Inactive'}</ZenBadge>
                        </td>
                        <td className="p-6 text-right">
                          {!rate.isActive && <ZenIconButton icon={CheckCircle2} variant="cream" onClick={() => handleActivate(rate._id)} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             )}
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Tax Protocol" headerIcon={Landmark}>
        <div className="p-8 space-y-6">
           <ZenInput label="Tax Name" placeholder="e.g. Standard GST" value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} />
           <ZenInput label="Percentage" type="number" value={formData.percentage} onChange={(e: any) => setFormData({...formData, percentage: Number(e.target.value)})} />
           <ZenButton className="w-full" onClick={() => setIsModalOpen(false)}>Save to Registry</ZenButton>
        </div>
      </Modal>
    </ZenPageLayout>
  );
};

export default GST;
