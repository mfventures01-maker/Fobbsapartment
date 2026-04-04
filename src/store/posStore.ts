import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

interface POSState {
    data: any | null;
    version: number;
    status: 'idle' | 'loading' | 'success' | 'error';
    error: string | null;
    fetch: (branchId: string, staffId: string) => Promise<void>;
}

export const usePOSStore = create<POSState>((set) => ({
    data: null,
    version: 0,
    status: 'idle',
    error: null,

    fetch: async (branchId: string, staffId: string) => {
        console.log('[HYDRATION_TRACE] fetch:get_pos_state', { branchId, staffId });
        set({ status: 'loading' });
        try {
            // POS State is the composite system state (Shift, Orders, Revenue)
            const { data: env, error: rpcError } = await supabase.rpc('get_pos_state', {
                p_branch_id: branchId,
                p_staff_id: staffId
            });

            if (rpcError) throw rpcError;

            set({
                data: env.data,
                version: env.version || 0,
                status: 'success',
                error: null
            });
            console.log('[HYDRATION_TRACE] success:get_pos_state', { version: env.version });
        } catch (err: any) {
            console.error('[HYDRATION_TRACE] error:get_pos_state', err);
            set({ status: 'error', error: err.message });
        }
    }
}));
