import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutGrid, Users, CalendarClock, DoorOpen, Briefcase, CalendarOff,
  Gem, FileText, Landmark, Boxes, MessageCircle, TrendingUp,
  LogOut, ChevronRight, ChevronDown, Settings2, ShieldCheck,
  MapPin, Award, Layers, CreditCard, Percent,
  Fingerprint, Timer, Shapes, Key, UserRound, Sparkles, Scissors, Clock, ArrowDownRight,
  History, Tag, X
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
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});
  const location = useLocation();

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
        { name: 'Transactions', icon: FileText, path: '/transactions', permission: ['transactions', 'finance'] },
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
      ]
    },
    {
      label: 'Finance',
      items: [
        // { name: 'Finance', icon: Landmark, path: '/finance', permission: 'finance' },
        { name: 'Expenses', icon: ArrowDownRight, path: '/expenses', permission: 'finance' },
        // { name: 'Reports', icon: TrendingUp, path: '/reports', permission: 'reports' },
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
        {
          name: 'Categories',
          icon: Shapes,
          permission: ['room-categories', 'service-categories', 'sector-categories', 'settings', 'finance'],
          children: [
            { name: 'Room Category', icon: Layers, path: '/room-categories', permission: ['room-categories', 'settings'] },
            { name: 'Service Category', icon: Shapes, path: '/service-categories', permission: ['service-categories', 'settings'] },
            { name: 'Sector Category', icon: Tag, path: '/sector-categories', permission: ['sector-categories', 'settings', 'finance'] },
          ]
        },
        { name: 'Admin Users', icon: ShieldCheck, path: '/admins', permission: ['admins', 'roles'] },
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

  // Auto-expand active submenus on location change
  React.useEffect(() => {
    menuGroups.forEach(group => {
      group.items.forEach(item => {
        if (item.children?.some(child => child.path === location.pathname)) {
          setOpenSubMenus(prev => ({ ...prev, [item.name]: true }));
        }
      });
    });
  }, [location.pathname]);

  const canAccessItem = (permission: string | string[]) => {
    if (user?.role === 'Admin') return true;
    return Array.isArray(permission)
      ? permission.some((perm) => hasPermission(perm))
      : hasPermission(permission);
  };

  const filteredGroups = user?.role === 'Client'
    ? [{ label: 'Sanctuary', items: clientMenu.filter(item => canAccessItem(item.permission)) }]
    : menuGroups
        .map(group => ({
          ...group,
          items: group.items
            .map(item => {
              if (item.children) {
                const allowedChildren = item.children.filter(child => canAccessItem(child.permission));
                return allowedChildren.length > 0 ? { ...item, children: allowedChildren } : null;
              }
              return canAccessItem(item.permission) ? item : null;
            })
            .filter((item): item is any => item !== null)
        }))
        .filter(group => group.items.length > 0);

  const toggleSubMenu = (name: string) => {
    setOpenSubMenus(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleParentClick = (item: any) => {
    if (isCollapsed && !isMobile) {
      setIsCollapsed(false);
      setOpenSubMenus(prev => ({ ...prev, [item.name]: true }));
    } else {
      toggleSubMenu(item.name);
    }
  };

  const renderNavLink = (item: any, isChild = false) => (
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
          isCollapsed && !isMobile
            ? 'justify-center p-2.5 mx-auto w-10 h-10'
            : `${isChild ? 'pl-3 pr-2.5 py-1.5' : 'px-3 py-2'} hover:bg-zen-cream/60`
        } ${isActive ? 'text-white shadow-sm shadow-zen-sand/20' : 'text-zen-brown/50 hover:text-zen-brown'}`
      }
    >
      {({ isActive }) => (
        <>
          <div className="flex items-center justify-center shrink-0">
            <item.icon size={isChild ? 14 : 16} strokeWidth={isActive ? 2 : 1.5} />
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

  const renderParentItem = (item: any) => {
    const isOpen = !!openSubMenus[item.name];
    const isChildActive = item.children?.some((child: any) => location.pathname === child.path);

    return (
      <div key={item.name} className="space-y-1">
        <button
          onClick={() => handleParentClick(item)}
          className={`w-full flex items-center rounded-xl transition-all duration-300 group min-h-[36px] ${
            isCollapsed && !isMobile ? 'justify-center p-2.5 mx-auto w-10 h-10' : 'px-3 py-2 hover:bg-zen-cream/60'
          } ${
            isChildActive && !isOpen
              ? 'text-zen-sand bg-zen-cream/30 font-bold'
              : 'text-zen-brown/50 hover:text-zen-brown'
          }`}
        >
          <div className="flex items-center justify-center shrink-0">
            <item.icon size={16} strokeWidth={isChildActive ? 2 : 1.5} className={isChildActive ? 'text-zen-sand' : ''} />
          </div>
          {(!isCollapsed || isMobile) && (
            <>
              <span className={`ml-2.5 text-[12px] font-semibold tracking-wide flex-1 text-left truncate ${
                isChildActive ? 'text-zen-sand font-bold' : 'text-zen-brown/60 group-hover:text-zen-brown'
              }`}>
                {item.name}
              </span>
              <ChevronDown
                size={14}
                className={`transform transition-transform duration-300 text-zen-brown/30 group-hover:text-zen-brown ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </>
          )}
        </button>

        {isOpen && (!isCollapsed || isMobile) && (
          <div className="ml-[19px] pl-3 border-l border-zen-stone/40 space-y-1 mt-1">
            {item.children.map((child: any) => renderNavLink(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={`bg-white border-r border-zen-stone/50 h-full transition-all duration-300 ease-in-out flex flex-col z-50 rounded-none relative overflow-hidden shadow-none ${isCollapsed ? 'lg:w-[68px] w-[min(90vw,16rem)] sm:w-[min(84vw,16rem)]' : 'lg:w-[210px] w-[min(92vw,18rem)] sm:w-[min(88vw,17rem)]'}`}>

      {/* Top Logo Section — Professional Classic Branding */}
      <div
        className={`flex items-center px-4 sm:px-6 relative overflow-hidden transition-all duration-500 ${isCollapsed && !isMobile ? 'h-14 justify-center' : 'h-16 sm:h-20 justify-between'}`}
      >
        {/* Glassy Layer Background */}
        <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-xl z-0" />

        {/* Subtle decorative glow */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-slate-200/20 rounded-full blur-3xl pointer-events-none" />

        <div className={`relative z-10 flex items-center gap-3 transition-all duration-700 ${isCollapsed && !isMobile ? 'scale-90' : 'scale-100'}`}>
          {logoUrl ? (
            <div className={`
              relative p-1 bg-white/80 backdrop-blur-sm classic-shine-effect
              ${isCollapsed && !isMobile ? 'w-10 h-10 sm:w-12 sm:h-12 rounded-[1rem] sm:rounded-[1.2rem] border-[2px]' : 'w-12 h-12 sm:w-14 sm:h-14 rounded-[1.2rem] sm:rounded-[1.5rem] border-[3px]'}
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
              ${isCollapsed && !isMobile ? 'w-10 h-10 rounded-lg' : 'w-12 h-12 rounded-xl'}
              professional-frame classic-shine-effect bg-white/60 backdrop-blur-md border border-white/40 flex items-center justify-center
              shadow-none
            `}>
              <Sparkles className="text-zen-sand" size={isCollapsed && !isMobile ? 18 : 24} />
            </div>
          )}
          
          {(!isCollapsed || isMobile) && (
            <span className="font-serif text-lg font-black tracking-[0.1em] uppercase text-zen-brown truncate">
              {settings?.general?.siteName || 'Zen Spa'}
            </span>
          )}
        </div>

        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="relative z-20 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-zen-stone/20 flex items-center justify-center text-zen-brown shadow-sm active:scale-95 transition-all"
          >
            <X size={20} />
          </button>
        )}

        {/* Bottom decorative line with subtle glow */}
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200/50 to-transparent" />
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
              {group.items.map(item => item.children ? renderParentItem(item) : renderNavLink(item))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 relative group overflow-hidden mt-auto" onClick={() => setShowLogoutConfirm(true)}>
        {/* Glassy Background */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-100/50 to-transparent backdrop-blur-md z-0" />

        {/* Top border line */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200/50 to-transparent" />

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
