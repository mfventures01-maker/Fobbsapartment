import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBootstrapStore } from '../store/bootstrapStore';
import { useQRMenuStore } from '../store/qrMenuStore';
import { useBarCartStore } from '../store/barCartStore';
import { useRoomBookingStore } from '../store/roomBookingStore';
import { usePOSStore } from '../store/posStore';

/**
 * 🛸 ANTI-GRAVITY HYDRATION GATE (THE KERNEL)
 * One Awakening. This gate resolves the entire system reality in a single atomic snapshot.
 * It eliminates the 'Hydration Loop' by centralising all RPC calls into the Bootstrap Kernel.
 */

export function useHydrationGate() {
    const { authority, session } = useAuth();
    const branchId = authority.branchId;
    const staffId = authority.staffId;

    // Kernel State
    const ignite = useBootstrapStore(state => state.ignite);
    const isHydrating = useBootstrapStore(state => state.isHydrating);
    const status = useBootstrapStore(state => state.status);
    const lastVersion = useBootstrapStore(state => state.lastHydratedVersion);

    // Slices Status
    const qrStatus = useQRMenuStore(state => state.status);
    const barStatus = useBarCartStore(state => state.status);
    const bookingStatus = useRoomBookingStore(state => state.status);
    const posStatus = usePOSStore(state => state.status);

    // 🛡️ RE-IGNITION GUARD: Ensure for a given branch identity, we only awaken ONCE.
    const ignitionContext = useRef<string | null>(null);

    useEffect(() => {
        const currentId = `${branchId}:${staffId}:${session?.user.id}`;

        const awaken = async () => {
            // Gate 1: Auth & Branch context
            if (!session || !branchId) return;

            // Gate 2: Guard against re-ignition if identity context hasn't changed
            if (ignitionContext.current === currentId && status === 'alive') {
                return;
            }

            console.log('[HYDRATION_TRACE] KERNEL: INITIATING ONE AWAKENING 🚀', { currentId });
            ignitionContext.current = currentId;

            try {
                // Step 1: The Singular Awakening (Omniscient RPC Bootstrap)
                // This resolves: Identity, Context, Shift, Version, POS Metrics, QR, Bar, Rooms
                const snapshot = await ignite(staffId || undefined, branchId);

                if (!snapshot) return;

                // Step 2: Synchronous Slice Propagation (Zero Secondary RPCs)
                useQRMenuStore.getState().hydrateFromSnapshot(snapshot);
                usePOSStore.getState().hydrateFromSnapshot(snapshot);
                useBarCartStore.getState().hydrateFromSnapshot(snapshot);
                useRoomBookingStore.getState().hydrateFromSnapshot(snapshot);

                console.log('[HYDRATION_TRACE] KERNEL: ALL SLICES SYNCHRONIZED ⚡');

            } catch (err) {
                console.error('[HYDRATION_TRACE] KERNEL: AWAKENING_FAILED ❌', err);
            }
        };

        awaken();
    }, [session?.user.id, branchId, staffId, ignite]);

    // Mandatory Gate: App only resolves when all slices are 'success'
    const allSuccess = [qrStatus, barStatus, bookingStatus, posStatus].every(s => s === 'success');
    const isHydrated = allSuccess && status === 'alive';

    if (isHydrated && !isHydrating) {
        // @ts-ignore
        window.canHydrate = true;
        // @ts-ignore
        window.__CARSS_PORTAL_STATE__ = {
            kernel_version: lastVersion,
            identity: { staffId, branchId }
        };
    }

    return isHydrated;
}
