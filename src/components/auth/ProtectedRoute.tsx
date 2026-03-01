import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import FullScreenLoader from '@/components/FullScreenLoader';

export interface ProtectedRouteProps {
    allowedRoles: UserRole[];
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<{
    allowedRoles: UserRole[];
    children: React.ReactNode;
}> = ({ allowedRoles, children }) => {
    const { authority } = useAuth();
    const isGranted = (authority.status === 'authorized' && allowedRoles.includes(authority.role));

    console.log('[FORENSIC] Evaluating ProtectedRoute');
    console.log('[FORENSIC] Allowed Roles:', allowedRoles);
    console.log('[FORENSIC] Authority Status:', authority.status);
    console.log('[FORENSIC] Current Role:', authority.status === 'authorized' ? authority.role : 'N/A');
    console.log('[FORENSIC] Access Granted:', isGranted);

    if (authority.status === 'loading') {
        return <FullScreenLoader />;
    }

    if (authority.status === 'unauthorized') {
        return <Navigate to="/unauthorized" replace />;
    }

    if (!isGranted) {
        return <Navigate to="/access-denied" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
