import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Unauthorized from '@/pages/auth/Unauthorized';
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
    const { authority, authorityResolved } = useAuth();

    if (!authorityResolved) {
        // Render nothing or a strict loading state to prevent flash
        return <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white font-mono">AUTHORITY LOCK HARDENING...</div>;
    }

    if (!authority || !authority.role) {
        return <Unauthorized />;
    }

    const { role, departmentName } = authority;

    switch (role) {
        case 'super_admin':
            return (
                <Routes>
                    <Route element={<DashboardLayout />}>
                        <Route index element={<SuperAdminDashboard />} />
                    </Route>
                </Routes>
            );
        case 'ceo':
            return (
                <Routes>
                    <Route element={<CeoLayout />}>
                        <Route index element={<CeoOverview />} />
                        <Route path="branches" element={<CeoBranches />} />
                        <Route path="audit" element={<CeoAuditFeed />} />
                        <Route path="staff" element={<CeoStaffAdmin />} />
                        <Route path="settings" element={<CeoSettings />} />
                    </Route>
                </Routes>
            );
        case 'manager':
            return (
                <Routes>
                    <Route element={<DashboardLayout />}>
                        <Route index element={<ManagerDashboard />} />
                    </Route>
                </Routes>
            );
        case 'staff':
            // Dynamic rendering based on departmentName
            let StaffComponent = <StaffDashboardPage />;

            if (departmentName === 'Restaurant') {
                StaffComponent = <RestaurantStaff />;
            } else if (departmentName === 'Bar') {
                StaffComponent = <BarStaff />;
            } else if (departmentName === 'Reception') {
                StaffComponent = <ReceptionStaff />;
            } else if (departmentName === 'Housekeeping') {
                StaffComponent = <HousekeepingStaff />;
            }

            return (
                <Routes>
                    <Route element={<DashboardLayout />}>
                        <Route index element={StaffComponent} />
                    </Route>
                </Routes>
            );
        default:
            return <Unauthorized />;
    }
};

export default DashboardEngine;
