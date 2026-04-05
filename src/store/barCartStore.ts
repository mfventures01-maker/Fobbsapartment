import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

interface BarCartState {
    data: any[];
    items: any[];
    version: number;
    status: 'idle' | 'loading' | 'success' | 'error';
    error: string | null;
    hydrate: (branchId: string) => Promise<void>;
    clearItems: (itemsToRemove: any[]) => void;
}

export const useBarCartStore = create<BarCartState>((set, get) => ({
    data: [],
    items: [],
    version: 0,
    status: 'idle',
    error: null,

    hydrate: async (branchId: string) => {
        if (get().status === 'loading') return;
        console.log('[HYDRATION_TRACE] bar_cart:hydrate:start', { branchId });
        set({ status: 'loading' });
        try {
            const { data: env, error: rpcError } = await supabase.rpc('get_bar_cart', { p_branch_id: branchId });
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
        } catch (err: any) {
            const cached = localStorage.getItem(`carss_cache_bar_${branchId}`);
            if (cached) {
                set({ ...JSON.parse(cached), status: 'success' });
            } else {
                set({ status: 'error', error: err.message });
            }
        }
    },

    clearItems: (itemsToRemove) => {
        const idsToRemove = itemsToRemove.map(i => i.id);
        set((state) => ({
            items: state.items.filter(i => !idsToRemove.includes(i.id)),
            data: state.data.filter(i => !idsToRemove.includes(i.id))
        }));
        console.log('[POS_TRACE] bar_cart:clear_items', { count: itemsToRemove.length });
    }
}));
