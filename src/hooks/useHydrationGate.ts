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
        // This blocks the app root render until all stores have hydrated successfully
        const hydrateAllStores = async () => {
            if (!session || !branchId) return;

            console.log('[HYDRATION_TRACE] HYDRATION_GATE: AWAKENING DOMAIN SLICES ⚡');

            // Parallel execution with individual store error/fallback handling
            await Promise.all([
                useQRMenuStore.getState().hydrate(branchId),
                useBarCartStore.getState().hydrate(branchId),
                useRoomBookingStore.getState().hydrate(branchId),
                staffId ? usePOSStore.getState().hydrate(branchId, staffId) : Promise.resolve(),
            ]);
        };

        hydrateAllStores();
    }, [session, branchId, staffId]);

    // Mandatory slices that must succeed (or fall back to successful cache)
    const isHydrated = slices.every((s, index) => {
        // Index 3 is POS status
        if (index === 3 && !staffId) return true;
        return s === 'success';
    });

    if (isHydrated) {
        console.log('[HYDRATION_TRACE] HYDRATION_GATE: ALL SLICES SYNCHRONIZED ⚡');
    }

    return isHydrated;
}
