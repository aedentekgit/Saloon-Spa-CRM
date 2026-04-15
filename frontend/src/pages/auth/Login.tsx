import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, Sparkles, ArrowRight } from 'lucide-react';

const Login = () => {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border border-[#B4A596]/20 border-t-[#B4A596] rounded-full animate-spin mb-8"></div>
        <p className="text-[10px] font-bold text-[#B4A596] uppercase tracking-[0.5em]">Synchronizing Archives</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await login(email, password);
    if (success) {
      navigate('/dashboard');
    } else {
      setError('Invalid registry credentials');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] flex overflow-hidden font-sans">
      {/* Cinematic Left Side */}
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
                 <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-[#B4A596]">ARTISAN PORTAL</span>
              </div>
              <h1 className="text-7xl font-serif text-white tracking-tighter leading-none italic">The Inner<br />Working.</h1>
              <p className="text-sm text-white/50 max-w-sm font-light leading-relaxed uppercase tracking-widest">
                Internal system for the custodians of silence. Please authenticate to maintain sanctuary operations.
              </p>
           </div>
        </div>
      </div>

      {/* Elegant Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 relative">
        {/* Mobile Logo Background */}
        <div className="absolute top-12 left-12 lg:hidden">
            <span className="font-serif text-2xl text-[#1A1816] tracking-tighter uppercase">Zen<span className="text-[#B4A596]">Sanctuary</span></span>
        </div>

        <div className="w-full max-w-md space-y-12">
          <div className="space-y-4">
            <h2 className="text-5xl font-serif text-[#1A1816] tracking-tight">Welcome Back</h2>
            <p className="text-xs font-bold text-[#B4A596] uppercase tracking-[0.3em] pb-6 border-b border-[#1A1816]/5">STAFF ACCESS REGISTRY</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            {error && (
              <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest border border-red-500/20 bg-red-50/50 p-4 text-center">
                {error}
              </div>
            )}

            <div className="space-y-8">
               <div className="space-y-4">
                  <label className="text-[9px] font-bold text-[#B4A596] uppercase tracking-[0.4em]">Signal Node (Email)</label>
                  <div className="relative border-b border-[#1A1816]/10 pb-2 focus-within:border-[#B4A596] transition-all">
                     <input
                       type="email"
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       placeholder="custodian@zensanctuary.qa"
                       className="w-full bg-transparent text-sm font-medium focus:outline-none placeholder:text-[#1A1816]/10"
                       required
                     />
                     <Mail size={16} strokeWidth={1} className="absolute right-0 top-0 text-[#1A1816]/40" />
                  </div>
               </div>

               <div className="space-y-4">
                  <label className="text-[9px] font-bold text-[#B4A596] uppercase tracking-[0.4em]">Passkey</label>
                  <div className="relative border-b border-[#1A1816]/10 pb-2 focus-within:border-[#B4A596] transition-all">
                     <input
                       type={showPassword ? "text" : "password"}
                       value={password}
                       onChange={(e) => setPassword(e.target.value)}
                       placeholder="••••••••••••"
                       className="w-full bg-transparent text-sm font-medium focus:outline-none placeholder:text-[#1A1816]/10"
                       required
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
              className="w-full py-6 bg-[#1A1816] text-[#FAF9F6] text-[10px] font-bold uppercase tracking-[0.4em] rounded-2xl hover:bg-[#B4A596] hover:shadow-xl hover:shadow-black/10 transition-all flex items-center justify-center gap-4 group"
            >
              Authenticate
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="pt-6 text-center">
               <p className="text-[10px] font-bold text-[#B4A596] uppercase tracking-widest">
                  Not a member? <Link to="/signup" className="text-[#1A1816] hover:underline">Join the Sanctuary</Link>
               </p>
            </div>

            <div className="pt-12 text-center opacity-40">
               <p className="text-[8px] font-bold uppercase tracking-[0.5em] flex items-center justify-center gap-4">
                  <div className="w-8 h-[1px] bg-[#1A1816]" />
                  Internal Sanctuary Use Only
                  <div className="w-8 h-[1px] bg-[#1A1816]" />
               </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
