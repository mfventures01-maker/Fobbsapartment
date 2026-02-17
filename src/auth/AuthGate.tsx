import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGateProps {
    children: React.ReactNode;
}

const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
    const { user, profile, loading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            if (loading) return;

            const path = location.pathname;

            // List of public paths that don't require login
            const publicPaths = [
                '/',
                '/hotel',
                '/fobbs',
                '/login',
                '/staff-login',
                '/payment-intent',
                '/confirm-payment',
                '/fulfillment',
                '/restaurant',
                '/bar',
                '/services',
                '/ceo-view', // The public CEO dashboard if any
                '/debug-auth'
            ];

            const isPublic = publicPaths.some(p => path === p || path.startsWith('/services/'));

            // 1. Unauthenticated user trying to access protected route
            if (!user && !isPublic) {
                console.log(`[AuthGate] Redirecting unauthenticated user from ${path} to /login`);
                navigate('/login', { replace: true });
                return;
            }

            // 2. Authenticated user
            if (user) {
                // If on login page or root, redirect to role-specific dashboard
                if (path === '/login' || path === '/staff-login' || path === '/') {
                    if (profile?.role) {
                        const role = profile.role;
                        console.log(`[AuthGate] Redirecting ${role} to dashboard`);
                        if (role === 'super_admin') navigate('/super-admin', { replace: true });
                        else if (role === 'ceo') navigate('/ceo', { replace: true });
                        else if (role === 'manager') navigate('/manager', { replace: true });
                        else if (role === 'staff' || role === 'cashier' || role === 'storekeeper') navigate('/staff', { replace: true });
                        else navigate('/unauthorized');
                    } else {
                        // User logged in but no role found yet
                    }
                }
            }
        };

        checkAuth();
    }, [user, profile, loading, location.pathname, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-emerald-900 bg-slate-50">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <div className="font-bold tracking-widest uppercase text-xs">Loading permissions...</div>
                <div className="text-[10px] text-gray-400 mt-2">v.2026.02.16</div>
            </div>
        );
    }

    return <>{children}</>;
};

export default AuthGate;
