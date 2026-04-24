import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutGrid, Users, CalendarClock, DoorOpen, Briefcase, CalendarOff,
  Gem, FileText, Landmark, Boxes, MessageCircle, TrendingUp,
  LogOut, ChevronRight, Settings2, ShieldCheck,
  MapPin, Award, Layers, CreditCard, Percent,
  Fingerprint, Timer, Shapes, Key, UserRound, Sparkles, Scissors, Clock, ArrowDownRight
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

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
  const logoUrl = settings?.general?.logo 
    ? (settings.general.logo.startsWith('http') ? settings.general.logo : `${API_URL.split('/api')[0]}/${settings.general.logo.replace(/^\.?\//, '')}`)
    : null;

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuGroups = [
    {
      label: 'Core',
      items: [
        { name: 'Dashboard', icon: LayoutGrid, path: '/dashboard', permission: 'dashboard' },
        { name: 'Appointments', icon: CalendarClock, path: '/appointments', permission: 'appointments' },
        { name: 'Billing', icon: CreditCard, path: '/billing', permission: 'billing' },
      ]
    },
    {
      label: 'Clients',
      items: [
        { name: 'Clients', icon: Users, path: '/clients', permission: 'clients' },
        { name: 'Memberships', icon: Gem, path: '/memberships', permission: 'billing' },
      ]
    },
    {
      label: 'Catalogue',
      items: [
        { name: 'Services', icon: Scissors, path: '/services', permission: 'services' },
        { name: 'Rooms', icon: DoorOpen, path: '/rooms', permission: 'rooms' },
        { name: 'Inventory', icon: Boxes, path: '/inventory', permission: 'inventory' },
      ]
    },
    {
      label: 'Team',
      items: [
        { name: 'Employees', icon: Briefcase, path: '/employees', permission: 'employees' },
        { name: 'Attendance Ritual', icon: Clock, path: '/attendance', permission: 'attendance' },

        { name: 'Shifts', icon: Timer, path: '/shifts', permission: 'settings' },
        { name: 'Payroll', icon: Landmark, path: '/payroll', permission: 'finance' },
        { name: 'Leave History', icon: CalendarOff, path: '/leave', permission: 'leave' },
        { name: 'Apply Leave', icon: Sparkles, path: '/leave/apply', permission: 'leave' },
      ]
    },
    {
      label: 'Finance',
      items: [
        { name: 'Finance', icon: Landmark, path: '/finance', permission: 'finance' },
        { name: 'Expenses', icon: ArrowDownRight, path: '/expenses', permission: 'finance' },
        { name: 'Transactions', icon: FileText, path: '/transactions', permission: 'finance' },
        { name: 'Reports', icon: TrendingUp, path: '/reports', permission: 'reports' },
      ]
    },
    {
      label: 'Comms',
      items: [
        { name: 'WhatsApp', icon: MessageCircle, path: '/whatsapp', permission: 'whatsapp' },
      ]
    },
    {
      label: 'Admin',
      items: [
        { name: 'Branches', icon: MapPin, path: '/branches', permission: 'settings' },
        { name: 'Room Category', icon: Layers, path: '/room-categories', permission: 'settings' },
        { name: 'Service Category', icon: Shapes, path: '/service-categories', permission: 'settings' },
        { name: 'Admins', icon: ShieldCheck, path: '/admins', permission: 'roles' },
        { name: 'Roles', icon: Key, path: '/roles', permission: 'roles' },
        { name: 'Settings', icon: Settings2, path: '/settings', permission: 'settings' },
      ]
    },
  ];

  // Flatten for permission check + client renames
  const mapItemName = (item: { name: string; icon: any; path: string; permission: string }) => {
    if (user?.role === 'Client') {
      if (item.name === 'Dashboard') return { ...item, name: 'Sanctuary Home' };
      if (item.name === 'Appointments') return { ...item, name: 'My Rituals' };
      if (item.name === 'Memberships') return { ...item, name: 'My Memberships' };
      if (item.name === 'Services') return { ...item, name: 'Ritual Menu' };
    }
    return item;
  };

  const filteredGroups = menuGroups
    .map(group => ({
      ...group,
      items: group.items
        .filter(item => hasPermission(item.permission))
        .map(mapItemName)
    }))
    .filter(group => group.items.length > 0);

  const renderNavLink = (item: any) => (
    <NavLink
      key={item.name}
      to={item.path}
      end={item.path === '/leave'} // Ensure strict matching for Leave to prevent double highlight
      onClick={() => {
        if (window.innerWidth < 1024 && onClose) onClose();
      }}
      style={({ isActive }) => ({
         backgroundColor: isActive ? 'var(--zen-sand)' : 'transparent',
         opacity: isActive ? 0.95 : 1
      })}
      className={({ isActive }) =>
        `flex items-center rounded-xl transition-all duration-300 group min-h-[36px] ${
          isCollapsed ? 'justify-center p-2.5 mx-auto w-10 h-10' : 'px-3 py-2 hover:bg-zen-cream/60'
        } ${isActive ? 'text-white shadow-sm shadow-zen-sand/20' : 'text-zen-brown/50 hover:text-zen-brown'}`
      }
    >

      {({ isActive }) => (
        <>
          <div className={`flex items-center justify-center shrink-0`}>
            <item.icon size={16} strokeWidth={isActive ? 2 : 1.5} className={isActive ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : ''} />
          </div>
          {(!isCollapsed || isMobile) && (
            <span className={`ml-2.5 text-[12.5px] font-semibold tracking-wide flex-1 truncate ${isActive ? 'text-white' : 'text-zen-brown/60 group-hover:text-zen-brown'}`}>
              {item.name}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <aside className={`bg-white border-r border-zen-stone/50 h-full transition-all duration-300 ease-in-out flex flex-col z-50 rounded-none relative overflow-hidden shadow-[20px_0_40px_-20px_rgba(0,0,0,0.05)] ${isCollapsed ? 'lg:w-[70px] w-60' : 'w-[210px]'}`}>
      
      {/* Top Logo Section — Professional Classic Branding */}
      <div 
        className={`flex items-center justify-center border-b border-zen-stone/40 bg-gradient-to-b from-white to-stone-50/20 relative overflow-hidden transition-all duration-500 ${isCollapsed ? 'h-20' : 'h-32'}`}
      >
        <div className={`relative transition-all duration-700 ${isCollapsed ? 'scale-90' : 'scale-100'}`}>
          {logoUrl ? (
            <div className={`
              relative p-1 bg-white classic-shine-effect
              ${isCollapsed ? 'w-14 h-14 rounded-[1.5rem] border-[4px]' : 'w-24 h-24 rounded-[2.5rem] border-[8px]'}
              border-white transition-all duration-500
              shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15),0_0_20px_rgba(197,163,88,0.05)]
              hover:shadow-[0_25px_50px_-12px_rgba(197,163,88,0.2)] hover:scale-105 transition-all duration-700 cursor-pointer
            `}>
               <img
                 src={logoUrl}
                 alt="Logo"
                 className="w-full h-full object-contain rounded-[inherit] brightness-[1.02]"
               />
               {/* Classic Inner Frame */}
               <div className="absolute inset-0 border border-black/[0.03] pointer-events-none rounded-[inherit]" />
            </div>
          ) : (
            <div className={`
              ${isCollapsed ? 'w-12 h-12 rounded-xl' : 'w-20 h-20 rounded-2xl'} 
              professional-frame classic-shine-effect bg-zen-cream border border-zen-stone/40 flex items-center justify-center 
              shadow-[0_8px_25px_-10px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,1)]
            `}>
              <Sparkles className="text-zen-sand" size={isCollapsed ? 20 : 28} />
            </div>
          )}
        </div>

        {/* Decorative architectural line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-white/80" />
        <div className="absolute top-[1px] left-0 w-full h-[1px] bg-zen-sand/5" />
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-hide">
        {filteredGroups.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-3' : ''}>
            {/* Section label — only when expanded */}
            {(!isCollapsed || isMobile) && (
              <p className="px-3 mb-1 text-[9px] font-black uppercase tracking-[0.3em] text-zen-brown/30 select-none">
                {group.label}
              </p>
            )}
            {/* Section divider — only when collapsed */}
            {isCollapsed && !isMobile && gi > 0 && (
              <div className="h-px bg-zen-stone/40 mx-2 mb-2" />
            )}
            <div className="space-y-1.5">
              {group.items.map(renderNavLink)}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-zen-stone/30 relative group cursor-pointer" onClick={() => setShowLogoutConfirm(true)}>
         <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-red-50 transition-colors">
            <div className="flex items-center gap-2.5">
               <div className="relative w-8 h-8 rounded-md bg-zen-cream text-zen-brown flex items-center justify-center shrink-0 border border-zen-stone/50">
                  <UserRound size={15} />
                  <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
               </div>
                   {(!isCollapsed || isMobile) && (
                      <div className="flex flex-col">
                         <span className="text-[13px] font-bold text-zen-brown truncate max-w-[100px]">{user?.name || 'Admin'}</span>
                         <span className="text-[9px] font-bold uppercase tracking-wider text-zen-brown/40 group-hover:text-red-500 transition-colors">Logout Account</span>
                      </div>
                   )}
                </div>
                {(!isCollapsed || isMobile) && (
                   <LogOut size={16} className="text-zen-brown/40 group-hover:text-red-500 transition-colors shrink-0" />
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
