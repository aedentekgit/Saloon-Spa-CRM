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
  Sun,
  Camera,
  ShieldCheck,
  ChevronRight,
  Activity,
  Info,
  Check,
  Percent,
  Trash2,
  Edit2,
  BadgeDollarSign,
  Plus,
  MessageSquare,
  Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenBadge, ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { ZenInput, ZenTextarea, ZenDropdown } from '../../components/zen/ZenInputs';
import { notify } from '../../components/shared/ZenNotification';
import { Modal } from '../../components/shared/Modal';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { countries } from '../../utils/countries';
import { validatePhoneNumber, getPhoneValidationProtocol } from '../../utils/validation';
import { useSettings } from '../../context/SettingsContext';

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
    headingFont: string;
    bodyFont: string;
    darkMode: boolean;
  };
  whatsapp: {
    instanceId: string;
    token: string;
    provider: string;
    enabled: boolean;
  };
  notifications: {
    pushEnabled: boolean;
    fcmToken?: string;
    // Client side
    firebaseApiKey?: string;
    firebaseAuthDomain?: string;
    firebaseProjectId?: string;
    firebaseStorageBucket?: string;
    firebaseMessagingSenderId?: string;
    firebaseAppId?: string;
    firebaseMeasurementId?: string;
    firebaseVapidKey?: string;
    // Server side
    firebaseClientEmail?: string;
    firebasePrivateKey?: string;
    firebaseServiceAccount?: string;
  };
  smtp?: {
    host: string;
    port: number;
    user: string;
    password: string;
    fromName: string;
    fromEmail: string;
    encryption: 'ssl' | 'tls' | 'none';
  };
  payroll: {
    type: 'Monthly' | 'Hourly';
    allowedPaidLeaves: number;
    allowedPaidHours: number;
  };
}

interface GSTRate {
  _id: string;
  name: string;
  percentage: number;
  isActive: boolean;
}

type SettingsSection = 'foundations' | 'storage' | 'visuals' | 'alerts' | 'smtp' | 'whatsapp' | 'payroll' | 'tax' | 'appearance';

