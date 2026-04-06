import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

interface BarCartState {
    data: any[];
    items: any[];
    version: number;
    status: 'idle' | 'loading' | 'success' | 'error';
    error: string | null;
    // 🛸 Step 1: Staff ID requirement for the new deterministic signature
    hydrate: (branchId: string, staffId: string) => Promise<void>;
    hydrateFromSnapshot: (snapshot: any) => void;
    clearItems: (itemsToRemove: any[]) => void;
}

export const useBarCartStore = create<BarCartState>((set, get) => ({
    data: [],
    items: [],
    version: 0,
    status: 'idle',
    error: null,

    hydrate: async (branchId: string, staffId: string) => {
        if (get().status === 'loading') return;
        console.log('[HYDRATION_TRACE] bar_cart:hydrate:start', { branchId, staffId });
        set({ status: 'loading' });
        try {
            // 🎯 Fix: Match the new RPC signature: get_bar_cart(p_branch_id, p_staff_id)
            const { data: env, error: rpcError } = await supabase.rpc('get_bar_cart', {
                p_branch_id: branchId,
                p_staff_id: staffId
            });

            if (rpcError) throw rpcError;

            const payload = {
                data: env.data || [],
                items: env.data || [],
                version: env.version || 0,
                status: 'success' as const,
                error: null
            };

            localStorage.setItem(`carss_cache_bar_${branchId}`, JSON.stringify(payload));
            set(payload);
            console.log('[HYDRATION_TRACE] bar_cart:hydrate:SUCCESS', { version: env.version });
        } catch (err: any) {
            console.warn('[HYDRATION_TRACE] bar_cart:hydrate:RPC_FAILURE — Fallback active', err);
            const cached = localStorage.getItem(`carss_cache_bar_${branchId}`);
            if (cached) {
                set({ ...JSON.parse(cached), status: 'success' });
            } else {
                set({ status: 'error', error: err.message });
            }
        }
    },

    hydrateFromSnapshot: (snapshot: any) => {
        console.log('[HYDRATION_TRACE] bar_cart:snapshot_applied 🧬', { version: snapshot.version });
        const items = snapshot.slices?.bar_items || [];
        set({
            data: items,
            items: items,
            version: snapshot.version,
            status: 'success',
            error: null
        });
    },

    clearItems: (itemsToRemove) => {
        const idsToRemove = itemsToRemove.map(i => i.id);
        set((state) => ({
            items: state.items.filter(i => !idsToRemove.includes(i.id)),
            data: state.data.filter(i => !idsToRemove.includes(i.id))
        }));
    }
}));
