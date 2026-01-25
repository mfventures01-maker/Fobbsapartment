import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from '@/components/Layout';
import HotelLanding from '@/pages/HotelLanding';

// Legacy imports kept for reference but not actively linked in v1
// import Apartments from '@/pages/Apartments';
// import ApartmentDetail from '@/pages/ApartmentDetail';
// import Restaurant from '@/pages/Restaurant';
// import OrderCheckout from '@/pages/OrderCheckout';
// import Booking from '@/pages/Booking';
// import QROrdering from '@/pages/QROrdering';
// import AdminDashboard from '@/pages/AdminDashboard';
// import ProtectedRoute from '@/components/ProtectedRoute';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

import Login from '@/pages/auth/Login';
import StaffLogin from '@/pages/staff/StaffLogin';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import DashboardHome from '@/pages/dashboard/DashboardHome';
import Payments from '@/pages/dashboard/Payments';
import Disputes from '@/pages/dashboard/Disputes';
import Outbox from '@/pages/dashboard/Outbox';
import GuestHubLanding from '@/pages/dashboard/guesthub/GuestHubLanding';
import Cleaning from '@/pages/dashboard/guesthub/Cleaning';
import Restaurant from '@/pages/dashboard/guesthub/Restaurant';
import Bar from '@/pages/dashboard/guesthub/Bar';
import Reservations from '@/pages/dashboard/guesthub/Reservations';
import StaffDashboard from '@/pages/staff/StaffDashboard';
import RestaurantPublic from '@/pages/public/RestaurantPublic';
import BarPublic from '@/pages/public/BarPublic';
import ServicesHubPublic from '@/pages/public/ServicesHubPublic';
import ServiceRequestPublic from '@/pages/public/ServiceRequestPublic';

const AppContent: React.FC = () => {
  return (
    <React.Fragment>
      <Toaster position="top-right" />
      <Routes>
        {/* Public Hotel Routes */}
        <Route element={<Layout><Outlet /></Layout>}>
          <Route path="/" element={<HotelLanding />} />
          <Route path="/hotel" element={<HotelLanding />} />
          <Route path="/fobbs" element={<HotelLanding />} />
        </Route>

        {/* Public Guest Hub Routes (No Login) */}
        <Route path="/restaurant" element={<RestaurantPublic />} />
        <Route path="/bar" element={<BarPublic />} />
        <Route path="/services" element={<ServicesHubPublic />} />
        <Route path="/services/:type" element={<ServiceRequestPublic />} />

        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/staff-login" element={<StaffLogin />} />

        {/* Internal Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="payments" element={<Payments />} />
            <Route path="disputes" element={<Disputes />} />
            <Route path="outbox" element={<Outbox />} />

            {/* Guest Hub Routes (Internal) */}
            <Route path="guest-hub" element={<GuestHubLanding />} />
            <Route path="guest-hub/cleaning" element={<Cleaning />} />
            <Route path="guest-hub/restaurant" element={<Restaurant />} />
            <Route path="guest-hub/bar" element={<Bar />} />
            <Route path="guest-hub/reservations" element={<Reservations />} />
          </Route>

          {/* Staff Portal */}
          <Route path="/staff" element={<StaffDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </React.Fragment>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;