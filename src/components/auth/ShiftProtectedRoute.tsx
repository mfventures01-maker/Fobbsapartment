import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useShiftState } from '@/contexts/ShiftContext';
import FullScreenLoader from '@/components/FullScreenLoader';
import OpenShiftScreen from '@/pages/dashboard/staff/OpenShiftScreen';
import Unauthorized from '@/pages/auth/Unauthorized';

function ShiftProtectedRoute({
    children,
    required = true
}: {
    children: React.ReactNode;
    required?: boolean;
}) {
    const { authority } = useAuth();
    const { shiftState } = useShiftState();

    // Phase 2 Logic Requirement
    // 1. Loading State
    if (authority.status === 'loading') {
        return <FullScreenLoader />;
    }

    // 2. Unauthorized State
    if (authority.status === 'unauthorized') {
        return <Unauthorized />;
    }

    const { role } = authority;

    // CEO and SuperAdmin don't need shift logic
    if (role === 'super_admin' || role === 'ceo' || role === 'owner' || role === 'manager') {
        return <>{children}</>;
    }

    // 3. Shift Loading State
    if (role === 'staff' && required && shiftState.status === 'loading') {
        return <FullScreenLoader />;
    }

    // 4. No Shift State
    if (role === 'staff' && required && shiftState.status === 'no_shift') {
        return <OpenShiftScreen />;
    }

    // 5. Shift Active State
    if (role === 'staff' && required && shiftState.status === 'active') {
        return <>{children}</>;
    }

    // Error handling
    if (shiftState.status === 'error') {
        return (
            <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-8 text-center">
                <h1 className="text-2xl font-bold text-red-700">Database Connection Error</h1>
                <p className="text-red-600 mt-2">{shiftState.error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-6 bg-red-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg"
                >
                    Re-establish Connection
                </button>
            </div>
        );
    }

    return <Navigate to="/access-denied" replace />;
}

export default ShiftProtectedRoute;
