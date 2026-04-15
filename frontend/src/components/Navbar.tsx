import { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Bell, User, ChevronLeft, ChevronRight, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { BranchSelector } from './zen/BranchSelector';

const Navbar = ({ 
  onMenuClick, 
  isCollapsed, 
  setIsCollapsed 
}: { 
  onMenuClick: () => void,
  isCollapsed: boolean,
  setIsCollapsed: (v: boolean) => void
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const shouldShowBranchInNavbar = ['/dashboard', '/', '/billing', '/reports', '/payroll', '/transactions'].includes(location.pathname);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/') return 'Dashboard Overview';
    const segment = path.split('/')[1];
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-10 sticky top-0 z-40 backdrop-blur-md bg-white/40 border-b border-zen-brown/15">
      <div className="flex items-center gap-6 flex-1">
        {/* Toggle Button */}
        <button 
          onClick={() => {
            if (window.innerWidth < 1024) {
              onMenuClick();
            } else {
              setIsCollapsed(!isCollapsed);
            }
          }}
          className="p-2 -ml-2 text-zen-brown hover:bg-zen-brown/5 rounded-xl transition-all active:scale-95 group hidden lg:block"
          aria-label="Toggle Menu"
        >
          <div className="transition-transform duration-300 group-hover:scale-110">
            {isCollapsed ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
          </div>
        </button>

        {/* Dynamic Page Title */}
        <div className="flex items-center animate-in fade-in slide-in-from-left-4 duration-500">
          <h2 className="text-xl font-serif font-bold text-zen-brown tracking-tight">
            {getPageTitle()}
          </h2>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4 ml-4">
        {shouldShowBranchInNavbar && (
          <div className="hidden sm:block mr-2 scale-90 origin-right">
            <BranchSelector />
          </div>
        )}
        <button className="relative p-2 text-zen-brown/60 hover:text-zen-brown transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-zen-cream"></span>
        </button>
        
        <div className="relative" ref={dropdownRef}>
          <div 
            className="flex items-center space-x-3 sm:border-l sm:border-zen-brown/25 sm:pl-4 cursor-pointer group"
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="text-right hidden md:block group-hover:opacity-80 transition-opacity">
              <p className="text-sm font-bold text-zen-brown truncate max-w-[120px]">{user?.name}</p>
              <p className="text-[10px] uppercase font-bold text-zen-brown/40 tracking-wider font-sans">{user?.role}</p>
            </div>
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-zen-brown shadow-inner ring-2 transition-all duration-500 ${isOpen ? 'ring-zen-brown bg-zen-brown text-white' : 'ring-white bg-zen-leaf'}`}>
              <User size={20} />
            </div>
          </div>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute right-0 mt-3 w-56 bg-white/90 backdrop-blur-2xl rounded-3xl border border-zen-brown/15 shadow-2xl shadow-zen-brown/20 overflow-hidden py-2"
              >
                <Link 
                  to="/settings" 
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-5 py-3 text-sm font-bold text-zen-brown hover:bg-zen-brown/5 transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-zen-cream flex items-center justify-center text-zen-brown/40">
                    <Settings size={16} />
                  </div>
                  Settings
                </Link>
                <div className="mx-5 my-1 border-t border-zen-brown/5" />
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-[#FF6B6B] hover:bg-red-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                    <LogOut size={16} />
                  </div>
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
