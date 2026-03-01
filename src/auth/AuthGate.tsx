import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import FullScreenLoader from '@/components/FullScreenLoader';

interface AuthGateProps {
    children: React.ReactNode;
}

const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
    const { authority } = useAuth();
    const location = useLocation();

    // 1. Loading State
    if (authority.status === 'loading') {
        return <FullScreenLoader />;
    }

    // 2. Unauthorized State (No Session or broken membership)
    if (authority.status === 'unauthorized') {
        const publicPaths = [
            '/', '/hotel', '/fobbs', '/login', '/staff-login', '/payment-intent', '/confirm-payment',
            '/fulfillment', '/restaurant', '/bar', '/services', '/debug-auth', '/unauthorized', '/access-denied'
        ];

        const isPublic = publicPaths.some(p => location.pathname === p || location.pathname.startsWith('/services/'));

        if (!isPublic) {
            console.warn(`[GATED] Blocking unauthorized access to ${location.pathname}`);
            return <Navigate to="/login" replace />;
        }
    }

    // 3. Authorized State
    if (authority.status === 'authorized') {
        // Deterministic redirect from login paths to dashboard
        const authPaths = ['/login', '/staff-login'];
        if (authPaths.includes(location.pathname)) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return <>{children}</>;
};

export default AuthGate;
