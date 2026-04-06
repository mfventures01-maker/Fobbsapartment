import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBootstrapStore } from '../store/bootstrapStore';
import { useQRMenuStore } from '../store/qrMenuStore';
import { useBarCartStore } from '../store/barCartStore';
import { useRoomBookingStore } from '../store/roomBookingStore';
import { usePOSStore } from '../store/posStore';

/**
 * 🛸 ANTI-GRAVITY HYDRATION GATE (THE KERNEL)
 * Finalized Shift Guard: Prevents loops when Layer 4 is empty.
 * One Awakening. This gate resolves the entire system reality in a single atomic snapshot.
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

    // Slices Status & Shift Context
    const qrStatus = useQRMenuStore(state => state.status);
    const barStatus = useBarCartStore(state => state.status);
    const bookingStatus = useRoomBookingStore(state => state.status);
    const posStatus = usePOSStore(state => state.status);
    const currentShift = usePOSStore(state => state.shift);

    // 🛡️ RE-IGNITION GUARD: Identity-tracked instance lock
    const ignitionContext = useRef<string | null>(null);

    useEffect(() => {
        const currentId = `${branchId}:${staffId}:${session?.user.id}`;

        const awaken = async () => {
            // Layer 1-2 Gate: Auth & Branch context
            if (!session || !branchId) return;

            // 🛸 ANTI-GRAVITY SHIFT GUARD: Skip re-ignition if already resolved (even if no shift)
            if (ignitionContext.current === currentId && status === 'alive') {
                return;
            }

            console.log('[HYDRATION_TRACE] KERNEL: INITIATING ONE AWAKENING 🚀', { currentId });
            ignitionContext.current = currentId;

            try {
                // Step 1: The Singular Awakening (Omniscient RPC Bootstrap)
                const snapshot = await ignite(staffId || undefined, branchId);

                if (!snapshot) return;

                // Step 2: Synchronous Slice Propagation
                useQRMenuStore.getState().hydrateFromSnapshot(snapshot);
                usePOSStore.getState().hydrateFromSnapshot(snapshot);
                useBarCartStore.getState().hydrateFromSnapshot(snapshot);
                useRoomBookingStore.getState().hydrateFromSnapshot(snapshot);

                // Diagnostic: Check Layer 4 Shift resolution
                if (!snapshot.execution_context) {
                    console.warn('[HYDRATION_TRACE] LAYER 4: NO_SHIFT (Idle Skip Applied) — Terminal remains aligned.');
                }

                console.log('[HYDRATION_TRACE] KERNEL: ALL SLICES SYNCHRONIZED ⚡');

            } catch (err) {
                console.error('[HYDRATION_TRACE] KERNEL: AWAKENING_FAILED ❌', err);
                // Clear context for retry on next identity change
                ignitionContext.current = null;
            }
        };

        awaken();
    }, [session?.user.id, branchId, staffId, ignite]);

    // Mandatory Gate: All slices must be technically resolved ('success' including NO_SHIFT)
    const allSuccess = [qrStatus, barStatus, bookingStatus, posStatus].every(s => s === 'success');
    const isHydrated = allSuccess && status === 'alive';

    if (isHydrated && !isHydrating) {
        // @ts-ignore
        window.canHydrate = true;
        // @ts-ignore
        window.__CARSS_PORTAL_STATE__ = {
            kernel_version: lastVersion,
            shift_status: currentShift ? 'ACTIVE' : 'NONE',
            identity: { staffId, branchId }
        };
    }

    return isHydrated;
}
