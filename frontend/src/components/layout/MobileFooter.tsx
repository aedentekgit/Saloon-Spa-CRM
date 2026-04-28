import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Sparkles,
  Menu,
  X,
  Crown,
  Bed,
  UserRound,
  UserCheck,
  Repeat,
  TrendingUp,
  CalendarDays,
  Wallet,
  Package,
  MessageSquare,
  BarChart3,
  Building2,
  DoorOpen,
  Shield,
  Percent,
  Settings as SettingsIcon,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const MobileFooter: React.FC = () => {
  const { user, hasPermission, logout } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const footerItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', permission: 'dashboard' },
    { name: 'Appointments', icon: Calendar, path: '/appointments', permission: 'appointments' },
    { name: 'Clients', icon: Users, path: '/clients', permission: 'clients' },
    { name: 'Services', icon: Sparkles, path: '/services', permission: 'services' },
  ];

  const sheetItems = [
    { name: 'Memberships', icon: Crown, path: '/memberships', permission: ['memberships', 'billing'] },
    { name: 'Rooms', icon: Bed, path: '/rooms', permission: 'rooms' },
    { name: 'Specialists', icon: UserRound, path: '/employees', permission: 'employees' },
    { name: 'Presence', icon: UserCheck, path: user?.role === 'Employee' ? '/staff-attendance' : '/attendance', permission: 'attendance' },
    { name: 'Shifts', icon: Repeat, path: '/shifts', permission: ['shifts', 'settings'] },
    { name: 'Payroll', icon: TrendingUp, path: '/payroll', permission: ['payroll', 'finance'] },
    { name: 'Leave Matrix', icon: CalendarDays, path: '/leave', permission: 'leave' },
    { name: 'Finance Hub', icon: Wallet, path: '/finance', permission: 'finance' },
    { name: 'Inventory', icon: Package, path: '/inventory', permission: 'inventory' },
    { name: 'WhatsApp', icon: MessageSquare, path: '/whatsapp', permission: 'whatsapp' },
    { name: 'Reports', icon: BarChart3, path: '/reports', permission: 'reports' },
    { name: 'Branches', icon: Building2, path: '/branches', permission: ['branches', 'settings'] },
    { name: 'Room Logic', icon: DoorOpen, path: '/room-categories', permission: ['room-categories', 'settings'] },
    { name: 'Service Logic', icon: Sparkles, path: '/service-categories', permission: ['service-categories', 'settings'] },
    { name: 'Admins', icon: UserRound, path: '/admins', permission: ['admins', 'roles'] },
    { name: 'Admin', icon: Shield, path: '/roles', permission: 'roles' },
    { name: 'Tax/GST', icon: Percent, path: '/settings', permission: 'settings' },
    { name: 'Settings', icon: SettingsIcon, path: '/settings', permission: 'settings' },
  ];

  const clientFooterItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', permission: 'dashboard' },
    { name: 'Booking', icon: Calendar, path: '/book', permission: 'book' },
    { name: 'Profile', icon: UserRound, path: '/profile', permission: 'profile' },
    { name: 'History', icon: Repeat, path: '/transactions', permission: ['history', 'transactions', 'finance'] },
  ];

  const canAccessItem = (permission: string | string[]) => (
    Array.isArray(permission)
      ? permission.some((perm) => hasPermission(perm))
      : hasPermission(permission)
  );

  const filteredFooter = (user?.role === 'Client' ? clientFooterItems : footerItems)
    .filter(item => canAccessItem(item.permission));
  const filteredSheet = (user?.role === 'Client' ? [] : sheetItems)
    .filter(item => canAccessItem(item.permission));

  return (
    <>
      {/* Main Navigation Bar */}
      <div className="lg:hidden fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-[100] animate-in slide-in-from-bottom-10 duration-700">
        <nav className="bg-white/95 backdrop-blur-2xl rounded-[1rem] border border-zen-brown/25 shadow-2xl shadow-zen-brown/20 p-1.5 flex items-center justify-around relative ring-1 ring-black/5">
          {filteredFooter.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setIsMoreOpen(false)}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all duration-500 gap-1.5 min-w-[64px] ${
                  isActive
                    ? 'text-zen-sand bg-zen-sand/5'
                    : 'text-zen-brown/40 hover:text-zen-brown/60 active:scale-90'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`transition-all duration-500 ${isActive ? 'scale-110 drop-shadow-none' : ''}`}>
                    <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                </>
              )}
            </NavLink>
          ))}

          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={`flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all duration-500 gap-1.5 min-w-[64px] ${
              isMoreOpen ? 'text-zen-sand bg-zen-sand/5' : 'text-zen-brown/40 hover:text-zen-brown/60 active:scale-95'
            }`}
          >
            <Menu size={22} strokeWidth={2} />
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-0 h-0 w-0 overflow-hidden">More</span>
          </button>
        </nav>
      </div>

      {/* Bottom Sheet Menu */}
      <AnimatePresence>
        {isMoreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] lg:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-zen-cream z-[120] lg:hidden rounded-t-[3rem] shadow-none max-h-[85vh] overflow-hidden flex flex-col border-t border-white"
            >
              <div className="p-5 border-b border-zen-brown/15 flex items-center justify-between shrink-0 bg-white/50">
                <div>
                  <h3 className="text-xl font-serif font-bold text-zen-brown tracking-tight">All Sections</h3>
                  <p className="text-[9px] font-bold text-zen-brown/40 uppercase tracking-[0.3em]">Explore all sectors</p>
                </div>
                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="w-10 h-10 rounded-xl bg-white border border-zen-brown/25 flex items-center justify-center text-zen-brown/40 hover:text-zen-brown transition-all duration-500 shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
                 <div className="grid grid-cols-3 gap-4">
                  {filteredSheet.map((item) => (
                    <NavLink
                      key={item.name}
                      to={item.path}
                      onClick={() => setIsMoreOpen(false)}
                      className="flex flex-col items-center justify-center gap-1.5 p-3 py-4 rounded-3xl bg-white hover:bg-zen-cream/30 hover:shadow-lg transition-all duration-500 border border-zen-brown/5 group text-center"
                    >
                      <div className="w-11 h-11 rounded-[1.25rem] bg-stone-100 flex items-center justify-center text-zen-brown/40 group-hover:text-zen-sand transition-all duration-500 group-hover:bg-zen-sand/10 shrink-0">
                        <item.icon size={22} strokeWidth={2} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-zen-brown/80 group-hover:text-zen-sand transition-colors leading-tight">
                        {item.name}
                      </span>
                    </NavLink>
                  ))}
                  <button
                    onClick={() => {
                      logout();
                      setIsMoreOpen(false);
                    }}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 py-4 mt-2 rounded-3xl bg-red-50/50 hover:bg-red-50 hover:shadow-lg transition-all duration-500 border border-white group col-span-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-100/50 flex items-center justify-center text-red-300 group-hover:text-red-500 transition-all duration-500 shrink-0">
                      <LogOut size={20} strokeWidth={1.5} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-400">
                      Terminate Session
                    </span>
                  </button>
                </div>
              </div>
              <div className="p-5 shrink-0 text-center text-[9px] font-serif italic text-zen-brown/20 bg-white/30 border-t border-zen-brown/15">
                Authentic Wellness Exchange · Workspace Digital
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileFooter;
