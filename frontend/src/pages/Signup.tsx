import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, User, Sparkles, ArrowRight, Phone } from 'lucide-react';
import { notify } from '../components/ZenNotification';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'Client' // Forced to Client role
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        notify('success', 'Welcome', 'Registration successful. Please login.');
        navigate('/login');
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] flex overflow-hidden font-sans">
      {/* Cinematic Left Side - Same as Login but different text */}
      <div className="hidden lg:flex w-1/2 relative">
        <img 
          src="/login-bg.png" 
          alt="Sanctuary" 
          className="w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-[#1A1816]/40" />
        <div className="absolute inset-0 flex flex-col justify-end p-24">
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1000">
              <div className="flex items-center gap-4">
                 <div className="h-[1px] w-12 bg-[#B4A596]" />
                 <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-[#B4A596]">Member Registration</span>
              </div>
              <h1 className="text-7xl font-serif text-white tracking-tighter leading-none italic">Begin Your<br />Journey.</h1>
              <p className="text-sm text-white/50 max-w-sm font-light leading-relaxed uppercase tracking-widest">
                Join our collective of mindful individuals. Create your registry to begin orchestrating your wellness rituals.
              </p>
           </div>
        </div>
      </div>

      {/* Elegant Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 relative overflow-y-auto">
        <div className="absolute top-12 left-12 lg:hidden">
            <span className="font-serif text-2xl text-[#1A1816] tracking-tighter uppercase">Zen<span className="text-[#B4A596]">Sanctuary</span></span>
        </div>

        <div className="w-full max-w-md space-y-10 my-auto">
          <div className="space-y-4">
            <h2 className="text-5xl font-serif text-[#1A1816] tracking-tight">Create Registry</h2>
            <p className="text-xs font-bold text-[#B4A596] uppercase tracking-[0.3em] pb-6 border-b border-[#1A1816]/5">MEMBERSHIP ENROLLMENT</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest border border-red-500/20 bg-red-50/50 p-4 text-center">
                {error}
              </div>
            )}

            <div className="space-y-6">
               {/* Full Name */}
               <div className="space-y-3">
                  <label className="text-[9px] font-bold text-[#B4A596] uppercase tracking-[0.4em]">Given Identity (Full Name)</label>
                  <div className="relative border-b border-[#1A1816]/10 pb-2 focus-within:border-[#B4A596] transition-all">
                     <input
                       type="text"
                       value={formData.name}
                       onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                       placeholder="Enter your full name"
                       className="w-full bg-transparent text-sm font-medium focus:outline-none placeholder:text-[#1A1816]/10"
                       required
                     />
                     <User size={16} strokeWidth={1} className="absolute right-0 top-0 text-[#1A1816]/40" />
                  </div>
               </div>

               {/* Email */}
               <div className="space-y-3">
                  <label className="text-[9px] font-bold text-[#B4A596] uppercase tracking-[0.4em]">Signal Node (Email)</label>
                  <div className="relative border-b border-[#1A1816]/10 pb-2 focus-within:border-[#B4A596] transition-all">
                     <input
                       type="email"
                       value={formData.email}
                       onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                       placeholder="your@email.com"
                       className="w-full bg-transparent text-sm font-medium focus:outline-none placeholder:text-[#1A1816]/10"
                       required
                     />
                     <Mail size={16} strokeWidth={1} className="absolute right-0 top-0 text-[#1A1816]/40" />
                  </div>
               </div>

               {/* Passkey */}
               <div className="space-y-3">
                  <label className="text-[9px] font-bold text-[#B4A596] uppercase tracking-[0.4em]">Passkey</label>
                  <div className="relative border-b border-[#1A1816]/10 pb-2 focus-within:border-[#B4A596] transition-all">
                     <input
                       type={showPassword ? "text" : "password"}
                       value={formData.password}
                       onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                       placeholder="Minimum 6 characters"
                       className="w-full bg-transparent text-sm font-medium focus:outline-none placeholder:text-[#1A1816]/10"
                       required
                       minLength={6}
                     />
                     <button 
                       type="button"
                       onClick={() => setShowPassword(!showPassword)}
                       className="absolute right-0 top-0 text-[#1A1816]/40 hover:text-[#B4A596] transition-colors"
                     >
                       {showPassword ? <EyeOff size={16} strokeWidth={1} /> : <Eye size={16} strokeWidth={1} />}
                     </button>
                  </div>
               </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-6 bg-[#1A1816] text-[#FAF9F6] text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-[#B4A596] transition-all flex items-center justify-center gap-4 group disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Engage Enrollment'}
              {!loading && <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />}
            </button>

            <div className="pt-4 text-center">
               <p className="text-[10px] font-bold text-[#B4A596] uppercase tracking-widest">
                  Already registered? <Link to="/login" className="text-[#1A1816] hover:underline">Access Portal</Link>
               </p>
            </div>

            <div className="pt-10 text-center opacity-40">
               <p className="text-[8px] font-bold uppercase tracking-[0.5em] flex items-center justify-center gap-4">
                  <div className="w-8 h-[1px] bg-[#1A1816]" />
                  Zen Sanctuary Client registry
                  <div className="w-8 h-[1px] bg-[#1A1816]" />
               </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
