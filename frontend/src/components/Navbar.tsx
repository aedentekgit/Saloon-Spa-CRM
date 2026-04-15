import { useLocation } from 'react-router-dom';
import { Bell, User, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
  const { user } = useAuth();
  const location = useLocation();
  const shouldShowBranchInNavbar = ['/dashboard', '/', '/billing'].includes(location.pathname);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/') return 'Dashboard Overview';
    const segment = path.split('/')[1];
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-10 sticky top-0 z-40 backdrop-blur-md bg-white/40 border-b border-zen-brown/15">
      <div className="flex items-center gap-6 flex-1">
        {/* Toggle Button - Visible for Desktop ONLY on Mobile it is hidden as we have footer */}
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
        
        <div className="flex items-center space-x-3 sm:border-l sm:border-zen-brown/25 sm:pl-4">
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-zen-brown truncate max-w-[120px]">{user?.name}</p>
            <p className="text-[10px] uppercase font-bold text-zen-brown/40 tracking-wider font-sans">{user?.role}</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zen-leaf flex items-center justify-center text-zen-brown shadow-inner ring-2 ring-white">
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
