import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, User, Sparkles, ArrowRight, Phone } from 'lucide-react';
import { notify } from '../../components/shared/ZenNotification';
import { withBase } from '../../utils/assetPath';
import { motion } from 'motion/react';

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

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <div className="min-h-screen w-full bg-zen-cream flex items-center justify-center p-4 sm:p-8 font-sans relative overflow-hidden">
       {/* Ambient Zen Breathing Blobs in Background */}
       <motion.div
         animate={{
           scale: [1, 1.15, 0.95, 1],
           x: [0, 40, -20, 0],
           y: [0, -30, 30, 0],
         }}
         transition={{
           duration: 12,
           repeat: Infinity,
           ease: "easeInOut",
         }}
         className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-zen-sand/10 blur-[100px] pointer-events-none"
       />
       <motion.div
         animate={{
           scale: [1, 0.9, 1.1, 1],
           x: [0, -30, 40, 0],
           y: [0, 40, -30, 0],
         }}
         transition={{
           duration: 15,
           repeat: Infinity,
           ease: "easeInOut",
         }}
         className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full bg-zen-gold/10 blur-[100px] pointer-events-none"
       />

       {/* Overall Animated Container Card */}
       <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.96 }}
          animate={{ 
            opacity: 1, 
            y: [50, 0, -4, 0],
            scale: 1 
          }}
          transition={{ 
            y: {
              times: [0, 0.4, 0.7, 1],
              duration: 1.6,
              ease: [0.16, 1, 0.3, 1]
            },
            opacity: { duration: 1.0 },
            scale: { duration: 1.4, ease: [0.16, 1, 0.3, 1] }
          }}
          whileHover={{
            y: -6,
            shadow: "0 30px 80px -15px rgba(101,78,65,0.12)",
          }}
          className="w-full max-w-[1000px] bg-white rounded-[1.75rem] sm:rounded-[3rem] shadow-[0_20px_50px_-12px_rgba(101,78,65,0.06)] flex flex-col lg:flex-row-reverse min-h-[460px] sm:min-h-[600px] border-2 sm:border-[4px] border-zen-stone/30 relative overflow-hidden transition-shadow duration-500 z-10"
       >

          {/* Branding Image with soft zoom/scale Ken Burns effect */}
          <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.4, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
             className="hidden lg:block w-1/2 p-3 relative"
          >
             <div className="w-full h-full rounded-[2.5rem] overflow-hidden relative shadow-inner group/img cursor-pointer">
                <motion.img
                  initial={{ scale: 1.12 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
                  src={withBase('/login-bg.png')}
                  alt="Sanctuary"
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover/img:scale-105"
                />
             </div>
          </motion.div>

          {/* Right side Form with stagger items animation */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-5 sm:p-8 lg:p-16 relative">
             <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.08,
                      delayChildren: 0.2
                    }
                  }
                }}
                className="w-full max-w-sm space-y-8"
             >
                <motion.div variants={itemVariants} className="space-y-3">
                   <h1 className="text-[2.75rem] font-black text-zen-brown tracking-tight leading-none">Create account</h1>
                   <p className="text-sm font-medium text-zen-brown/40 italic mt-2">Join us and start your journey today</p>
                </motion.div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                      <motion.div variants={itemVariants} className="text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-50 p-4 rounded-2xl text-center">
                        {error}
                      </motion.div>
                    )}

                    <motion.div variants={itemVariants} className="space-y-4">
                       <div className="relative group">
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Full Name"
                            className="w-full bg-white text-zen-brown text-sm font-bold placeholder:text-zen-brown/30 placeholder:font-medium px-6 py-4 rounded-3xl outline-none focus:ring-4 focus:ring-zen-sand/20 focus:border-zen-sand/60 transition-all border border-zen-brown/15 shadow-sm group-hover:border-zen-sand/40"
                            required
                          />
                          <User size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-zen-brown/30 group-focus-within:text-zen-sand transition-colors" />
                       </div>

                       <div className="relative group">
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="Mail id"
                            className="w-full bg-white text-zen-brown text-sm font-bold placeholder:text-zen-brown/30 placeholder:font-medium px-6 py-4 rounded-3xl outline-none focus:ring-4 focus:ring-zen-sand/20 focus:border-zen-sand/60 transition-all border border-zen-brown/15 shadow-sm group-hover:border-zen-sand/40"
                            required
                          />
                          <Mail size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-zen-brown/30 group-focus-within:text-zen-sand transition-colors" />
                       </div>

                       <div className="relative group">
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="Phone number"
                            className="w-full bg-white text-zen-brown text-sm font-bold placeholder:text-zen-brown/30 placeholder:font-medium px-6 py-4 rounded-3xl outline-none focus:ring-4 focus:ring-zen-sand/20 focus:border-zen-sand/60 transition-all border border-zen-brown/15 shadow-sm group-hover:border-zen-sand/40"
                            required
                          />
                          <Phone size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-zen-brown/30 group-focus-within:text-zen-sand transition-colors" />
                       </div>

                       <div className="relative group">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Password"
                            className="w-full bg-white text-zen-brown text-sm font-bold placeholder:text-zen-brown/30 placeholder:font-medium px-6 py-4 rounded-3xl outline-none focus:ring-4 focus:ring-zen-sand/20 focus:border-zen-sand/60 transition-all border border-zen-brown/15 shadow-sm group-hover:border-zen-sand/40"
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
                    </motion.div>

                     <motion.div variants={itemVariants} className="pt-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-4 bg-zen-sand hover:opacity-90 disabled:opacity-50 text-white text-[13px] font-bold shadow-none rounded-3xl transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
                        >
                          {loading ? 'Processing...' : 'Sign up now'}
                        </button>
                     </motion.div>

                     <motion.div variants={itemVariants} className="text-center pt-6">
                        <p className="text-[11px] font-bold text-zen-brown/35">
                           Already registered? <Link to="/login" className="text-zen-sand hover:underline">Sign in</Link>
                        </p>
                     </motion.div>
                </form>
             </motion.div>
          </div>
       </motion.div>
    </div>
  );
};

export default Signup;