const Settings = () => {
  const { user } = useAuth();
  const { refreshSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [activeSection, setActiveSection] = useState<SettingsSection>('foundations');

  // Tax Section States
  const [taxRates, setTaxRates] = useState<GSTRate[]>([]);
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [editingTaxRate, setEditingTaxRate] = useState<GSTRate | null>(null);
  const [taxFormData, setTaxFormData] = useState({ name: '', percentage: 0 });
  const [taxConfirmState, setTaxConfirmState] = useState({ isOpen: false, id: '' });
  const [taxLoading, setTaxLoading] = useState(false);
  const [fontConfigMode, setFontConfigMode] = useState<'heading' | 'body'>('heading');
  const [testTargetEmail, setTestTargetEmail] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  useEffect(() => {
    fetchSettings();
    fetchTaxRates();
  }, []);

  const fetchTaxRates = async () => {
    setTaxLoading(true);
    try {
      const response = await fetch(`${API_URL}/gst`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const result = await response.json();
      const rates = Array.isArray(result) ? result : (result.data || []);
      setTaxRates(rates);
    } catch (e) {
      console.error(e);
    } finally {
      setTaxLoading(false);
    }
  };

  const handleToggleGST = async () => {
    try {
      if (!settings) return;
      const newState = !settings.general.billing?.gstEnabled;
      const updatedSettings = { 
        ...settings, 
        general: { 
          ...settings.general, 
          billing: { ...settings.general.billing, gstEnabled: newState } 
        } 
      };
      setSettings(updatedSettings);
      
      const response = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ general: updatedSettings.general })
      });

      if (response.ok) {
        notify('success', 'Status Updated', `Taxation mode is now ${newState ? 'active' : 'paused'}.`);
        await refreshSettings();
      }
    } catch (e) {
      notify('error', 'Error', 'Failed to update system settings.');
    }
  };

  const handleSaveTaxRate = async () => {
    try {
      const url = editingTaxRate ? `${API_URL}/gst/${editingTaxRate._id}` : `${API_URL}/gst`;
      const method = editingTaxRate ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(taxFormData)
      });

      if (response.ok) {
        notify('success', 'Tax Rate Saved', editingTaxRate ? 'Tax rate updated successfully.' : 'New tax rate created successfully.');
        setIsTaxModalOpen(false);
        fetchTaxRates();
      }
    } catch (e) {
      notify('error', 'Sync Failure', 'Failed to save tax rate.');
    }
  };

  const handleDeleteTaxRate = async () => {
    try {
      const response = await fetch(`${API_URL}/gst/${taxConfirmState.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (response.ok) {
        notify('success', 'Tax Rate Removed', 'Tax rate removed from the system.');
        setTaxConfirmState({ isOpen: false, id: '' });
        fetchTaxRates();
      }
    } catch (e) {
      notify('error', 'Error', 'Failed to remove rate.');
    }
  };

  const openTaxModal = (rate: GSTRate | null = null) => {
    if (rate) {
      setEditingTaxRate(rate);
      setTaxFormData({ name: rate.name, percentage: rate.percentage });
    } else {
      setEditingTaxRate(null);
      setTaxFormData({ name: '', percentage: 0 });
    }
    setIsTaxModalOpen(true);
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/settings`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      
      // Ensure all top-level keys exist even if API returns sparse object
      const safeSettings = {
        ...data,
        general: data?.general || { siteName: '', email: '', contactNumber: '', address: '', country: '', countryIso: '', dialingCode: '', currency: '', currencySymbol: '', dateTimeFormat: '', logo: '' },
        theme: data?.theme || { primaryColor: '', darkMode: false, headingFont: '', bodyFont: '' },
        upload: data?.upload || { provider: 'local', cloudinaryCloudName: '', cloudinaryApiKey: '', cloudinaryApiSecret: '' },
        whatsapp: data?.whatsapp || { instanceId: '', token: '', provider: 'ultramsg', enabled: false },
        notifications: data?.notifications || { pushEnabled: false },
        smtp: data?.smtp || { host: '', port: 587, user: '', password: '', fromName: '', fromEmail: '', encryption: 'tls' },
        payroll: data?.payroll || { type: 'Monthly', allowedPaidLeaves: 1.5, allowedPaidHours: 12 }
      };
      
      setSettings(safeSettings);
    } catch (error) {
      notify('error', 'Sync Failure', 'Failed to synchronize system configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (settings?.theme?.primaryColor) {
      document.documentElement.style.setProperty('--zen-sand', settings.theme.primaryColor);
      document.documentElement.style.setProperty('--zen-primary', settings.theme.primaryColor);
    }
  }, [settings?.theme?.primaryColor]);

  useEffect(() => {
    if (settings?.smtp?.port) {
       const port = parseInt(settings.smtp.port.toString());
       if (port === 465 && settings.smtp.encryption !== 'ssl') {
          setSettings(prev => prev ? {...prev, smtp: {...prev.smtp!, encryption: 'ssl'}} : null);
       } else if (port === 587 && settings.smtp.encryption !== 'tls') {
          setSettings(prev => prev ? {...prev, smtp: {...prev.smtp!, encryption: 'tls'}} : null);
       }
    }
  }, [settings?.smtp?.port]);

  useEffect(() => {
    const injectFont = (name: string, url: string) => {
      if (!url || !url.match(/uploads/i)) return;
      const fullUrl = url.startsWith('http') ? url : `${API_URL.split('/api')[0]}/${url.replace(/^\.?\//, '')}`;
      const styleId = `font-face-${name}`;
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = `@font-face { font-family: '${name}'; src: url('${fullUrl}'); font-display: swap; }`;
    };

    if (settings?.theme?.headingFont) injectFont('CustomHeadingFont', settings.theme.headingFont);
    if (settings?.theme?.bodyFont) injectFont('CustomBodyFont', settings.theme.bodyFont);
  }, [settings?.theme?.headingFont, settings?.theme?.bodyFont]);

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

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'heading' | 'body') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    const formData = new FormData();
    formData.append('font', file);
    formData.append('type', type);

    try {
      const response = await fetch(`${API_URL}/settings/upload-font`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user?.token}` },
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
         setSettings(prev => prev ? { ...prev, theme: { ...prev.theme, [type === 'heading' ? 'headingFont' : 'bodyFont']: data.fontUrl } } : null);
         notify('success', 'Font Updated', `${type === 'heading' ? 'Heading' : 'Body'} font successfully uploaded.`);
      } else {
         notify('error', 'Upload Failed', data.message || 'Failed to upload font.');
      }
    } catch (error) {
       notify('error', 'Network Error', 'Failed to upload font due to server error.');
    } finally {
       setSaving(false);
       // Clear input to allow re-upload
       e.target.value = '';
    }
  };

  const handleTestSMTP = async () => {
    if (!settings?.smtp) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/settings/test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          ...settings.smtp,
          targetEmail: testTargetEmail || user?.email
        })
      });
      const data = await response.json();
      if (response.ok) {
        notify('success', 'Test Successful', data.message);
      } else {
        notify('error', 'Test Failed', data.message);
      }
    } catch (error) {
      notify('error', 'Network Error', 'Failed to reach SMTP diagnostic relay.');
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
           className="p-8 bg-zen-sand/5 rounded-[1.5rem] border border-zen-sand/10"
        >
           <Zap size={40} className="text-zen-sand" />
        </motion.div>
      </div>
    );
  }

  const sidebarItems = [
    { id: 'foundations', name: 'General', icon: Map, sub: 'Business Identity' },
    { id: 'payroll', name: 'Payroll & Leave', icon: Clock, sub: 'Leave Thresholds' },
    { id: 'tax', name: 'Tax Protocol', icon: Percent, sub: 'Fiscal Configuration' },
    { id: 'smtp', name: 'SMTP', icon: ShieldCheck, sub: 'Outbound Configuration' },
    { id: 'whatsapp', name: 'WhatsApp Gateway', icon: MessageSquare, sub: 'Customer Messaging' },
    { id: 'alerts', name: 'Notification', icon: Bell, sub: 'System Alerts' },
    { id: 'storage', name: 'Storage', icon: Cloud, sub: 'File Management' },
    { id: 'visuals', name: 'Appearance', icon: Palette, sub: 'Interface Styling' },
  ];

  return (
    <ZenPageLayout
      title="Settings"
      hideSearch
      hideAddButton
      hideBranchSelector
      hideViewToggle
    >
      <div className="min-h-[750px] flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-64 shrink-0">
           <div className="bg-white rounded-3xl border border-gray-100 p-4 sticky top-24 shadow-sm pb-6">
              
              <div className="px-3 pt-4 pb-2 mb-2">
                  <h4 className="text-[10px] uppercase font-extrabold text-gray-500 tracking-wider">
                     Admin Menu
                  </h4>
              </div>
              
               <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-2 scrollbar-hide pb-4 lg:pb-0 whitespace-nowrap">
                 {sidebarItems.map((item) => (
                    <button
                       key={item.id}
                       onClick={() => setActiveSection(item.id as SettingsSection)}
                       className={`flex items-center gap-3 px-5 py-2.5 rounded-xl transition-all font-sans font-bold text-[12px] group relative whitespace-nowrap ${
                         activeSection === item.id 
                           ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
                           : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                       } lg:w-full`}
                    >
                       <item.icon size={16} className={activeSection === item.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'} />
                       <span>{item.name}</span>
                       {activeSection === item.id && (
                          <motion.div 
                             layoutId="sidebarActive"
                             className="hidden lg:block absolute right-3 w-1.5 h-1.5 rounded-full bg-white/40"
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
                        <div className="xl:col-span-8 bg-white/80 backdrop-blur-xl p-6 sm:p-12 rounded-[1.5rem] border border-zen-brown/15 shadow-sm">
                           <header className="mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                              <div>
                                 <h3 className="text-3xl font-serif font-bold text-zen-brown tracking-tight">Business Profile</h3>
                                 <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mt-2">Manage your platform's public identity.</p>
                              </div>
                              <div className="w-16 h-16 bg-zen-cream/20 rounded-[1rem] flex items-center justify-center text-zen-sand border border-zen-brown/15 shrink-0">
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
                                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest whitespace-nowrap">
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

                           <footer className="mt-12 pt-10 border-t border-zen-brown/15 flex justify-end">
                              <ZenButton 
                                 onClick={() => handleSave('general')}
                                 disabled={saving}
                                 className="px-12 py-5 rounded-[1.5rem] shadow-sm transition-all text-lg"
                              >
                                 Update Profile
                              </ZenButton>
                           </footer>
                        </div>

                        <div className="xl:col-span-4 space-y-6">
                           <div className="bg-zen-brown p-8 sm:p-12 rounded-[1.5rem] text-white shadow-sm relative overflow-hidden group min-h-[400px]">
                              <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-150 transition-transform duration-1000">
                                 <Camera size={150} />
                              </div>
                              <h4 className="text-xl font-serif font-bold mb-10 relative z-10">Brand Assets</h4>
                              <div className="relative group w-fit mx-auto mb-10 z-10">
                                 {(logoFile || settings.general.logo) ? (
                                   <div className="relative p-3 bg-white/5 rounded-[1rem] border border-white/10 backdrop-blur-sm">
                                      <img 
                                        src={logoFile ? URL.createObjectURL(logoFile) : (settings.general.logo && settings.general.logo.startsWith('http') ? settings.general.logo : `${API_URL.split('/api')[0]}/${settings.general.logo?.replace(/^\.?\//, '')}`)} 
                                        alt="Logo" 
                                        className="h-40 w-40 object-cover rounded-[1rem] shadow-sm" 
                                      />
                                      <label htmlFor="logo-upload-final" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-[1rem] flex items-center justify-center transition-all cursor-pointer backdrop-blur-md">
                                         <Camera className="text-white" size={32} />
                                      </label>
                                   </div>
                                 ) : (
                                   <label htmlFor="logo-upload-final" className="h-40 w-40 bg-white/5 rounded-[1rem] flex items-center justify-center text-white/20 border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
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
                     <div className="max-w-5xl flex flex-col gap-6 font-sans">
                        <section className="bg-white p-6 sm:p-14 rounded-[2rem] border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative">
                           
                           <header className="flex flex-col sm:flex-row sm:items-center gap-5 mb-14">
                              <div className="w-14 h-14 rounded-full flex items-center justify-center text-purple-700 bg-purple-50 shrink-0">
                                 <Palette size={24} strokeWidth={2} />
                              </div>
                              <div className="text-center sm:text-left"><h2 className="text-[22px] font-sans font-bold text-slate-900 tracking-tight">Appearance Settings</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Calibrate brand visual identity.</p></div>
                           </header>
                           
                           <div className="space-y-12 font-sans text-center sm:text-left">
                              {/* Color Profile Settings */}
                              <div>
                                 <div className="flex items-center gap-6 mb-5">
                                    <h3 className="text-[14px] font-bold text-slate-900">
                                       Themes
                                    </h3>
                                 </div>
                                 <div className="flex flex-wrap items-center gap-3">
                                    {[
                                      '#1E293B', '#0F766E', '#15803D', '#84CC16', '#B45309', '#EA580C', 
                                      '#BE123C', '#9333EA', '#7E22CE', '#1D4ED8', '#2563EB', '#0284C7', '#451A03'
                                    ].map(color => (
                                       <button
                                          key={color}
                                          onClick={() => setSettings(prev => prev ? {...prev, theme: {...prev.theme, primaryColor: color}} : null)}
                                          className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                                             settings.theme.primaryColor === color 
                                                ? 'ring-[6px] ring-purple-100/60 scale-[1.15] z-10' 
                                                : 'hover:scale-110'
                                          }`}
                                          style={{ backgroundColor: color }}
                                       >
                                          {settings.theme.primaryColor === color && <Check size={18} className="text-white" strokeWidth={3} />}
                                       </button>
                                    ))}
                                    
                                    {/* Custom Color Upload Picker & Hex Input */}
                                    <div className="flex items-center gap-2 bg-slate-50 border border-gray-200 rounded-full pr-4 p-1 ml-2 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                                       <div className="relative w-9 h-9 rounded-full flex items-center justify-center text-gray-500 transition-colors cursor-pointer overflow-hidden bg-white shadow-sm border border-gray-200">
                                          <Palette size={14} />
                                          <input
                                             type="color"
                                             className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-20"
                                             value={settings.theme.primaryColor || '#2D1622'}
                                             onChange={(e: any) => setSettings(prev => prev ? {...prev, theme: {...prev.theme, primaryColor: e.target.value}} : null)}
                                          />
                                       </div>
                                       <input 
                                          type="text" 
                                          value={settings.theme.primaryColor || '#2D1622'}
                                          onChange={(e: any) => setSettings(prev => prev ? {...prev, theme: {...prev.theme, primaryColor: e.target.value}} : null)}
                                          className="bg-transparent border-none outline-none text-[11px] font-bold text-slate-700 w-16 uppercase focus:ring-0 placeholder:text-gray-300"
                                          placeholder="#HEX"
                                       />
                                    </div>
                                 </div>
                              </div>

                              {/* Typography Settings */}
                              <div className="pt-12 border-t border-slate-100">
                                 <div className="flex items-center gap-3 mb-8">
                                    <Sparkles size={18} className="text-purple-500" />
                                    <h3 className="text-[16px] font-bold text-slate-900">Typography Workshop</h3>
                                 </div>
                                 
                                 <div className="space-y-6">
                                    <div className="bg-slate-50/50 rounded-[2.5rem] p-6 sm:p-12 border border-slate-100 shadow-sm overflow-hidden relative group/workshop">
                                       <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                                          {/* Unified Controls Section */}
                                          <div className="lg:col-span-5 space-y-10 lg:pr-12 lg:border-r lg:border-slate-200/50">
                                             <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Architecture Mode</label>
                                                   <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">Dynamic Control</span>
                                                </div>
                                                <div className="flex bg-white/50 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
                                                   {(['heading', 'body'] as const).map((mode) => (
                                                      <button
                                                         key={mode}
                                                         onClick={() => setFontConfigMode(mode)}
                                                         className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${fontConfigMode === mode ? 'bg-zen-brown text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                                                      >
                                                         {mode === 'heading' ? 'Headings' : 'Body Text'}
                                                      </button>
                                                   ))}
                                                </div>
                                             </div>

                                             <div className="space-y-8">
                                                <div className="space-y-4">
                                                   <div className="flex items-center justify-between">
                                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Protocol</label>
                                                      <label className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-purple-600 hover:border-purple-200 hover:shadow-lg transition-all cursor-pointer">
                                                         <Upload size={16} />
                                                         <input type="file" className="hidden" accept=".zip,.ttf,.otf,.woff,.woff2" onChange={(e) => handleFontUpload(e, fontConfigMode)} />
                                                      </label>
                                                   </div>
                                                   <ZenDropdown 
                                                      label="Select Font"
                                                      hideLabel
                                                      options={fontConfigMode === 'heading' ? ['Plus Jakarta Sans', 'Inter', 'Outfit', 'Roboto', 'Poppins'] : ['Plus Jakarta Sans', 'Inter', 'Outfit', 'Roboto', 'Montserrat']}
                                                      value={settings.theme[fontConfigMode === 'heading' ? 'headingFont' : 'bodyFont'].match(/uploads/i) ? 'Custom Font (Uploaded)' : settings.theme[fontConfigMode === 'heading' ? 'headingFont' : 'bodyFont']}
                                                      onChange={(val) => setSettings(prev => prev ? {...prev, theme: {...prev.theme, [fontConfigMode === 'heading' ? 'headingFont' : 'bodyFont']: val}} : null)}
                                                      fontFamily={settings.theme[fontConfigMode === 'heading' ? 'headingFont' : 'bodyFont'].match(/uploads/i) ? (fontConfigMode === 'heading' ? 'CustomHeadingFont' : 'CustomBodyFont') : settings.theme[fontConfigMode === 'heading' ? 'headingFont' : 'bodyFont']}
                                                   />
                                                </div>

                                                <div className="p-6 bg-white/40 rounded-3xl border border-slate-200/60 backdrop-blur-sm space-y-4">
                                                   <div className="flex items-center justify-between opacity-40">
                                                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Asset Validation</span>
                                                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                                   </div>
                                                   <p className="text-[11px] font-medium leading-relaxed text-slate-500">
                                                      Configure the <span className="font-black text-slate-700 uppercase tracking-tighter">{fontConfigMode}</span> layer of your visual identity. Uploaded assets are automatically optimized for cross-browser delivery.
                                                   </p>
                                                </div>
                                             </div>
                                          </div>

                                          {/* Specimen Preview Section */}
                                          <div className="lg:col-span-7 flex flex-col justify-center space-y-12 min-h-[300px]">
                                             <div className="space-y-4">
                                                <h1 
                                                   className={`transition-all duration-700 text-4xl md:text-5xl lg:text-6xl tracking-tight leading-none break-words ${fontConfigMode === 'heading' ? 'text-slate-900 border-l-4 border-purple-500 pl-4 sm:pl-8' : 'text-slate-400 pl-4 sm:pl-8 opacity-40'}`} 
                                                   style={{ fontFamily: settings.theme.headingFont.match(/uploads/i) ? 'CustomHeadingFont' : settings.theme.headingFont }}
                                                >
                                                   Sanctuary Settings
                                                </h1>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] pl-8 sm:pl-12 opacity-30">Heading Specimen</p>
                                             </div>
 
                                             <div className="space-y-4">
                                                <div 
                                                   className={`transition-all duration-700 space-y-2 lg:max-w-xl pl-4 sm:pl-8 ${fontConfigMode === 'body' ? 'border-l-4 border-purple-500 opacity-100' : 'opacity-30'}`} 
                                                   style={{ fontFamily: settings.theme.bodyFont.match(/uploads/i) ? 'CustomBodyFont' : settings.theme.bodyFont }}
                                                >
                                                   <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed">
                                                      Every touchpoint across the experience is calibrated for absolute consistency and reading comfort.
                                                   </p>
                                                   <p className="text-sm sm:text-base text-slate-400 italic">
                                                      The quick brown fox jumps over the lazy dog.
                                                   </p>
                                                </div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] pl-8 sm:pl-12 opacity-30">Body Readability Specimen</p>
                                             </div>
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </section>
                        
                        <div className="flex justify-end pr-4">
                           <button 
                              onClick={() => handleSave('theme')} 
                              disabled={saving}
                              style={{ backgroundColor: settings.theme.primaryColor || '#7E22CE' }}
                              className="hover:brightness-110 text-white px-10 py-4 rounded-[1.25rem] text-sm font-bold shadow-2xl shadow-purple-500/20 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
                           >
                              <Save size={18} />
                              Save Changes
                           </button>
                        </div>
                     </div>
                  )}

                  {activeSection === 'storage' && (
                     <div className="max-w-4xl">
                        <section className="bg-white/80 backdrop-blur-xl p-6 sm:p-12 rounded-[1.5rem] border border-zen-brown/15 shadow-sm">
                           <header className="mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                              <div>
                                 <h3 className="text-3xl font-serif font-bold text-zen-brown tracking-tight">Storage Provider</h3>
                                 <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mt-2">Configure automated file hosting.</p>
                              </div>
                              <div className="flex bg-zen-cream/30 p-1.5 rounded-2xl border border-zen-brown/15">
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
                                 <motion.div key="local" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="p-6 sm:p-10 bg-zen-cream/10 rounded-[1rem] border border-zen-brown/15 flex flex-col sm:flex-row items-center gap-8 group text-center sm:text-left">
                                    <div className="w-20 h-20 rounded-[1rem] bg-white flex items-center justify-center text-zen-sand shadow-sm group-hover:scale-110 transition-transform duration-700">
                                       <HardDrive size={36} strokeWidth={1} />
                                    </div>
                                    <div>
                                       <h4 className="text-2xl font-serif font-bold text-zen-brown">Local Filesystem</h4>
                                       <p className="text-[10px] font-bold text-zen-brown/20 uppercase tracking-widest mt-1">Documents are stored in your private workspace.</p>
                                    </div>
                                 </motion.div>
                              ) : (
                                 <motion.div key="cloudinary" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-8">
                                    <div className="bg-zen-cream/10 p-6 sm:p-10 rounded-[1rem] border border-zen-brown/15 space-y-8">
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
                              <ZenButton onClick={() => handleSave('upload')} className="w-full py-5 rounded-[1.5rem] text-lg shadow-sm">
                                 Update Storage Gateway
                              </ZenButton>
                           </div>
                        </section>
                     </div>
                  )}

                   {activeSection === 'alerts' && (
                      <div className="bg-white/80 backdrop-blur-xl p-6 sm:p-12 rounded-[1.5rem] border border-zen-brown/15 shadow-sm">
                         <header className="mb-12 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
                            <div>
                               <h3 className="text-3xl font-serif font-bold text-zen-brown tracking-tight">Notification</h3>
                               <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.4em] mt-2">Manage communication channels and Firebase dispatch.</p>
                            </div>
                            <div className="flex items-center gap-6 p-4 bg-zen-cream/30 rounded-3xl border border-zen-brown/10 backdrop-blur-md">
                               <div className="flex flex-col items-end">
                                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">System Status</p>
                                  <p className="text-sm font-serif font-bold text-zen-sand">{settings.notifications.pushEnabled ? 'Active Relay' : 'Standby Mode'}</p>
                               </div>
                               <button 
                                  onClick={() => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, pushEnabled: !prev.notifications.pushEnabled}} : null)}
                                  className={`w-16 h-8 rounded-full flex items-center px-1 transition-all duration-500 ${settings.notifications.pushEnabled ? 'bg-zen-sand shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-zen-brown/10'}`}
                               >
                                  <motion.div layout className="w-6 h-6 rounded-full bg-white shadow-sm" animate={{ x: settings.notifications.pushEnabled ? 32 : 0 }} />
                                </button>
                             </div>
                          </header>
 
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 relative z-10">
                             <ZenInput 
                                label="FIREBASE PUBLIC VAPID KEY (KEY PAIR)" 
                                value={settings.notifications.firebaseVapidKey || ''} 
                                onChange={(e: any) => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, firebaseVapidKey: e.target.value}} : null)} 
                             />
                             <ZenInput 
                                label="FIREBASE API KEY" 
                                value={settings.notifications.firebaseApiKey || ''} 
                                onChange={(e: any) => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, firebaseApiKey: e.target.value}} : null)} 
                             />
                             <ZenInput 
                                label="FIREBASE AUTH DOMAIN" 
                                value={settings.notifications.firebaseAuthDomain || ''} 
                                onChange={(e: any) => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, firebaseAuthDomain: e.target.value}} : null)} 
                             />
                             <ZenInput 
                                label="FIREBASE PROJECT ID" 
                                value={settings.notifications.firebaseProjectId || ''} 
                                onChange={(e: any) => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, firebaseProjectId: e.target.value}} : null)} 
                             />
                             <ZenInput 
                                label="FIREBASE STORAGE BUCKET" 
                                value={settings.notifications.firebaseStorageBucket || ''} 
                                onChange={(e: any) => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, firebaseStorageBucket: e.target.value}} : null)} 
                             />
                             <ZenInput 
                                label="FIREBASE MESSAGE SENDER ID" 
                                value={settings.notifications.firebaseMessagingSenderId || ''} 
                                onChange={(e: any) => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, firebaseMessagingSenderId: e.target.value}} : null)} 
                             />
                             <ZenInput 
                                label="FIREBASE APP ID" 
                                value={settings.notifications.firebaseAppId || ''} 
                                onChange={(e: any) => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, firebaseAppId: e.target.value}} : null)} 
                             />
                             <ZenInput 
                                label="FIREBASE MEASUREMENT ID" 
                                value={settings.notifications.firebaseMeasurementId || ''} 
                                onChange={(e: any) => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, firebaseMeasurementId: e.target.value}} : null)} 
                             />
                             <ZenInput 
                                label="FIREBASE SERVICE ACCOUNT ID (CLIENT EMAIL)" 
                                value={settings.notifications.firebaseClientEmail || ''} 
                                onChange={(e: any) => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, firebaseClientEmail: e.target.value}} : null)} 
                             />
                             <div className="md:col-span-2">
                                <ZenTextarea 
                                   label="FIREBASE PRIVATE KEY" 
                                   placeholder="-----BEGIN PRIVATE KEY-----"
                                   value={settings.notifications.firebasePrivateKey || ''} 
                                   onChange={(e: any) => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, firebasePrivateKey: e.target.value}} : null)} 
                                />
                             </div>
                             
                             <div className="space-y-4">
                                <label className="text-[10px] font-black text-zen-brown/30 uppercase tracking-[0.3em] ml-2 block">
                                   File (JSON) {settings.notifications.firebasePrivateKey ? '— ✓ Configured' : ''}
                                </label>
                                <div className="flex items-center gap-4 bg-zen-cream/30 p-2 rounded-2xl border border-zen-brown/10">
                                   <input 
                                      type="file" 
                                      accept=".json"
                                      onChange={async (e) => {
                                         const file = e.target.files?.[0];
                                         if (!file) return;
                                         setSaving(true);
                                         try {
                                            const formData = new FormData();
                                            formData.append('firebaseJSON', file);
                                            const res = await fetch(`${API_URL}/settings/upload-firebase-config`, {
                                               method: 'POST',
                                               headers: { 'Authorization': `Bearer ${user?.token}` },
                                               body: formData
                                            });
                                            const data = await res.json();
                                            if (res.ok) {
                                               setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, ...data.config}} : null);
                                               notify('success', 'Config Imported', 'Firebase service account parsed successfully. Click "Update Logic" to save.');
                                            } else {
                                               notify('error', 'Import Failed', data.message);
                                            }
                                         } catch (err) {
                                            notify('error', 'Network Error', 'Failed to synchronize config file.');
                                         } finally {
                                            setSaving(false);
                                         }
                                      }}
                                      className="text-xs text-zen-brown/50 file:mr-4 file:py-2 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-white file:text-zen-brown file:uppercase file:tracking-widest hover:file:bg-zen-sand transition-all cursor-pointer"
                                   />
                                </div>
                             </div>
                          </div>
 
                          {/* Test Block */}
                          <div className="mt-12 p-8 bg-zen-cream/20 rounded-3xl border border-zen-brown/10 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                             <div className="flex items-center gap-6">
                                <div className="p-4 bg-white text-zen-sand rounded-2xl shadow-sm border border-zen-brown/5"><Activity size={24} /></div>
                                <div>
                                   <p className="text-lg font-serif font-bold text-zen-brown">Signal Diagnostic</p>
                                   <p className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest mt-1">Verify push notification relay</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-4 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64">
                                   <input 
                                      type="text" 
                                      placeholder="Target Device Token..." 
                                      className="bg-white border border-zen-brown/10 rounded-xl px-4 py-2.5 text-xs text-zen-brown focus:outline-none focus:ring-4 focus:ring-zen-sand/5 w-full transition-all pr-24"
                                      value={settings.notifications.fcmToken || ''}
                                      onChange={(e: any) => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, fcmToken: e.target.value}} : null)}
                                   />
                                   <button 
                                      onClick={async () => {
                                         const currentSettings = settings;
                                         if (!currentSettings) return;
                                         
                                         try {
                                            if (!('Notification' in window)) {
                                               notify('error', 'Unsupported', 'Browser does not support notifications.');
                                               return;
                                            }
                                            
                                            setSaving(true);
                                            // Dynamic import to avoid bundle overhead if not used
                                            const { initializeApp } = await import('firebase/app');
                                            const { getMessaging, getToken } = await import('firebase/messaging');

                                            const firebaseConfig = {
                                               apiKey: currentSettings.notifications.firebaseApiKey,
                                               authDomain: currentSettings.notifications.firebaseAuthDomain,
                                               projectId: currentSettings.notifications.firebaseProjectId,
                                               storageBucket: currentSettings.notifications.firebaseStorageBucket,
                                               messagingSenderId: currentSettings.notifications.firebaseMessagingSenderId,
                                               appId: currentSettings.notifications.firebaseAppId,
                                            };

                                            if (!firebaseConfig.apiKey || !firebaseConfig.messagingSenderId) {
                                               setSaving(false);
                                               notify('error', 'Config Incomplete', 'Provide API Key and Sender ID first.');
                                               return;
                                            }

                                            const appName = 'diagnostic-app-' + Date.now();
                                            const app = initializeApp(firebaseConfig, appName);
                                            const messaging = getMessaging(app);

                                            const permission = await Notification.requestPermission();
                                            if (permission !== 'granted') {
                                               setSaving(false);
                                               notify('warning', 'Permission Required', 'Please allow notifications to retrieve your token.');
                                               return;
                                            }

                                            const token = await getToken(messaging, { 
                                               vapidKey: currentSettings.notifications.firebaseVapidKey 
                                            });

                                            if (token) {
                                               setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, fcmToken: token}} : null);
                                               if (navigator.clipboard) {
                                                  navigator.clipboard.writeText(token);
                                                  notify('success', 'Token Captured', 'Device token retrieved and copied to clipboard.');
                                               } else {
                                                  notify('success', 'Token Captured', 'Device token retrieved successfully.');
                                               }
                                            } else {
                                               notify('info', 'Token Unavailable', 'Ensure VAPID key is correct and valid.');
                                            }
                                         } catch (e: any) {
                                            console.error('FCM Token Retrieval Error:', e);
                                            notify('error', 'Retrieval Failed', e.message || 'Check browser console for details.');
                                         } finally {
                                            setSaving(false);
                                         }
                                      }}
                                      className="absolute right-1.5 top-1.5 bottom-1.5 bg-zen-cream text-zen-sand px-3 rounded-lg text-[8px] font-black uppercase tracking-tighter hover:bg-zen-sand hover:text-white transition-all"
                                   >
                                      My Token
                                   </button>
                                </div>
                                <button 
                                   onClick={async () => {
                                      try {
                                         const res = await fetch(`${API_URL}/settings/test-notification`, {
                                            method: 'POST',
                                            headers: { 
                                               'Authorization': `Bearer ${user?.token}`,
                                               'Content-Type': 'application/json'
                                            },
                                            body: JSON.stringify({ token: settings.notifications.fcmToken })
                                         });
                                         const data = await res.json();
                                         if (res.ok) notify('success', 'Signal Sent', data.message);
                                         else notify('error', 'Signal Failed', data.message);
                                      } catch (e) {
                                         notify('error', 'Network Error', 'Could not reach push relay.');
                                      }
                                   }}
                                   className="bg-zen-brown text-white px-8 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zen-sand transition-all shadow-lg whitespace-nowrap"
                                >
                                   Test Signal
                                </button>
                             </div>
                          </div>
 
                          <footer className="mt-12 pt-10 border-t border-zen-brown/15 flex justify-end relative z-10">
                             <ZenButton 
                                onClick={() => handleSave('notifications')} 
                                disabled={saving}
                                className="px-12 py-5 rounded-[1.5rem] shadow-sm transition-all text-lg"
                             >
                                <Save className="mr-2" size={20} />
                                Update Logic
                             </ZenButton>
                          </footer>
                       </div>
                    )}

                  {activeSection === 'smtp' && (
                     <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                        <div className="xl:col-span-8 bg-white/80 backdrop-blur-xl p-6 sm:p-12 rounded-[1.5rem] border border-zen-brown/15 shadow-sm">
                           <header className="mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                              <div>
                                 <h3 className="text-3xl font-serif font-bold text-zen-brown tracking-tight">SMTP Gateway</h3>
                                 <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mt-2">Manage dynamic outbound communication credentials.</p>
                              </div>
                              <div className="w-16 h-16 bg-zen-cream/20 rounded-[1rem] flex items-center justify-center text-zen-sand border border-zen-brown/15 shrink-0">
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
                                    onChange={(e: any) => setSettings(prev => prev ? {...prev, smtp: {...(prev.smtp || {host: '', port: 587, user: '', password: '', fromName: '', fromEmail: '', encryption: 'tls'}), fromName: e.target.value}} : null)}
                                 />
                                 <ZenInput 
                                    label="Default From Email"
                                    placeholder="noreply@yourdomain.com"
                                    value={settings.smtp?.fromEmail || ''}
                                    onChange={(e: any) => setSettings(prev => prev ? {...prev, smtp: {...(prev.smtp || {host: '', port: 587, user: '', password: '', fromName: '', fromEmail: '', encryption: 'tls'}), fromEmail: e.target.value}} : null)}
                                 />
                              </div>

                              <div className="space-y-4">
                                 <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-zen-brown/30 uppercase tracking-[0.3em] ml-2">Mail Encryption</label>
                                    <p className="text-[9px] font-bold text-zen-sand uppercase tracking-widest bg-zen-sand/5 px-2 py-0.5 rounded-md">
                                       {settings.smtp?.port === 587 ? 'STARTTLS (Port 587)' : settings.smtp?.port === 465 ? 'Direct SSL (Port 465)' : 'Custom Protocol'}
                                    </p>
                                 </div>
                                 <div className="flex bg-zen-cream/30 p-1.5 rounded-2xl border border-zen-brown/10 w-fit">
                                    {['ssl', 'tls', 'none'].map((enc) => (
                                       <button 
                                          key={enc}
                                          onClick={() => setSettings(prev => prev ? {...prev, smtp: {...(prev.smtp || {host: '', port: 587, user: '', password: '', fromName: '', fromEmail: '', encryption: 'tls'}), encryption: enc as any}} : null)}
                                          className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${settings.smtp?.encryption === enc ? 'bg-white text-zen-brown shadow-lg' : 'text-zen-brown/40 hover:text-zen-brown'}`}
                                       >
                                          {enc.toUpperCase()}
                                       </button>
                                    ))}
                                 </div>
                              </div>

                              <div className="pt-8 border-t border-zen-brown/5 space-y-6">
                                 <div className="max-w-md">
                                    <ZenInput 
                                       label="Test Delivery Address"
                                       placeholder="Enter email to receive test message..."
                                       icon={Mail}
                                       value={testTargetEmail}
                                       onChange={(e: any) => setTestTargetEmail(e.target.value)}
                                    />
                                    <p className="text-[10px] font-bold text-zen-brown/20 uppercase tracking-widest mt-2 ml-2">Specify where the synchronization signal should be sent.</p>
                                 </div>
                              </div>
                           </div>

                           <footer className="mt-12 pt-10 border-t border-zen-brown/15 flex flex-col sm:flex-row justify-end gap-4">
                              <ZenButton 
                                 variant="outline"
                                 onClick={handleTestSMTP}
                                 disabled={saving}
                                 className="px-8 py-5 rounded-[1.5rem] shadow-sm transition-all text-sm uppercase tracking-widest font-black"
                              >
                                 Test Gateway
                              </ZenButton>
                              <ZenButton 
                                 onClick={() => handleSave('smtp' as any)}
                                 disabled={saving}
                                 className="px-12 py-5 rounded-[1.5rem] shadow-sm transition-all text-lg"
                              >
                                 Verify & Save
                              </ZenButton>
                           </footer>
                        </div>

                        <div className="xl:col-span-4 h-full">
                           <div className="bg-zen-brown p-6 sm:p-10 rounded-[2rem] text-white shadow-xl relative overflow-hidden h-full group">
                              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-1000">
                                 <ShieldCheck size={180} />
                              </div>
                              <h4 className="text-2xl font-serif font-bold mb-6 flex items-center gap-3 relative z-10">
                                 Security Protocol
                              </h4>
                              <p className="text-sm font-medium text-white/90 leading-relaxed relative z-10">
                                 Your SMTP credentials are encrypted and stored securely within our infrastructure. 
                                 For standard configuration, use port **587** with TLS. For legacy systems, port **465** provides direct SSL.
                              </p>
                              <div className="mt-8 space-y-4 relative z-10">
                                 <div className="p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-2">Service Status</p>
                                    <div className="flex items-center gap-3">
                                       <div className={`w-2.5 h-2.5 rounded-full ${settings.smtp?.host ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)] animate-pulse' : 'bg-rose-400 shadow-[0_0_12px_rgba(251,113,113,0.5)]'}`} />
                                       <p className="text-sm font-bold text-white tracking-tight">{settings.smtp?.host ? 'Communication Active' : 'Provider Pending'}</p>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {activeSection === 'whatsapp' && (
                     <div className="space-y-12 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center gap-6 mb-12">
                           <div className="w-16 h-16 rounded-[1.5rem] bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
                              <MessageSquare size={32} />
                           </div>
                           <div>
                              <h2 className="text-3xl font-serif font-bold text-zen-brown tracking-tight">WhatsApp Gateway</h2>
                              <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.4em] mt-2 italic">Automated Customer Dissemination</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                           <div className="space-y-8 p-10 bg-white/40 rounded-[2rem] border border-zen-brown/15 shadow-sm group hover:bg-white/80 transition-all duration-700">
                              <div className="flex items-center justify-between mb-4">
                                 <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-zen-brown">Instance Credentials</h3>
                                 <ZenBadge variant={settings.whatsapp.enabled ? 'leaf' : 'stone'}>
                                    {settings.whatsapp.enabled ? 'Channel Live' : 'Channel Paused'}
                                 </ZenBadge>
                              </div>

                              <ZenInput 
                                label="Provider"
                                placeholder="e.g. ultramsg"
                                value={settings.whatsapp.provider}
                                onChange={(e: any) => setSettings(prev => prev ? {...prev, whatsapp: {...prev.whatsapp, provider: e.target.value}} : null)}
                                icon={Layout}
                              />

                              <ZenInput 
                                label="Instance ID"
                                placeholder="e.g. instance12345"
                                value={settings.whatsapp.instanceId}
                                onChange={(e: any) => setSettings(prev => prev ? {...prev, whatsapp: {...prev.whatsapp, instanceId: e.target.value}} : null)}
                                icon={Zap}
                              />

                              <ZenInput 
                                label="Token / API Key"
                                type="password"
                                placeholder="Your private access token"
                                value={settings.whatsapp.token}
                                onChange={(e: any) => setSettings(prev => prev ? {...prev, whatsapp: {...prev.whatsapp, token: e.target.value}} : null)}
                                icon={ShieldCheck}
                              />

                              <div className="flex items-center justify-between pt-4">
                                 <span className="text-[11px] font-bold text-zen-brown/50 uppercase tracking-widest">Enable Messaging</span>
                                 <button 
                                   onClick={() => setSettings(prev => prev ? {...prev, whatsapp: {...prev.whatsapp, enabled: !prev.whatsapp.enabled}} : null)}
                                   className={`w-12 h-6 rounded-full transition-all duration-500 relative ${settings.whatsapp.enabled ? 'bg-[#25D366]' : 'bg-stone-300'}`}
                                 >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-500 ${settings.whatsapp.enabled ? 'left-7' : 'left-1'}`} />
                                 </button>
                              </div>
                              
                              <ZenButton onClick={() => handleSave('whatsapp')} className="w-full py-4 rounded-[1.5rem]">
                                 Update Gateway
                              </ZenButton>
                           </div>

                           <div className="p-10 bg-gradient-to-tr from-zen-brown to-stone-800 rounded-[2rem] text-white shadow-xl shadow-zen-brown/20 relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                                 <Sparkles size={180} />
                              </div>
                              <div className="relative z-10">
                                 <h4 className="text-xl font-serif font-bold mb-6 tracking-tight">Active Reach Protocol</h4>
                                 <p className="text-sm text-stone-300 leading-relaxed mb-10 italic">"Ensure your WhatsApp Instance is paired with a physical device before enabling. This connection allows the CRM to broadcast directly through your primary business line."</p>
                                 
                                 <div className="space-y-6">
                                    <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                                       <div className="w-2 h-2 rounded-full bg-zen-sand" />
                                       UltraMsg Certified
                                    </div>
                                    <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                                       <div className="w-2 h-2 rounded-full bg-zen-sand" />
                                       E2E Encryption Maintained
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {activeSection === 'payroll' && (
                     <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                        <div className="xl:col-span-8 bg-white/80 backdrop-blur-xl p-5 sm:p-12 rounded-[1.5rem] border border-zen-brown/15 shadow-sm">
                           <header className="mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                              <div>
                                 <h3 className="text-3xl font-serif font-bold text-zen-brown tracking-tight">Leave & Payroll Policy</h3>
                                 <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mt-2">Harmonize employment compensation and absence thresholds.</p>
                              </div>
                              <div className="w-16 h-16 bg-zen-cream/20 rounded-[1rem] flex items-center justify-center text-zen-sand border border-zen-brown/15 shrink-0">
                                 <Clock size={28} strokeWidth={1.5} />
                              </div>
                           </header>

                           <div className="space-y-12">
                              {/* Leave Thresholds */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 <div className="p-6 sm:p-10 rounded-[2rem] border transition-all duration-500 bg-white border-zen-sand shadow-lg">
                                    <div className="flex items-center gap-4 mb-8">
                                       <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-zen-sand text-white">
                                          <Sun size={24} />
                                       </div>
                                       <div>
                                          <h4 className="text-lg font-serif font-bold text-zen-brown">Monthly Threshold</h4>
                                          <p className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest">Paid leaves per month</p>
                                       </div>
                                    </div>
                                    <ZenInput 
                                       label="Allowed Paid Leaves (Days)"
                                       type="number"
                                       value={settings.payroll.allowedPaidLeaves}
                                       onChange={(e: any) => setSettings(prev => prev ? {...prev, payroll: {...prev.payroll, allowedPaidLeaves: parseFloat(e.target.value)}} : null)}
                                    />
                                    <p className="text-[10px] font-medium text-zen-brown/40 leading-relaxed mt-4 italic">
                                       Absence exceeding this limit will trigger daily rate deductions for monthly employees.
                                    </p>
                                 </div>

                                 <div className="p-6 sm:p-10 rounded-[2rem] border transition-all duration-500 bg-white border-zen-sand shadow-lg">
                                    <div className="flex items-center gap-4 mb-8">
                                       <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-zen-sand text-white">
                                          <Activity size={24} />
                                       </div>
                                       <div>
                                          <h4 className="text-lg font-serif font-bold text-zen-brown">Hourly Threshold</h4>
                                          <p className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest">Paid hours per month</p>
                                       </div>
                                    </div>
                                    <ZenInput 
                                       label="Allowed Paid Hours (Hours)"
                                       type="number"
                                       value={settings.payroll.allowedPaidHours}
                                       onChange={(e: any) => setSettings(prev => prev ? {...prev, payroll: {...prev.payroll, allowedPaidHours: parseFloat(e.target.value)}} : null)}
                                    />
                                    <p className="text-[10px] font-medium text-zen-brown/40 leading-relaxed mt-4 italic">
                                       Absence exceeding this limit will trigger hourly rate deductions for hourly employees.
                                    </p>
                                 </div>
                              </div>
                           </div>

                           <footer className="mt-12 pt-10 border-t border-zen-brown/15 flex justify-end">
                              <ZenButton 
                                 onClick={() => handleSave('payroll')}
                                 disabled={saving}
                                 className="px-12 py-5 rounded-[1.5rem] shadow-sm transition-all text-lg"
                              >
                                 Sync Policy
                              </ZenButton>
                           </footer>
                        </div>

                        <div className="xl:col-span-4">
                           <div className="bg-zen-brown p-10 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-1000">
                                 <ShieldCheck size={180} />
                              </div>
                              <h4 className="text-2xl font-serif font-bold mb-8 relative z-10">Payroll Equilibrium</h4>
                              <p className="text-sm font-medium text-white/95 leading-relaxed relative z-10 mb-8">
                                 The Sanctuary payroll engine automatically recalibrates employee compensation based on these global thresholds.
                              </p>
                              
                              <div className="space-y-6 relative z-10">
                                 <div className="p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-amber-200">Monthly Logic</h5>
                                    <p className="text-xs text-white/85 leading-relaxed">
                                       Payroll = Base Salary - ((Leaves - Paid Threshold) * Daily Rate)
                                    </p>
                                 </div>
                                 <div className="p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-amber-200">Hourly Logic</h5>
                                    <p className="text-xs text-white/85 leading-relaxed">
                                       Payroll = (Hours Worked - (Max Potential - Paid Threshold)) * Hourly Rate
                                    </p>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {activeSection === 'tax' && (
                     <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8 bg-white/80 backdrop-blur-xl p-6 sm:p-12 rounded-[1.5rem] border border-zen-brown/15 shadow-sm">
                           <header className="mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                              <div>
                                 <h3 className="text-3xl font-serif font-bold text-zen-brown tracking-tight">Taxation Registry</h3>
                                 <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mt-2">Standardized Fiscal Control & Audit Compliance.</p>
                              </div>
                              <ZenButton onClick={() => openTaxModal()} className="px-8 py-3.5 rounded-xl shadow-sm text-sm flex items-center justify-center gap-2 w-full sm:w-auto">
                                 <Plus size={18} />
                                 <span>Create Rate</span>
                              </ZenButton>
                           </header>

                           <div className="table-container bg-white rounded-2xl border border-zen-brown/10 shadow-sm min-h-[400px] overflow-hidden overflow-x-auto">
                              {taxLoading ? (
                                 <div className="p-20 text-center italic opacity-20">Syncing registry...</div>
                              ) : (
                                 <table className="w-full text-center border-collapse min-w-[700px]">
                                    <thead>
                                       <tr>
                                          <th>S NO</th>
                                          <th>Rate Protocol</th>
                                          <th>Calculated Value</th>
                                          <th>Status</th>
                                          <th>Actions</th>
                                       </tr>
                                    </thead>
                                    <tbody>
                                       {taxRates.length === 0 && (
                                          <tr>
                                             <td colSpan={5} className="p-20 text-center text-zen-brown/30 italic">No tax protocols established.</td>
                                          </tr>
                                       )}
                                       {taxRates.map((rate, index) => (
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
                                                      onClick={() => openTaxModal(rate)} 
                                                   />
                                                   <ZenIconButton 
                                                      icon={Trash2} 
                                                      variant="danger" 
                                                      onClick={() => setTaxConfirmState({ isOpen: true, id: rate._id })} 
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

                        <div className="lg:col-span-4 space-y-8 h-full">
                           <div className="bg-zen-brown p-10 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-1000">
                                 <Percent size={180} />
                              </div>
                              <h3 className="text-2xl font-serif font-bold mb-8 relative z-10">Global Tax Master</h3>
                              <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm shadow-xl relative z-10">
                                 <div>
                                    <span className="block font-black text-[10px] uppercase tracking-widest text-white/40 mb-1">Taxation Status</span>
                                    <span className={`font-bold text-sm ${settings.general.billing?.gstEnabled ? 'text-emerald-400' : 'text-amber-200'}`}>
                                       {settings.general.billing?.gstEnabled ? 'OPERATIONAL' : 'PAUSED'}
                                    </span>
                                 </div>
                                 <button 
                                    onClick={handleToggleGST}
                                    className={`w-14 h-7 rounded-full transition-all duration-500 relative ${settings.general.billing?.gstEnabled ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-white/10'}`}
                                 >
                                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-500 ${settings.general.billing?.gstEnabled ? 'left-8' : 'left-1'}`} />
                                 </button>
                              </div>
                              <p className="mt-8 text-[11px] font-medium leading-relaxed text-white/60 relative z-10">
                                 Toggling this master switch enables or disables tax calculations across all checkout rituals and financial statements.
                              </p>
                           </div>

                           <div className="bg-zen-brown p-10 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
                              <ShieldCheck className="absolute -right-8 -bottom-8 text-white/5 w-48 h-48 group-hover:scale-110 transition-transform duration-1000" />
                              <h4 className="text-xl font-serif font-bold mb-4 relative z-10">Best Practice</h4>
                              <p className="text-sm font-medium leading-relaxed text-white/90 relative z-10">
                                 Maintain a single active rate protocol for consistency. Obsolete rates should be archived or removed to ensure audit integrity.
                              </p>
                           </div>
                        </div>
                     </div>
                  )}
               </motion.div>
            </AnimatePresence>
         </main>
      </div>

      {/* Tax Management Modal */}
      <Modal 
        isOpen={isTaxModalOpen} 
        onClose={() => setIsTaxModalOpen(false)} 
        title={editingTaxRate ? "Edit Tax Rate" : "New Tax Rate"} 
        subtitle="Calibrate your fiscal protocols"
        maxWidth="max-w-4xl"
        headerIcon={Percent}
        footer={
          <div className="flex w-full gap-6">
            <ZenButton
              type="button"
              variant="secondary"
              className="flex-1 rounded-[2rem] py-5"
              onClick={() => setIsTaxModalOpen(false)}
            >
              Cancel
            </ZenButton>
            <ZenButton
              type="button"
              onClick={handleSaveTaxRate}
              className="flex-[2] rounded-[2rem] py-5 shadow-sm shadow-zen-brown/20 flex items-center justify-center gap-3"
            >
              <span>{editingTaxRate ? 'Update Protocol' : 'Set Protocol'}</span>
              <BadgeDollarSign size={18} />
            </ZenButton>
          </div>
        }
      >
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] p-2">
            <div className="rounded-[1.5rem] border border-zen-brown/10 bg-zen-cream/50 p-6 sm:p-8 space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-zen-brown/10 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-zen-brown/50">
                <Percent size={12} />
                Taxation Note
              </div>
              <h3 className="text-2xl font-serif font-bold text-zen-brown">Fiscal Controls</h3>
              <p className="text-sm leading-relaxed text-zen-brown/60">
                This percentage will be applied globally across all service rituals and product inventory checkouts. Ensure naming follows regulatory standards.
              </p>

              <div className="rounded-[1.25rem] border border-white/70 bg-white/80 p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/35">
                  Calculation Method
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zen-brown/65">
                  Final Price = Net Price + (Net Price × Tax %)
                </p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-zen-brown/10 bg-white/80 p-6 sm:p-8 space-y-8">
              <ZenInput
                label="Tax Protocol Name"
                value={taxFormData.name}
                placeholder="e.g. Standard GST"
                onChange={(e: any) => setTaxFormData({ ...taxFormData, name: e.target.value })}
              />
              <ZenInput
                label="Tax Percentage"
                type="number"
                value={taxFormData.percentage}
                placeholder="0.00"
                onChange={(e: any) => setTaxFormData({ ...taxFormData, percentage: parseFloat(e.target.value) })}
              />
              <div className="rounded-[1.25rem] border border-zen-brown/10 bg-zen-cream/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zen-brown/35">
                  Output Preview
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zen-brown/60">
                   {taxFormData.name || 'Protocol'} — {taxFormData.percentage || 0}% applied on every transaction.
                </p>
              </div>
            </div>
          </div>
      </Modal>

      <ConfirmDialog 
        isOpen={taxConfirmState.isOpen}
        onClose={() => setTaxConfirmState({ isOpen: false, id: '' })}
        onConfirm={handleDeleteTaxRate}
        title="Archive Tax Protocol"
        message="Are you sure you want to permanently remove this tax rate from the sanctuary registry?"
      />
    </ZenPageLayout>
  );
};

export default Settings;
