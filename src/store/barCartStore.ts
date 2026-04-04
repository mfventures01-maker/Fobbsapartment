import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

interface BarCartState {
    data: any[];
    version: number;
    status: 'idle' | 'loading' | 'success' | 'error';
    error: string | null;
    fetch: (branchId: string) => Promise<void>;
}

export const useBarCartStore = create<BarCartState>((set) => ({
    data: [],
    version: 0,
    status: 'idle',
    error: null,

    fetch: async (branchId: string) => {
        console.log('[HYDRATION_TRACE] fetch:get_bar_cart', { branchId });
        set({ status: 'loading' });
        try {
            // Local carts are often hydrated from sessionStorage, 
            // but we use this RPC handle to verify active cart boundaries
            const { data: env, error: rpcError } = await supabase.rpc('get_bar_cart', { p_branch_id: branchId });

            if (rpcError) throw rpcError;

            set({
                data: env.data || [],
                version: env.version || 0,
                status: 'success',
                error: null
            });
            console.log('[HYDRATION_TRACE] success:get_bar_cart', { version: env.version });
        } catch (err: any) {
            console.error('[HYDRATION_TRACE] error:get_bar_cart', err);
            set({ status: 'error', error: err.message });
        }
    }
}));
