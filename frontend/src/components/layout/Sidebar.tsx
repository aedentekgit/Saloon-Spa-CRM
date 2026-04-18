import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutGrid, Users, CalendarClock, DoorOpen, Briefcase, CalendarOff,
  Gem, FileText, Landmark, Boxes, MessageCircle, TrendingUp,
  LogOut, ChevronRight, Settings2, ShieldCheck,
  MapPin, Award, Layers, CreditCard, Percent,
  Fingerprint, Timer, Shapes, Key, UserRound, Sparkles, Scissors
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { useSettings } from '../../context/SettingsContext';

const Sidebar = ({
  isCollapsed,
  setIsCollapsed,
  onClose
}: {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  onClose?: () => void
}) => {
  const { user, logout, hasPermission } = useAuth();
  const { settings } = useSettings();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  const logoUrl = settings?.general?.logo 
    ? (settings.general.logo.startsWith('http') ? settings.general.logo : `${API_URL.split('/api')[0]}/${settings.general.logo.replace(/^\.?\//, '')}`)
    : null;

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutGrid, path: '/dashboard', permission: 'dashboard' },
    { name: 'Appointments', icon: CalendarClock, path: '/appointments', permission: 'appointments' },
    { name: 'Billing', icon: CreditCard, path: '/billing', permission: 'billing' },
    { name: 'Clients', icon: Users, path: '/clients', permission: 'clients' },
    { name: 'Memberships', icon: Gem, path: '/memberships', permission: 'billing' },
    { name: 'Services', icon: Scissors, path: '/services', permission: 'services' },
    { name: 'Rooms', icon: DoorOpen, path: '/rooms', permission: 'rooms' },
    { name: 'Employees', icon: Briefcase, path: '/employees', permission: 'employees' },
    { name: 'Attendance', icon: Fingerprint, path: '/attendance', permission: 'attendance' },
    { name: 'Shifts', icon: Timer, path: '/shifts', permission: 'settings' },
    { name: 'Payroll', icon: Landmark, path: '/payroll', permission: 'finance' },
    { name: 'Leave', icon: CalendarOff, path: '/leave', permission: 'leave' },
    { name: 'Finance', icon: Landmark, path: '/finance', permission: 'finance' },
    { name: 'Transactions', icon: FileText, path: '/transactions', permission: 'finance' },
    { name: 'Inventory', icon: Boxes, path: '/inventory', permission: 'inventory' },
    { name: 'WhatsApp', icon: MessageCircle, path: '/whatsapp', permission: 'whatsapp' },
    { name: 'Reports', icon: TrendingUp, path: '/reports', permission: 'reports' },
    { name: 'Branches', icon: MapPin, path: '/branches', permission: 'settings' },
    { name: 'Room Category', icon: Layers, path: '/room-categories', permission: 'settings' },
    { name: 'Service Category', icon: Shapes, path: '/service-categories', permission: 'settings' },
    { name: 'Admins', icon: ShieldCheck, path: '/admins', permission: 'roles' },
    { name: 'Roles', icon: Key, path: '/roles', permission: 'roles' },
    { name: 'Tax', icon: Percent, path: '/tax', permission: 'settings' },
    { name: 'Settings', icon: Settings2, path: '/settings', permission: 'settings' },
  ];

  const filteredItems = menuItems
    .filter(item => hasPermission(item.permission))
    .map(item => {
      if (user?.role === 'Client') {
        if (item.name === 'Dashboard') return { ...item, name: 'Sanctuary Home' };
        if (item.name === 'Appointments') return { ...item, name: 'My Rituals' };
        if (item.name === 'Memberships') return { ...item, name: 'My Memberships' };
        if (item.name === 'Services') return { ...item, name: 'Ritual Menu' };
      }
      return item;
    });

  return (
    <aside className={`bg-white border-r border-gray-100 h-full transition-all duration-300 ease-in-out flex flex-col z-20 rounded-none relative overflow-hidden ${isCollapsed ? 'lg:w-[70px] w-60 md:w-60' : 'w-[210px]'}`}>
      
      {/* Top Logo Section: Black Background */}
      <div className={`h-16 flex items-center bg-[#0B0F19] text-white ${isCollapsed && !isMobile ? 'justify-center px-0' : 'justify-start px-3.5'}`}>
        {(!isCollapsed || isMobile) ? (
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-md bg-white/10 p-0.5" />
            ) : (
              <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center">
                 <Sparkles className="text-white" size={16} />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-wide text-white truncate max-w-[110px]">
                {settings?.general?.siteName || 'Settings'}
              </span>
            </div>
          </div>
        ) : (
          logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-md bg-white/10 p-0.5" />
          ) : (
            <Sparkles className="text-white" size={18} />
          )
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
        {filteredItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={() => {
              if (window.innerWidth < 1024 && onClose) onClose();
            }}
            style={({ isActive }) => ({
               backgroundColor: isActive ? 'var(--zen-sand)' : 'transparent',
               opacity: isActive ? 0.95 : 1
            })}
            className={({ isActive }) =>
              `flex items-center rounded-xl transition-all duration-300 group ${
                isCollapsed ? 'justify-center p-2.5 mx-auto w-10 h-10' : 'px-3 py-2.5 hover:bg-gray-50'
              } ${isActive ? 'text-white shadow-md shadow-zen-sand/20' : 'text-slate-500 hover:text-slate-900'}`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`flex items-center justify-center`}>
                  <item.icon size={18} strokeWidth={isActive ? 1.75 : 1.5} className={isActive ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : ''} />
                </div>
                {(!isCollapsed || isMobile) && (
                  <span className={`ml-3 text-[13px] font-bold tracking-wide flex-1 ${isActive ? 'text-white' : 'text-slate-600 group-hover:text-slate-900'}`}>
                    {item.name}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

  <div className="p-3 border-t border-gray-100 relative group cursor-pointer" onClick={() => setShowLogoutConfirm(true)}>
     <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-red-50 transition-colors">
        <div className="flex items-center gap-2.5">
           <div className="relative w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center shrink-0">
              <UserRound size={15} />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
           </div>
               {(!isCollapsed || isMobile) && (
                  <div className="flex flex-col">
                     <span className="text-[13px] font-bold text-slate-900 truncate max-w-[100px]">{user?.name || 'Admin'}</span>
                     <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-red-500 transition-colors">Logout Account</span>
                  </div>
               )}
            </div>
            {(!isCollapsed || isMobile) && (
               <LogOut size={16} className="text-slate-400 group-hover:text-red-500 transition-colors shrink-0" />
            )}
         </div>
         {isCollapsed && !isMobile && (
            <div className="absolute inset-0 bg-red-50/0 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
               <LogOut size={18} className="text-red-500 hidden group-hover:block z-10" />
               <div className="absolute bg-white/80 inset-2 backdrop-blur-sm z-0 hidden group-hover:block rounded-md"></div>
            </div>
         )}
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
    </aside>
  );
};

export default Sidebar;
