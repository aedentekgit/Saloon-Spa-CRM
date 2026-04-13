import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

const Login = () => {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zen-cream flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-zen-sand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await login(email, password);
    if (success) {
      navigate('/');
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen w-full bg-zen-cream flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans overflow-y-auto">
      {/* Main Card Container */}
      <div className="max-w-5xl w-full h-auto md:h-[650px] bg-[#E0E7FF] rounded-[2.5rem] md:rounded-[3rem] shadow-2xl overflow-hidden border-[8px] md:border-[12px] border-white flex flex-col md:flex-row transition-all duration-500 my-4 md:my-0">
        
        {/* Left Side: Illustration */}
        <div className="md:w-1/2 h-56 md:h-full bg-[#C7D2FE]/30 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-lavender-300/20 to-transparent z-10 pointer-events-none"></div>
          <img 
            src="/spa_login_illustration.png" 
            alt="Spa Wellness" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        </div>

        {/* Right Side: Form */}
        <div className="md:w-1/2 p-6 md:p-12 lg:p-14 flex flex-col justify-center bg-white/40 backdrop-blur-sm">
          <div className="mb-6 md:mb-8 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-zen-brown tracking-tight">Let's sign you in.</h1>
            <p className="text-sm md:text-base lg:text-lg text-zen-brown/60 mt-2 md:mt-4 font-medium italic">Hello, welcome back to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center text-sm font-bold border border-red-100 animate-pulse">
                {error}
              </div>
            )}

            {/* Email Input */}
            <div className="relative group">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Mail id"
                required
                className="w-full px-6 py-4 md:py-5 bg-lavender-200/50 border-none rounded-[1.5rem] focus:ring-4 focus:ring-lavender-400/30 outline-none transition-all placeholder:text-zen-brown/40 text-zen-brown font-semibold shadow-inner"
              />
              <Mail className="absolute right-6 top-1/2 -translate-y-1/2 text-zen-brown/20 group-focus-within:text-zen-sand transition-colors" size={20} />
            </div>

            {/* Password Input */}
            <div className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full px-6 py-4 md:py-5 bg-lavender-200/50 border-none rounded-[1.5rem] focus:ring-4 focus:ring-lavender-400/30 outline-none transition-all placeholder:text-zen-brown/40 text-zen-brown font-semibold shadow-inner"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-zen-brown/20 hover:text-zen-sand transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Forget Password */}
            <div className="flex justify-start px-2">
              <button type="button" className="text-sm font-bold text-zen-brown/60 hover:text-zen-sand transition-colors underline-offset-4 hover:underline">
                Forget password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-zen-brown lavender-gradient hover:brightness-110 text-white font-bold py-4 md:py-5 rounded-[1.5rem] transition-all shadow-xl shadow-zen-brown/20 active:scale-[0.98] text-lg mt-4 flex items-center justify-center gap-3 group"
            >
              Sign in now
              <div className="w-2 h-2 rounded-full bg-white animate-pulse group-hover:scale-150 transition-transform"></div>
            </button>

            {/* Demo Credentials Hint */}
            <div className="bg-lavender-50/50 p-4 rounded-3xl border border-white flex flex-col sm:flex-row items-center justify-center gap-x-4 gap-y-2 text-[10px] text-zen-brown/40 font-bold tracking-widest text-center">
              <span>Admin: admin@gmail.com</span>
              <span className="hidden sm:inline">•</span>
              <span>Pass: admin123</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
