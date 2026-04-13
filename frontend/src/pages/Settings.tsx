import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Upload, 
  Bell, 
  Palette, 
  Map, 
  MapPin, 
  Mail, 
  Phone, 
  Clock,
  Zap,
  Sparkles,
  Cloud,
  HardDrive,
  Moon,
  Sun,
  Camera,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  Layout,
  Settings as SettingsIcon,
  Layers,
  Activity,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { ZenPageLayout } from '../components/zen/ZenLayout';
import { ZenBadge, ZenButton, ZenIconButton } from '../components/zen/ZenButtons';
import { ZenInput, ZenTextarea, ZenDropdown } from '../components/zen/ZenInputs';
import { notify } from '../components/ZenNotification';
import { countries } from '../utils/countries';
import { validatePhoneNumber, getPhoneValidationProtocol } from '../utils/validation';
import { useSettings } from '../context/SettingsContext';

interface SettingsData {
  general: {
    siteName: string;
    logo: string;
    email: string;
    address: string;
    contactNumber: string;
    country: string;
    countryIso: string;
    dialingCode: string;
    currency: string;
    currencySymbol: string;
    dateTimeFormat: string;
    billing?: {
      gstEnabled: boolean;
    };
  };
  upload: {
    provider: 'cloudinary' | 'local';
    cloudinaryCloudName: string;
    cloudinaryApiKey: string;
    cloudinaryApiSecret: string;
  };
  theme: {
    primaryColor: string;
    darkMode: boolean;
  };
  notifications: {
    pushEnabled: boolean;
  };
  smtp?: {
    host: string;
    port: number;
    user: string;
    password: string;
    fromName: string;
    fromEmail: string;
  };
}

type SettingsSection = 'foundations' | 'storage' | 'visuals' | 'alerts' | 'smtp';

