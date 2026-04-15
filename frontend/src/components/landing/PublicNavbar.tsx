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
      className={`fixed top-0 left-0 right-0 z-[100] border-b border-[#32172A]/10 transition-all duration-500 ${
        scrolled ? 'bg-[#FAF9F6]/95 backdrop-blur-2xl shadow-[0_10px_30px_rgba(50,23,42,0.05)]' : 'bg-[#FAF9F6]/90 backdrop-blur-xl'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-3 group shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#32172A] text-[#FAF9F6] shadow-lg transition-transform duration-500 group-hover:scale-110">
              <Sparkles size={18} />
            </div>
            <span className="hidden sm:block font-serif text-lg font-bold tracking-[0.2em] uppercase text-[#32172A]">
              ZenSpa
            </span>
          </NavLink>

          {/* Nav Links — centred in remaining space */}
          <div className="hidden lg:flex flex-1 items-center justify-center">
            <div className="flex items-center gap-10 xl:gap-16">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) => `
                    relative text-[10px] font-semibold uppercase tracking-[0.42em] transition-colors
                    ${isActive ? 'text-[#32172A]' : 'text-[#A79CA4] hover:text-[#32172A]'}
                  `}
                >
                  {({ isActive }) => (
                    <span className="relative inline-block py-2">
                      {link.name}
                      {isActive && (
                        <motion.span
                          layoutId="nav-underline"
                          className="absolute -bottom-0.5 left-1/2 h-[2px] w-12 -translate-x-1/2 bg-[#32172A]"
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
              className="inline-flex items-center gap-2 rounded-full border border-[#32172A]/10 bg-white/50 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.24em] text-[#32172A] transition-colors hover:bg-white"
            >
              <User size={14} />
              Portal
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-[#32172A] px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.24em] text-[#FAF9F6] transition-colors hover:bg-black"
            >
              Book Now
              <ArrowUpRight size={14} />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden ml-auto rounded-full border border-[#32172A]/10 bg-white/70 p-3 text-[#32172A] backdrop-blur-md"
            aria-label="Toggle navigation menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed inset-x-4 top-20 z-[101] overflow-hidden lg:hidden sm:inset-x-6"
          >
            <div className="rounded-[2.5rem] border border-[#32172A]/10 bg-[#FAF9F6]/95 p-6 shadow-2xl backdrop-blur-2xl">
              <div className="flex items-center justify-between pb-5">
                <NavLink to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#32172A] text-[#FAF9F6]">
                    <Sparkles size={18} />
                  </div>
                  <span className="font-serif text-lg font-bold tracking-[0.2em] uppercase text-[#32172A]">ZenSpa</span>
                </NavLink>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full border border-[#32172A]/10 p-2 text-[#32172A]"
                  aria-label="Close navigation menu"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) => `
                      rounded-2xl px-4 py-4 text-left text-lg font-semibold uppercase tracking-[0.28em] transition-colors
                      ${isActive ? 'bg-[#32172A]/5 text-[#32172A]' : 'text-[#32172A]/60'}
                    `}
                  >
                    {link.name}
                  </NavLink>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="rounded-2xl border border-[#32172A]/10 bg-white px-4 py-4 text-center text-[10px] font-bold uppercase tracking-[0.24em] text-[#32172A]"
                >
                  Portal
                </Link>
                <Link
                  to="/contact"
                  onClick={() => setIsOpen(false)}
                  className="rounded-2xl bg-[#32172A] px-4 py-4 text-center text-[10px] font-bold uppercase tracking-[0.24em] text-white"
                >
                  Book Now
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
