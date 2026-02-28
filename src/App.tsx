import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from '@/components/Layout';
import HotelLanding from '@/pages/HotelLanding';
import PaymentIntent from '@/pages/PaymentIntent';
import ConfirmPayment from '@/pages/ConfirmPayment';
import Fulfillment from '@/pages/Fulfillment';
import DebugAuth from '@/pages/auth/DebugAuth';

import { AuthProvider } from '@/contexts/AuthContext';
import { DemoProvider } from '@/contexts/DemoContext';
import { RoleProvider } from '@/contexts/RoleContext';
import { CartProvider } from '@/contexts/CartContext';
import { Toaster } from 'react-hot-toast';

import Login from '@/pages/auth/Login';
import StaffLogin from '@/pages/staff/StaffLogin';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AuthGate from '@/auth/AuthGate';
import DashboardEngine from '@/pages/dashboard/DashboardEngine';
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
          <Route path="/restaurant" element={<RestaurantPublic />} />
          <Route path="/bar" element={<BarPublic />} />
          <Route path="/services" element={<ServicesHubPublic />} />
          <Route path="/services/:type" element={<ServiceRequestPublic />} />

          {/* Authentication */}
          <Route path="/login" element={<Login />} />
          <Route path="/staff-login" element={<StaffLogin />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/access-denied" element={<AccessDenied />} />

          {/* Protected Dashboard Engine */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard/*" element={<DashboardEngine />} />
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