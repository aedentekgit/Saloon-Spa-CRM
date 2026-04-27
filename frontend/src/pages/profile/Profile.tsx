import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Camera, 
  Lock, 
  Save, 
  ShieldCheck,
  Key
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
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
        notify('success', 'Profile Updated', 'Your personal details have been synchronized.');
        fetchProfile();
      } else {
        notify('error', 'Update Failed', 'Could not update profile information.');
      }
    } catch (error) {
      notify('error', 'Network Error', 'Failed to reach synchronization relay.');
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
        notify('success', 'Identity Updated', 'Your profile picture has been updated.');
        setProfilePicFile(null);
      } else {
        notify('error', 'Upload Error', data.message || 'Failed to update identity asset.');
      }
    } catch (error) {
      notify('error', 'Upload Error', 'Failed to update identity asset.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      notify('error', 'Validation Error', 'Passwords do not match.');
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
        notify('success', 'Security Updated', 'Your password has been changed successfully.');
        setIsPasswordModalOpen(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        notify('error', 'Security Update Failed', data.message || 'Failed to change password.');
      }
    } catch (error) {
      notify('error', 'Network Error', 'Failed to reach security relay.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div 
           animate={{ rotate: 360 }}
           transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
           className="p-8 bg-zen-sand/5 rounded-[1.5rem] border border-zen-sand/10"
        >
           <ShieldCheck size={40} className="text-zen-sand" />
        </motion.div>
      </div>
    );
  }

  const profilePicUrl = getImageUrl(profile.profilePic) || null;

  return (
    <ZenPageLayout
      title="My Profile"
      hideSearch
      hideAddButton
      hideBranchSelector
      hideViewToggle
    >
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        {/* Header Section */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-zen-brown/10 shadow-sm overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-zen-brown to-zen-sand relative opacity-90">
             <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]"></div>
          </div>
          <div className="px-10 pb-10 -mt-16 relative z-10 flex flex-col md:flex-row items-end gap-8">
            <div className="relative group">
               <div className="w-32 h-32 rounded-[2rem] bg-white p-1 shadow-2xl border border-zen-brown/5 overflow-hidden">
                  {profilePicUrl ? (
                    <img 
                      src={profilePicUrl} 
                      alt="Profile" 
                      className="w-full h-full object-cover rounded-[1.8rem]" 
                    />
                  ) : (
                    <div className="w-full h-full bg-zen-cream flex items-center justify-center text-zen-brown/20 rounded-[1.8rem]">
                      <User size={48} strokeWidth={1} />
                    </div>
                  )}
               </div>
               <label 
                htmlFor="profile-pic-upload"
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-[2rem] transition-all cursor-pointer backdrop-blur-sm"
               >
                  <Camera className="text-white" size={24} />
               </label>
               <input 
                type="file" 
                id="profile-pic-upload" 
                className="hidden" 
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProfilePicUpload(file);
                }}
               />
            </div>
            <div className="flex-1 pb-4">
               <h2 className="text-3xl font-serif font-bold text-zen-brown">{profile.name}</h2>
               <div className="flex items-center gap-4 mt-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zen-sand bg-zen-sand/10 px-3 py-1 rounded-full">
                    {profile.role}
                  </span>
                  <span className="text-[11px] font-medium text-zen-brown/40">
                    ID: {profile._id.slice(-8).toUpperCase()}
                  </span>
               </div>
            </div>
            <div className="pb-4">
               <ZenButton 
                onClick={() => setIsPasswordModalOpen(true)}
                className="bg-white text-zen-brown border border-zen-brown/10 hover:bg-zen-cream"
               >
                  <Lock size={16} className="mr-2" />
                  Change Password
               </ZenButton>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[2.5rem] border border-zen-brown/10 shadow-sm">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 rounded-xl bg-zen-cream flex items-center justify-center text-zen-brown">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-zen-brown">Account Details</h3>
                  <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest mt-0.5">Manage your personal presence.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ZenInput 
                  label="Full Name"
                  value={profile.name}
                  onChange={(e: any) => setProfile(prev => prev ? {...prev, name: e.target.value} : null)}
                  icon={User}
                />
                <ZenInput 
                  label="Email Address"
                  value={profile.email}
                  readOnly
                  icon={Mail}
                  disabled
                />
                <ZenInput 
                  label="Phone Number"
                  value={profile.phone || ''}
                  onChange={(e: any) => setProfile(prev => prev ? {...prev, phone: e.target.value} : null)}
                  icon={Phone}
                />
                <ZenInput 
                  label="Date of Birth"
                  type="date"
                  value={profile.dob ? new Date(profile.dob).toISOString().split('T')[0] : ''}
                  onChange={(e: any) => setProfile(prev => prev ? {...prev, dob: e.target.value} : null)}
                  icon={Calendar}
                />
              </div>

              <div className="mt-8">
                <ZenTextarea 
                  label="Permanent Address"
                  value={profile.address || ''}
                  onChange={(e: any) => setProfile(prev => prev ? {...prev, address: e.target.value} : null)}
                  icon={MapPin}
                />
              </div>

              <div className="mt-12 pt-10 border-t border-zen-brown/5 flex justify-end">
                <ZenButton 
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-12 py-4 rounded-2xl shadow-lg"
                >
                  <Save size={18} className="mr-2" />
                  Synchronize Profile
                </ZenButton>
              </div>
            </div>
          </div>

          {/* Side Info/Security Stats */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-zen-brown text-white p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                  <ShieldCheck size={120} />
               </div>
               <h3 className="text-xl font-serif font-bold mb-2 relative z-10">Security Shield</h3>
               <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-10 relative z-10">Your account safety status.</p>
               
               <div className="space-y-6 relative z-10">
                  <div className="flex items-center gap-4">
                     <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <ShieldCheck size={16} className="text-zen-sand" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-white/40">Encryption</p>
                        <p className="text-xs font-bold">End-to-End Active</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <Key size={16} className="text-zen-sand" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-white/40">Last Changed</p>
                        <p className="text-xs font-bold">Recently Updated</p>
                     </div>
                  </div>
               </div>

               <div className="mt-12 p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                  <p className="text-[10px] leading-relaxed text-white/60">
                    Your account is protected by industry-standard encryption protocol. We recommend rotating your password every 90 days.
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Change Password"
        maxWidth="max-w-md"
      >
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-4 p-4 bg-red-50 rounded-2xl border border-red-100 mb-6">
             <ShieldCheck className="text-red-500" size={24} />
             <p className="text-[11px] text-red-600 font-medium">For security reasons, please do not share your new credentials with anyone.</p>
          </div>

          <ZenInput 
            label="Current Password"
            type="password"
            value={passwordData.currentPassword}
            onChange={(e: any) => setPasswordData(prev => ({...prev, currentPassword: e.target.value}))}
            icon={Lock}
          />
          <ZenInput 
            label="New Password"
            type="password"
            value={passwordData.newPassword}
            onChange={(e: any) => setPasswordData(prev => ({...prev, newPassword: e.target.value}))}
            icon={Key}
          />
          <ZenInput 
            label="Confirm New Password"
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e: any) => setPasswordData(prev => ({...prev, confirmPassword: e.target.value}))}
            icon={ShieldCheck}
          />

          <div className="pt-6 flex flex-col gap-3">
            <ZenButton 
              onClick={handleChangePassword}
              disabled={saving || !passwordData.currentPassword || !passwordData.newPassword}
              className="w-full py-4 shadow-xl"
            >
              Update Security Credentials
            </ZenButton>
            <ZenButton 
              onClick={() => setIsPasswordModalOpen(false)}
              className="w-full py-4 bg-transparent text-zen-brown hover:bg-zen-cream border-transparent"
            >
              Cancel
            </ZenButton>
          </div>
        </div>
      </Modal>
    </ZenPageLayout>
  );
};

export default Profile;
