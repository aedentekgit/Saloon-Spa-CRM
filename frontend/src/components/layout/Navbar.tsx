import { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Bell, ChevronLeft, ChevronRight, Settings, LogOut, UserRound } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { notify } from '../../components/shared/ZenNotification';
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
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [notifications, setNotifications] = useState<any[]>([]);
  
  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_URL}/notifications`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      setNotifications(data);
    } catch (e) {
      console.error('Failed to fetch notifications');
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 20000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleClearAll = async () => {
    try {
      await fetch(`${API_URL}/notifications`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      setNotifications([]);
      notify('info', 'Clean Slate', 'All notifications have been cleared.');
    } catch (e) {
      notify('error', 'Action Failed', 'Could not clear notifications.');
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API_URL}/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (e) {
       // Silently fail
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

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
        <div className="relative" ref={notifRef}>
           <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className={`relative p-2 transition-all rounded-lg ${isNotifOpen ? 'bg-zen-cream text-zen-sand' : 'text-slate-400 hover:text-slate-900 hover:bg-gray-50'}`}
           >
              <Bell size={18} />
              {unreadCount > 0 && (
                 <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
              )}
           </button>

           <AnimatePresence>
             {isNotifOpen && (
               <motion.div
                 initial={{ opacity: 0, y: 15, scale: 0.95 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 exit={{ opacity: 0, y: 15, scale: 0.95 }}
                 className="absolute right-0 mt-3 w-80 bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden z-[60]"
               >
                  <div className="p-6 pb-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                     <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-900">Notifications</h4>
                     {notifications.length > 0 && (
                        <button 
                           onClick={handleClearAll}
                           className="text-[10px] font-bold text-zen-sand hover:underline"
                        >
                           Clear all
                        </button>
                     )}
                  </div>
                  <div className="max-h-[350px] overflow-y-auto scrollbar-hide py-2">
                     {notifications.length === 0 ? (
                        <div className="py-12 px-6 text-center">
                           <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                              <Bell size={20} strokeWidth={1} />
                           </div>
                           <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Your sanctuary is quiet</p>
                           <p className="text-[10px] text-slate-300 mt-1">No new updates right now.</p>
                        </div>
                     ) : (
                        notifications.map((notif) => (
                           <div 
                              key={notif._id} 
                              onClick={() => markAsRead(notif._id)}
                              className={`px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group ${!notif.isRead ? 'bg-slate-50/30' : ''}`}
                           >
                              <div className="flex items-start gap-3">
                                 <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${notif.isRead ? 'bg-transparent border border-slate-200' : 'bg-zen-sand'}`} />
                                 <div className="flex-1">
                                    <div className="flex justify-between items-center bg">
                                       <p className="text-xs font-bold text-slate-900 leading-tight">{notif.title}</p>
                                       <span className="text-[8px] font-bold text-slate-400 uppercase">{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{notif.message}</p>
                                 </div>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
                  <div className="p-4 border-t border-gray-50 text-center">
                     <button className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">View all updates</button>
                  </div>
               </motion.div>
             )}
           </AnimatePresence>
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
