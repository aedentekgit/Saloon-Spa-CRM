import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { withBase } from '../../utils/assetPath';
import { getInitialRouteForUser } from '../../config/accessControl';
import { motion } from 'motion/react';

const Login = () => {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!loading && user) {
      navigate(getInitialRouteForUser(user.role, user.permissions), { replace: true });
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
    const result = await login(email, password);
    if (result.success) {
      navigate(result.redirectPath || '/profile', { replace: true });
    } else {
      setError(result.message || 'Invalid registry credentials');
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
           className="w-full max-w-[1000px] bg-white rounded-[2rem] sm:rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(43,36,64,0.12)] flex flex-col lg:flex-row-reverse min-h-[500px] sm:min-h-[640px] relative overflow-hidden transition-all duration-500 z-10"
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
                    <h1 className="text-[3rem] font-black text-zen-brown tracking-tighter leading-[0.9] sm:leading-none">Let's sign you in.</h1>
                    <p className="text-sm font-medium text-zen-brown/30 italic">Hello, welcome back to your account</p>
                 </motion.div>

                 <form onSubmit={handleSubmit} className="space-y-8">
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

                     <motion.div variants={itemVariants} className="space-y-5">
                        <div className="relative group">
                           <input
                             type="email"
                             value={email}
                             onChange={(e) => setEmail(e.target.value)}
                             placeholder="Mail id"
                             className="w-full bg-zen-cream/30 text-zen-brown text-sm font-bold placeholder:text-zen-brown/30 placeholder:font-medium px-8 py-5 rounded-[2rem] outline-none focus:ring-4 focus:ring-zen-sand/5 focus:border-zen-sand/30 transition-all border border-zen-brown/5 shadow-sm group-hover:border-zen-sand/20"
                             required
                           />
                           <Mail size={18} className="absolute right-8 top-1/2 -translate-y-1/2 text-zen-brown/20 group-focus-within:text-zen-sand transition-colors" />
                        </div>

                        <div className="relative group">
                           <input
                             type={showPassword ? "text" : "password"}
                             value={password}
                             onChange={(e) => setPassword(e.target.value)}
                             placeholder="Password"
                             className="w-full bg-zen-cream/30 text-zen-brown text-sm font-bold placeholder:text-zen-brown/30 placeholder:font-medium px-8 py-5 rounded-[2rem] outline-none focus:ring-4 focus:ring-zen-sand/5 focus:border-zen-sand/30 transition-all border border-zen-brown/5 shadow-sm group-hover:border-zen-sand/20"
                             required
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

                     <motion.div variants={itemVariants} className="flex justify-start">
                        <Link to="/forgot-password" title="Recover access" className="text-[11px] font-bold text-zen-brown/25 hover:text-zen-sand cursor-pointer transition-colors block -mt-4 ml-4">Forget password?</Link>
                     </motion.div>

                     <motion.div variants={itemVariants} className="pt-4">
                        <button
                          type="submit"
                          className="w-full py-5 bg-zen-brown hover:bg-zen-brown/95 text-white text-[13px] font-black uppercase tracking-[0.2em] shadow-xl shadow-zen-brown/10 rounded-[2rem] transition-all flex items-center justify-center gap-3 group active:scale-[0.98]"
                        >
                          <span>Sign in now</span>
                          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                     </motion.div>

                     <motion.div variants={itemVariants} className="text-center pt-4">
                        <p className="text-[11px] font-bold text-zen-brown/30 uppercase tracking-widest">
                           Not registered? <Link to="/signup" className="text-zen-sand hover:underline font-black">Sign up</Link>
                        </p>
                     </motion.div>
                 </form>
              </motion.div>
           </div>
        </motion.div>
    </div>
  );
};

export default Login;
