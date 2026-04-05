import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQRMenuStore } from '../store/qrMenuStore';
import { useBarCartStore } from '../store/barCartStore';
import { useRoomBookingStore } from '../store/roomBookingStore';
import { usePOSStore } from '../store/posStore';

export function useHydrationGate() {
    const { authority, session } = useAuth();

    const branchId = authority.branchId;
    const staffId = authority.staffId;

    const slicesStatus = [
        useQRMenuStore(state => state.status),
        useBarCartStore(state => state.status),
        useRoomBookingStore(state => state.status),
        usePOSStore(state => state.status),
    ];

    useEffect(() => {
        // 🛡️ RE-IGNITION STRATEGY
        // We only trigger fetch for all domain slices once the Auth identity is resolved
        if (session && branchId) {
            console.log('[HYDRATION_TRACE] HYDRATION_GATE: AWAKENING DOMAIN SLICES ⚡');

            // Concurrent fire-and-forget fetch calls managed by individual stores
            useQRMenuStore.getState().fetch(branchId);
            useBarCartStore.getState().fetch(branchId);
            useRoomBookingStore.getState().fetch(branchId);

            if (staffId) {
                usePOSStore.getState().fetch(branchId, staffId);
            }
        }
    }, [session, branchId, staffId]);

    // Aggregated success gate
    // Note: POS is only required if staffId exists
    const isHydrated = slicesStatus.every((s, index) => {
        // Index 3 is POS status
        if (index === 3 && !staffId) return true;
        return s === 'success';
    });

    if (isHydrated) {
        console.log('[HYDRATION_TRACE] HYDRATION_GATE: ALL SLICES SYNCHRONIZED ⚡');
    }

    return isHydrated;
}
