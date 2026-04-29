import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

// Context & Providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { SettingsProvider } from './context/SettingsContext';

import { BranchProvider } from './context/BranchContext';
import { CategoryProvider } from './context/CategoryContext';
import { MapsProvider } from './context/MapsContext';

// Components
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import MobileFooter from './components/layout/MobileFooter';
import { NotificationContainer } from './components/shared/ZenNotification';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import ScrollToTop from './components/shared/ScrollToTop';

// Pages - Lazy Loaded
const Login = React.lazy(() => import('./pages/auth/Login'));
const Signup = React.lazy(() => import('./pages/auth/Signup'));
const ForgotPassword = React.lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/auth/ResetPassword'));
const VerifyEmail = React.lazy(() => import('./pages/auth/VerifyEmail'));
const Dashboard = React.lazy(() => import('./pages/dashboard/Dashboard'));
const Clients = React.lazy(() => import('./pages/resources/Clients'));
const Appointments = React.lazy(() => import('./pages/operations/Appointments'));
const Rooms = React.lazy(() => import('./pages/resources/Rooms'));
const Employees = React.lazy(() => import('./pages/resources/Employees'));
const Attendance = React.lazy(() => import('./pages/operations/Attendance'));
const StaffAttendance = React.lazy(() => import('./pages/operations/StaffAttendance'));
const Leave = React.lazy(() => import('./pages/operations/Leave'));
const ApplyLeave = React.lazy(() => import('./pages/operations/ApplyLeave'));
const Services = React.lazy(() => import('./pages/resources/Services'));
const Memberships = React.lazy(() => import('./pages/resources/Memberships'));
const Billing = React.lazy(() => import('./pages/operations/Billing'));
const Finance = React.lazy(() => import('./pages/operations/Finance'));
const Inventory = React.lazy(() => import('./pages/resources/Inventory'));
const WhatsApp = React.lazy(() => import('./pages/config/WhatsApp'));
const Reports = React.lazy(() => import('./pages/dashboard/Reports'));
const Settings = React.lazy(() => import('./pages/config/Settings'));
const Roles = React.lazy(() => import('./pages/config/Roles'));
const Branches = React.lazy(() => import('./pages/config/Branches'));
const Admins = React.lazy(() => import('./pages/config/Admins'));
const RoomCategories = React.lazy(() => import('./pages/config/RoomCategories'));
const ServiceCategories = React.lazy(() => import('./pages/config/ServiceCategories'));
const ExpenseCategories = React.lazy(() => import('./pages/config/ExpenseCategories'));
const Payroll = React.lazy(() => import('./pages/operations/Payroll'));
const Shifts = React.lazy(() => import('./pages/config/Shifts'));
const Transactions = React.lazy(() => import('./pages/operations/Transactions'));
const Expenses = React.lazy(() => import('./pages/operations/Expenses'));
const Categories = React.lazy(() => import('./pages/config/Categories'));
const Profile = React.lazy(() => import('./pages/profile/Profile'));

// Pages - Landing (Public)
import PublicLayout from './components/landing/PublicLayout';
const Home = React.lazy(() => import('./pages/landing/Home'));
const About = React.lazy(() => import('./pages/landing/About'));
const LandingServices = React.lazy(() => import('./pages/landing/LandingServices'));
const LandingRooms = React.lazy(() => import('./pages/landing/LandingRooms'));
const OurTeam = React.lazy(() => import('./pages/landing/OurTeam'));
const Contact = React.lazy(() => import('./pages/landing/Contact'));
const BookAppointment = React.lazy(() => import('./pages/landing/BookAppointment'));
const MembershipTiers = React.lazy(() => import('./pages/landing/MembershipTiers'));

import { ZenLoadingBarrier } from './components/zen/ZenLoading';
import { useData } from './context/DataContext';
import { getInitialRouteForUser, getRoutePermissions, isAuthenticatedOnlyRoute } from './config/accessControl';

const Layout = () => {
  const { user, loading: authLoading } = useAuth();
  // We don't block the globally on dataLoading anymore as each page handles its own data
  const { loading: dataLoading } = useData();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    return localStorage.getItem('zen_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('zen_sidebar_collapsed', next.toString());
      return next;
    });
  };

  if (authLoading) {
    return <ZenLoadingBarrier />;
  }

  // Protected route logic
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex p-0 gap-0 h-[100dvh] bg-zen-cream overflow-hidden font-sans text-zen-brown relative">
      <div className={`
        fixed inset-y-0 left-0 z-[100] transform lg:relative lg:translate-x-0 transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-[68px] w-[min(84vw,16rem)]' : 'lg:w-[210px] w-[min(88vw,17rem)]'}
      `}>
        <Sidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={toggleSidebar}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      </div>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[90] lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 relative bg-zen-cream">
        <main className="flex-1 h-full overflow-y-auto overflow-x-hidden scrollbar-hide rounded-none scroll-smooth relative pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
          <Navbar
            onMenuClick={() => setIsMobileMenuOpen(true)}
            isCollapsed={isCollapsed}
            setIsCollapsed={toggleSidebar}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="min-h-full w-full rounded-none"
            >
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <MobileFooter />
    </div>
  );
};

