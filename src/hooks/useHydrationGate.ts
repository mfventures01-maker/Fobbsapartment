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

    const slices = [
        useQRMenuStore(state => state.status),
        useBarCartStore(state => state.status),
        useRoomBookingStore(state => state.status),
        usePOSStore(state => state.status),
    ];

    useEffect(() => {
        // 🛸 Step 2: Hydration Gate for Domain Slices
        const hydrateAllStores = async () => {
            // 🎯 Fix: We only hydrate if we have an active session + branch context
            if (!session || !branchId) return;

            console.log('[HYDRATION_TRACE] HYDRATION_GATE: AWAKENING DOMAIN SLICES ⚡');

            // We need staffId for barCartStore and posStore (New RPC Signatures)
            const currentStaffId = staffId || authority.user_id; // Absolute fallback

            // Parallel execution with individual store error/fallback handling
            await Promise.all([
                useQRMenuStore.getState().hydrate(branchId),

                // 🎯 Fix: Pass currentStaffId to barCartStore.hydrate() to match RPC signature
                currentStaffId ? useBarCartStore.getState().hydrate(branchId, currentStaffId) : Promise.resolve(),

                useRoomBookingStore.getState().hydrate(branchId),

                currentStaffId ? usePOSStore.getState().hydrate(branchId, currentStaffId) : Promise.resolve(),
            ]);
        };

        hydrateAllStores();
    }, [session, branchId, staffId, authority.user_id]);

    // Aggregated success gate
    const isHydrated = slices.every((s, index) => {
        // Indices needing staff/session: 1 (Bar Cart), 3 (POS)
        const staffIdResolved = staffId || authority.user_id;
        if ((index === 1 || index === 3) && !staffIdResolved) return true;
        return s === 'success';
    });

    if (isHydrated) {
        console.log('[HYDRATION_TRACE] HYDRATION_GATE: ALL SLICES SYNCHRONIZED ⚡');
        // @ts-ignore
        window.canHydrate = true;
    }

    return isHydrated;
}
