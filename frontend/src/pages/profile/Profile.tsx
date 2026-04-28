import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, MapPin, Calendar, Camera, Lock,
  Save, ShieldCheck, Key, Sparkles, Zap, Fingerprint,
  Activity, Star, Clock, Globe, Shield, Edit3, X,
  ArrowRight, CheckCircle2, AlertCircle, RefreshCw,
  LogOut, Settings, Award, Verified
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { ZenPageLayout } from '../../components/zen/ZenLayout';
import { ZenButton } from '../../components/zen/ZenButtons';
import { ZenInput, ZenTextarea } from '../../components/zen/ZenInputs';
import { notify } from '../../components/shared/ZenNotification';
import { Modal } from '../../components/shared/Modal';
import { getImageUrl } from '../../utils/imageUrl';

interface ProfileData {
  _id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  address: string;
  profilePic: string;
  role: string;
}

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'essence' | 'security'>('essence');

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/users/profile`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setProfile(data);

        // Ensure role is treated as a clean string for global state
        const freshRole = String(data.role || 'Employee');
        const freshName = String(data.name || '');

        // Broadcast to global state (Top Bar, Sidebar, etc)
        // Using a tiny timeout to ensure AuthProvider is ready to receive
        setTimeout(() => {
          updateUser({
            role: freshRole as any,
            name: freshName
          });
          console.log('ZenSync: Global identity updated to', freshRole);
        }, 100);
      } else {
        notify('error', 'Sync Failure', 'Failed to load profile details.');
      }
    } catch (error) {
      notify('error', 'Sync Failure', 'Failed to synchronize profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          dob: profile.dob,
          address: profile.address
        })
      });
      if (response.ok) {
        notify('success', 'Profile Updated', 'Your identity has been synchronized.');
        updateUser({ name: profile.name });
        fetchProfile();
      } else {
        notify('error', 'Update Failed', 'Could not synchronize profile.');
      }
    } catch (error) {
      notify('error', 'Network Error', 'Failed to reach relay.');
    } finally {
      setSaving(false);
    }
  };

  const handleProfilePicUpload = async (file: File) => {
    setSaving(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${API_URL}/users/upload-profile-pic`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user?.token}` },
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        setProfile(prev => prev ? { ...prev, profilePic: data.profilePic } : null);
        notify('success', 'Portrait Updated', 'Your visual identity is refreshed.');
      } else {
        notify('error', 'Upload Error', data.message || 'Failed to update asset.');
      }
    } catch (error) {
      notify('error', 'Upload Error', 'Failed to update asset.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      notify('error', 'Validation Error', 'Security keys do not match.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/users/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      const data = await response.json();
      if (response.ok) {
        notify('success', 'Security Hardened', 'Your credentials have been rotated.');
        setIsPasswordModalOpen(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        notify('error', 'Security Error', data.message || 'Failed to update security key.');
      }
    } catch (error) {
      notify('error', 'Network Error', 'Failed to reach relay.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
         <div className="w-12 h-12 border-2 border-zen-sand border-t-transparent rounded-full animate-spin mb-4" />
         <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zen-brown/30">Syncing Registry</p>
      </div>
    );
  }

  const profilePicUrl = getImageUrl(profile.profilePic) || null;

  return (
    <ZenPageLayout
      title="Identity Profile"
      hideSearch hideAddButton hideBranchSelector hideViewToggle
    >
      <div className="max-w-7xl mx-auto space-y-10 pb-40">

        {/* Executive Profile Card */}
        <section className="bg-white rounded-[2.5rem] border border-zen-brown/10 shadow-xl overflow-hidden relative group transition-all duration-700 hover:shadow-zen-brown/10">
           {/* Top Banner (Subtle Texture) */}
           <div className="h-40 bg-gradient-to-r from-zen-brown via-zen-brown/95 to-zen-sand opacity-95 relative">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-10 mix-blend-overlay" />
           </div>

           <div className="px-10 pb-12 -mt-12 relative z-10 flex flex-col md:flex-row items-end gap-8">
              {/* Profile Image Container */}
              <div className="relative">
                 <div className="w-40 h-40 md:w-52 md:h-52 rounded-[2rem] bg-white p-1 shadow-2xl border border-zen-brown/5 overflow-hidden group/portrait">
                    <div className="w-full h-full rounded-[1.8rem] overflow-hidden relative bg-zen-cream">
                       {profilePicUrl ? (
                         <img src={profilePicUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover/portrait:scale-110" alt="Identity" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-zen-brown/10">
                            <User size={80} strokeWidth={0.5} />
                         </div>
                       )}
                       <label htmlFor="portrait-upload" className="absolute inset-0 flex flex-col items-center justify-center bg-zen-brown/60 opacity-0 group-hover/portrait:opacity-100 transition-all cursor-pointer backdrop-blur-md text-white">
                          <Camera size={24} />
                          <span className="text-[10px] font-black uppercase tracking-widest mt-2">Change Portrait</span>
                       </label>
                       <input type="file" id="portrait-upload" className="hidden" accept="image/*" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleProfilePicUpload(file);
                       }} />
                    </div>
                 </div>
                 <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-zen-leaf text-white rounded-xl shadow-lg flex items-center justify-center border-4 border-white">
                    <Verified size={20} />
                 </div>
              </div>

              {/* Basic Info */}
              <div className="flex-1 pb-2">
                 <div className="flex items-center gap-4 mb-1">
                    <h1 className="text-4xl md:text-5xl font-serif font-black text-zen-brown tracking-tight">{profile.name}</h1>
                    <span className="px-3 py-1 bg-zen-sand/10 text-zen-sand text-[10px] font-black uppercase tracking-[0.2em] rounded-lg border border-zen-sand/20">
                       {profile.role}
                    </span>
                 </div>
                 <div className="flex items-center gap-6 text-zen-brown/40">
                    <div className="flex items-center gap-2">
                       <Mail size={14} className="text-zen-sand" />
                       <span className="text-sm font-medium">{profile.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <Shield size={14} className="text-zen-leaf" />
                       <span className="text-[10px] font-bold uppercase tracking-widest">Global ID: {profile._id.slice(-8).toUpperCase()}</span>
                    </div>
                 </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-3 pb-2">
                 <ZenButton
                   onClick={() => setIsPasswordModalOpen(true)}
                   className="bg-zen-cream text-zen-brown border border-zen-brown/10 hover:bg-zen-brown hover:text-white px-6 py-3 rounded-xl transition-all"
                 >
                    <Lock size={16} className="mr-2" />
                    Security Settings
                 </ZenButton>
              </div>
           </div>
        </section>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
           {/* Main Data Section */}
           <div className="lg:col-span-8 space-y-10">
              <div className="bg-white p-10 md:p-14 rounded-[2.5rem] border border-zen-brown/10 shadow-sm">
                 <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-xl bg-zen-brown/5 flex items-center justify-center text-zen-brown shadow-inner">
                          <Fingerprint size={24} />
                       </div>
                       <div>
                          <h3 className="text-xl font-serif font-black text-zen-brown tracking-tight">Personal Details</h3>
                          <p className="text-[10px] font-bold text-zen-brown/20 uppercase tracking-[0.3em] mt-0.5">Management Registry Information</p>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                    <ZenInput
                      label="Full Name"
                      value={profile.name}
                      onChange={(e: any) => setProfile(prev => prev ? {...prev, name: e.target.value} : null)}
                      variant="professional"
                      icon={User}
                    />
                    <ZenInput
                      label="Email Address"
                      value={profile.email}
                      readOnly
                      variant="professional"
                      icon={Mail}
                      className="bg-zen-cream/30 text-zen-brown/30"
                    />
                    <ZenInput
                      label="Phone Number"
                      placeholder="e.g. +974 5555 1234"
                      value={profile.phone || ''}
                      onChange={(e: any) => setProfile(prev => prev ? {...prev, phone: e.target.value} : null)}
                      variant="professional"
                      icon={Phone}
                    />
                    <ZenInput
                      label="Date of Birth"
                      type="date"
                      value={profile.dob ? new Date(profile.dob).toISOString().split('T')[0] : ''}
                      onChange={(e: any) => setProfile(prev => prev ? {...prev, dob: e.target.value} : null)}
                      variant="professional"
                      icon={Calendar}
                    />
                 </div>

                 <div className="mt-8">
                    <ZenTextarea
                      label="Permanent Address"
                      placeholder="Enter your residence details..."
                      value={profile.address || ''}
                      onChange={(e: any) => setProfile(prev => prev ? {...prev, address: e.target.value} : null)}
                      icon={MapPin}
                      rows={4}
                    />
                 </div>

                 <div className="mt-12 pt-10 border-t border-zen-brown/5 flex justify-end">
                    <ZenButton
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="px-12 py-4 rounded-2xl shadow-lg shadow-zen-brown/10"
                    >
                       {saving ? <RefreshCw className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
                       {saving ? 'Synchronizing...' : 'Save Changes'}
                    </ZenButton>
                 </div>
              </div>
           </div>

           {/* Sidebar Stats & Info */}
           <div className="lg:col-span-4 space-y-10">
              {/* Activity Pulse Card */}
              <div className="bg-zen-brown text-white p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-1000">
                    <Activity size={140} />
                 </div>
                 <h3 className="text-xl font-serif font-black mb-1 relative z-10 text-white/90">Identity Pulse</h3>
                 <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.3em] mb-10 relative z-10">Ecosystem Activity</p>

                 <div className="space-y-6 relative z-10">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                       <div className="flex items-center gap-3">
                          <Zap size={16} className="text-zen-sand" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Integrity</span>
                       </div>
                       <span className="text-xs font-bold">100%</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                       <div className="flex items-center gap-3">
                          <Clock size={16} className="text-zen-leaf" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Sessions</span>
                       </div>
                       <span className="text-xs font-bold">Active</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                       <div className="flex items-center gap-3">
                          <Award size={16} className="text-amber-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Level</span>
                       </div>
                       <span className="text-xs font-bold">Manager</span>
                    </div>
                 </div>

                 <div className="mt-10 p-6 bg-white/10 rounded-2xl border border-white/10 text-center">
                    <p className="text-[11px] leading-relaxed text-white/50 font-medium italic">
                       Professional accounts are protected by multi-factor authentication protocols.
                    </p>
                 </div>
              </div>

              {/* Security Shield Summary */}
              <div className="bg-zen-cream/30 border border-zen-brown/10 p-10 rounded-[2.5rem] flex flex-col items-center text-center">
                 <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-zen-brown/5 flex items-center justify-center text-zen-sand mb-6">
                    <ShieldCheck size={32} />
                 </div>
                 <h4 className="text-lg font-serif font-black text-zen-brown mb-2 tracking-tight">Security Shield</h4>
                 <p className="text-xs text-zen-brown/40 leading-relaxed mb-8 px-4">
                    Your account is currently protected. We recommend rotating your password periodically.
                 </p>
                 <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="w-full py-4 bg-white text-zen-brown rounded-xl border border-zen-brown/10 font-black text-[10px] uppercase tracking-widest hover:bg-zen-brown hover:text-white transition-all"
                 >
                    Rotate Security Key
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* Security Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        maxWidth="max-w-xl"
        header={
          <div className="px-10 py-8 border-b border-zen-brown/5 bg-white flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-zen-brown text-white flex items-center justify-center shadow-lg shadow-zen-brown/10">
                   <Lock size={22} />
                </div>
                <div>
                   <h3 className="text-xl font-serif font-black text-zen-brown tracking-tight">Update Credentials</h3>
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zen-brown/20 mt-0.5">Registry Access Rotation</p>
                </div>
             </div>
             <button onClick={() => setIsPasswordModalOpen(false)} className="text-zen-brown/20 hover:text-zen-brown transition-colors">
                <X size={24} />
             </button>
          </div>
        }
      >
        <div className="p-10 space-y-10">
          <div className="p-6 bg-rose-50/50 rounded-2xl border border-rose-100 flex gap-5 items-start">
             <AlertCircle size={20} className="text-rose-500 shrink-0 mt-0.5" />
             <p className="text-[11px] font-medium text-rose-900/60 leading-relaxed italic">
                For security compliance, updating your key will invalidate existing sessions on other devices.
             </p>
          </div>

          <div className="space-y-8">
             <ZenInput
              label="Current Security Key"
              type="password"
              placeholder="••••••••"
              value={passwordData.currentPassword}
              onChange={(e: any) => setPasswordData(prev => ({...prev, currentPassword: e.target.value}))}
              icon={Lock}
              variant="professional"
             />
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <ZenInput
                  label="New Security Key"
                  type="password"
                  placeholder="Min 6 characters"
                  value={passwordData.newPassword}
                  onChange={(e: any) => setPasswordData(prev => ({...prev, newPassword: e.target.value}))}
                  icon={Key}
                  variant="professional"
                />
                <ZenInput
                  label="Confirm New Key"
                  type="password"
                  placeholder="Repeat new key"
                  value={passwordData.confirmPassword}
                  onChange={(e: any) => setPasswordData(prev => ({...prev, confirmPassword: e.target.value}))}
                  icon={ShieldCheck}
                  variant="professional"
                />
             </div>
          </div>

          <div className="flex gap-4 pt-8">
             <button
              onClick={() => setIsPasswordModalOpen(false)}
              className="flex-1 py-4.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zen-brown/30 hover:text-zen-brown transition-all border border-zen-brown/5"
             >
                Cancel
             </button>
             <ZenButton
              onClick={handleChangePassword}
              disabled={saving || !passwordData.currentPassword || !passwordData.newPassword}
              className="flex-[2] py-4.5 rounded-xl shadow-xl shadow-zen-brown/10"
             >
                {saving ? 'Synchronizing...' : 'Rotate Security Key'}
             </ZenButton>
          </div>
        </div>
      </Modal>
    </ZenPageLayout>
  );
};

export default Profile;
