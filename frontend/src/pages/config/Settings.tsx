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
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenBadge, ZenButton, ZenIconButton } from '../../components/zen/ZenButtons';
import { ZenInput, ZenTextarea, ZenDropdown } from '../../components/zen/ZenInputs';
import { notify } from '../../components/shared/ZenNotification';
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

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchSettings();
  }, []);

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
        notifications: data?.notifications || { pushEnabled: false },
        smtp: data?.smtp || { host: '', port: 587, user: '', password: '', fromName: '', fromEmail: '' }
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
    { id: 'smtp', name: 'SMTP', icon: ShieldCheck, sub: 'Outbound Configuration' },
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
              
               <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-1 scrollbar-hide">
                 {sidebarItems.map((item) => (
                    <button
                       key={item.id}
                       onClick={() => setActiveSection(item.id as SettingsSection)}
                       className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-sans font-bold text-[13px] group relative ${
                         activeSection === item.id 
                           ? 'bg-purple-100/40 text-purple-800' 
                           : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                       }`}
                    >
                       <item.icon size={18} className={activeSection === item.id ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-600'} />
                       <span>{item.name}</span>
                       {activeSection === item.id && (
                          <motion.div 
                             layoutId="sidebarActive"
                             className="absolute right-3 w-1.5 h-1.5 rounded-full bg-purple-600"
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
                        <div className="xl:col-span-8 bg-white/80 backdrop-blur-xl p-12 rounded-[1.5rem] border border-zen-brown/15 shadow-sm">
                           <header className="mb-12 flex items-center justify-between">
                              <div>
                                 <h3 className="text-3xl font-serif font-bold text-zen-brown tracking-tight">Business Profile</h3>
                                 <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mt-2">Manage your platform's public identity.</p>
                              </div>
                              <div className="w-16 h-16 bg-zen-cream/20 rounded-[1rem] flex items-center justify-center text-zen-sand border border-zen-brown/15">
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
                           <div className="bg-zen-brown p-10 rounded-[1.5rem] text-white shadow-sm relative overflow-hidden group min-h-[400px]">
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
                        <section className="bg-white p-10 md:p-14 rounded-[2rem] border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative">
                           
                           <header className="flex items-center gap-5 mb-14">
                              <div className="w-14 h-14 rounded-full flex items-center justify-center text-purple-700 bg-purple-50">
                                 <Palette size={24} strokeWidth={2} />
                              </div>
                              <h2 className="text-[22px] font-sans font-bold text-slate-900 tracking-tight">Appearance Settings</h2>
                           </header>
                           
                           <div className="space-y-12 font-sans">
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
                                 
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Heading Font Specimen */}
                                    <div className="group relative bg-slate-50/50 rounded-3xl p-8 border border-slate-100 transition-all hover:bg-white hover:shadow-xl hover:shadow-purple-500/5">
                                       <div className="flex items-center justify-between mb-8">
                                          <div>
                                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Heading Specimen</label>
                                             <p className="text-[11px] font-bold text-purple-600">Serif Presence</p>
                                          </div>
                                          <label className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-slate-400 hover:text-purple-600 hover:shadow-md transition-all cursor-pointer">
                                             <Upload size={16} />
                                             <input type="file" className="hidden" accept=".zip,.ttf,.otf,.woff,.woff2" onChange={(e) => handleFontUpload(e, 'heading')} />
                                          </label>
                                       </div>

                                       <div className="mb-8 py-6 px-4 border-y border-slate-200/50">
                                          <h1 className="text-4xl text-slate-900 leading-tight truncate" style={{ fontFamily: settings.theme.headingFont.match(/uploads/i) ? 'CustomHeadingFont' : settings.theme.headingFont }}>
                                             Platform Settings
                                          </h1>
                                          <p className="text-[10px] font-medium text-slate-400 mt-2 uppercase tracking-[0.2em] leading-relaxed">Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk</p>
                                       </div>

                                       <ZenDropdown 
                                          label="Select Architecture"
                                          hideLabel
                                          options={['Plus Jakarta Sans', 'Inter', 'Outfit', 'Roboto', 'Poppins']}
                                          value={settings.theme.headingFont.match(/uploads/i) ? 'Custom Font' : settings.theme.headingFont}
                                          onChange={(val) => setSettings(prev => prev ? {...prev, theme: {...prev.theme, headingFont: val}} : null)}
                                       />
                                       
                                       {settings.theme.headingFont.match(/uploads/i) && (
                                          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-100">
                                             <Check size={12} strokeWidth={3} /> Verified Asset
                                          </div>
                                       )}
                                    </div>

                                    {/* Body Font Specimen */}
                                    <div className="group relative bg-slate-50/50 rounded-3xl p-8 border border-slate-100 transition-all hover:bg-white hover:shadow-xl hover:shadow-purple-500/5">
                                       <div className="flex items-center justify-between mb-8">
                                          <div>
                                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Body Specimen</label>
                                             <p className="text-[11px] font-bold text-purple-600">Sans Readability</p>
                                          </div>
                                          <label className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-slate-400 hover:text-purple-600 hover:shadow-md transition-all cursor-pointer">
                                             <Upload size={16} />
                                             <input type="file" className="hidden" accept=".zip,.ttf,.otf,.woff,.woff2" onChange={(e) => handleFontUpload(e, 'body')} />
                                          </label>
                                       </div>

                                       <div className="mb-8 py-6 px-4 border-y border-slate-200/50">
                                          <div className="space-y-2" style={{ fontFamily: settings.theme.bodyFont.match(/uploads/i) ? 'CustomBodyFont' : settings.theme.bodyFont }}>
                                             <p className="text-sm text-slate-600 font-medium leading-relaxed">Every touchpoint is designed for consistency and reliability.</p>
                                             <p className="text-sm text-slate-400 leading-relaxed italic">The quick brown fox jumps over the lazy dog.</p>
                                          </div>
                                       </div>

                                       <ZenDropdown 
                                          label="Select Architecture"
                                          hideLabel
                                          options={['Plus Jakarta Sans', 'Inter', 'Outfit', 'Roboto', 'Montserrat']}
                                          value={settings.theme.bodyFont.match(/uploads/i) ? 'Custom Font' : settings.theme.bodyFont}
                                          onChange={(val) => setSettings(prev => prev ? {...prev, theme: {...prev.theme, bodyFont: val}} : null)}
                                       />

                                       {settings.theme.bodyFont.match(/uploads/i) && (
                                          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-100">
                                             <Check size={12} strokeWidth={3} /> Verified Asset
                                          </div>
                                       )}
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
                        <section className="bg-white/80 backdrop-blur-xl p-12 rounded-[1.5rem] border border-zen-brown/15 shadow-sm">
                           <header className="mb-12 flex items-center justify-between">
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
                                 <motion.div key="local" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="p-10 bg-zen-cream/10 rounded-[1rem] border border-zen-brown/15 flex items-center gap-8 group">
                                    <div className="w-20 h-20 rounded-[1rem] bg-white flex items-center justify-center text-zen-sand shadow-sm group-hover:scale-110 transition-transform duration-700">
                                       <HardDrive size={36} strokeWidth={1} />
                                    </div>
                                    <div>
                                       <h4 className="text-2xl font-serif font-bold text-zen-brown tracking-tight">Local Filesystem</h4>
                                       <p className="text-[10px] font-bold text-zen-brown/20 uppercase tracking-widest mt-1">Documents are stored in your private workspace.</p>
                                    </div>
                                 </motion.div>
                              ) : (
                                 <motion.div key="cloudinary" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-8">
                                    <div className="bg-zen-cream/10 p-10 rounded-[1rem] border border-zen-brown/15 space-y-8">
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
                      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-full">
                         <div className="xl:col-span-12 bg-white/80 backdrop-blur-xl p-10 sm:p-12 rounded-[1.5rem] border border-zen-brown/15 shadow-sm">
                            <header className="mb-12 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
                               <div>
                                  <h3 className="text-3xl font-serif font-bold text-zen-brown tracking-tight">System Notifications</h3>
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

                            <div className="space-y-12 relative z-10">
                               {/* Section: Firebase Setup */}
                               <div className={`transition-all duration-700 ${settings.notifications.pushEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                  <div className="flex items-center gap-4 mb-10 pb-4 border-b border-zen-brown/10">
                                     <Zap size={20} className="text-zen-sand" />
                                     <h4 className="text-xl font-serif font-bold text-zen-brown tracking-tight uppercase">Firebase Configuration</h4>
                                  </div>

                                  <div className="space-y-12">
                                     {/* Step 1: Client Connectivity */}
                                     <div>
                                        <div className="flex items-center gap-3 mb-8">
                                           <div className="w-8 h-8 rounded-xl bg-zen-cream flex items-center justify-center text-zen-sand text-[10px] font-black border border-zen-brown/10">01</div>
                                           <p className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-[.3em]">Client Connectivity (Web SDK)</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                           <ZenInput label="API Key" value={settings.notifications.firebaseApiKey || ''} onChange={(e: any) => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, firebaseApiKey: e.target.value}} : null)} />
                                           <ZenInput label="Auth Domain" value={settings.notifications.firebaseAuthDomain || ''} onChange={(e: any) => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, firebaseAuthDomain: e.target.value}} : null)} />
                                           <ZenInput label="Project ID" value={settings.notifications.firebaseProjectId || ''} onChange={(e: any) => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, firebaseProjectId: e.target.value}} : null)} />
                                           <ZenInput label="Storage Bucket" value={settings.notifications.firebaseStorageBucket || ''} onChange={(e: any) => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, firebaseStorageBucket: e.target.value}} : null)} />
                                           <ZenInput label="Messaging Sender ID" value={settings.notifications.firebaseMessagingSenderId || ''} onChange={(e: any) => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, firebaseMessagingSenderId: e.target.value}} : null)} />
                                           <ZenInput label="App ID" value={settings.notifications.firebaseAppId || ''} onChange={(e: any) => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, firebaseAppId: e.target.value}} : null)} />
                                        </div>
                                        <div className="mt-8">
                                            <ZenInput label="VAPID Public Key" placeholder="BExXx..." value={settings.notifications.firebaseVapidKey || ''} onChange={(e: any) => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, firebaseVapidKey: e.target.value}} : null)} />
                                        </div>
                                     </div>

                                     {/* Step 2: Server Authorization */}
                                     <div>
                                        <div className="flex items-center gap-3 mb-8">
                                           <div className="w-8 h-8 rounded-xl bg-zen-cream flex items-center justify-center text-zen-sand text-[10px] font-black border border-zen-brown/10">02</div>
                                           <p className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-[.3em]">Server Authorization (Admin SDK)</p>
                                        </div>
                                        <div className="space-y-8">
                                           <ZenInput label="Service Client Email" value={settings.notifications.firebaseClientEmail || ''} onChange={(e: any) => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, firebaseClientEmail: e.target.value}} : null)} />
                                           <ZenTextarea label="Private Key" placeholder="-----BEGIN PRIVATE KEY-----" value={settings.notifications.firebasePrivateKey || ''} onChange={(e: any) => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, firebasePrivateKey: e.target.value}} : null)} />
                                        </div>
                                     </div>

                                     {/* Test Signal Block */}
                                     <div className="p-8 bg-zen-cream/20 rounded-3xl border border-zen-brown/10 flex flex-col sm:flex-row items-center justify-between gap-6">
                                        <div className="flex items-center gap-6">
                                           <div className="p-4 bg-white text-zen-sand rounded-2xl shadow-sm border border-zen-brown/5"><Activity size={24} /></div>
                                           <div>
                                              <p className="text-lg font-serif font-bold text-zen-brown">Connection Status</p>
                                              <p className="text-[9px] font-bold text-zen-brown/30 uppercase tracking-widest mt-1">Verify configuration integrity</p>
                                           </div>
                                        </div>
                                        <div className="flex items-center gap-4 w-full sm:w-auto">
                                           <input 
                                              type="text" 
                                              placeholder="Target Device Token" 
                                              className="bg-white border border-zen-brown/10 rounded-xl px-4 py-2.5 text-xs text-zen-brown focus:outline-none focus:ring-4 focus:ring-zen-sand/5 w-full sm:w-64 transition-all"
                                              value={settings.notifications.fcmToken || ''}
                                              onChange={(e: any) => setSettings(prev => prev ? {...prev, notifications: {...prev.notifications, fcmToken: e.target.value}} : null)}
                                           />
                                           <button 
                                              onClick={async () => {
                                                 try {
                                                    const res = await fetch(`${API_URL}/settings/test-notification`, {
                                                       method: 'POST',
                                                       headers: { 'Authorization': `Bearer ${user?.token}` }
                                                    });
                                                    const data = await res.json();
                                                    if (res.ok) notify('success', 'Signal Sent', data.message);
                                                    else notify('error', 'Signal Failed', data.message);
                                                 } catch (e) {
                                                    notify('error', 'Network Error', 'Could not reach cosmic relay.');
                                                 }
                                              }}
                                              className="bg-zen-brown text-white px-8 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zen-sand transition-all shadow-lg whitespace-nowrap"
                                           >
                                              Test Signal
                                           </button>
                                        </div>
                                     </div>
                                  </div>
                               </div>

                               {/* Section: Save Area */}
                               <footer className="mt-12 pt-10 border-t border-zen-brown/15 flex justify-end">
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
                         </div>
                      </div>
                   )}

                  {activeSection === 'smtp' && (
                     <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                        <div className="xl:col-span-8 bg-white/80 backdrop-blur-xl p-12 rounded-[1.5rem] border border-zen-brown/15 shadow-sm">
                           <header className="mb-12 flex items-center justify-between">
                              <div>
                                 <h3 className="text-3xl font-serif font-bold text-zen-brown tracking-tight">SMTP Gateway</h3>
                                 <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-[0.3em] mt-2">Manage dynamic outbound communication credentials.</p>
                              </div>
                              <div className="w-16 h-16 bg-zen-cream/20 rounded-[1rem] flex items-center justify-center text-zen-sand border border-zen-brown/15">
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

                           <footer className="mt-12 pt-10 border-t border-zen-brown/15 flex justify-end">
                              <ZenButton 
                                 onClick={() => handleSave('smtp' as any)}
                                 disabled={saving}
                                 className="px-12 py-5 rounded-[1.5rem] shadow-sm transition-all text-lg"
                              >
                                 Verify & Save
                              </ZenButton>
                           </footer>
                        </div>

                        <div className="xl:col-span-4">
                           <div className="bg-zen-cream/10 p-10 rounded-[1.5rem] border border-zen-brown/15 h-full">
                              <h4 className="text-xl font-serif font-bold text-zen-brown mb-6 flex items-center gap-3">
                                 <ShieldCheck className="text-zen-sand" size={24} />
                                 Security Protocol
                              </h4>
                              <p className="text-xs text-zen-brown/60 leading-relaxed font-medium">
                                 Your SMTP credentials are encrypted and stored securely within our infrastructure. 
                                 For standard configuration, use port **587** with TLS. For legacy systems, port **465** provides direct SSL.
                              </p>
                              <div className="mt-8 space-y-4">
                                 <div className="p-5 bg-white rounded-2xl border border-zen-brown/15">
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
