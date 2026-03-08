import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import FullScreenLoader from '@/components/FullScreenLoader';

// Super Admin
import SuperAdminDashboard from '@/pages/dashboard/super_admin/SuperAdminDashboard';

// CEO
import CeoLayout from '@/pages/dashboard/ceo/CeoLayout';
import CEOControlTower from '@/pages/dashboard/ceo/CEOControlTower';
import CeoBranches from '@/pages/dashboard/ceo/CeoBranches';
import CeoAuditFeed from '@/pages/dashboard/ceo/CeoAuditFeed';
import CeoStaffAdmin from '@/pages/dashboard/ceo/CeoStaffAdmin';
import CeoSettings from '@/pages/dashboard/ceo/CeoSettings';

// Manager
import ManagerCommandCenter from '@/pages/dashboard/manager/ManagerCommandCenter';

// Staff
import { HardenedStaffTerminal } from '@/components/staff/HardenedStaffTerminal';

// Store / Branch
import StoreOperationsPanel from '@/pages/dashboard/store/StoreOperationsPanel';

const DashboardEngine: React.FC = () => {
    const { authority } = useAuth();

    if (authority.status === 'loading') return <FullScreenLoader />;
    if (authority.status === 'unauthorized') return <Navigate to="/unauthorized" replace />;

    const { role } = authority;

    // --- HIGH-INTEGRITY TERMINAL ROUTING ---
    return (
        <Routes>
            {/* 1. Super Admin Ops */}
            <Route
                path="super_admin"
                element={
                    <ProtectedRoute allowedRoles={['super_admin']}>
                        <DashboardLayout><SuperAdminDashboard /></DashboardLayout>
                    </ProtectedRoute>
                }
            />

            {/* 2. CEO Control Tower */}
            <Route
                path="ceo/*"
                element={
                    <ProtectedRoute allowedRoles={['ceo', 'owner']}>
                        <CeoLayout>
                            <Routes>
                                <Route index element={<CEOControlTower />} />
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

            {/* 3. Manager Command Center */}
            <Route
                path="manager"
                element={
                    <ProtectedRoute allowedRoles={['manager']}>
                        <DashboardLayout><ManagerCommandCenter /></DashboardLayout>
                    </ProtectedRoute>
                }
            />

            {/* 4. Staff Operational Terminal */}
            <Route
                path="staff/*"
                element={
                    <DashboardLayout>
                        <HardenedStaffTerminal />
                    </DashboardLayout>
                }
            />

            {/* 5. Store Operations Panel */}
            <Route
                path="store"
                element={
                    <ProtectedRoute allowedRoles={['ceo', 'manager']}>
                        <DashboardLayout><StoreOperationsPanel /></DashboardLayout>
                    </ProtectedRoute>
                }
            />

            {/* Base redirect: find the role and push them through */}
            <Route index element={<Navigate to={`/dashboard/${role}`} replace />} />
        </Routes>
    );
};

export default DashboardEngine;
