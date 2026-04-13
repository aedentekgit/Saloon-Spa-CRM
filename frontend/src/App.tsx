import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

// Context & Providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { SettingsProvider } from './context/SettingsContext';

// Components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import { NotificationContainer } from './components/ZenNotification';
import { ErrorBoundary } from './components/ErrorBoundary';

// Pages
// Pages - Administrative
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Appointments from './pages/Appointments';
import Rooms from './pages/Rooms';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Leave from './pages/Leave';
import Services from './pages/Services';
import Memberships from './pages/Memberships';
import Billing from './pages/Billing';
import Finance from './pages/Finance';
import Inventory from './pages/Inventory';
import GST from './pages/GST';
import WhatsApp from './pages/WhatsApp';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Roles from './pages/Roles';
import Branches from './pages/Branches';
import Admins from './pages/Admins';
import RoomCategories from './pages/RoomCategories';
import ServiceCategories from './pages/ServiceCategories';
import Payroll from './pages/Payroll';
import Shifts from './pages/Shifts';

// Pages - Landing (Public)
import PublicLayout from './components/landing/PublicLayout';
import Home from './pages/landing/Home';
import About from './pages/landing/About';
import LandingServices from './pages/landing/LandingServices';
import OurTeam from './pages/landing/OurTeam';
import Contact from './pages/landing/Contact';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  if (loading) {
    return (
      <div className="h-screen bg-zen-cream flex items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-zen-sand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Protected route logic
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex p-0 lg:p-6 gap-0 lg:gap-6 h-screen bg-zen-cream overflow-hidden font-sans text-zen-brown relative">
      <div className={`
        fixed inset-y-0 left-0 z-[100] transform lg:relative lg:translate-x-0 transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-24 w-64' : 'w-64'}
      `}>
        <Sidebar 
          isCollapsed={isCollapsed} 
          setIsCollapsed={setIsCollapsed} 
          onClose={() => setIsMobileMenuOpen(false)} 
        />
      </div>

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[90] lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 relative">
        <main className="flex-1 h-full overflow-y-auto overflow-x-hidden scrollbar-hide bg-white/80 backdrop-blur-xl rounded-none lg:rounded-[3rem] shadow-2xl border border-zen-brown/5 scroll-smooth relative">
          <Navbar 
            onMenuClick={() => setIsMobileMenuOpen(true)} 
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="min-h-full w-full lg:rounded-[3rem]"
            >
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
      <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
      <Route path="/landing-services" element={<PublicLayout><LandingServices /></PublicLayout>} />
      <Route path="/team" element={<PublicLayout><OurTeam /></PublicLayout>} />
      <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
      
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

      {/* Protected Dashboards */}
      <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
      <Route path="/clients" element={<Layout><Clients /></Layout>} />
      <Route path="/appointments" element={<Layout><Appointments /></Layout>} />
      <Route path="/rooms" element={<Layout><Rooms /></Layout>} />
      <Route path="/employees" element={<Layout><Employees /></Layout>} />
      <Route path="/attendance" element={<Layout><Attendance /></Layout>} />
      <Route path="/leave" element={<Layout><Leave /></Layout>} />
      <Route path="/services" element={<Layout><Services /></Layout>} />
      <Route path="/memberships" element={<Layout><Memberships /></Layout>} />
      <Route path="/billing" element={<Layout><Billing /></Layout>} />
      <Route path="/finance" element={<Layout><Finance /></Layout>} />
      <Route path="/inventory" element={<Layout><Inventory /></Layout>} />
      <Route path="/whatsapp" element={<Layout><WhatsApp /></Layout>} />
      <Route path="/reports" element={<Layout><Reports /></Layout>} />
      <Route path="/tax" element={<Layout><GST /></Layout>} />
      <Route path="/settings" element={<Layout><Settings /></Layout>} />
      <Route path="/roles" element={<Layout><Roles /></Layout>} />
      <Route path="/branches" element={<Layout><Branches /></Layout>} />
      <Route path="/room-categories" element={<Layout><RoomCategories /></Layout>} />
      <Route path="/service-categories" element={<Layout><ServiceCategories /></Layout>} />
      <Route path="/admins" element={<Layout><Admins /></Layout>} />
      <Route path="/payroll" element={<Layout><Payroll /></Layout>} />
      <Route path="/shifts" element={<Layout><Shifts /></Layout>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

import { BranchProvider } from './context/BranchContext';
import { CategoryProvider } from './context/CategoryContext';

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BranchProvider>
          <CategoryProvider>
            <DataProvider>
              <Router>
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