const AccessDenied = ({ required }: { required: string[] }) => {
  const location = useLocation();

  return (
    <div className="min-h-[calc(100dvh-72px)] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-2xl border border-zen-brown/10 bg-white p-8 sm:p-10 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <span className="text-2xl font-black">!</span>
        </div>
        <h1 className="text-3xl font-serif font-black text-zen-brown">Access Restricted</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-zen-brown/50">
          Your current role does not include access to {location.pathname}.
        </p>
        {required.length > 0 && (
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.25em] text-zen-brown/30">
            Required: {required.join(' / ')}
          </p>
        )}
      </div>
    </div>
  );
};

const ProtectedPage = ({ children }: { children: React.ReactElement }) => {
  const { hasPermission, user } = useAuth();
  const location = useLocation();
  const required = getRoutePermissions(location.pathname);

  if (isAuthenticatedOnlyRoute(location.pathname)) {
    return children;
  }

  if (!required || !required.some((permission) => hasPermission(permission))) {
    if (location.pathname === '/dashboard' && user) {
      return <Navigate to={getInitialRouteForUser(user.role, user.permissions)} replace />;
    }
    return <AccessDenied required={required || []} />;
  }

  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  const guarded = (element: React.ReactElement) => <ProtectedPage>{element}</ProtectedPage>;
  const initialRoute = user ? getInitialRouteForUser(user.role, user.permissions) : '/login';

  return (
    <React.Suspense fallback={<ZenLoadingBarrier />}>
      <Routes>
        {/* Public Pages */}
        <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
        <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
        <Route path="/landing-services" element={<PublicLayout><LandingServices /></PublicLayout>} />
        <Route path="/landing-rooms" element={<PublicLayout><LandingRooms /></PublicLayout>} />
        <Route path="/team" element={<PublicLayout><OurTeam /></PublicLayout>} />
        <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
        <Route path="/book" element={<PublicLayout><BookAppointment /></PublicLayout>} />
        <Route path="/membership-tiers" element={<PublicLayout><MembershipTiers /></PublicLayout>} />

        <Route path="/login" element={user ? <Navigate to={initialRoute} replace /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to={initialRoute} replace /> : <Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Protected Dashboards */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={guarded(<Dashboard />)} />
          <Route path="/clients" element={guarded(<Clients />)} />
          <Route path="/appointments" element={guarded(<Appointments />)} />
          <Route path="/rooms" element={guarded(<Rooms />)} />
          <Route path="/employees" element={guarded(<Employees />)} />
          <Route path="/attendance" element={guarded(<Attendance />)} />
          <Route path="/staff-attendance" element={guarded(<StaffAttendance />)} />
          <Route path="/leave" element={guarded(<Leave />)} />
          <Route path="/leave/apply" element={guarded(<ApplyLeave />)} />
          <Route path="/services" element={guarded(<Services />)} />
          <Route path="/memberships" element={guarded(<Memberships />)} />
          <Route path="/billing" element={guarded(<Billing />)} />
          <Route path="/finance" element={guarded(<Finance />)} />
          <Route path="/inventory" element={guarded(<Inventory />)} />
          <Route path="/whatsapp" element={guarded(<WhatsApp />)} />
          <Route path="/reports" element={guarded(<Reports />)} />
          <Route path="/settings" element={guarded(<Settings />)} />
          <Route path="/roles" element={guarded(<Roles />)} />
          <Route path="/branches" element={guarded(<Branches />)} />
          <Route path="/room-categories" element={guarded(<RoomCategories />)} />
          <Route path="/service-categories" element={guarded(<ServiceCategories />)} />
          <Route path="/expense-categories" element={guarded(<ExpenseCategories />)} />
          <Route path="/admins" element={guarded(<Admins />)} />
          <Route path="/payroll" element={guarded(<Payroll />)} />
          <Route path="/shifts" element={guarded(<Shifts />)} />
          <Route path="/transactions" element={guarded(<Transactions />)} />
          <Route path="/expenses" element={guarded(<Expenses />)} />
          <Route path="/profile" element={guarded(<Profile />)} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </React.Suspense>
  );
};


export default function App() {
  const routerBase = ((import.meta as any).env?.BASE_URL || '/').replace(/\/$/, '') || '/';

  return (
    <AuthProvider>
      <SettingsProvider>
        <MapsProvider>
          <BranchProvider>
            <CategoryProvider>
              <DataProvider>
                <Router basename={routerBase}>
                  <ScrollToTop />
                  <ErrorBoundary>
                    <AppRoutes />
                  </ErrorBoundary>
                  <NotificationContainer />
                </Router>
              </DataProvider>
            </CategoryProvider>
          </BranchProvider>
        </MapsProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
