import { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Bell, ChevronLeft, ChevronRight, Settings, LogOut, FileText, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

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
    if (path === '/dashboard' || path === '/') return 'DASHBOARD';
    const segment = path.split('/')[1];
    return segment.toUpperCase();
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
      
      {/* Left section: Breadcrumb & Title */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => {
            if (window.innerWidth < 1024) {
              onMenuClick();
            } else {
              setIsCollapsed(!isCollapsed);
            }
          }}
          className="text-gray-500 hover:text-slate-900 transition-colors p-1 rounded-md hover:bg-gray-50"
          aria-label="Toggle Menu"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        <div className="h-5 w-px bg-gray-200 hidden sm:block"></div>

        <AnimatePresence mode="wait">
          <motion.div 
            key={getPageTitle()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="hidden sm:flex items-center gap-3"
          >
            <div className="w-1 h-4 bg-zen-primary rounded-full opacity-50"></div>
            <span className="text-[15px] font-black tracking-[0.2em] text-slate-900 uppercase font-sans">
              {getPageTitle()}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right section: Icons & Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        
        {/* Helper Icons */}
        <div className="flex items-center gap-1 mr-2 text-slate-400">
           <button className="p-2 hover:text-slate-900 transition-colors hover:bg-gray-50 rounded-lg">
              <FileText size={18} />
           </button>
           <button className="relative p-2 hover:text-slate-900 transition-colors hover:bg-gray-50 rounded-lg">
              <Bell size={18} />
              <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
           </button>
        </div>

        <div className="h-6 w-px bg-gray-200 hidden sm:block mr-2"></div>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <div 
            className="flex items-center gap-3 cursor-pointer group hover:bg-gray-50 p-1.5 rounded-xl transition-colors pr-3"
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <UserRound size={16} />
            </div>
            <div className="hidden md:flex flex-col">
              <span className="text-[13px] font-bold text-slate-900 leading-tight">
                {user?.name || 'Admin User'}
              </span>
              <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">
                {user?.role || 'ADMIN'}
              </span>
            </div>
          </div>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden py-2 z-50"
              >
                <Link 
                  to="/settings" 
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Settings size={16} className="text-slate-400" />
                  Settings
                </Link>
                <div className="mx-5 my-1 border-t border-gray-100" />
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} className="text-red-500" />
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
