import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ShiftProtectedRoute from '@/components/auth/ShiftProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';

// Super Admin
import SuperAdminDashboard from '@/pages/dashboard/super_admin/SuperAdminDashboard';

// CEO
import CeoLayout from '@/pages/dashboard/ceo/CeoLayout';
import CeoOverview from '@/pages/dashboard/ceo/CeoOverview';
import CeoBranches from '@/pages/dashboard/ceo/CeoBranches';
import CeoAuditFeed from '@/pages/dashboard/ceo/CeoAuditFeed';
import CeoStaffAdmin from '@/pages/dashboard/ceo/CeoStaffAdmin';
import CeoSettings from '@/pages/dashboard/ceo/CeoSettings';

// Manager
import ManagerDashboard from '@/pages/dashboard/manager/ManagerDashboard';

// Staff
import StaffDashboardPage from '@/pages/dashboard/staff/StaffDashboardPage';
import RestaurantStaff from '@/pages/dashboard/staff/RestaurantStaff';
import BarStaff from '@/pages/dashboard/staff/BarStaff';
import ReceptionStaff from '@/pages/dashboard/staff/ReceptionStaff';
import HousekeepingStaff from '@/pages/dashboard/staff/HousekeepingStaff';

const DashboardEngine: React.FC = () => {
    const { authority } = useAuth();

    if (authority.status === 'loading') return null; // Handled by AuthGate and ProtectedRoute
    if (authority.status === 'unauthorized') return <Navigate to="/unauthorized" replace />;

    const { role, departmentName } = authority;

    // Use specific components instead of a switch for cleaner routing
    return (
        <Routes>
            <Route
                path="super_admin"
                element={
                    <ProtectedRoute allowedRoles={['super_admin']}>
                        <DashboardLayout><SuperAdminDashboard /></DashboardLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="ceo/*"
                element={
                    <ProtectedRoute allowedRoles={['ceo', 'owner']}>
                        <CeoLayout>
                            <Routes>
                                <Route index element={<CeoOverview />} />
                                <Route path="branches" element={<CeoBranches />} />
                                <Route path="audit" element={<CeoAuditFeed />} />
                                <Route path="staff" element={<CeoStaffAdmin />} />
                                <Route path="settings" element={<CeoSettings />} />
                            </Routes>
                        </CeoLayout>
                    </ProtectedRoute>
                }
            />
            {/* Alias owner to ceo view */}
            <Route path="owner/*" element={<Navigate to="/dashboard/ceo" replace />} />
            <Route
                path="manager"
                element={
                    <ProtectedRoute allowedRoles={['manager']}>
                        <DashboardLayout><ManagerDashboard /></DashboardLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="staff"
                element={
                    <ShiftProtectedRoute required={true}>
                        <DashboardLayout>
                            {departmentName === 'Restaurant' ? <RestaurantStaff /> :
                                departmentName === 'Bar' ? <BarStaff /> :
                                    departmentName === 'Reception' ? <ReceptionStaff /> :
                                        departmentName === 'Housekeeping' ? <HousekeepingStaff /> :
                                            <StaffDashboardPage />}
                        </DashboardLayout>
                    </ShiftProtectedRoute>
                }
            />

            {/* Base redirect: find the role and push them throuh */}
            <Route index element={<Navigate to={`/dashboard/${role}`} replace />} />
        </Routes>
    );
};

export default DashboardEngine;
