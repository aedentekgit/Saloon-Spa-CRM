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
      <div className="min-h-screen bg-zen-cream flex flex-col items-center justify-center">
        <div className="w-12 h-12 border border-zen-primary/20 border-t-zen-primary rounded-full animate-spin mb-8"></div>
        <p className="text-[10px] font-bold text-zen-leaf uppercase tracking-[0.5em]">Synchronizing Archives</p>
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
    <div className="min-h-screen w-full bg-[#f4f5f9] flex items-center justify-center p-4 sm:p-8 font-sans">
       <div className="w-full max-w-[1000px] bg-[#f8f9fe] rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.03)] flex flex-col lg:flex-row min-h-[600px] border-[4px] border-white/40">
          
          {/* Left side Image */}
          <div className="hidden lg:block w-1/2 p-3 relative">
             <div className="w-full h-full rounded-[2.5rem] overflow-hidden relative shadow-inner">
                <img 
                  src="/login-bg.png" 
                  alt="Sanctuary" 
                  className="w-full h-full object-cover"
                />
             </div>
          </div>

          {/* Right side Form */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 relative">
             <div className="w-full max-w-sm space-y-8">
                <div className="space-y-3">
                   <h1 className="text-[2.75rem] font-black text-[#1e1b4b] tracking-tight leading-none">Let's sign you in.</h1>
                   <p className="text-sm font-medium text-[#8b87a1] italic mt-2">Hello, welcome back to your account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                      <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-50 p-4 rounded-2xl text-center">
                        {error}
                      </div>
                    )}
                    
                    <div className="space-y-4">
                       <div className="relative">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Mail id"
                            className="w-full bg-[#efedfa] text-[#4b4566] text-sm font-bold placeholder:text-[#a09cba] placeholder:font-medium px-6 py-4 rounded-3xl outline-none focus:ring-2 focus:ring-[#4c35de]/30 transition-all border border-transparent"
                            required
                          />
                          <Mail size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#a09cba]" />
                       </div>

                       <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full bg-[#efedfa] text-[#4b4566] text-sm font-bold placeholder:text-[#a09cba] placeholder:font-medium px-6 py-4 rounded-3xl outline-none focus:ring-2 focus:ring-[#4c35de]/30 transition-all border border-transparent"
                            required
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-6 top-1/2 -translate-y-1/2 text-[#a09cba] hover:text-[#4c35de] transition-colors"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                       </div>
                    </div>

                    <div className="flex justify-start">
                       <span className="text-[11px] font-bold text-[#8b87a1] hover:text-[#392994] cursor-pointer transition-colors block -mt-2">Forget password?</span>
                    </div>

                    <div className="pt-2">
                       <button
                         type="submit"
                         className="w-full py-4 bg-[#392994] hover:bg-[#2a1d70] text-white text-[13px] font-bold shadow-[0_8px_20px_rgba(57,41,148,0.3)] hover:shadow-[0_10px_25px_rgba(57,41,148,0.4)] rounded-3xl transition-all flex items-center justify-center gap-2 group"
                       >
                         Sign in now <span className="w-1.5 h-1.5 rounded-full bg-white ml-2 opacity-80 group-hover:opacity-100"></span>
                       </button>
                    </div>

                    <div className="pt-4">
                       <div className="bg-white/60 border border-white rounded-full py-2.5 px-6 mx-auto w-max shadow-[0_2px_10px_rgba(0,0,0,0.02)] cursor-pointer hover:bg-white transition-colors" onClick={() => {setEmail('admin@gmail.com'); setPassword('admin123');}}>
                          <p className="text-[8px] font-bold text-[#a09cba] uppercase tracking-widest flex items-center gap-3">
                             Admin: admin@gmail.com <span className="w-1 h-1 rounded-full bg-[#a09cba]/40"></span> Pass: admin123
                          </p>
                       </div>
                    </div>

                    <div className="text-center pt-2">
                       <p className="text-[11px] font-bold text-[#a09cba]">
                          Not registered? <Link to="/signup" className="text-[#392994] hover:underline">Sign up</Link>
                       </p>
                    </div>
                </form>
             </div>
          </div>
       </div>
    </div>
  );
};

export default Login;
