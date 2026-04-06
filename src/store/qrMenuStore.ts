import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

interface QRMenuState {
    data: any[];
    items: any[];
    version: number;
    status: 'idle' | 'loading' | 'success' | 'error';
    error: string | null;
    optimisticUpdates: any[];
    // 🛸 Step 2: hydrate() replaces fetch() for deterministic nomenclature
    hydrate: (branchId: string) => Promise<void>;
    // 🛸 Step 1: One Awakening — hydrateFromSnapshot()
    hydrateFromSnapshot: (payload: any) => void;
    applyOptimisticUpdate: (update: { id: string; item: any }) => void;
    rollbackOptimisticUpdate: (updateId: string) => void;
}

export const useQRMenuStore = create<QRMenuState>((set, get) => ({
    data: [],
    items: [],
    version: 0,
    status: 'idle',
    error: null,
    optimisticUpdates: [],

    hydrate: async (branchId: string) => {
        if (get().status === 'loading') return;
        console.log('[HYDRATION_TRACE] qr_menu:hydrate:start', { branchId });
        set({ status: 'loading', error: null });

        try {
            const { data: env, error: rpcError } = await supabase.rpc('get_qr_menu', { p_branch_id: branchId });

            if (rpcError) throw rpcError;

            const payload = {
                data: env.data || [],
                items: env.data || [],
                version: env.version || 1,
                status: 'success' as const,
                error: null,
                optimisticUpdates: [],
            };

            // Persistence for offline fallback
            localStorage.setItem(`carss_cache_qr_${branchId}`, JSON.stringify(payload));

            set(payload);
            console.log('[HYDRATION_TRACE] qr_menu:hydrate:SUCCESS', { version: env.version });
        } catch (err: any) {
            console.warn('[HYDRATION_TRACE] qr_menu:hydrate:RPC_FAILURE — Attempting fallback...', err);

            // 🛸 Step 3: RPC Deterministic Fallback
            const cached = localStorage.getItem(`carss_cache_qr_${branchId}`);
            if (cached) {
                console.info('[HYDRATION_TRACE] qr_menu:hydrate:FALLBACK_SUCCESS (using cache)');
                set({ ...JSON.parse(cached), status: 'success' }); // Mark as success to release gate
            } else {
                console.error('[HYDRATION_TRACE] qr_menu:hydrate:FALLBACK_FAILED (no cache)');
                set({ status: 'error', error: err.message, items: [], version: 0 });
            }
        }
    },

    applyOptimisticUpdate: (update) => {
        set((state) => ({
            items: [...state.items, update.item],
            data: [...state.data, update.item],
            optimisticUpdates: [...state.optimisticUpdates, update],
        }));
    },

    rollbackOptimisticUpdate: (updateId: string) => {
        set((state) => ({
            items: state.items.filter((i) => i.id !== updateId),
            data: state.data.filter((i) => i.id !== updateId),
            optimisticUpdates: state.optimisticUpdates.filter((u) => (u as any).id !== updateId),
        }));
    },

    hydrateFromSnapshot: (snapshot: any) => {
        console.log('[HYDRATION_TRACE] qr_menu:snapshot_applied 🧬', { version: snapshot.version });
        const items = snapshot.slices?.qr_menu || [];
        set({
            data: items,
            items: items,
            version: snapshot.version,
            status: 'success'
        });
    }
}));
