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
import { useAuth } from '../context/AuthContext';

const MobileFooter: React.FC = () => {
  const { hasPermission, logout } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const footerItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', permission: 'dashboard' },
    { name: 'Appointments', icon: Calendar, path: '/appointments', permission: 'appointments' },
    { name: 'Clients', icon: Users, path: '/clients', permission: 'clients' },
    { name: 'Services', icon: Sparkles, path: '/services', permission: 'services' },
  ];

  const sheetItems = [
    { name: 'Memberships', icon: Crown, path: '/memberships', permission: 'billing' },
    { name: 'Sanctuary Rooms', icon: Bed, path: '/rooms', permission: 'rooms' },
    { name: 'Specialists', icon: UserRound, path: '/employees', permission: 'employees' },
    { name: 'Presence', icon: UserCheck, path: '/attendance', permission: 'attendance' },
    { name: 'Temporal Shifts', icon: Repeat, path: '/shifts', permission: 'settings' },
    { name: 'Payroll', icon: TrendingUp, path: '/payroll', permission: 'finance' },
    { name: 'Leave Matrix', icon: CalendarDays, path: '/leave', permission: 'leave' },
    { name: 'Finance Hub', icon: Wallet, path: '/finance', permission: 'finance' },
    { name: 'Inventory', icon: Package, path: '/inventory', permission: 'inventory' },
    { name: 'WhatsApp', icon: MessageSquare, path: '/whatsapp', permission: 'whatsapp' },
    { name: 'Reports', icon: BarChart3, path: '/reports', permission: 'reports' },
    { name: 'Branches', icon: Building2, path: '/branches', permission: 'settings' },
    { name: 'Room Logic', icon: DoorOpen, path: '/room-categories', permission: 'settings' },
    { name: 'Service Logic', icon: Sparkles, path: '/service-categories', permission: 'settings' },
    { name: 'Admins', icon: UserRound, path: '/admins', permission: 'roles' },
    { name: 'Authority', icon: Shield, path: '/roles', permission: 'roles' },
    { name: 'Tax/GST', icon: Percent, path: '/tax', permission: 'settings' },
    { name: 'Calibration', icon: SettingsIcon, path: '/settings', permission: 'settings' },
  ];

  const filteredFooter = footerItems.filter(item => hasPermission(item.permission));
  const filteredSheet = sheetItems.filter(item => hasPermission(item.permission));

  return (
    <>
      {/* Main Navigation Bar */}
      <div className="lg:hidden fixed bottom-6 left-4 right-4 z-[100] animate-in slide-in-from-bottom-10 duration-700">
        <nav className="bg-white/95 backdrop-blur-2xl rounded-[2rem] border border-zen-brown/25 shadow-2xl shadow-zen-brown/20 p-1.5 flex items-center justify-around relative ring-1 ring-black/5">
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
                  <div className={`transition-all duration-500 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]' : ''}`}>
                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-widest transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-0 h-0 w-0 overflow-hidden'}`}>
                    {item.name}
                  </span>
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
              className="fixed bottom-0 left-0 right-0 bg-zen-cream z-[120] lg:hidden rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.2)] max-h-[85vh] overflow-hidden flex flex-col border-t border-white"
            >
              <div className="p-8 border-b border-zen-brown/15 flex items-center justify-between shrink-0 bg-white/50">
                <div>
                  <h3 className="text-2xl font-serif font-bold text-zen-brown tracking-tight">Sanctuary Matrix</h3>
                  <p className="text-[10px] font-bold text-zen-brown/40 uppercase tracking-[0.3em] mt-1">Explore all sectors</p>
                </div>
                <button 
                  onClick={() => setIsMoreOpen(false)}
                  className="w-12 h-12 rounded-2xl bg-white border border-zen-brown/25 flex items-center justify-center text-zen-brown/40 hover:text-zen-brown hover:rotate-90 transition-all duration-500 shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar">
                <div className="flex flex-col gap-3">
                  {filteredSheet.map((item) => (
                    <NavLink
                      key={item.name}
                      to={item.path}
                      onClick={() => setIsMoreOpen(false)}
                      className="flex items-center gap-6 p-5 rounded-[2rem] bg-white/60 hover:bg-white hover:shadow-xl transition-all duration-500 border border-white group"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-zen-cream flex items-center justify-center text-zen-brown/20 group-hover:text-zen-sand transition-all duration-500 group-hover:bg-zen-sand/5 shrink-0">
                        <item.icon size={24} strokeWidth={1.5} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black uppercase tracking-[0.2em] text-zen-brown group-hover:text-zen-sand transition-colors">
                          {item.name}
                        </span>
                        <p className="text-[10px] font-bold text-zen-brown/30 uppercase tracking-widest mt-0.5">
                          Management Sector
                        </p>
                      </div>
                      <ChevronRight className="ml-auto text-zen-brown/10 group-hover:text-zen-sand/30 transition-colors" size={18} />
                    </NavLink>
                  ))}
                  
                  <button
                    onClick={() => {
                      logout();
                      setIsMoreOpen(false);
                    }}
                    className="flex items-center gap-6 p-5 mt-4 rounded-[2rem] bg-red-50/50 hover:bg-red-50 hover:shadow-xl transition-all duration-500 border border-white group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-red-100/50 flex items-center justify-center text-red-300 group-hover:text-red-500 transition-all duration-500 shrink-0">
                      <LogOut size={24} strokeWidth={1.5} />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-black uppercase tracking-[0.2em] text-red-400">
                        Terminate Session
                      </span>
                      <p className="text-[10px] font-bold text-red-300/40 uppercase tracking-widest mt-0.5">
                        Security Exit
                      </p>
                    </div>
                  </button>
                </div>
              </div>
              <div className="p-10 shrink-0 text-center text-[10px] font-serif italic text-zen-brown/20 bg-white/30 border-t border-zen-brown/15">
                Authentic Wellness Exchange · Sanctuary Digital
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileFooter;
