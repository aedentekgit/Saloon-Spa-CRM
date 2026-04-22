import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Sparkles, User, ArrowUpRight, ChevronDown } from 'lucide-react';
import { usePublicSettings } from './usePublicSettings';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

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
    { 
      name: 'Catalogue', 
      isDropdown: true,
      items: [
        { name: 'Services', path: '/landing-services' },
        { name: 'Memberships', path: '/membership-tiers' },
        { name: 'Rooms', path: '/landing-rooms' },
      ]
    },
    { name: 'Team', path: '/team' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[100] border-b border-zen-primary/10 transition-all duration-500 ${
        scrolled ? 'bg-zen-cream/95 backdrop-blur-2xl shadow-lg shadow-zen-primary/5' : 'bg-zen-cream/90 backdrop-blur-xl'
      }`}
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
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
            <span className="hidden sm:block font-serif text-lg font-bold tracking-[0.2em] uppercase text-zen-brown">
              {siteName}
            </span>
          </NavLink>

          {/* Nav Links — centred in remaining space */}
          <div className="hidden lg:flex flex-1 items-center justify-center">
            <div className="flex items-center gap-4 xl:gap-8">
              {navLinks.map((link) => (
                link.isDropdown ? (
                  <div 
                    key={link.name}
                    className="relative group py-2"
                    onMouseEnter={() => setIsDropdownOpen(true)}
                    onMouseLeave={() => setIsDropdownOpen(false)}
                  >
                    <button className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-zen-brown/40 hover:text-zen-brown transition-colors">
                      {link.name}
                      <ChevronDown size={12} className={`transition-transform duration-500 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-2xl border border-zen-primary/10 shadow-2xl overflow-hidden py-3 z-[110]"
                        >
                          {link.items?.map((item) => (
                            <NavLink
                              key={item.path}
                              to={item.path}
                              className={({ isActive }) => `
                                block px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all
                                ${isActive ? 'bg-zen-primary/5 text-zen-brown' : 'text-zen-brown/40 hover:text-zen-brown hover:bg-zen-primary/5'}
                              `}
                            >
                              {item.name}
                            </NavLink>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    className={({ isActive }) => `
                      relative text-[10px] font-bold uppercase tracking-[0.2em] transition-colors py-2
                      ${isActive ? 'text-zen-brown' : 'text-zen-brown/40 hover:text-zen-brown'}
                    `}
                  >
                    {({ isActive }) => (
                      <span className="relative inline-block">
                        {link.name}
                        {isActive && (
                          <motion.span
                            layoutId="nav-underline"
                            className="absolute -bottom-1 left-1/2 h-[2px] w-full -translate-x-1/2 bg-zen-sand"
                          />
                        )}
                      </span>
                    )}
                  </NavLink>
                )
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3 ml-auto shrink-0">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full border border-zen-brown/10 bg-white/50 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.24em] text-zen-brown transition-colors hover:bg-white"
            >
              <User size={14} />
              Portal
            </Link>
            <Link
              to="/book"
              className="inline-flex items-center gap-2 rounded-full bg-zen-primary px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.24em] text-zen-contrast transition-colors hover:bg-zen-brown"
            >
              Book Now
              <ArrowUpRight size={14} />
            </Link>
          </div>

          {/* Mobile hamburger */}
            <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden ml-auto rounded-full border border-zen-brown/10 bg-white/70 p-3 text-zen-brown backdrop-blur-md"
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
            className="fixed inset-0 z-[200] bg-zen-cream lg:hidden flex flex-col shadow-2xl overflow-y-auto"
          >
            {/* Elegant Header Area */}
            <div className="flex h-24 shrink-0 items-center justify-between px-8 bg-zen-cream border-b border-zen-primary/5">
              <NavLink to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zen-primary text-zen-contrast shadow-xl shadow-zen-primary/20">
                  {logoUrl ? (
                    <img src={logoUrl} alt={siteName} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <Sparkles size={20} />
                  )}
                </div>
                <span className="font-serif text-xl font-bold tracking-[0.2em] uppercase text-zen-brown">{siteName}</span>
              </NavLink>
              <button
                onClick={() => setIsOpen(false)}
                className="h-14 w-14 rounded-full bg-white border border-zen-brown/5 flex items-center justify-center text-zen-brown shadow-lg active:scale-95 transition-all"
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

              <div className="space-y-6">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.name}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 + 0.2, ease: "easeOut" }}
                  >
                    {link.isDropdown ? (
                      <div className="space-y-4">
                        <button 
                          onClick={() => setActiveSubMenu(activeSubMenu === link.name ? null : link.name)}
                          className="w-full flex items-center justify-between text-zen-brown/40 hover:text-zen-brown transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40">0{i + 1}</span>
                            <span className="font-serif text-5xl sm:text-6xl font-black leading-none tracking-tight">
                              {link.name}
                            </span>
                          </div>
                          <ChevronDown size={32} className={`transition-transform duration-500 ${activeSubMenu === link.name ? 'rotate-180 text-zen-primary' : 'opacity-20'}`} />
                        </button>
                        
                        <AnimatePresence>
                          {activeSubMenu === link.name && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden space-y-4 pl-12"
                            >
                              {link.items?.map((item) => (
                                <NavLink
                                  key={item.path}
                                  to={item.path}
                                  onClick={() => setIsOpen(false)}
                                  className={({ isActive }) => `
                                    block font-serif text-3xl font-black transition-all
                                    ${isActive ? 'text-zen-primary italic' : 'text-zen-brown/30'}
                                  `}
                                >
                                  {item.name}
                                </NavLink>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <NavLink
                        to={link.path}
                        onClick={() => setIsOpen(false)}
                        className={({ isActive }) => `
                          group relative flex flex-col transition-all duration-500
                          ${isActive ? 'text-zen-primary' : 'text-zen-brown/40 hover:text-zen-brown'}
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
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Footer Area - Premium CTA */}
            <div className="p-10 pb-12 space-y-8 bg-zen-cream border-t border-zen-primary/5">
              <div className="flex flex-col gap-4">
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full rounded-2xl border border-zen-brown/10 bg-white py-6 text-center text-[11px] font-bold uppercase tracking-[0.3em] text-zen-brown active:scale-[0.98] transition-all shadow-sm hover:shadow-md"
                >
                  Portal Access
                </Link>
                <Link
                  to="/book"
                  onClick={() => setIsOpen(false)}
                  className="w-full rounded-2xl bg-zen-primary py-6 text-center text-[11px] font-bold uppercase tracking-[0.3em] text-zen-contrast active:scale-[0.98] transition-all shadow-2xl shadow-zen-primary/30"
                >
                  Book Your Ritual
                </Link>
              </div>
              
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-[1px] bg-zen-brown/10" />
                <p className="text-[10px] text-zen-brown/30 uppercase tracking-[0.5em] font-black">
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
