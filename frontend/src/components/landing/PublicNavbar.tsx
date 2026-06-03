import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, User, ArrowUpRight, ChevronDown } from 'lucide-react';
import { usePublicSettings } from './usePublicSettings';
import { getImageUrl } from '../../utils/imageUrl';

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
        <div className="flex h-16 sm:h-20 items-center">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-3 group shrink-0">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 lg:h-10 lg:w-10 items-center justify-center rounded-full bg-zen-primary text-zen-contrast shadow-lg transition-transform duration-500 group-hover:scale-110">
              {logoUrl ? (
                <img src={logoUrl} alt={siteName} className="h-full w-full rounded-full object-cover" />
              ) : (
                <Sparkles size={20} />
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
            className="lg:hidden ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-zen-brown/10 bg-white/75 text-zen-brown backdrop-blur-md shadow-sm active:scale-95 transition-all"
            aria-label="Toggle navigation menu"
          >
            {isOpen ? (
              <X size={18} strokeWidth={2.2} />
            ) : (
              <span className="flex w-4 flex-col gap-1.5">
                <span className="h-[2px] w-full rounded-full bg-current" />
                <span className="h-[2px] w-full rounded-full bg-current" />
              </span>
            )}
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
            className="fixed inset-0 z-[200] bg-[#FDFCFB] lg:hidden flex flex-col shadow-2xl h-dvh w-screen overflow-hidden"
          >
            <div className="flex h-16 shrink-0 items-center justify-between px-4 bg-[#FDFCFB]/95 backdrop-blur-xl border-b border-zen-brown/10">
              <NavLink to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-zen-primary border border-zen-brown/10 shadow-sm shrink-0 overflow-hidden">
                  {logoUrl ? (
                    <img src={logoUrl} alt={siteName} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <Sparkles size={20} />
                  )}
                </div>
                <span className="truncate text-[12px] font-black tracking-[0.16em] uppercase text-zen-brown">{siteName}</span>
              </NavLink>
              <button
                onClick={() => setIsOpen(false)}
                className="h-10 w-10 rounded-full bg-white/70 border border-zen-brown/10 flex items-center justify-center text-zen-brown shadow-sm active:scale-95 transition-all shrink-0"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-8 relative z-10">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.76),rgba(241,245,249,0.45))] -z-10" />
              <div className="mb-8">
                <p className="text-[9px] font-black uppercase tracking-[0.32em] text-zen-sand">Navigation</p>
                <div className="mt-4 h-px w-16 bg-zen-brown/15" />
              </div>

              <div className="border-y border-zen-brown/10">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.name}
                    initial={{ opacity: 1, x: 0 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ease: "easeOut" }}
                  >
                    {link.isDropdown ? (
                      <div className="border-b border-zen-brown/10 last:border-b-0">
                        <button
                          onClick={() => setActiveSubMenu(activeSubMenu === link.name ? null : link.name)}
                          className="w-full flex items-center justify-between gap-4 py-5 text-zen-brown transition-all"
                        >
                          <div className="flex min-w-0 items-baseline gap-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zen-brown/25">0{i + 1}</span>
                            <span className="font-serif text-3xl font-black leading-none tracking-tight text-zen-brown">
                              {link.name}
                            </span>
                          </div>
                          <ChevronDown size={18} className={`shrink-0 transition-transform duration-300 ${activeSubMenu === link.name ? 'rotate-180 text-zen-sand' : 'text-zen-brown/25'}`} />
                        </button>

                        <AnimatePresence>
                          {activeSubMenu === link.name && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden pb-5"
                            >
                              {link.items?.map((item) => (
                                <NavLink
                                  key={item.path}
                                  to={item.path}
                                  onClick={() => setIsOpen(false)}
                                  className={({ isActive }) => `
                                    ml-12 flex items-center justify-between border-t border-zen-brown/5 py-3 text-[10px] font-black uppercase tracking-[0.22em] transition-all
                                    ${isActive ? 'text-zen-sand' : 'text-zen-brown/45'}
                                  `}
                                >
                                  <span>{item.name}</span>
                                  <ArrowUpRight size={13} />
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
                          group relative flex items-center justify-between gap-4 border-b border-zen-brown/10 py-5 transition-all duration-300 last:border-b-0
                          ${isActive ? 'text-zen-sand' : 'text-zen-brown'}
                        `}
                      >
                        {({ isActive }) => (
                          <>
                            <div className="flex min-w-0 items-baseline gap-4">
                              <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${isActive ? 'text-zen-sand/60' : 'text-zen-brown/25'}`}>0{i + 1}</span>
                              <span className={`font-serif text-3xl font-black leading-none tracking-tight ${isActive ? 'italic' : ''}`}>
                                {link.name}
                              </span>
                            </div>
                            <ArrowUpRight size={16} className={isActive ? 'text-zen-sand' : 'text-zen-brown/20'} />
                            {isActive && (
                              <motion.div
                                layoutId="mobile-link-dot"
                                className="absolute -left-6 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-zen-sand"
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

            <div className="shrink-0 border-t border-zen-brown/10 bg-[#FDFCFB]/95 p-5 z-20">
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex h-12 items-center justify-center rounded-full border border-zen-brown/15 bg-white/70 text-[9px] font-black uppercase tracking-[0.18em] text-zen-brown active:scale-[0.98] transition-all shadow-sm"
                >
                  Portal
                </Link>
                <Link
                  to="/book"
                  onClick={() => setIsOpen(false)}
                  className="flex h-12 items-center justify-center rounded-full bg-zen-primary text-[9px] font-black uppercase tracking-[0.18em] text-zen-contrast active:scale-[0.98] transition-all shadow-xl shadow-zen-primary/20"
                >
                  Book
                </Link>
              </div>
              <p className="mt-4 text-center text-[8px] font-black uppercase tracking-[0.28em] text-zen-brown/25">
                Since 2024 / Doha, Qatar
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default PublicNavbar;
