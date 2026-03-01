import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import FullScreenLoader from '@/components/FullScreenLoader';

export interface ProtectedRouteProps {
    allowedRoles: UserRole[];
    children: React.ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
    const { authority } = useAuth();

    if (authority.status === 'loading') {
        return <FullScreenLoader />;
    }

    if (authority.status === 'unauthorized') {
        return <Navigate to="/unauthorized" replace />;
    }

    // Safety check for role match
    if (authority.status === 'authorized' && !allowedRoles.includes(authority.role)) {
        return <Navigate to="/access-denied" replace />;
    }

    return <>{children}</>;
}
