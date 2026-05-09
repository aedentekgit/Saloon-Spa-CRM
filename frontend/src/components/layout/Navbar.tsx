import { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate, NavLink } from 'react-router-dom';
import { Bell, PanelLeftClose, PanelLeftOpen, Settings, LogOut, UserRound, LayoutGrid, CalendarClock, History, Menu } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { notify } from '../../components/shared/ZenNotification';
import { motion, AnimatePresence } from 'motion/react';
import { getPollIntervalMs, shouldPollNow } from '../../utils/polling';
import { ConfirmDialog } from '../shared/ConfirmDialog';

const Navbar = ({
  onMenuClick,
  isCollapsed,
  setIsCollapsed
}: {
  onMenuClick: () => void,
  isCollapsed: boolean,
  setIsCollapsed: (v: boolean) => void
}) => {
  const { user, logout, hasPermission, validating } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

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
      const interval = setInterval(() => {
        if (!shouldPollNow()) return;
        fetchNotifications();
      }, getPollIntervalMs(30000));
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

  const navigate = useNavigate();

  const handleNotifClick = (notif: any) => {
    markAsRead(notif._id);
    if (notif.link) {
      navigate(notif.link);
      setIsNotifOpen(false);
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
    <header className="h-14 sm:h-16 md:h-[72px] bg-white/80 backdrop-blur-xl border-b border-zen-stone/40 flex items-center justify-between px-3 sm:px-4 md:px-6 lg:px-10 sticky top-0 z-40 shadow-none overflow-visible">

      {/* Left section: Breadcrumb & Title */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Sidebar Toggle/Menu for Admin Roles */}
        {user?.role !== 'Client' && (
          <>
            <button
              onClick={onMenuClick}
              className="lg:hidden text-zen-brown/40 hover:text-zen-brown transition-colors p-1.5 rounded-lg hover:bg-zen-stone/30"
              aria-label="Open Menu"
            >
              <Menu size={20} />
            </button>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex text-zen-brown/40 hover:text-zen-brown transition-colors p-1.5 rounded-lg hover:bg-zen-stone/30"
              aria-label="Toggle Menu"
            >
              {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
          </>
        )}

        <div className="h-5 w-px bg-zen-stone hidden sm:block"></div>

        {/* Client role: show 4 nav tabs inline */}
        {user?.role === 'Client' ? (
          <nav className="hidden sm:flex items-center gap-1 bg-zen-cream/60 rounded-xl p-1 border border-zen-stone/30">
            {[
              { name: 'Home',    path: '/dashboard',    icon: LayoutGrid },
              { name: 'Book',    path: '/book',         icon: CalendarClock },
              { name: 'Profile', path: '/profile',      icon: UserRound },
              { name: 'History', path: '/transactions', icon: History },
            ].map(({ name, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black tracking-wide transition-all duration-200 ${
                    isActive
                      ? 'bg-zen-sand text-white shadow-sm shadow-zen-sand/30'
                      : 'text-zen-brown/50 hover:text-zen-brown hover:bg-white/60'
                  }`
                }
              >
                <Icon size={13} />
                {name}
              </NavLink>
            ))}
          </nav>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={getPageTitle()}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="hidden sm:flex items-center gap-3 min-w-0"
            >
              <div className="w-1.5 h-5 bg-zen-sand rounded-sm opacity-90 shadow-none"></div>
              <span className="text-[15px] font-black tracking-[0.15em] text-zen-brown uppercase font-sans">
                {getPageTitle()}
              </span>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
      
      {/* Middle section: Portal target for page-specific actions */}
      <div id="navbar-middle-content" className="flex-1 flex justify-end px-4" />

      {/* Right section: Icons & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-4">

        {/* Helper Icons */}
        <div className="relative" ref={notifRef}>
           <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className={`relative p-2 transition-all rounded-lg ${isNotifOpen ? 'bg-zen-cream text-zen-sand' : 'text-zen-brown/40 hover:text-zen-brown hover:bg-zen-stone/30'}`}
           >
              <Bell size={18} />
              {unreadCount > 0 && (
                 <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
              )}
           </button>

           <AnimatePresence>
             {isNotifOpen && (
               <motion.div
                 initial={{ opacity: 0, y: 8, scale: 0.98 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 exit={{ opacity: 0, y: 8, scale: 0.98 }}
                 transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                 className="absolute right-0 top-full mt-3 w-[min(22rem,calc(100vw-1.5rem))] bg-white rounded-xl border border-zen-stone/70 shadow-xl overflow-hidden z-[9999]"
               >
                 <div className="px-4 py-3 border-b border-zen-stone/30 flex items-center justify-between bg-white">
                     <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.22em] text-zen-brown/45">Notifications</h4>
                        <p className="text-[10px] font-bold text-zen-brown/30 mt-0.5">{unreadCount} unread</p>
                     </div>
                     {notifications.length > 0 && (
                        <button
                           onClick={handleClearAll}
                           className="text-[10px] font-black text-zen-sand hover:text-zen-brown transition-colors"
                        >
                           Clear
                        </button>
                     )}
                  </div>
                  <div className="max-h-[min(24rem,calc(100vh-9rem))] overflow-y-auto py-1">
                     {notifications.length === 0 ? (
                        <div className="py-12 px-6 text-center">
                           <div className="w-10 h-10 bg-zen-cream rounded-xl flex items-center justify-center mx-auto mb-4 text-zen-brown/20">
                              <Bell size={20} strokeWidth={1} />
                           </div>
                           <p className="text-[11px] font-black uppercase tracking-widest text-zen-brown/30">Your sanctuary is quiet</p>
                           <p className="text-[10px] text-zen-brown/20 mt-1">No new updates right now.</p>
                        </div>
                     ) : (
                        notifications.map((notif) => (
                           <div
                              key={notif._id}
                              onClick={() => handleNotifClick(notif)}
                              className={`px-4 py-3 hover:bg-zen-cream/45 transition-colors cursor-pointer group border-b border-zen-stone/20 last:border-b-0 ${!notif.isRead ? 'bg-zen-sand/[0.04]' : ''}`}
                           >
                              <div className="flex items-start gap-3 min-w-0">
                                 <div className={`mt-2 w-2 h-2 rounded-full shrink-0 ${notif.isRead ? 'bg-zen-stone/70' : 'bg-zen-sand'}`} />
                                 <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3">
                                       <p className="text-[12px] font-black text-zen-brown leading-snug truncate">{notif.title}</p>
                                       <span className="text-[9px] font-bold text-zen-brown/30 uppercase shrink-0 pt-0.5">{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-[11px] text-zen-brown/55 mt-1 line-clamp-2 leading-relaxed break-words">{notif.message}</p>
                                 </div>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
                  <div className="px-4 py-3 border-t border-zen-stone/30 text-center bg-white">
                     <button className="text-[10px] font-black uppercase tracking-[0.18em] text-zen-brown/35 hover:text-zen-brown transition-colors">View all updates</button>
                  </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>


        <div className="h-6 w-px bg-zen-stone/60 hidden sm:block mr-2"></div>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <div
            className="flex items-center gap-3 cursor-pointer group hover:bg-stone-50/80 p-1 rounded-2xl transition-all pr-4 border border-transparent hover:border-zen-stone/40"
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="w-10 h-10 professional-frame classic-shine-effect flex items-center justify-center bg-white shadow-sm border-zen-stone/50 shrink-0">
              <div className="w-full h-full bg-zen-cream flex items-center justify-center text-zen-brown/40 group-hover:text-zen-brown transition-colors">
                <UserRound size={18} />
              </div>
            </div>
            <div className="hidden md:flex flex-col">
              <span className="text-[13px] font-black text-zen-brown tracking-tight leading-tight min-h-[1.25rem] flex items-center">
                {validating ? (
                  <div className="h-3 w-24 bg-zen-stone/20 animate-pulse rounded-full" />
                ) : (
                  user?.name || 'Admin User'
                )}
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] font-black text-zen-brown/30 mt-0.5 min-h-[0.75rem] flex items-center">
                {validating ? (
                  <div className="h-2 w-16 bg-zen-stone/10 animate-pulse rounded-full" />
                ) : (
                  user?.role || 'ADMINISTRATOR'
                )}
              </span>
            </div>
          </div>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border-2 border-zen-sand/40 shadow-xl overflow-hidden py-2 z-[9999] ring-1 ring-zen-stone/20"
              >
                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-5 py-2.5 text-sm font-semibold text-zen-brown hover:bg-zen-cream transition-colors"
                >
                  <UserRound size={16} className="text-zen-brown/30" />
                  My Profile
                </Link>
                {hasPermission('settings') && (
                  <Link
                    to="/settings"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-5 py-2.5 text-sm font-semibold text-zen-brown hover:bg-zen-cream transition-colors"
                  >
                    <Settings size={16} className="text-zen-brown/30" />
                    Settings
                  </Link>
                )}
                <div className="mx-5 my-1 border-t border-zen-stone/30" />
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowLogoutConfirm(true);
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

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        title="Confirm Logout"
        message="Are you sure you want to log out of your session?"
        confirmText="Logout Now"
        cancelText="Cancel"
        type="danger"
      />
    </header>
  );
};

export default Navbar;
