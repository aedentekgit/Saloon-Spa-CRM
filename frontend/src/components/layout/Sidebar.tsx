import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutGrid, Users, CalendarClock, DoorOpen, Briefcase, CalendarOff,
  Gem, FileText, Landmark, Boxes, MessageCircle, TrendingUp,
  LogOut, ChevronRight, Settings2, ShieldCheck,
  MapPin, Award, Layers, CreditCard, Percent,
  Fingerprint, Timer, Shapes, Key, UserRound, Sparkles, Scissors, Clock, ArrowDownRight,
  History, Tag
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { useSettings } from '../../context/SettingsContext';
import { getImageUrl } from '../../utils/imageUrl';

const Sidebar = ({
  isCollapsed,
  setIsCollapsed,
  onClose
}: {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  onClose?: () => void
}) => {
  const { user, logout, hasPermission, validating } = useAuth();
  const { settings } = useSettings();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);

  const logoUrl = settings?.general?.logo
    ? getImageUrl(settings.general.logo)
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
        { name: 'Memberships', icon: Gem, path: '/memberships', permission: ['memberships', 'billing'] },
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
        { name: 'Attendance Ritual', icon: Clock, path: user?.role === 'Employee' ? '/staff-attendance' : '/attendance', permission: 'attendance' },

        { name: 'Shifts', icon: Timer, path: '/shifts', permission: ['shifts', 'settings'] },
        { name: 'Payroll', icon: Landmark, path: '/payroll', permission: ['payroll', 'finance'] },
        { name: 'Leave History', icon: CalendarOff, path: '/leave', permission: 'leave' },
        { name: 'Apply Leave', icon: Sparkles, path: '/leave/apply', permission: 'leave' },
      ]
    },
    {
      label: 'Finance',
      items: [
        { name: 'Finance', icon: Landmark, path: '/finance', permission: 'finance' },
        { name: 'Expenses', icon: ArrowDownRight, path: '/expenses', permission: 'finance' },
        { name: 'Transactions', icon: FileText, path: '/transactions', permission: ['transactions', 'finance'] },
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
        { name: 'Branches', icon: MapPin, path: '/branches', permission: ['branches', 'settings'] },
        { name: 'Room Category', icon: Layers, path: '/room-categories', permission: ['room-categories', 'settings'] },
        { name: 'Service Category', icon: Shapes, path: '/service-categories', permission: ['service-categories', 'settings'] },
        { name: 'Expense Category', icon: Tag, path: '/expense-categories', permission: ['expense-categories', 'settings', 'finance'] },
        { name: 'Admins', icon: ShieldCheck, path: '/admins', permission: ['admins', 'roles'] },
        { name: 'Roles', icon: Key, path: '/roles', permission: 'roles' },
        { name: 'Settings', icon: Settings2, path: '/settings', permission: 'settings' },
      ]
    },
  ];

  // Specific Client Menu
  const clientMenu = [
    { name: 'Dashboard', icon: LayoutGrid, path: '/dashboard', permission: 'dashboard' },
    { name: 'Booking', icon: CalendarClock, path: '/book', permission: 'book' },
    { name: 'Profile', icon: UserRound, path: '/profile', permission: 'profile' },
    { name: 'History', icon: History, path: '/transactions', permission: ['history', 'transactions', 'finance'] },
  ];

  const canAccessItem = (permission: string | string[]) => (
    Array.isArray(permission)
      ? permission.some((perm) => hasPermission(perm))
      : hasPermission(permission)
  );

  const filteredGroups = user?.role === 'Client'
    ? [{ label: 'Sanctuary', items: clientMenu.filter(item => canAccessItem(item.permission)) }]
    : menuGroups
        .map(group => ({
          ...group,
          items: group.items
            .filter(item => canAccessItem(item.permission))
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
            <item.icon size={16} strokeWidth={isActive ? 2 : 1.5} className={isActive ? 'drop-shadow-none' : ''} />
          </div>
          {(!isCollapsed || isMobile) && (
            <span className={`ml-2.5 text-[12px] font-semibold tracking-wide flex-1 truncate ${isActive ? 'text-white' : 'text-zen-brown/60 group-hover:text-zen-brown'}`}>
              {item.name}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <aside className={`bg-white border-r border-zen-stone/50 h-full transition-all duration-300 ease-in-out flex flex-col z-50 rounded-none relative overflow-hidden shadow-none ${isCollapsed ? 'lg:w-[68px] w-[min(84vw,16rem)]' : 'lg:w-[210px] w-[min(88vw,17rem)]'}`}>

      {/* Top Logo Section — Professional Classic Branding */}
      <div
        className={`flex items-center justify-center relative overflow-hidden transition-all duration-500 ${isCollapsed ? 'h-14 sm:h-16' : 'h-20 sm:h-24'}`}
      >
        {/* Glassy Layer Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-zen-sand/[0.08] via-transparent to-zen-sand/[0.05] backdrop-blur-xl z-0" />

        {/* Subtle decorative glow */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-zen-sand/10 rounded-full blur-3xl pointer-events-none" />

        <div className={`relative z-10 transition-all duration-700 ${isCollapsed ? 'scale-90' : 'scale-100'}`}>
          {logoUrl ? (
            <div className={`
              relative p-1 bg-white/80 backdrop-blur-sm classic-shine-effect
              ${isCollapsed ? 'w-10 h-10 sm:w-12 sm:h-12 rounded-[1rem] sm:rounded-[1.2rem] border-[2px]' : 'w-14 h-14 sm:w-16 sm:h-16 rounded-[1.2rem] sm:rounded-[2rem] border-[3px]'}
              border-white/60 transition-all duration-500
              shadow-none
              hover:shadow-none hover:scale-105 cursor-pointer
            `}>
               <img
                 src={logoUrl}
                 alt="Logo"
                 className="w-full h-full object-contain rounded-[inherit] brightness-[1.02]"
               />
            </div>
          ) : (
            <div className={`
              ${isCollapsed ? 'w-10 h-10 rounded-lg' : 'w-16 h-16 rounded-xl'}
              professional-frame classic-shine-effect bg-white/60 backdrop-blur-md border border-white/40 flex items-center justify-center
              shadow-none
            `}>
              <Sparkles className="text-zen-sand" size={isCollapsed ? 18 : 24} />
            </div>
          )}
        </div>

        {/* Bottom decorative line with subtle glow */}
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-zen-sand/20 to-transparent" />
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-hide">
        {filteredGroups.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-2' : ''}>
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

      <div className="p-3 relative group overflow-hidden mt-auto" onClick={() => setShowLogoutConfirm(true)}>
        {/* Glassy Background */}
        <div className="absolute inset-0 bg-gradient-to-t from-zen-sand/[0.05] to-transparent backdrop-blur-md z-0" />

        {/* Top border line */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-zen-sand/10 to-transparent" />

        <div className="relative z-10 flex items-center justify-between p-1.5 rounded-xl hover:bg-white/40 transition-all duration-500 cursor-pointer border border-transparent hover:border-white/60">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl bg-white shadow-sm text-zen-brown flex items-center justify-center shrink-0 border border-zen-stone/50 overflow-hidden group-hover:scale-105 transition-all">
              <UserRound size={16} className="text-zen-sand" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
            </div>
            {(!isCollapsed || isMobile) && (
              <div className="flex flex-col min-w-0">
                {validating ? (
                   <div className="h-3 w-20 bg-zen-stone/20 animate-pulse rounded-full my-1" />
                ) : (
                   <span className="text-[12px] font-bold text-zen-brown truncate">{user?.name || 'Sanctuary User'}</span>
                )}
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zen-brown/30 group-hover:text-red-500 transition-colors">Session Profile</span>
              </div>
            )}
          </div>
          {(!isCollapsed || isMobile) && (
            <LogOut size={14} className="text-zen-brown/30 group-hover:text-red-500 transition-all shrink-0 hover:scale-110" />
          )}
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
    </aside>
  );
};

export default Sidebar;
