import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

// Context & Providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { SettingsProvider } from './context/SettingsContext';

import { BranchProvider } from './context/BranchContext';
import { CategoryProvider } from './context/CategoryContext';

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
const Dashboard = React.lazy(() => import('./pages/dashboard/Dashboard'));
const Clients = React.lazy(() => import('./pages/resources/Clients'));
const Appointments = React.lazy(() => import('./pages/operations/Appointments'));
const Rooms = React.lazy(() => import('./pages/resources/Rooms'));
const Employees = React.lazy(() => import('./pages/resources/Employees'));
const Attendance = React.lazy(() => import('./pages/operations/Attendance'));
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
const Payroll = React.lazy(() => import('./pages/operations/Payroll'));
const Shifts = React.lazy(() => import('./pages/config/Shifts'));
const Transactions = React.lazy(() => import('./pages/operations/Transactions'));
const Categories = React.lazy(() => import('./pages/config/Categories'));

// Pages - Landing (Public)
import PublicLayout from './components/landing/PublicLayout';
const Home = React.lazy(() => import('./pages/landing/Home'));
const About = React.lazy(() => import('./pages/landing/About'));
const LandingServices = React.lazy(() => import('./pages/landing/LandingServices'));
const LandingRooms = React.lazy(() => import('./pages/landing/LandingRooms'));
const OurTeam = React.lazy(() => import('./pages/landing/OurTeam'));
const Contact = React.lazy(() => import('./pages/landing/Contact'));
const BookAppointment = React.lazy(() => import('./pages/landing/BookAppointment'));

import { ZenLoadingBarrier } from './components/zen/ZenLoading';
import { useData } from './context/DataContext';

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
        ${isCollapsed ? 'lg:w-[70px] w-60 md:w-60' : 'w-[210px]'}
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

      <div className="flex-1 flex flex-col min-w-0 relative bg-[#F9FAFB]">
        <main className="flex-1 h-full overflow-y-auto overflow-x-hidden scrollbar-hide rounded-none scroll-smooth relative pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
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

const AppRoutes = () => {
  const { user } = useAuth();

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
        <Route path="/book" element={<BookAppointment />} />
        
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup />} />

        {/* Protected Dashboards */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/leave" element={<Leave />} />
          <Route path="/leave/apply" element={<ApplyLeave />} />
          <Route path="/services" element={<Services />} />
          <Route path="/memberships" element={<Memberships />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/whatsapp" element={<WhatsApp />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/roles" element={<Roles />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/room-categories" element={<RoomCategories />} />
          <Route path="/service-categories" element={<ServiceCategories />} />
          <Route path="/admins" element={<Admins />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/shifts" element={<Shifts />} />
          <Route path="/transactions" element={<Transactions />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </React.Suspense>
  );
};


export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BranchProvider>
          <CategoryProvider>
            <DataProvider>
              <Router>
                <ScrollToTop />
                <ErrorBoundary>
                  <AppRoutes />
                </ErrorBoundary>
                <NotificationContainer />
              </Router>
            </DataProvider>
          </CategoryProvider>
        </BranchProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

