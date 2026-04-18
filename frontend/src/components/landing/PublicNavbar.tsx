import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Sparkles, User, ArrowUpRight } from 'lucide-react';
import { usePublicSettings } from './usePublicSettings';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const BASE_URL = API_URL.replace('/api', '');

function getImageUrl(path?: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const clean = path.replace(/^\.?\/?/, '');
  return `${BASE_URL}/${clean}`;
}

const PublicNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { settings } = usePublicSettings();
  const siteName = settings.general.siteName;
  const logoUrl = getImageUrl(settings.general.logo);

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
    { name: 'Rooms', path: '/landing-rooms' },
    { name: 'Team', path: '/team' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[100] border-b border-zen-primary/10 transition-all duration-500 ${
        scrolled ? 'bg-zen-cream/95 backdrop-blur-2xl shadow-lg shadow-zen-primary/5' : 'bg-zen-cream/90 backdrop-blur-xl'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-3 group shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zen-primary text-zen-contrast shadow-lg transition-transform duration-500 group-hover:scale-110">
              {logoUrl ? (
                <img src={logoUrl} alt={siteName} className="h-full w-full rounded-full object-cover" />
              ) : (
                <Sparkles size={18} />
              )}
            </div>
            <span className="hidden sm:block font-serif text-lg font-bold tracking-[0.2em] uppercase text-black">
              {siteName}
            </span>
          </NavLink>

          {/* Nav Links — centred in remaining space */}
          <div className="hidden lg:flex flex-1 items-center justify-center">
            <div className="flex items-center gap-4 xl:gap-6">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) => `
                    relative text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors
                    ${isActive ? 'text-black' : 'text-slate-400 hover:text-black'}
                  `}
                >
                  {({ isActive }) => (
                    <span className="relative inline-block py-2">
                      {link.name}
                      {isActive && (
                        <motion.span
                          layoutId="nav-underline"
                          className="absolute -bottom-0.5 left-1/2 h-[2px] w-12 -translate-x-1/2 bg-zen-primary"
                        />
                      )}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3 ml-auto shrink-0">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/50 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.24em] text-black transition-colors hover:bg-white"
            >
              <User size={14} />
              Portal
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-zen-primary px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.24em] text-zen-contrast transition-colors hover:bg-black"
            >
              Book Now
              <ArrowUpRight size={14} />
            </Link>
          </div>

          {/* Mobile hamburger */}
            <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden ml-auto rounded-full border border-black/10 bg-white/70 p-3 text-black backdrop-blur-md"
            aria-label="Toggle navigation menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[200] bg-[#FDFCFB] lg:hidden flex flex-col shadow-2xl overflow-y-auto"
          >
            {/* Elegant Header Area */}
            <div className="flex h-24 shrink-0 items-center justify-between px-8 bg-[#FDFCFB] border-b border-zen-primary/5">
              <NavLink to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zen-primary text-zen-contrast shadow-xl shadow-zen-primary/20">
                  {logoUrl ? (
                    <img src={logoUrl} alt={siteName} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <Sparkles size={20} />
                  )}
                </div>
                <span className="font-serif text-xl font-bold tracking-[0.2em] uppercase text-black">{siteName}</span>
              </NavLink>
              <button
                onClick={() => setIsOpen(false)}
                className="h-14 w-14 rounded-full bg-white border border-black/5 flex items-center justify-center text-black shadow-lg active:scale-95 transition-all"
              >
                <X size={28} />
              </button>
            </div>

            {/* Links Area - Staggered & Refined */}
            <div className="flex-1 flex flex-col justify-center px-10 relative">
              {/* Subtle background decoration */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] -z-10 pointer-events-none">
                <Sparkles size={400} />
              </div>

              <div className="space-y-10">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.path}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 + 0.2, ease: "easeOut" }}
                  >
                    <NavLink
                      to={link.path}
                      onClick={() => setIsOpen(false)}
                      className={({ isActive }) => `
                        group relative flex flex-col transition-all duration-500
                        ${isActive ? 'text-zen-primary' : 'text-black/40 hover:text-black'}
                      `}
                    >
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40">0{i + 1}</span>
                            <span className={`font-serif text-5xl sm:text-6xl font-black leading-none tracking-tight transition-transform duration-500 group-hover:translate-x-4 ${isActive ? 'italic' : ''}`}>
                              {link.name}
                            </span>
                          </div>
                          {isActive && (
                            <motion.div 
                              layoutId="mobile-link-dot"
                              className="absolute -left-6 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-zen-sand"
                            />
                          )}
                        </>
                      )}
                    </NavLink>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Footer Area - Premium CTA */}
            <div className="p-10 pb-12 space-y-8 bg-[#FDFCFB] border-t border-zen-primary/5">
              <div className="flex flex-col gap-4">
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full rounded-2xl border border-black/10 bg-white py-6 text-center text-[11px] font-bold uppercase tracking-[0.3em] text-black active:scale-[0.98] transition-all shadow-sm hover:shadow-md"
                >
                  Portal Access
                </Link>
                <Link
                  to="/contact"
                  onClick={() => setIsOpen(false)}
                  className="w-full rounded-2xl bg-zen-primary py-6 text-center text-[11px] font-bold uppercase tracking-[0.3em] text-zen-contrast active:scale-[0.98] transition-all shadow-2xl shadow-zen-primary/30"
                >
                  Book Your Ritual
                </Link>
              </div>
              
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-[1px] bg-black/10" />
                <p className="text-[10px] text-black/30 uppercase tracking-[0.5em] font-black">
                  Since 2024 • Doha, Qatar
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default PublicNavbar;
