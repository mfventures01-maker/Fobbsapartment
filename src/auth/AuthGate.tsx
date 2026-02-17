import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGateProps {
    children: React.ReactNode;
}

const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
    const { user, profile, loading, authState, signOut } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            // Wait for full hydration
            if (loading || authState === 'initializing' || authState === 'session_loaded') return;

            const path = location.pathname;

            // List of public paths
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
                '/ceo-view',
                '/debug-auth'
            ];

            const isPublic = publicPaths.some(p => path === p || path.startsWith('/services/'));

            // 1. Unauthenticated or Error
            if (!user && !isPublic) {
                // If we are in 'error' state, maybe we should show the error screen instead of redirecting?
                // But generally redirect to login is safer for unauthenticated.
                if (authState === 'unauthenticated') {
                    console.log(`[AuthGate] Redirecting unauthenticated user from ${path} to /login`);
                    navigate('/login', { replace: true });
                }
                return;
            }

            // 2. Authenticated user
            if (user) {
                // Missing profile check
                if (!profile) {
                    // This is handled by the render block below
                    return;
                }

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
                    }
                }
            }
        };

        checkAuth();
    }, [user, profile, authState, loading, location.pathname, navigate]);

    // Render Logic based on State Machine

    if (authState === 'initializing' || authState === 'session_loaded') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-emerald-900 bg-slate-50">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <div className="font-bold tracking-widest uppercase text-xs">
                    {authState === 'initializing' ? 'Initializing System...' : 'Loading Profile...'}
                </div>
                <div className="text-[10px] text-gray-400 mt-2">v.2026.02.17</div>
            </div>
        );
    }

    if (authState === 'error') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 text-red-900">
                <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
                    <h2 className="text-xl font-bold mb-2">Connection Error</h2>
                    <p className="text-gray-600 mb-6">Failed to connect to the authentication service.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    if (user && !profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-900">
                <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Account Not Configured</h2>
                    <p className="text-gray-600 mb-6">
                        We found your login, but your personnel profile is missing.
                        Please contact the System Administrator.
                    </p>
                    <div className="text-xs font-mono bg-gray-100 p-2 rounded">
                        ID: {user.id}
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="mt-6 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default AuthGate;
