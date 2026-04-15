import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Bed,
  UserRound,
  CalendarDays,
  Sparkles,
  Receipt,
  Wallet, 
  Package, 
  MessageSquare,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings as SettingsIcon,
  Shield,
  Building2,
  Crown,
  Tag,
  DoorOpen,
  TrendingUp,
  Landmark,
  Coins,
  Percent,
  UserCheck,
  Repeat
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from './ConfirmDialog';

import { useSettings } from '../context/SettingsContext';

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
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', permission: 'dashboard' },
    { name: 'Appointments', icon: Calendar, path: '/appointments', permission: 'appointments' },
    { name: 'Billing', icon: Coins, path: '/billing', permission: 'billing' },
    { name: 'Clients', icon: Users, path: '/clients', permission: 'clients' },
    { name: 'Memberships', icon: Crown, path: '/memberships', permission: 'billing' },
    { name: 'Services', icon: Sparkles, path: '/services', permission: 'services' },
    { name: 'Rooms', icon: Bed, path: '/rooms', permission: 'rooms' },
    { name: 'Employees', icon: UserRound, path: '/employees', permission: 'employees' },
    { name: 'Attendance', icon: UserCheck, path: '/attendance', permission: 'attendance' },
    { name: 'Shifts', icon: Repeat, path: '/shifts', permission: 'settings' },
    { name: 'Payroll', icon: TrendingUp, path: '/payroll', permission: 'finance' },
    { name: 'Leave', icon: CalendarDays, path: '/leave', permission: 'leave' },
    { name: 'Finance', icon: Wallet, path: '/finance', permission: 'finance' },
    { name: 'Transactions', icon: Receipt, path: '/transactions', permission: 'finance' },
    { name: 'Inventory', icon: Package, path: '/inventory', permission: 'inventory' },
    { name: 'WhatsApp', icon: MessageSquare, path: '/whatsapp', permission: 'whatsapp' },
    { name: 'Reports', icon: BarChart3, path: '/reports', permission: 'reports' },
    { name: 'Branches', icon: Building2, path: '/branches', permission: 'settings' },
    { name: 'Room Category', icon: DoorOpen, path: '/room-categories', permission: 'settings' },
    { name: 'Service Category', icon: Sparkles, path: '/service-categories', permission: 'settings' },
    { name: 'Admins', icon: UserRound, path: '/admins', permission: 'roles' },
    { name: 'Roles', icon: Shield, path: '/roles', permission: 'roles' },
    { name: 'Tax', icon: Percent, path: '/tax', permission: 'settings' },
    { name: 'Settings', icon: SettingsIcon, path: '/settings', permission: 'settings' },
  ];

  const filteredItems = menuItems.filter(item => hasPermission(item.permission));

  return (
    <aside className={`zen-sidebar-gradient text-zen-cream h-full transition-all duration-300 ease-in-out flex flex-col z-20 rounded-[2.5rem] relative overflow-hidden ${isCollapsed ? 'lg:w-20 w-64 md:w-64' : 'w-64'}`}>
      <div className={`p-6 flex items-center border-b border-zen-cream/5 ${isCollapsed && !isMobile ? 'justify-center' : 'justify-between'}`}>
        {(!isCollapsed || isMobile) ? (
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-xl bg-white/10 p-1.5" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                 <Sparkles className="text-zen-sand" size={20} />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xl font-serif font-bold tracking-tighter text-white truncate max-w-[120px]">
                {settings?.general?.siteName || 'Spa'}
              </span>
              <span className="text-[8px] uppercase tracking-[0.2em] text-zen-leaf font-bold whitespace-nowrap">
                Premium Wellness
              </span>
            </div>
          </div>
        ) : (
          logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-lg bg-white/5 p-1" />
          ) : (
            <Landmark className="text-zen-sand" size={20} />
          )
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 scrollbar-hide">
        {filteredItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={() => {
              if (window.innerWidth < 1024 && onClose) onClose();
            }}
            className={({ isActive }) =>
              `flex items-center rounded-2xl transition-all duration-300 group ${
                isCollapsed ? 'justify-center p-3' : 'px-4 py-3.5 hover:translate-x-1'
              } ${isActive
                ? 'bg-zen-sand text-white shadow-lg shadow-black/20'
                : 'text-zen-cream/60 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`transition-transform duration-300 group-hover:scale-110 flex items-center justify-center`}>
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                {(!isCollapsed || isMobile) && (
                  <span className={`ml-4 text-sm font-semibold tracking-wide ${isActive ? 'translate-x-1' : ''} transition-transform`}>
                    {item.name}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-zen-cream/5">
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className={`flex items-center w-full text-[#FF6B6B] hover:bg-red-500/10 transition-all duration-300 rounded-2xl group ${
            isCollapsed ? 'justify-center p-3' : 'px-4 py-3.5'
          }`}
        >
          <div className="group-hover:rotate-12 transition-transform">
            <LogOut size={20} />
          </div>
          {(!isCollapsed || isMobile) && <span className="ml-4 text-sm font-bold uppercase tracking-widest">Logout</span>}
        </button>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        title="Confirm Logout"
        message="Are you sure you want to securely conclude your current session?"
        confirmText="Logout Now"
        cancelText="Preserve Session"
        type="danger"
      />
    </aside>

  );
};

export default Sidebar;
