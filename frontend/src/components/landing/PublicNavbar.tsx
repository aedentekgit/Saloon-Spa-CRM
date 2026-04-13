import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Sparkles, User, ArrowUpRight } from 'lucide-react';

const PublicNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Services', path: '/landing-services' },
    { name: 'Team', path: '/team' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-1000 ${scrolled ? 'py-4' : 'py-8'}`}>
      <div className={`container mx-auto px-6 lg:px-24 transition-all duration-1000`}>
        <div className={`
          flex items-center justify-between p-4 px-8 rounded-full transition-all duration-1000
          ${scrolled ? 'bg-white/40 backdrop-blur-3xl border border-white/50 shadow-2xl' : 'bg-transparent border border-transparent'}
        `}>
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-[#32172A] flex items-center justify-center text-[#FAF9F6] shadow-lg group-hover:scale-110 transition-transform duration-500">
              <Sparkles size={18} />
            </div>
            <span className="font-serif text-2xl font-bold text-[#32172A] tracking-tighter uppercase hidden sm:block">Zen<span className="font-normal opacity-50 italic">Spa</span></span>
          </NavLink>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-10">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) => `
                  text-[10px] font-bold uppercase tracking-[0.4em] transition-all duration-500 relative py-1
                  ${isActive ? 'text-[#32172A]' : 'text-[#32172A]/40 hover:text-[#4A2C40]'}
                `}
              >
                {link.name}
                {location.pathname === link.path && (
                  <motion.div layoutId="nav-underline" className="absolute -bottom-1 left-0 right-0 h-[2px] bg-[#32172A]" />
                )}
              </NavLink>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="hidden lg:flex items-center gap-6">
            <Link 
              to="/login" 
              className="px-6 py-2.5 backdrop-blur-3xl bg-[#32172A]/5 border border-[#32172A]/10 text-[10px] font-bold uppercase tracking-widest text-[#32172A] rounded-full hover:bg-[#32172A] hover:text-[#FAF9F6] transition-all flex items-center gap-2"
            >
              <User size={14} />
              Portal Access
            </Link>
            
            <Link
              to="/contact"
              className="px-8 py-2.5 bg-[#32172A] text-[#FAF9F6] text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-[#32172A]/20"
            >
               Book Now
               <ArrowUpRight size={14} />
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden p-3 bg-white/20 backdrop-blur-md rounded-full text-[#32172A] border border-white/50">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed inset-x-6 top-24 z-[101] overflow-hidden lg:hidden"
          >
            <div className="bg-white/80 backdrop-blur-3xl border border-white/50 rounded-[3rem] shadow-2xl p-10 flex flex-col gap-6">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) => `
                    text-3xl font-serif text-center py-2 transition-all
                    ${isActive ? 'text-[#32172A] italic' : 'text-[#32172A]/30'}
                  `}
                >
                  {link.name}
                </NavLink>
              ))}
              <div className="pt-8 flex flex-col gap-4">
                 <Link 
                   to="/login" 
                   onClick={() => setIsOpen(false)}
                   className="w-full py-5 bg-[#32172A]/5 text-[#32172A] text-[10px] font-bold uppercase tracking-widest text-center rounded-2xl"
                 >
                   Staff Login
                 </Link>
                 <Link 
                   to="/contact" 
                   onClick={() => setIsOpen(false)}
                   className="w-full py-5 bg-[#32172A] text-white text-[10px] font-bold uppercase tracking-widest text-center rounded-2xl shadow-xl shadow-[#32172A]/20"
                 >
                   Reserve Entry
                 </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default PublicNavbar;
