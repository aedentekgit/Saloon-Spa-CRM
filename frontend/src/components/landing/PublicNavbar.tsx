import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Sparkles, User, ArrowUpRight } from 'lucide-react';

const PublicNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
        scrolled ? 'bg-[#FAF9F6]/95 backdrop-blur-2xl shadow-lg shadow-zen-primary/5' : 'bg-[#FAF9F6]/90 backdrop-blur-xl'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-3 group shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zen-primary text-zen-contrast shadow-lg transition-transform duration-500 group-hover:scale-110">
              <Sparkles size={18} />
            </div>
            <span className="hidden sm:block font-serif text-lg font-bold tracking-[0.2em] uppercase text-black">
              ZenSpa
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-[#FAF9F6] lg:hidden flex flex-col"
          >
            {/* Header Area */}
            <div className="flex h-20 items-center justify-between px-6 border-b border-zen-primary/5">
              <NavLink to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zen-primary text-zen-contrast">
                  <Sparkles size={18} />
                </div>
                <span className="font-serif text-lg font-bold tracking-[0.2em] uppercase text-black">ZenSpa</span>
              </NavLink>
              <button
                onClick={() => setIsOpen(false)}
                className="h-12 w-12 rounded-full border border-black/10 flex items-center justify-center text-black active:scale-90 transition-transform"
              >
                <X size={24} />
              </button>
            </div>

            {/* Links Area */}
            <div className="flex-1 flex flex-col justify-center items-center px-6 gap-y-8">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.path}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, ease: "easeOut" }}
                >
                  <NavLink
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) => `
                      font-serif text-5xl md:text-6xl transition-all duration-500
                      ${isActive ? 'italic text-zen-primary translate-x-2' : 'text-black/60 hover:text-black'}
                    `}
                  >
                    {link.name}
                  </NavLink>
                </motion.div>
              ))}
            </div>

            {/* Footer Buttons Area */}
            <div className="p-8 pb-12 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full border border-black/10 bg-white py-5 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-black active:scale-95 transition-all"
                >
                  Portal Access
                </Link>
                <Link
                  to="/contact"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full bg-zen-primary py-5 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-zen-contrast active:scale-95 transition-all shadow-xl shadow-zen-primary/20"
                >
                  Book Now
                </Link>
              </div>
              <p className="text-[10px] text-center text-black/30 uppercase tracking-[0.4em] mt-4 font-bold">
                est. 2024 • the global sanctuary
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default PublicNavbar;
