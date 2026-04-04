/**
 * 🛸 CARSS HOTEL HYDRATION PORTAL (LAYER 1-4 AGGREGATOR)
 * 
 * Purpose: Aggregates Auth, Operational Context, Shift, and System State
 * into a single deterministic portal object with math-level certainty.
 */

import { useAuth } from '@/contexts/AuthContext';
import { useShiftState } from '@/contexts/ShiftContext';
import { useSystemState } from '@/hooks/useSystemState';
import { SHIFT_STATUS } from '@/constants/shiftStatus';

export interface HotelPortalState {
    userId: string | null;
    role: string | null;
    status: 'loading' | 'authorized' | 'unauthorized';

    // Layer 2: Operational Context
    branchId: string | null;
    businessId: string | null;
    staffId: string | null;

    // Layer 3: Shift Snapshot
    shift: {
        id: string | null;
        status: string;
        revenue: number;
    };

    // Layer 4: System Snapshot (L4)
    system: {
        orders: { open: number; pending: number; total: number };
        revenue: { today: number; hour: number; shift: number };
        transactions: any[];
        alerts: any[];
    };

    fully_hydrated: boolean;
    timestamp: string | null;
}

export function useHotelHydration(): HotelPortalState {
    const { authority, user } = useAuth();
    const { shiftState } = useShiftState();
    const { orders, revenue, recent_transactions, alerts, timestamp } = useSystemState();

    const isShiftOpen = shiftState.status === SHIFT_STATUS.OPEN;

    // ⚔️ [ANTI-GRAVITY] SEQUENTIAL VALIDATION (STEP 5)
    // Marks fully_hydrated only if all layers succeed.
    const fully_hydrated = !!authority.hydrated
        && !!authority.businessId
        && !!authority.branchId
        && (shiftState.status !== 'loading' && shiftState.status !== 'error')
        && !!timestamp;

    return {
        userId: user?.id || null,
        role: authority.role,
        status: authority.status as any,

        branchId: authority.branchId,
        businessId: authority.businessId,
        staffId: authority.staffId,

        shift: {
            id: isShiftOpen ? shiftState.shift.id : null,
            status: shiftState.status,
            revenue: isShiftOpen ? (revenue?.shift_total || 0) : 0
        },

        system: {
            orders: {
                open: orders?.open_orders || 0,
                pending: orders?.pending_payment || 0,
                total: orders?.today_total || 0
            },
            revenue: {
                today: revenue?.today || 0,
                hour: revenue?.last_hour || 0,
                shift: revenue?.shift_total || 0
            },
            transactions: recent_transactions || [],
            alerts: alerts || []
        },

        fully_hydrated,
        timestamp: timestamp || null
    };
}
