import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Sparkles, User } from 'lucide-react';

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
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${scrolled ? 'py-4' : 'py-6'}`}>
      <div className="container mx-auto px-6">
        <div className={`relative glass overflow-hidden rounded-[2.5rem] px-8 py-4 flex items-center justify-between transition-all duration-500 ${scrolled ? 'shadow-2xl shadow-zen-sand/20' : ''}`}>
          {/* Animated Background Pulse */}
          <div className="absolute inset-0 bg-gradient-to-r from-zen-sand/5 to-zen-leaf/5 animate-pulse opacity-50 -z-10" />

          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zen-sand to-zen-leaf flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform duration-500">
              <Sparkles size={20} />
            </div>
            <span className="font-serif text-2xl font-black text-zen-brown tracking-tighter">ZEN<span className="text-zen-sand">SPA</span></span>
          </NavLink>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) => `
                  text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-300 relative py-2
                  ${isActive ? 'text-zen-sand' : 'text-zen-brown/40 hover:text-zen-sand'}
                `}
              >
                {link.name}
                {location.pathname === link.path && (
                  <motion.div layoutId="nav-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zen-sand rounded-full" />
                )}
              </NavLink>
            ))}
          </div>

          {/* Action Button */}
          <div className="hidden lg:flex items-center gap-4">
            <NavLink 
              to="/login" 
              className="px-8 py-3 bg-zen-brown text-white text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-2 hover:bg-zen-sand transition-colors shadow-xl group"
            >
              <User size={14} className="group-hover:scale-110 transition-transform" />
              Portal Access
            </NavLink>
          </div>

          {/* Mobile Menu Toggle */}
          <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden w-10 h-10 glass-dark rounded-xl flex items-center justify-center text-zen-brown">
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-6 top-28 z-[90] glass rounded-[3rem] p-8 lg:hidden shadow-3xl flex flex-col gap-6"
          >
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `
                  text-lg font-serif font-black text-center py-4 border-b border-zen-brown/5
                  ${isActive ? 'text-zen-sand' : 'text-zen-brown/40'}
                `}
              >
                {link.name}
              </NavLink>
            ))}
            <NavLink 
              to="/login" 
              onClick={() => setIsOpen(false)}
              className="mt-4 px-8 py-5 bg-zen-sand text-white text-[10px] font-black uppercase tracking-widest rounded-[2rem] text-center shadow-xl shadow-zen-sand/20"
            >
              Portal Access
            </NavLink>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default PublicNavbar;
