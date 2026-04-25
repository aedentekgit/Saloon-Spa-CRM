import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { withBase } from '../../utils/assetPath';

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
    <div className="min-h-screen w-full bg-zen-cream flex items-center justify-center p-4 sm:p-8 font-sans">
       <div className="w-full max-w-[1000px] bg-white rounded-[1.75rem] sm:rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] flex flex-col lg:flex-row min-h-[460px] sm:min-h-[600px] border-2 sm:border-[4px] border-zen-stone/30">
          
          {/* Left side Image */}
          <div className="hidden lg:block w-1/2 p-3 relative">
             <div className="w-full h-full rounded-[2.5rem] overflow-hidden relative shadow-inner">
                <img 
                  src={withBase('/login-bg.png')} 
                  alt="Sanctuary" 
                  className="w-full h-full object-cover"
                />
             </div>
          </div>

          {/* Right side Form */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-5 sm:p-8 lg:p-16 relative">
             <div className="w-full max-w-sm space-y-8">
                <div className="space-y-3">
                   <h1 className="text-[2.75rem] font-black text-zen-brown tracking-tight leading-none">Let's sign you in.</h1>
                   <p className="text-sm font-medium text-zen-brown/40 italic mt-2">Hello, welcome back to your account</p>
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
                            className="w-full bg-zen-cream text-zen-brown text-sm font-bold placeholder:text-zen-brown/30 placeholder:font-medium px-6 py-4 rounded-3xl outline-none focus:ring-2 focus:ring-zen-sand/30 transition-all border border-zen-stone/60"
                            required
                          />
                          <Mail size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-zen-brown/30" />
                       </div>

                       <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full bg-zen-cream text-zen-brown text-sm font-bold placeholder:text-zen-brown/30 placeholder:font-medium px-6 py-4 rounded-3xl outline-none focus:ring-2 focus:ring-zen-sand/30 transition-all border border-zen-stone/60"
                            required
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-6 top-1/2 -translate-y-1/2 text-zen-brown/30 hover:text-zen-sand transition-colors"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                       </div>
                    </div>

                    <div className="flex justify-start">
                       <Link to="/forgot-password" className="text-[11px] font-bold text-zen-brown/35 hover:text-zen-sand cursor-pointer transition-colors block -mt-2">Forget password?</Link>
                    </div>

                    <div className="pt-2">
                       <button
                         type="submit"
                         className="w-full py-4 bg-zen-sand hover:opacity-90 text-white text-[13px] font-bold shadow-[0_8px_20px_rgba(0,0,0,0.12)] rounded-3xl transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
                       >
                         Sign in now <span className="w-1.5 h-1.5 rounded-full bg-white ml-2 opacity-80 group-hover:opacity-100"></span>
                       </button>
                    </div>

                    <div className="pt-4">
                       <div className="bg-zen-cream border border-zen-stone/60 rounded-full py-2.5 px-6 mx-auto w-max shadow-[0_2px_10px_rgba(0,0,0,0.02)] cursor-pointer hover:bg-white transition-colors" onClick={() => {setEmail('admin@gmail.com'); setPassword('admin123');}}>
                          <p className="text-[8px] font-bold text-zen-brown/35 uppercase tracking-widest flex items-center gap-3">
                             Admin: admin@gmail.com <span className="w-1 h-1 rounded-full bg-zen-brown/20"></span> Pass: admin123
                          </p>
                       </div>
                    </div>

                    <div className="text-center pt-2">
                       <p className="text-[11px] font-bold text-zen-brown/35">
                          Not registered? <Link to="/signup" className="text-zen-sand hover:underline">Sign up</Link>
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
