import React, { useState, useEffect } from 'react';
import { Percent, Plus, Trash2, CheckCircle2, ShoppingBag, ShieldCheck, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { ZenPageLayout } from '../components/zen/ZenLayout';
import { ZenButton, ZenIconButton, ZenBadge } from '../components/zen/ZenButtons';
import { ZenInput } from '../components/zen/ZenInputs';
import { Modal } from '../components/Modal';
import { notify } from '../components/ZenNotification';
import { ConfirmDialog } from '../components/ConfirmDialog';

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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [rateToDelete, setRateToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    percentage: 0,
    isActive: false
  });
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('zen_tax_view') as 'grid' | 'table') || 'grid';
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchRates();
  }, []);

  useEffect(() => {
    localStorage.setItem('zen_tax_view', viewMode);
  }, [viewMode]);

  const fetchRates = async () => {
    try {
      const response = await fetch(`${API_URL}/gst`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) setRates(data);
    } catch (error) {
      notify('error', 'Sync Failed', 'Could not retrieve taxation sequences.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGST = async () => {
    try {
      const newState = !settings?.billing?.gstEnabled;
      await updateSettings({
        billing: { gstEnabled: newState }
      });
      notify('success', newState ? 'Taxation Activated' : 'Taxation Suspended', 
        `Global tax application is now ${newState ? 'live' : 'disabled'}.`);
    } catch (error) {
      notify('error', 'Update Failed', 'Could not synchronize global preference.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/gst`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        notify('success', 'Sequence Established', `${formData.name} has been added to the registry.`);
        setIsModalOpen(false);
        fetchRates();
        setFormData({ name: '', percentage: 0, isActive: false });
      }
    } catch (error) {
      notify('error', 'Registry Error', 'Failed to commit tax sequence.');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/gst/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ isActive: true })
      });

      if (response.ok) {
        notify('info', 'Active Sequence Updated', 'The primary taxation rate has been synchronized.');
        fetchRates();
      }
    } catch (error) {
      notify('error', 'Update Failed', 'Could not modify active sequence.');
    }
  };

  const executeDelete = async () => {
    if (!rateToDelete) return;
    try {
      const response = await fetch(`${API_URL}/gst/${rateToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });

      if (response.ok) {
        notify('success', 'Sequence Purged', 'Taxation record has been removed.');
        setIsConfirmOpen(false);
        fetchRates();
      }
    } catch (error) {
      notify('error', 'Erasure Failed', 'Could not remove the sequence.');
    }
  };

  return (
    <ZenPageLayout
      title="Taxation Treasury"
      addButtonLabel="Initialize Rate"
      onAddClick={() => setIsModalOpen(true)}
      addButtonIcon={<Plus size={18} />}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-8">
           {/* Global Toggle Card */}
           <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] border border-zen-brown/15 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-1000">
                 <Percent size={120} />
              </div>
              
              <div className="relative z-10">
                 <h3 className="text-xl font-serif font-bold text-zen-brown mb-2 tracking-tight">Global Mastery</h3>
                 <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.4em] mb-8">Universal Taxation Authority</p>
                 
                 <div className="flex items-center justify-between p-6 bg-zen-cream/30 rounded-[2rem] border border-zen-brown/15 transition-all">
                    <div>
                       <span className="text-sm font-bold text-zen-brown tracking-tight">Tax Application</span>
                       <p className="text-[9px] text-white/40 uppercase tracking-widest mt-1">
                          {settings?.billing?.gstEnabled ? 'Currently Active' : 'Suspended'}
                       </p>
                    </div>
                    
                    <button 
                      onClick={handleToggleGST}
                      className={`w-14 h-8 rounded-full transition-all duration-500 relative ${settings?.billing?.gstEnabled ? 'bg-zen-leaf shadow-lg shadow-zen-leaf/20' : 'bg-zen-brown/10'}`}
                    >
                       <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-500 ${settings?.billing?.gstEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                 </div>

                 <div className="mt-8 p-6 bg-white rounded-[2rem] border border-zen-brown/15 flex gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-zen-sand/10 flex items-center justify-center shrink-0">
                       <Info size={18} className="text-zen-sand" />
                    </div>
                    <div>
                       <p className="text-[10px] leading-relaxed text-zen-brown/60 font-medium italic">
                          When suspended, tax fields vanish from the billing ritual. Activating will apply the selected 'Live' rate to all new energy exchanges.
                       </p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-zen-brown p-10 rounded-[3rem] text-white shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-1000">
                 <ShieldCheck size={100} />
              </div>
              <h4 className="text-lg font-serif font-bold mb-4 relative z-10 transition-colors group-hover:text-zen-sand">Compliance Core</h4>
              <p className="text-sm opacity-60 font-medium leading-relaxed relative z-10">
                 Maintain precise taxation sequences to ensure financial equilibrium within the sanctuary limits.
              </p>
           </div>
        </div>

        <div className="lg:col-span-2">
           <div className="bg-white/60 backdrop-blur-sm rounded-[3rem] border border-zen-brown/15 overflow-hidden shadow-sm h-full flex flex-col">
              <div className="px-10 py-10 border-b border-zen-brown/15 flex justify-between items-center bg-white/40">
                 <div>
                    <h3 className="text-2xl font-serif font-bold text-zen-brown tracking-tight">Sequence Registry</h3>
                    <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.4em] mt-2">Available Taxation Models</p>
                 </div>
              </div>
 
              <div className="flex-1 overflow-y-auto">
                 {viewMode === 'grid' ? (
                   <div className="p-8 space-y-6">
                      {rates.map((rate) => (
                         <div 
                           key={rate._id} 
                           className={`group flex items-center justify-between p-8 rounded-[2.5rem] border transition-all duration-500 hover:shadow-xl ${rate.isActive ? 'bg-white border-zen-sand shadow-lg' : 'bg-white/40 border-zen-brown/15 hover:bg-white'}`}
                         >
                            <div className="flex items-center gap-8">
                               <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-500 ${rate.isActive ? 'bg-zen-sand text-white' : 'bg-zen-brown/5 text-zen-brown/20'}`}>
                                  <Percent size={28} />
                               </div>
                               <div>
                                  <h4 className="text-xl font-serif font-bold text-zen-brown tracking-tight flex items-center gap-3">
                                     {rate.name}
                                     {rate.isActive && <ZenBadge variant="leaf">Live Rate</ZenBadge>}
                                  </h4>
                                  <p className="text-sm font-bold text-zen-brown/40 uppercase tracking-[0.2em] mt-1">{rate.percentage}% Multiplier</p>
                               </div>
                            </div>
 
                            <div className="flex items-center gap-4">
                               {!rate.isActive && (
                                  <ZenIconButton 
                                    icon={CheckCircle2} 
                                    variant="cream"
                                    onClick={() => handleActivate(rate._id)}
                                    className="hover:scale-110 transition-transform"
                                  />
                               )}
                               <ZenIconButton 
                                 icon={Trash2} 
                                 variant="danger"
                                 onClick={() => { setRateToDelete(rate._id); setIsConfirmOpen(true); }}
                                 className="hover:scale-110 transition-transform"
                               />
                            </div>
                         </div>
                      ))}
                   </div>
                 ) : (
                   <div className="min-w-full overflow-x-auto">
                      <table className="w-full text-center border-collapse">
                         <thead>
                            <tr className="bg-zen-cream/10 border-b border-zen-brown/10">
                               <th className="px-8 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">S NO</th>
                               <th className="px-8 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Tax Model</th>
                               <th className="px-8 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Multiplier</th>
                               <th className="px-8 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Identity</th>
                               <th className="px-8 py-6 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-zen-brown/10">
                            {rates.map((rate, idx) => (
                               <tr key={rate._id} className={`hover:bg-zen-cream/5 transition-colors group ${rate.isActive ? 'bg-zen-sand/5' : ''}`}>
                                  <td className="px-8 py-8 text-sm font-serif text-zen-brown/30">{(idx + 1).toString().padStart(2, '0')}</td>
                                  <td className="px-8 py-8">
                                     <div className="flex flex-col items-center">
                                        <span className="font-serif font-bold text-zen-brown text-lg">{rate.name}</span>
                                        {rate.isActive && <ZenBadge variant="leaf" className="mt-1 scale-75 origin-center">Live</ZenBadge>}
                                     </div>
                                  </td>
                                  <td className="px-8 py-8">
                                     <span className="font-serif font-black text-zen-brown">{rate.percentage}%</span>
                                  </td>
                                  <td className="px-8 py-8">
                                     <span className="text-[10px] font-bold text-zen-brown/20 uppercase tracking-[0.2em]">{rate._id.slice(-6).toUpperCase()}</span>
                                  </td>
                                  <td className="px-8 py-8">
                                     <div className="flex items-center justify-center gap-3">
                                        {!rate.isActive && (
                                           <ZenIconButton icon={CheckCircle2} onClick={() => handleActivate(rate._id)} />
                                        )}
                                        <ZenIconButton 
                                          icon={Trash2} 
                                          variant="danger" 
                                          onClick={() => { setRateToDelete(rate._id); setIsConfirmOpen(true); }} 
                                        />
                                     </div>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                 )}

                 {rates.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 italic font-serif">
                       The treasury registry is silent.
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Initialize Taxation"
      >
        <form onSubmit={handleSubmit} className="px-10 py-12 space-y-8">
           <ZenInput
             label="Sequence Identity"
             required
             placeholder="e.g. Standard GST, High Value Ritual Tax"
             value={formData.name}
             onChange={(e: any) => setFormData({...formData, name: e.target.value})}
           />

           <ZenInput
             type="number"
             label="Percentage Multiplier (%)"
             required
             placeholder="18"
             value={formData.percentage}
             onChange={(e: any) => setFormData({...formData, percentage: parseFloat(e.target.value)})}
           />

           <div className="pt-4">
              <ZenButton type="submit" className="w-full py-5 rounded-[2rem] shadow-sm">
                 Commit to Registry
              </ZenButton>
           </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Purge Sequence?"
        message="Are you certain you wish to dissolve this taxation model? Past invoices will retain their historical values."
      />
    </ZenPageLayout>
  );
};

export default GST;