const Settings = () => {
  const { user } = useAuth();
  const { refreshSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [activeSection, setActiveSection] = useState<SettingsSection>('foundations');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100/api';

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/settings`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      notify('error', 'Sync Failure', 'Failed to synchronize system configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (section: keyof SettingsData) => {
    if (!settings) return;

    if (section === 'general') {
       const phoneValidation = validatePhoneNumber(settings.general.contactNumber, settings.general.countryIso);
       if (!phoneValidation.isValid) {
          notify('error', 'Validation Error', phoneValidation.message || 'Invalid contact number');
          return;
       }
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ [section]: settings[section] })
      });
      if (response.ok) {
        notify('success', 'Settings Saved', `${section.charAt(0).toUpperCase() + section.slice(1)} parameters successfully updated.`);
        await refreshSettings();
      }
    } catch (error) {
      notify('error', 'Update Error', 'Failed to update system parameters.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setSaving(true);
    const formData = new FormData();
    formData.append('logo', logoFile);

    try {
      const response = await fetch(`${API_URL}/settings/upload-logo`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user?.token}` },
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        setSettings(prev => prev ? { ...prev, general: { ...prev.general, logo: data.logoUrl } } : null);
        notify('success', 'Identity Updated', 'Business branding logo has been updated.');
        setLogoFile(null);
        await refreshSettings();
      } else {
        notify('error', 'Upload Error', data.message || 'Failed to update branding asset.');
      }
    } catch (error) {
      notify('error', 'Upload Error', 'Failed to update branding asset.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <motion.div 
           animate={{ rotate: 360 }}
           transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
           className="p-8 bg-zen-sand/5 rounded-[3rem] border border-zen-sand/10"
        >
           <Zap size={40} className="text-zen-sand" />
        </motion.div>
      </div>
    );
  }

  const sidebarItems = [
    { id: 'foundations', name: 'General', icon: Map, sub: 'Business Identity' },
    { id: 'visuals', name: 'Theme', icon: Palette, sub: 'Interface Styling' },
    { id: 'storage', name: 'Storage', icon: Cloud, sub: 'File Management' },
    { id: 'alerts', name: 'Notifications', icon: Bell, sub: 'System Alerts' },
    { id: 'smtp', name: 'Email (SMTP)', icon: ShieldCheck, sub: 'Outbound Configuration' },
  ];

  return (
    <ZenPageLayout
      title="Settings"
      hideSearch
      hideAddButton
    >
      <div className="min-h-[750px] flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-80 shrink-0">
           <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-zen-brown/5 p-6 sticky top-24 shadow-2xl shadow-zen-brown/5">
              <div className="px-4 py-6 mb-6 border-b border-zen-brown/5 flex items-center gap-4">
                 <div className="w-12 h-12 bg-zen-brown rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <SettingsIcon size={22} />
                 </div>
                 <div>
                    <h2 className="text-lg font-serif font-bold text-zen-brown tracking-tight">Admin Sanctuary</h2>
                    <p className="text-[9px] text-zen-brown/30 font-bold uppercase tracking-[0.3em]">System Configuration</p>
                 </div>
              </div>
              
              <div className="space-y-2">
                 {sidebarItems.map((item) => (
                    <button
                       key={item.id}
                       onClick={() => setActiveSection(item.id as SettingsSection)}
                       className={`w-full flex items-center gap-4 p-4 rounded-[1.5rem] transition-all duration-500 font-bold text-[11px] uppercase tracking-widest group ${
                         activeSection === item.id 
                           ? 'bg-zen-brown text-white shadow-xl shadow-zen-brown/20' 
                           : 'text-zen-brown/40 hover:bg-zen-cream/40 hover:text-zen-brown'
                       }`}
                    >
                       <item.icon size={18} className={activeSection === item.id ? 'text-zen-sand' : 'text-zen-brown/20 group-hover:text-zen-brown/40'} strokeWidth={1.5} />
                       <span>{item.name}</span>
                       {activeSection === item.id && (
                          <motion.div 
                             layoutId="sidebarActive"
                             className="ml-auto w-1.5 h-1.5 rounded-full bg-zen-sand"
                          />
                       )}
                    </button>
                 ))}
              </div>
           </div>
        </aside>

        <main className="flex-1">
           <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="h-full"
              >
                  {activeSection === 'foundations' && (
                     <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-full">
                        <div className="xl:col-span-8 bg-white/80 backdrop-blur-xl p-12 rounded-[3.5rem] border border-zen-brown/5 shadow-2xl shadow-zen-brown/5">
                           <header className="mb-12 flex items-center justify-between">
                              <div>
                                 <h3 className="text-3xl font-serif font-bold text-zen-brown tracking-tight">Business Profile</h3>
                                 <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mt-2">Manage your platform's public identity.</p>
                              </div>
                              <div className="w-16 h-16 bg-zen-cream/20 rounded-[2rem] flex items-center justify-center text-zen-sand border border-zen-brown/5">
                                 <Map size={28} strokeWidth={1.5} />
                              </div>
                           </header>

                           <div className="space-y-8">
                              <ZenInput 
                                 label="Business Name"
                                 value={settings.general.siteName}
                                 onChange={(e: any) => setSettings(prev => prev ? {...prev, general: {...prev.general, siteName: e.target.value}} : null)}
                              />
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 <ZenInput 
                                   label="Official Email"
                                   icon={Mail}
                                   value={settings.general.email}
                                   onChange={(e: any) => setSettings(prev => prev ? {...prev, general: {...prev.general, email: e.target.value}} : null)}
                                 />
                                  <div className="relative">
                                     <ZenInput 
                                       label="Contact Number"
                                       icon={Phone}
                                       prefix={settings.general.dialingCode}
                                       value={settings.general.contactNumber}
                                       maxLength={countries.find(c => c.iso === settings.general.countryIso)?.phoneLength || 10}
                                       onChange={(e: any) => setSettings(prev => prev ? {...prev, general: {...prev.general, contactNumber: e.target.value.replace(/\D/g, '')}} : null)}
                                     />
                                     <div className="flex items-center gap-2 mt-2 px-1">
                                        <Info size={10} className="text-zen-brown/40" />
                                        <p className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-widest whitespace-nowrap">
                                          {getPhoneValidationProtocol(settings.general.countryIso)}
                                        </p>
                                     </div>
                                  </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 <ZenInput 
                                   label="Currency"
                                   placeholder="e.g. Qatari Riyal"
                                   value={settings.general.currency}
                                   onChange={(e: any) => setSettings(prev => prev ? {...prev, general: {...prev.general, currency: e.target.value}} : null)}
                                 />
                                 <ZenInput 
                                   label="Currency Symbol"
                                   placeholder="e.g. QR"
                                   value={settings.general.currencySymbol}
                                   onChange={(e: any) => setSettings(prev => prev ? {...prev, general: {...prev.general, currencySymbol: e.target.value}} : null)}
                                 />
                              </div>

                              <ZenDropdown
                                 label="Country"
                                 icon={Map}
                                 options={countries.map(c => c.name)}
                                 value={settings.general.country}
                                 onChange={(val) => {
                                    const country = countries.find(c => c.name === val);
                                    if (country) {
                                       setSettings(prev => prev ? {
                                          ...prev, 
                                          general: {
                                             ...prev.general, 
                                             country: country.name,
                                             countryIso: country.iso,
                                             dialingCode: country.code
                                          }
                                       } : null);
                                    }
                                 }}
                              />

                              <ZenTextarea 
                                 label="Business Address"
                                 value={settings.general.address}
                                 onChange={(e: any) => setSettings(prev => prev ? {...prev, general: {...prev.general, address: e.target.value}} : null)}
                              />
                           </div>

                           <footer className="mt-12 pt-10 border-t border-zen-brown/5 flex justify-end">
                              <ZenButton 
                                 onClick={() => handleSave('general')}
                                 disabled={saving}
                                 className="px-12 py-5 rounded-[1.5rem] shadow-2xl shadow-zen-brown/10 transition-all text-lg"
                              >
                                 Update Profile
                              </ZenButton>
                           </footer>
                        </div>

                        <div className="xl:col-span-4 space-y-6">
                           <div className="bg-zen-brown p-10 rounded-[3rem] text-white shadow-2xl shadow-zen-brown/20 relative overflow-hidden group min-h-[400px]">
                              <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-150 transition-transform duration-1000">
                                 <Camera size={150} />
                              </div>
                              <h4 className="text-xl font-serif font-bold mb-10 relative z-10">Brand Assets</h4>
                              <div className="relative group w-fit mx-auto mb-10 z-10">
                                 {(logoFile || settings.general.logo) ? (
                                   <div className="relative p-3 bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-sm">
                                      <img 
                                        src={logoFile ? URL.createObjectURL(logoFile) : (settings.general.logo && settings.general.logo.startsWith('http') ? settings.general.logo : `${API_URL.split('/api')[0]}/${settings.general.logo?.replace(/^\.?\//, '')}`)} 
                                        alt="Logo" 
                                        className="h-40 w-40 object-cover rounded-[2rem] shadow-2xl" 
                                      />
                                      <label htmlFor="logo-upload-final" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-[2rem] flex items-center justify-center transition-all cursor-pointer backdrop-blur-md">
                                         <Camera className="text-white" size={32} />
                                      </label>
                                   </div>
                                 ) : (
                                   <label htmlFor="logo-upload-final" className="h-40 w-40 bg-white/5 rounded-[2.5rem] flex items-center justify-center text-white/20 border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
                                      <Camera size={40} />
                                   </label>
                                 )}
                              </div>
                              <input type="file" id="logo-upload-final" className="hidden" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                              
                              {logoFile && (
                                 <ZenButton onClick={handleLogoUpload} className="w-full bg-white text-zen-brown hover:bg-zen-cream py-5 rounded-[1.5rem] font-bold shadow-xl relative z-10">
                                    Synchronize Logo
                                 </ZenButton>
                              )}
                           </div>
                        </div>
                     </div>
                  )}

                  {activeSection === 'visuals' && (
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <section className="bg-white/80 backdrop-blur-xl p-12 rounded-[3.5rem] border border-zen-brown/5 shadow-2xl shadow-zen-brown/5 h-fit">
                           <header className="mb-12">
                              <h3 className="text-3xl font-serif font-bold text-zen-brown tracking-tight">Interface</h3>
                              <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mt-2">Configure workspace styling.</p>
                           </header>
                           
                           <div className="space-y-8">
                              <div 
                                 onClick={() => setSettings(prev => prev ? {...prev, theme: {...prev.theme, darkMode: !prev.theme.darkMode}} : null)}
                                 className={`p-8 rounded-[2rem] border-2 transition-all duration-500 cursor-pointer flex items-center justify-between ${settings.theme.darkMode ? 'bg-zen-brown border-zen-brown shadow-2xl shadow-zen-brown/20' : 'bg-zen-cream/20 border-zen-brown/5'}`}
                              >
                                 <div className="flex items-center gap-6">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${settings.theme.darkMode ? 'bg-white/10 text-white' : 'bg-white text-zen-sand shadow-lg'}`}>
                                       {settings.theme.darkMode ? <Moon size={24} /> : <Sun size={24} />}
                                    </div>
                                    <div>
                                       <h4 className={`text-lg font-serif font-bold ${settings.theme.darkMode ? 'text-white' : 'text-zen-brown'}`}>Dark Mode</h4>
                                       <p className={`text-[9px] font-bold uppercase tracking-widest ${settings.theme.darkMode ? 'text-white/40' : 'text-zen-brown/30'}`}>Ambient Lighting</p>
                                    </div>
                                 </div>
                                 <div className={`w-14 h-7 rounded-full flex items-center px-1 transition-all duration-500 ${settings.theme.darkMode ? 'bg-zen-sand' : 'bg-zen-brown/10'}`}>
                                    <motion.div layout animate={{ x: settings.theme.darkMode ? 28 : 0 }} className="w-5 h-5 rounded-full bg-white shadow-xl" />
                                 </div>
                              </div>

                              <ZenButton onClick={() => handleSave('theme')} className="w-full py-5 rounded-[1.5rem] text-lg font-bold shadow-2xl shadow-zen-brown/10">
                                 Save Aesthetics
                              </ZenButton>
                           </div>
                        </section>

                        <div className="bg-zen-cream/10 p-12 rounded-[3.5rem] border border-zen-brown/5 shadow-2xl shadow-zen-brown/5">
                           <h4 className="text-xl font-serif font-bold text-zen-brown mb-10 flex items-center gap-4">
                              <Palette className="text-zen-sand" size={24} strokeWidth={1.5} />
                              Sacred Palette
                           </h4>
                           <div className="grid grid-cols-3 gap-6">
                              {['#634832', '#977F6D', '#A69080', '#065F46', '#B45309', '#7F1D1D'].map(color => (
                                 <button
                                    key={color}
                                    onClick={() => setSettings(prev => prev ? {...prev, theme: {...prev.theme, primaryColor: color}} : null)}
                                    className={`h-20 rounded-2xl transition-all duration-500 border-4 border-white ${settings.theme.primaryColor === color ? 'ring-4 ring-zen-sand scale-110 shadow-2xl' : 'hover:scale-105 opacity-60 hover:opacity-100'}`}
                                    style={{ backgroundColor: color }}
                                 />
                              ))}
                           </div>
                        </div>
                     </div>
                  )}

                  {activeSection === 'storage' && (
                     <div className="max-w-4xl">
                        <section className="bg-white/80 backdrop-blur-xl p-12 rounded-[3.5rem] border border-zen-brown/5 shadow-2xl shadow-zen-brown/5">
                           <header className="mb-12 flex items-center justify-between">
                              <div>
                                 <h3 className="text-3xl font-serif font-bold text-zen-brown tracking-tight">Storage Provider</h3>
                                 <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mt-2">Configure automated file hosting.</p>
                              </div>
                              <div className="flex bg-zen-cream/30 p-1.5 rounded-2xl border border-zen-brown/5">
                                 {['local', 'cloudinary'].map((prov) => (
                                    <button 
                                       key={prov}
                                       onClick={() => setSettings(prev => prev ? {...prev, upload: {...prev.upload, provider: prov as any}} : null)}
                                       className={`px-8 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-500 ${settings.upload.provider === prov ? 'bg-white text-zen-brown shadow-lg' : 'text-zen-brown/40 hover:text-zen-brown'}`}
                                    >
                                       {prov === 'local' ? 'VPS' : 'Cloud'}
                                    </button>
                                 ))}
                              </div>
                           </header>

                           <AnimatePresence mode="wait">
                              {settings.upload.provider === 'local' ? (
                                 <motion.div key="local" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="p-10 bg-zen-cream/10 rounded-[2.5rem] border border-zen-brown/5 flex items-center gap-8 group">
                                    <div className="w-20 h-20 rounded-[2rem] bg-white flex items-center justify-center text-zen-sand shadow-sm group-hover:scale-110 transition-transform duration-700">
                                       <HardDrive size={36} strokeWidth={1} />
                                    </div>
                                    <div>
                                       <h4 className="text-2xl font-serif font-bold text-zen-brown tracking-tight">Local Filesystem</h4>
                                       <p className="text-[10px] font-bold text-zen-brown/20 uppercase tracking-widest mt-1">Storing documents on your private sanctuary storage.</p>
                                    </div>
                                 </motion.div>
                              ) : (
                                 <motion.div key="cloudinary" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-8">
                                    <div className="bg-zen-cream/10 p-10 rounded-[2.5rem] border border-zen-brown/5 space-y-8">
                                       <ZenInput 
                                          label="Cloud Name" 
                                          value={settings.upload.cloudinaryCloudName}
                                          onChange={(e: any) => setSettings(prev => prev ? {...prev, upload: {...prev.upload, cloudinaryCloudName: e.target.value}} : null)}
                                       />
                                       <ZenInput 
                                          label="API Key" 
                                          value={settings.upload.cloudinaryApiKey}
                                          onChange={(e: any) => setSettings(prev => prev ? {...prev, upload: {...prev.upload, cloudinaryApiKey: e.target.value}} : null)}
                                       />
                                       <ZenInput 
                                          label="API Secret" 
                                          type="password"
                                          value={settings.upload.cloudinaryApiSecret}
                                          onChange={(e: any) => setSettings(prev => prev ? {...prev, upload: {...prev.upload, cloudinaryApiSecret: e.target.value}} : null)}
                                       />
                                    </div>
                                 </motion.div>
                              )}
                           </AnimatePresence>

                           <div className="mt-12">
                              <ZenButton onClick={() => handleSave('upload')} className="w-full py-5 rounded-[1.5rem] text-lg shadow-2xl shadow-zen-brown/10">
                                 Update Storage Gateway
                              </ZenButton>
                           </div>
                        </section>
                     </div>
                  )}

                  {activeSection === 'alerts' && (
                     <div className="max-w-4xl">
                        <section className="bg-zen-brown p-16 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-20 opacity-5 group-hover:scale-125 transition-transform duration-[2000ms] pointer-events-none"><Bell size={250} /></div>
                           <header className="mb-20 relative z-10">
                              <h3 className="text-4xl font-serif font-bold tracking-tight mb-3">System Alerts</h3>
                              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.4em]">Manage sanctuary communication channels.</p>
                           </header>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
                              <div className="space-y-8">
                                 <div className="flex items-center justify-between p-10 bg-white/5 rounded-[3rem] border border-white/10 hover:bg-white/10 transition-all duration-500">
                                    <div>
                                       <p className="text-2xl font-serif font-bold tracking-tight">Push Alerts</p>
                                       <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1">Real-time Echoes</p>
                                    </div>
                                    <button 
                                       onClick={() => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, pushEnabled: !prev.notifications.pushEnabled}} : null)}
                                       className={`w-16 h-8 rounded-full flex items-center px-1 transition-all duration-500 ${settings.notifications.pushEnabled ? 'bg-zen-sand' : 'bg-white/10'}`}
                                    >
                                       <motion.div layout className="w-6 h-6 rounded-full bg-white shadow-2xl" animate={{ x: settings.notifications.pushEnabled ? 32 : 0 }} />
                                    </button>
                                 </div>
                                 <div className="p-10 bg-white/5 rounded-[3rem] border border-white/10 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-all duration-500 group/item">
                                    <div className="flex items-center gap-8">
                                       <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-zen-sand">
                                          <MessageSquare size={24} strokeWidth={1.5} />
                                       </div>
                                       <p className="text-2xl font-serif font-bold tracking-tight">WhatsApp</p>
                                    </div>
                                    <ChevronRight size={20} className="opacity-20 group-hover/item:translate-x-2 transition-transform" />
                                 </div>
                              </div>
                              <div className="flex flex-col h-full">
                                 <div className="flex-1 bg-white/5 rounded-[3rem] border border-white/10 p-12 flex items-center justify-center relative overflow-hidden">
                                    <Activity size={80} className="text-white/5 animate-pulse relative z-10" />
                                    <div className="absolute inset-0 bg-gradient-to-br from-zen-sand/5 to-transparent opacity-50" />
                                 </div>
                                 <ZenButton onClick={() => handleSave('notifications')} className="mt-10 w-full py-6 bg-white text-zen-brown hover:bg-zen-cream rounded-[1.5rem] font-bold text-lg shadow-2xl">
                                    Save Notification Logic
                                 </ZenButton>
                              </div>
                           </div>
                        </section>
                     </div>
                  )}

                  {activeSection === 'smtp' && (
                     <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                        <div className="xl:col-span-8 bg-white/80 backdrop-blur-xl p-12 rounded-[3.5rem] border border-zen-brown/5 shadow-2xl shadow-zen-brown/5">
                           <header className="mb-12 flex items-center justify-between">
                              <div>
                                 <h3 className="text-3xl font-serif font-bold text-zen-brown tracking-tight">SMTP Gateway</h3>
                                 <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mt-2">Manage dynamic outbound communication credentials.</p>
                              </div>
                              <div className="w-16 h-16 bg-zen-cream/20 rounded-[2rem] flex items-center justify-center text-zen-sand border border-zen-brown/5">
                                 <Mail size={28} strokeWidth={1.5} />
                              </div>
                           </header>

                           <div className="space-y-8">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                 <div className="md:col-span-3">
                                    <ZenInput 
                                       label="SMTP Host"
                                       placeholder="e.g. smtp.mailtrap.io"
                                       value={settings.smtp?.host || ''}
                                       onChange={(e: any) => setSettings(prev => prev ? {...prev, smtp: {...(prev.smtp || {host: '', port: 587, user: '', password: '', fromName: '', fromEmail: ''}), host: e.target.value}} : null)}
                                    />
                                 </div>
                                 <ZenInput 
                                    label="Port"
                                    type="number"
                                    placeholder="587"
                                    value={settings.smtp?.port || ''}
                                    onChange={(e: any) => setSettings(prev => prev ? {...prev, smtp: {...(prev.smtp || {host: '', port: 587, user: '', password: '', fromName: '', fromEmail: ''}), port: parseInt(e.target.value)}} : null)}
                                 />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 <ZenInput 
                                    label="SMTP Username"
                                    value={settings.smtp?.user || ''}
                                    onChange={(e: any) => setSettings(prev => prev ? {...prev, smtp: {...(prev.smtp || {host: '', port: 587, user: '', password: '', fromName: '', fromEmail: ''}), user: e.target.value}} : null)}
                                 />
                                 <ZenInput 
                                    label="SMTP Password"
                                    type="password"
                                    value={settings.smtp?.password || ''}
                                    onChange={(e: any) => setSettings(prev => prev ? {...prev, smtp: {...(prev.smtp || {host: '', port: 587, user: '', password: '', fromName: '', fromEmail: ''}), password: e.target.value}} : null)}
                                 />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 <ZenInput 
                                    label="Default From Name"
                                    placeholder="SaloonSpaCRM"
                                    value={settings.smtp?.fromName || ''}
                                    onChange={(e: any) => setSettings(prev => prev ? {...prev, smtp: {...(prev.smtp || {host: '', port: 587, user: '', password: '', fromName: '', fromEmail: ''}), fromName: e.target.value}} : null)}
                                 />
                                 <ZenInput 
                                    label="Default From Email"
                                    placeholder="noreply@yourdomain.com"
                                    value={settings.smtp?.fromEmail || ''}
                                    onChange={(e: any) => setSettings(prev => prev ? {...prev, smtp: {...(prev.smtp || {host: '', port: 587, user: '', password: '', fromName: '', fromEmail: ''}), fromEmail: e.target.value}} : null)}
                                 />
                              </div>
                           </div>

                           <footer className="mt-12 pt-10 border-t border-zen-brown/5 flex justify-end">
                              <ZenButton 
                                 onClick={() => handleSave('smtp' as any)}
                                 disabled={saving}
                                 className="px-12 py-5 rounded-[1.5rem] shadow-2xl shadow-zen-brown/10 transition-all text-lg"
                              >
                                 Verify & Save
                              </ZenButton>
                           </footer>
                        </div>

                        <div className="xl:col-span-4">
                           <div className="bg-zen-cream/10 p-10 rounded-[3rem] border border-zen-brown/5 h-full">
                              <h4 className="text-xl font-serif font-bold text-zen-brown mb-6 flex items-center gap-3">
                                 <ShieldCheck className="text-zen-sand" size={24} />
                                 Security Protocol
                              </h4>
                              <p className="text-xs text-zen-brown/60 leading-relaxed font-medium">
                                 Your SMTP credentials are encrypted and stored securely within our infrastructure. 
                                 For standard configuration, use port **587** with TLS. For legacy systems, port **465** provides direct SSL.
                              </p>
                              <div className="mt-8 space-y-4">
                                 <div className="p-5 bg-white rounded-2xl border border-zen-brown/5">
                                    <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.2em] mb-1">Status</p>
                                    <div className="flex items-center gap-3">
                                       <div className={`w-2 h-2 rounded-full ${settings.smtp?.host ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                       <p className="text-sm font-bold text-zen-brown">{settings.smtp?.host ? 'Configuration Active' : 'Provider Pending'}</p>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}
              </motion.div>
           </AnimatePresence>
        </main>
      </div>
    </ZenPageLayout>
  );
};

export default Settings;
