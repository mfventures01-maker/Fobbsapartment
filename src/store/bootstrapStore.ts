import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { useEventStore } from './eventStore';

interface BootstrapState {
    isHydrating: boolean;
    lastHydratedVersion: number;
    kernel: any | null;
    status: 'idle' | 'igniting' | 'alive' | 'failed';
    error: string | null;

    // 🛰️ THE ONE AWAKENING: Centralised bootloader
    ignite: (staffId?: string, branchId?: string) => Promise<any>;
}

export const useBootstrapStore = create<BootstrapState>((set, get) => ({
    isHydrating: false,
    lastHydratedVersion: 0,
    kernel: null,
    status: 'idle',
    error: null,

    ignite: async (staffId, branchId) => {
        const { isHydrating, lastHydratedVersion } = get();

        // 🛑 LOCK: Only one ignition allowed at a time
        if (isHydrating) {
            console.warn('[BOOTSTRAP_TRACE] IGNITION_LOCKED — concurrent attempt aborted.');
            return;
        }

        set({ isHydrating: true, status: 'igniting' });
        console.log('[BOOTSTRAP_TRACE] SYSTEM_IGNITION:START');

        try {
            // 🧬 BOOT SEQUENCE: Resolve entire state in one atomic snapshots
            const { data: snapshot, error: rpcError } = await supabase.rpc('system_bootstrap', {
                p_staff_id: staffId,
                p_branch_id: branchId
            });

            if (rpcError) throw rpcError;

            // 🧠 MEMORY: Skip if this version is already hydrated
            if (snapshot.version === lastHydratedVersion) {
                console.log('[BOOTSTRAP_TRACE] SYSTEM_IGNITION:SKIPPED — Current version is ground truth.');
                set({ isHydrating: false, status: 'alive' });
                return snapshot;
            }

            console.log('[BOOTSTRAP_TRACE] SYSTEM_IGNITION:SUCCESS ✅', {
                version: snapshot.version,
                shift: snapshot.execution_context?.shift_id || 'NONE'
            });

            // 🛰️ ANCHOR EVENT CLOCK: Ensure catch-up starts from snapshot version
            useEventStore.getState().syncLastEventId(snapshot.version);

            set({
                kernel: snapshot,
                lastHydratedVersion: snapshot.version,
                isHydrating: false,
                status: 'alive',
                error: null
            });

            return snapshot;
        } catch (err: any) {
            console.error('[BOOTSTRAP_TRACE] SYSTEM_IGNITION:FAILED ❌', err);
            set({
                isHydrating: false,
                status: 'failed',
                error: err.message
            });
            throw err;
        }
    }
}));
