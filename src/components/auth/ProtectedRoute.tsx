import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useRole, UserRole } from '@/contexts/RoleContext';
import AccessDenied from '@/pages/auth/AccessDenied';

interface ProtectedRouteProps {
    allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
    const { role, loading } = useRole();

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!role) {
        return <Navigate to="/unauthorized" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
        return <AccessDenied />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
