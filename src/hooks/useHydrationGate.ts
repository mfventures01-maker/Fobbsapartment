import { useEffect } from 'react';
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

    // Slices Status (for Aggregated Gate)
    const qrStatus = useQRMenuStore(state => state.status);
    const barStatus = useBarCartStore(state => state.status);
    const bookingStatus = useRoomBookingStore(state => state.status);
    const posStatus = usePOSStore(state => state.status);

    useEffect(() => {
        const awaken = async () => {
            // Gate 1: Auth & Branch context
            if (!session || !branchId) return;

            console.log('[HYDRATION_TRACE] KERNEL: INITIATING ONE AWAKENING 🚀');

            try {
                // Step 1: The Singular Awakening (RPC Bootstrap)
                // This resolves: Identity, Context, Shift, Version
                const snapshot = await ignite(staffId || undefined, branchId);

                if (!snapshot) return;

                // Step 2: Synchronous Slice Propagation (One Reality)
                // No extra RPCs! We populate every domain from the kernel snapshot.
                useQRMenuStore.getState().hydrateFromSnapshot(snapshot);
                usePOSStore.getState().hydrateFromSnapshot(snapshot);

                // Parallel hydration for secondary slices not yet in kernel
                // (Optional: Move these into system_bootstrap for pure determinism)
                await Promise.all([
                    useBarCartStore.getState().hydrate(branchId, staffId || authority.user_id!),
                    useRoomBookingStore.getState().hydrate(branchId)
                ]);

            } catch (err) {
                console.error('[HYDRATION_TRACE] KERNEL: AWAKENING_FAILED ❌', err);
            }
        };

        awaken();
    }, [session, branchId, staffId, ignite, authority.user_id]);

    // Mandatory Gate: App only resolves when all slices are 'success'
    const allSuccess = [qrStatus, barStatus, bookingStatus].every(s => s === 'success');

    // Shift context gate (optional blocking)
    const posReady = staffId ? posStatus === 'success' : true;

    const isHydrated = allSuccess && posReady && status === 'alive';

    if (isHydrated && !isHydrating) {
        console.log('[HYDRATION_TRACE] KERNEL: SYSTEM FULLY SYNCHRONIZED ⚡');
        // @ts-ignore
        window.canHydrate = true;
        // @ts-ignore
        window.__CARSS_PORTAL_STATE__ = {
            kernel: useBootstrapStore.getState().kernel,
            slices: {
                qr: useQRMenuStore.getState().status,
                pos: usePOSStore.getState().status
            }
        };
    }

    return isHydrated;
}
