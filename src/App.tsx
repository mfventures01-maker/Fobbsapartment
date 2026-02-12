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
import AuthGate from '@/auth/AuthGate';
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
import StaffAdmin from '@/pages/dashboard/StaffAdmin';
import DepartmentDashboard from '@/pages/staff/DepartmentDashboard';

// Role-based dashboard pages
import OwnerDashboard from '@/pages/dashboard/owner/OwnerDashboard';
import ManagerDashboard from '@/pages/dashboard/manager/ManagerDashboard';
import StaffDashboardPage from '@/pages/dashboard/staff/StaffDashboardPage';
import RestaurantStaff from '@/pages/dashboard/staff/RestaurantStaff';
import BarStaff from '@/pages/dashboard/staff/BarStaff';
import ReceptionStaff from '@/pages/dashboard/staff/ReceptionStaff';
import HousekeepingStaff from '@/pages/dashboard/staff/HousekeepingStaff';

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
          <Route path="/restaurant" element={<RestaurantPublic />} />
          <Route path="/bar" element={<BarPublic />} />
          <Route path="/services" element={<ServicesHubPublic />} />
          <Route path="/services/:type" element={<ServiceRequestPublic />} />

          {/* Authentication */}
          <Route path="/login" element={<Login />} />
          <Route path="/staff-login" element={<StaffLogin />} />


          <Route element={<ProtectedRoute />}>
            {/* Role-based Dashboard Routes */}
            <Route path="/dashboard/owner" element={<DashboardLayout />}>
              <Route index element={<OwnerDashboard />} />
              <Route path="payments" element={<Payments />} />
              <Route path="disputes" element={<Disputes />} />
              <Route path="outbox" element={<Outbox />} />
              <Route path="staff-admin" element={<StaffAdmin />} />
              <Route path="guest-hub" element={<GuestHubLanding />} />
              <Route path="guest-hub/cleaning" element={<Cleaning />} />
              <Route path="guest-hub/restaurant" element={<Restaurant />} />
              <Route path="guest-hub/bar" element={<Bar />} />
              <Route path="guest-hub/reservations" element={<Reservations />} />
            </Route>

            <Route path="/dashboard/manager" element={<DashboardLayout />}>
              <Route index element={<ManagerDashboard />} />
              <Route path="payments" element={<Payments />} />
              <Route path="disputes" element={<Disputes />} />
              <Route path="outbox" element={<Outbox />} />
              <Route path="guest-hub" element={<GuestHubLanding />} />
              <Route path="guest-hub/cleaning" element={<Cleaning />} />
              <Route path="guest-hub/restaurant" element={<Restaurant />} />
              <Route path="guest-hub/bar" element={<Bar />} />
              <Route path="guest-hub/reservations" element={<Reservations />} />
            </Route>

            {/* Staff Dashboard Routes */}
            <Route path="/dashboard/staff" element={<DashboardLayout />}>
              <Route index element={<StaffDashboardPage />} />
              <Route path="restaurant" element={<RestaurantStaff />} />
              <Route path="bar" element={<BarStaff />} />
              <Route path="reception" element={<ReceptionStaff />} />
              <Route path="housekeeping" element={<HousekeepingStaff />} />
            </Route>

            {/* Legacy dashboard route - redirects via AuthGate */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="payments" element={<Payments />} />
              <Route path="disputes" element={<Disputes />} />
              <Route path="outbox" element={<Outbox />} />
              <Route path="staff-admin" element={<StaffAdmin />} />
              <Route path="guest-hub" element={<GuestHubLanding />} />
              <Route path="guest-hub/cleaning" element={<Cleaning />} />
              <Route path="guest-hub/restaurant" element={<Restaurant />} />
              <Route path="guest-hub/bar" element={<Bar />} />
              <Route path="guest-hub/reservations" element={<Reservations />} />
            </Route>

            {/* Legacy Staff Portal Routes */}
            <Route path="/staff" element={<StaffDashboard />} />
            <Route path="/staff/restaurant" element={<DepartmentDashboard department="restaurant" />} />
            <Route path="/staff/bar" element={<DepartmentDashboard department="bar" />} />
            <Route path="/staff/reception" element={<DepartmentDashboard department="reception" />} />
            <Route path="/staff/housekeeping" element={<DepartmentDashboard department="housekeeping" />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthGate>
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