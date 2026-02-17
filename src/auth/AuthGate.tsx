import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGateProps {
    children: React.ReactNode;
}

const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
    const { user, profile, loading, signOut } = useAuth();
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
                // Missing profile check
                if (!profile) {
                    console.warn(`[AuthGate] User ${user.email} has no profile!`);
                    // Optionally redirect to a "setup profile" page or show error
                    // For now, we might want to let them see public pages, but if they are on /login, we can't redirect them to dashboard.
                    // But strictly per instructions: "If profile not found: Block routing. Show 'Account not configured'".
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

    if (user && !profile && !loading) {
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
