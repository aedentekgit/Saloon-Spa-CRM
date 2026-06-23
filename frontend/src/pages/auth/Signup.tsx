import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, User, Sparkles, ArrowRight, Phone } from 'lucide-react';
import { notify } from '../../components/shared/ZenNotification';
import { withBase } from '../../utils/assetPath';
import { motion } from 'motion/react';
import { ZenInput } from '../../components/zen/ZenInputs';

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

  const itemVariants: any = {
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
           initial={{ opacity: 0, y: 50, scale: 0.98 }}
           animate={{ 
             opacity: 1, 
             y: 0,
             scale: 1 
           }}
           transition={{ 
             duration: 1.2,
             ease: [0.16, 1, 0.3, 1]
           }}
           className="w-full max-w-[1000px] bg-white rounded-[2rem] sm:rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(43,36,64,0.12)] flex flex-col lg:flex-row-reverse min-h-[500px] sm:min-h-[700px] relative overflow-hidden transition-all duration-500 z-10"
        >

           {/* Branding Image - Flush to edges */}
           <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:block w-1/2 relative overflow-hidden"
           >
              <div className="w-full h-full relative group/img cursor-pointer">
                 <motion.img
                   initial={{ scale: 1.15 }}
                   animate={{ scale: 1 }}
                   transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
                   src={withBase('/login-bg.png')}
                   alt="Sanctuary"
                   className="w-full h-full object-cover transition-transform duration-1000 group-hover/img:scale-105"
                 />
                 <div className="absolute inset-0 bg-gradient-to-l from-transparent to-white/10" />
              </div>
           </motion.div>

           {/* Left side Form */}
           <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-20 relative">
              <motion.div 
                 initial="hidden"
                 animate="visible"
                 variants={{
                   hidden: { opacity: 0 },
                   visible: {
                     opacity: 1,
                     transition: {
                       staggerChildren: 0.1,
                       delayChildren: 0.3
                     }
                   }
                 }}
                 className="w-full max-w-sm space-y-10"
              >
                 <motion.div variants={itemVariants} className="space-y-4">
                    <h1 className="text-[3rem] font-black text-zen-brown tracking-tighter leading-[0.9] sm:leading-none">Create account</h1>
                    <p className="text-sm font-medium text-zen-brown/30 italic">Join us and start your journey today</p>
                 </motion.div>

                 <form onSubmit={handleSubmit} className="space-y-6">
                     {error && (
                       <motion.div 
                         initial={{ opacity: 0, scale: 0.95 }}
                         animate={{ opacity: 1, scale: 1 }}
                         className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-center flex items-center justify-center gap-3 relative"
                       >
                         <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                         <span className="text-[10px] font-black uppercase tracking-[0.25em]">{error}</span>
                       </motion.div>
                     )}

                     <motion.div variants={itemVariants} className="space-y-4">
                        <div className="relative group">
                           <input
                             type="text"
                             value={formData.name}
                             onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                             placeholder="Full Name"
                             className="w-full bg-zen-cream/30 text-zen-brown text-sm font-bold placeholder:text-zen-brown/30 placeholder:font-medium px-8 py-5 rounded-[2rem] outline-none focus:ring-4 focus:ring-zen-sand/5 focus:border-zen-sand/30 transition-all border border-zen-brown/5 shadow-sm group-hover:border-zen-sand/20"
                             required
                           />
                           <User size={18} className="absolute right-8 top-1/2 -translate-y-1/2 text-zen-brown/20 group-focus-within:text-zen-sand transition-colors" />
                        </div>

                        <div className="relative group">
                           <input
                             type="email"
                             value={formData.email}
                             onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                             placeholder="Mail id"
                             className="w-full bg-zen-cream/30 text-zen-brown text-sm font-bold placeholder:text-zen-brown/30 placeholder:font-medium px-8 py-5 rounded-[2rem] outline-none focus:ring-4 focus:ring-zen-sand/5 focus:border-zen-sand/30 transition-all border border-zen-brown/5 shadow-sm group-hover:border-zen-sand/20"
                             required
                           />
                           <Mail size={18} className="absolute right-8 top-1/2 -translate-y-1/2 text-zen-brown/20 group-focus-within:text-zen-sand transition-colors" />
                        </div>

                         <div className="w-full relative">
                            <ZenInput
                              label="Phone Number"
                              icon={Phone}
                              type="tel"
                              value={formData.phone}
                              onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })}
                              placeholder="Phone number"
                              required
                              hideLabel={true}
                              className="w-full bg-zen-cream/30 text-zen-brown text-sm font-bold placeholder:text-zen-brown/30 placeholder:font-medium rounded-[2rem] border border-zen-brown/5 shadow-sm group-hover:border-zen-sand/20 focus:ring-4 focus:ring-zen-sand/5 focus:border-zen-sand/30"
                            />
                         </div>

                        <div className="relative group">
                           <input
                             type={showPassword ? "text" : "password"}
                             value={formData.password}
                             onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                             placeholder="Password"
                             className="w-full bg-zen-cream/30 text-zen-brown text-sm font-bold placeholder:text-zen-brown/30 placeholder:font-medium px-8 py-5 rounded-[2rem] outline-none focus:ring-4 focus:ring-zen-sand/5 focus:border-zen-sand/30 transition-all border border-zen-brown/5 shadow-sm group-hover:border-zen-sand/20"
                             required
                             minLength={6}
                           />
                           <button
                             type="button"
                             onClick={() => setShowPassword(!showPassword)}
                             className="absolute right-8 top-1/2 -translate-y-1/2 text-zen-brown/20 hover:text-zen-sand transition-colors"
                           >
                             {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                           </button>
                        </div>
                     </motion.div>

                     <motion.div variants={itemVariants} className="pt-4">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-5 bg-zen-brown hover:bg-zen-brown/95 disabled:opacity-50 text-white text-[13px] font-black uppercase tracking-[0.2em] shadow-xl shadow-zen-brown/10 rounded-[2rem] transition-all flex items-center justify-center gap-3 group active:scale-[0.98]"
                        >
                          <span>{loading ? 'Processing...' : 'Sign up now'}</span>
                          {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                        </button>
                     </motion.div>

                     <motion.div variants={itemVariants} className="text-center pt-6">
                        <p className="text-[11px] font-bold text-zen-brown/30 uppercase tracking-widest">
                           Already registered? <Link to="/login" className="text-zen-sand hover:underline font-black">Sign in</Link>
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
