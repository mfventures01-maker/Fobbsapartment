import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import FullScreenLoader from '@/components/FullScreenLoader';

const DEFAULT_ALLOWED_ROLES: UserRole[] = ['admin', 'manager', 'staff', 'ceo', 'super_admin', 'kitchen'];

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    allowedRoles = DEFAULT_ALLOWED_ROLES
}) => {
    const { isLoading, isAuthenticated, role } = useAuth();
    const location = useLocation();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            console.log('[ANTI-GRAVITY] 🔒 No session, redirecting to login');
        }
        if (!isLoading && isAuthenticated && role && !allowedRoles.includes(role)) {
            console.warn(`[ANTI-GRAVITY] 🚫 Role '${role}' not allowed for ${location.pathname}`);
        }
    }, [isLoading, isAuthenticated, role, location.pathname, allowedRoles]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <FullScreenLoader />
                <p className="mt-4 text-emerald-900 font-medium animate-pulse">Initializing Anti-Gravity Engine...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!role || !allowedRoles.includes(role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
