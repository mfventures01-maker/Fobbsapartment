import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

interface BarCartState {
    data: any[];
    version: number;
    status: 'idle' | 'loading' | 'success' | 'error';
    error: string | null;
    hydrate: (branchId: string) => Promise<void>;
}

export const useBarCartStore = create<BarCartState>((set, get) => ({
    data: [],
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
    }
}));
