import React from "react";
import { useShiftState } from "@/contexts/ShiftContext";
import { useAuth } from "@/contexts/AuthContext";
import OpenShiftScreen from "@/pages/dashboard/staff/OpenShiftScreen";
import ShiftDeclarationScreen from "@/pages/dashboard/staff/ShiftDeclarationScreen";
import { ShieldCheck, Clock, RefreshCw } from "lucide-react";
import FullScreenLoader from "@/components/FullScreenLoader";
import RestaurantStaff from "@/pages/dashboard/staff/RestaurantStaff";
import BarStaff from "@/pages/dashboard/staff/BarStaff";
import ReceptionStaff from "@/pages/dashboard/staff/ReceptionStaff";
import HousekeepingStaff from "@/pages/dashboard/staff/HousekeepingStaff";
import StaffDashboardPage from "@/pages/dashboard/staff/StaffDashboardPage";

const AwaitingApprovalScreen = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100 text-center space-y-6">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 font-serif">Awaiting Approval</h1>
            <p className="text-gray-500 text-sm">Your shift declaration has been submitted for review. Contact your manager or supervisor to finalize closure.</p>
            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center gap-3">
                <Clock className="w-5 h-5 text-gray-400 animate-pulse" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pending Review</span>
            </div>
            <button
                onClick={() => window.location.reload()}
                className="text-xs text-blue-600 font-bold hover:underline flex items-center justify-center gap-2 mx-auto"
            >
                <RefreshCw className="w-3 h-3" /> Check for status update
            </button>
        </div>
    </div>
);

/**
 * HardenedStaffTerminal Wrapper
 * Implements a deterministic state machine for staff access.
 * Prevents unauthorized access and ensures shift existence before rendering terminal components.
 */
export function HardenedStaffTerminal() {
    const { shiftState } = useShiftState();
    const { authority, user } = useAuth();

    React.useEffect(() => {
        if (user) {
            console.log('[SHIFT CONTEXT]', {
                authUser: user.id,
            });
        }
    }, [user]);

    // 1. Handle Loading State
    if (shiftState.status === 'loading') {
        return <FullScreenLoader />;
    }

    // 2. Handle Error State
    if (shiftState.status === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-50 p-6 text-center">
                <div>
                    <h2 className="text-xl font-bold text-red-900 mb-2 font-serif">Shift Engine Error</h2>
                    <p className="text-red-700 text-sm">{shiftState.error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 bg-red-900 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // 3. Handle Lifecycle States
    switch (shiftState.status) {
        case 'no_shift':
            return <OpenShiftScreen />;

        case 'pending_declaration':
            return <ShiftDeclarationScreen />;

        case 'awaiting_approval':
            return <AwaitingApprovalScreen />;

        case 'active':
            // Resolve component based on department
            const departmentName = authority.departmentName;

            if (departmentName === 'Restaurant') return <RestaurantStaff />;
            if (departmentName === 'Bar') return <BarStaff />;
            if (departmentName === 'Reception') return <ReceptionStaff />;
            if (departmentName === 'Housekeeping') return <HousekeepingStaff />;

            return <StaffDashboardPage />;

        default:
            return <OpenShiftScreen />;
    }
}
