/**
 * AuthGate - Global authentication guard component
 * Handles redirects based on auth state and route
 */

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthedProfile } from './getAuthedProfile';
import { routeForProfile } from './routeRules';

interface AuthGateProps {
    children: React.ReactNode;
}

const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
    const { user, loading: authLoading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            // Wait for auth context to finish loading
            if (authLoading) {
                return;
            }

            const path = location.pathname;

            // If user is NOT logged in and trying to access dashboard
            if (!user && path.startsWith('/dashboard')) {
                navigate('/login', { replace: true });
                setChecking(false);
                return;
            }

            // If user IS logged in and on login page or bare /dashboard
            if (user && (path === '/login' || path === '/staff-login' || path === '/dashboard')) {
                try {
                    const profile = await getAuthedProfile();
                    const targetRoute = routeForProfile(profile);

                    // Only redirect if not already on the target route
                    if (path !== targetRoute && !path.startsWith(targetRoute)) {
                        navigate(targetRoute, { replace: true });
                    }
                } catch (error) {
                    // If profile fetch fails on login pages, let them stay
                    // If on dashboard, redirect to login
                    if (path === '/dashboard') {
                        navigate('/login', { replace: true });
                    }
                    console.error('AuthGate profile fetch error:', error);
                }
            }

            setChecking(false);
        };

        checkAuth();
    }, [user, authLoading, location.pathname, navigate]);

    // Show loading state while auth is being determined
    if (authLoading || checking) {
        return (
            <div className="min-h-screen flex items-center justify-center text-emerald-900">
                Loading...
            </div>
        );
    }

    return <>{children}</>;
};

export default AuthGate;
