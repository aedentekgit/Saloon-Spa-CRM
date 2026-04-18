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
                   <h1 className="text-[2.75rem] font-black text-[#1e1b4b] tracking-tight leading-none">Create account.</h1>
                   <p className="text-sm font-medium text-[#8b87a1] italic mt-2">Join us and start your journey today</p>
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
                            className="w-full bg-[#efedfa] text-[#4b4566] text-sm font-bold placeholder:text-[#a09cba] placeholder:font-medium px-6 py-4 rounded-3xl outline-none focus:ring-2 focus:ring-[#4c35de]/30 transition-all border border-transparent"
                            required
                          />
                          <User size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#a09cba]" />
                       </div>

                       <div className="relative">
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="Mail id"
                            className="w-full bg-[#efedfa] text-[#4b4566] text-sm font-bold placeholder:text-[#a09cba] placeholder:font-medium px-6 py-4 rounded-3xl outline-none focus:ring-2 focus:ring-[#4c35de]/30 transition-all border border-transparent"
                            required
                          />
                          <Mail size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#a09cba]" />
                       </div>

                       <div className="relative">
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="Phone number"
                            className="w-full bg-[#efedfa] text-[#4b4566] text-sm font-bold placeholder:text-[#a09cba] placeholder:font-medium px-6 py-4 rounded-3xl outline-none focus:ring-2 focus:ring-[#4c35de]/30 transition-all border border-transparent"
                            required
                          />
                          <Phone size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#a09cba]" />
                       </div>

                       <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Password"
                            className="w-full bg-[#efedfa] text-[#4b4566] text-sm font-bold placeholder:text-[#a09cba] placeholder:font-medium px-6 py-4 rounded-3xl outline-none focus:ring-2 focus:ring-[#4c35de]/30 transition-all border border-transparent"
                            required
                            minLength={6}
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

                    <div className="pt-2">
                       <button
                         type="submit"
                         disabled={loading}
                         className="w-full py-4 bg-[#392994] hover:bg-[#2a1d70] disabled:opacity-50 text-white text-[13px] font-bold shadow-[0_8px_20px_rgba(57,41,148,0.3)] hover:shadow-[0_10px_25px_rgba(57,41,148,0.4)] rounded-3xl transition-all flex items-center justify-center gap-2 group"
                       >
                         {loading ? 'Processing...' : 'Sign up now'} {!loading && <span className="w-1.5 h-1.5 rounded-full bg-white ml-2 opacity-80 group-hover:opacity-100"></span>}
                       </button>
                    </div>

                    <div className="text-center pt-6">
                       <p className="text-[11px] font-bold text-[#a09cba]">
                          Already registered? <Link to="/login" className="text-[#392994] hover:underline">Sign in</Link>
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
