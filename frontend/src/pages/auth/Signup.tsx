import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, User, Sparkles, ArrowRight, Phone } from 'lucide-react';
import { notify } from '../../components/shared/ZenNotification';

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

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

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
    <div className="min-h-screen w-full bg-zen-cream flex items-center justify-center p-4 sm:p-8 font-sans">
       <div className="w-full max-w-[1000px] bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] flex flex-col lg:flex-row min-h-[600px] border-[4px] border-zen-stone/30">
          
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
                   <h1 className="text-[2.75rem] font-black text-zen-brown tracking-tight leading-none">Create account.</h1>
                   <p className="text-sm font-medium text-zen-brown/40 italic mt-2">Join us and start your journey today</p>
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
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Full Name"
                            className="w-full bg-zen-cream text-zen-brown text-sm font-bold placeholder:text-zen-brown/30 placeholder:font-medium px-6 py-4 rounded-3xl outline-none focus:ring-2 focus:ring-zen-sand/30 transition-all border border-zen-stone/60"
                            required
                          />
                          <User size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-zen-brown/30" />
                       </div>

                       <div className="relative">
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="Mail id"
                            className="w-full bg-zen-cream text-zen-brown text-sm font-bold placeholder:text-zen-brown/30 placeholder:font-medium px-6 py-4 rounded-3xl outline-none focus:ring-2 focus:ring-zen-sand/30 transition-all border border-zen-stone/60"
                            required
                          />
                          <Mail size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-zen-brown/30" />
                       </div>

                       <div className="relative">
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="Phone number"
                            className="w-full bg-zen-cream text-zen-brown text-sm font-bold placeholder:text-zen-brown/30 placeholder:font-medium px-6 py-4 rounded-3xl outline-none focus:ring-2 focus:ring-zen-sand/30 transition-all border border-zen-stone/60"
                            required
                          />
                          <Phone size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-zen-brown/30" />
                       </div>

                       <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Password"
                            className="w-full bg-zen-cream text-zen-brown text-sm font-bold placeholder:text-zen-brown/30 placeholder:font-medium px-6 py-4 rounded-3xl outline-none focus:ring-2 focus:ring-zen-sand/30 transition-all border border-zen-stone/60"
                            required
                            minLength={6}
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

                    <div className="pt-2">
                       <button
                         type="submit"
                         disabled={loading}
                         className="w-full py-4 bg-zen-sand hover:opacity-90 disabled:opacity-50 text-white text-[13px] font-bold shadow-[0_8px_20px_rgba(0,0,0,0.12)] rounded-3xl transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
                       >
                         {loading ? 'Processing...' : 'Sign up now'} {!loading && <span className="w-1.5 h-1.5 rounded-full bg-white ml-2 opacity-80 group-hover:opacity-100"></span>}
                       </button>
                    </div>

                    <div className="text-center pt-6">
                       <p className="text-[11px] font-bold text-zen-brown/35">
                          Already registered? <Link to="/login" className="text-zen-sand hover:underline">Sign in</Link>
                       </p>
                    </div>
                </form>
             </div>
          </div>
       </div>
    </div>
  );
};

export default Signup;
