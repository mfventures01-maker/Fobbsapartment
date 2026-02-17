import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from '@/components/Layout';
import HotelLanding from '@/pages/HotelLanding';
import PaymentIntent from '@/pages/PaymentIntent';
import ConfirmPayment from '@/pages/ConfirmPayment';
import Fulfillment from '@/pages/Fulfillment';
import CeoDashboard from '@/pages/dashboard/ceo/CeoDashboard';
import DebugAuth from '@/components/auth/DebugAuth';

import { AuthProvider } from '@/contexts/AuthContext';
import { DemoProvider } from '@/contexts/DemoContext';
import { RoleProvider } from '@/contexts/RoleContext';
import { CartProvider } from '@/contexts/CartContext';
import { Toaster } from 'react-hot-toast';

import Login from '@/pages/auth/Login';
import StaffLogin from '@/pages/staff/StaffLogin';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AuthGate from '@/auth/AuthGate';
import DashboardLayout from '@/components/DashboardLayout';
import OwnerDashboard from '@/pages/dashboard/owner/OwnerDashboard';
import ManagerDashboard from '@/pages/dashboard/manager/ManagerDashboard';
import StaffDashboardPage from '@/pages/dashboard/staff/StaffDashboardPage';

// POS
import POSPage from '@/pages/pos/POSPage';

// Role-based dashboard pages
import CeoLayout from '@/pages/dashboard/ceo/CeoLayout';
import CeoOverview from '@/pages/dashboard/ceo/CeoOverview';
import CeoBranches from '@/pages/dashboard/ceo/CeoBranches';
import CeoAuditFeed from '@/pages/dashboard/ceo/CeoAuditFeed';
import CeoStaffAdmin from '@/pages/dashboard/ceo/CeoStaffAdmin';
import CeoSettings from '@/pages/dashboard/ceo/CeoSettings';

// Staff sub-pages
import RestaurantStaff from '@/pages/dashboard/staff/RestaurantStaff';
import BarStaff from '@/pages/dashboard/staff/BarStaff';
import ReceptionStaff from '@/pages/dashboard/staff/ReceptionStaff';
import HousekeepingStaff from '@/pages/dashboard/staff/HousekeepingStaff';
import AccessDenied from '@/pages/auth/AccessDenied';
import Unauthorized from '@/pages/auth/Unauthorized';

// Public pages
import RestaurantPublic from '@/pages/public/RestaurantPublic';
import BarPublic from '@/pages/public/BarPublic';
import ServicesHubPublic from '@/pages/public/ServicesHubPublic';
import ServiceRequestPublic from '@/pages/public/ServiceRequestPublic';

const AppContent: React.FC = () => {
  return (
    <React.Fragment>
      <Toaster position="top-right" />
      <AuthGate>
        <Routes>
          {/* Public Hotel Routes */}
          <Route element={<Layout><Outlet /></Layout>}>
            <Route path="/" element={<HotelLanding />} />
            <Route path="/hotel" element={<HotelLanding />} />
            <Route path="/fobbs" element={<HotelLanding />} />
          </Route>

          {/* Public Guest Hub Routes (No Login) */}
          <Route path="/payment-intent" element={<PaymentIntent />} />
          <Route path="/confirm-payment" element={<ConfirmPayment />} />
          <Route path="/fulfillment" element={<Fulfillment />} />
          {/* Public CEO view (as per existing code, maybe for investors?) */}
          <Route path="/ceo-view" element={<CeoDashboard />} />
          <Route path="/restaurant" element={<RestaurantPublic />} />
          <Route path="/bar" element={<BarPublic />} />
          <Route path="/services" element={<ServicesHubPublic />} />
          <Route path="/services/:type" element={<ServiceRequestPublic />} />

          {/* Authentication */}
          <Route path="/login" element={<Login />} />
          <Route path="/staff-login" element={<StaffLogin />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/access-denied" element={<AccessDenied />} />

          {/* Protected Role Routes */}
          {/* Super Admin / Owner */}
          <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
            <Route path="/super-admin" element={<DashboardLayout />}>
              <Route index element={<OwnerDashboard />} />
              {/* Add other owner routes here if needed, or map existing */}
            </Route>
          </Route>

          {/* CEO */}
          <Route element={<ProtectedRoute allowedRoles={['ceo']} />}>
            <Route path="/ceo" element={<CeoLayout />}>
              <Route index element={<CeoOverview />} />
              <Route path="branches" element={<CeoBranches />} />
              <Route path="audit" element={<CeoAuditFeed />} />
              <Route path="staff" element={<CeoStaffAdmin />} />
              <Route path="settings" element={<CeoSettings />} />
            </Route>
          </Route>

          {/* Manager */}
          <Route element={<ProtectedRoute allowedRoles={['manager']} />}>
            <Route path="/manager" element={<DashboardLayout />}>
              <Route index element={<ManagerDashboard />} />
              {/* Add manager sub-routes */}
            </Route>
          </Route>

          {/* POS Route - Accessible to staff and admins */}
          <Route element={<ProtectedRoute allowedRoles={['super_admin', 'manager', 'staff', 'cashier', 'storekeeper']} />}>
            <Route path="/pos" element={<POSPage />} />
          </Route>

          {/* Staff */}
          <Route element={<ProtectedRoute allowedRoles={['staff', 'cashier', 'storekeeper']} />}>
            <Route path="/staff" element={<DashboardLayout />}>
              <Route index element={<StaffDashboardPage />} />
              <Route path="restaurant" element={<RestaurantStaff />} />
              <Route path="bar" element={<BarStaff />} />
              <Route path="reception" element={<ReceptionStaff />} />
              <Route path="housekeeping" element={<HousekeepingStaff />} />
            </Route>
          </Route>

          {/* Debug Route */}
          <Route path="/debug-auth" element={<DebugAuth />} />

          {/* Catch all - redirect to login or home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthGate>
    </React.Fragment>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <RoleProvider>
        <CartProvider>
          <DemoProvider>
            <AppContent />
          </DemoProvider>
        </CartProvider>
      </RoleProvider>
    </AuthProvider>
  );
};

export default App;