import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import FullScreenLoader from '@/components/FullScreenLoader';

function ProtectedRoute({
    allowedRoles,
    children
}: {
    allowedRoles: UserRole[];
    children: React.ReactNode;
}) {
    const { authorityStatus, currentRole } = useAuth();

    console.log('[ROUTE] Evaluating ProtectedRoute');
    console.log('[ROUTE] Allowed Roles:', allowedRoles);
    console.log('[ROUTE] Status:', authorityStatus);
    console.log('[ROUTE] Role:', currentRole);

    if (authorityStatus === 'loading') {
        return <FullScreenLoader />;
    }

    if (authorityStatus === 'unauthorized') {
        return <Navigate to="/login" replace />;
    }

    if (!currentRole || !allowedRoles.includes(currentRole)) {
        console.warn(`[ROUTE] Access Denied: Role '${currentRole}' not in [${allowedRoles.join(',')}]`);
        return <Navigate to="/unauthorized" replace />;
    }

    return <>{children}</>;
}

export default ProtectedRoute;
