import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

interface QRMenuState {
    data: any[];
    version: number;
    status: 'idle' | 'loading' | 'success' | 'error';
    error: string | null;
    fetch: (branchId: string) => Promise<void>;
}

export const useQRMenuStore = create<QRMenuState>((set) => ({
    data: [],
    version: 0,
    status: 'idle',
    error: null,

    fetch: async (branchId: string) => {
        console.log('[HYDRATION_TRACE] fetch:get_qr_menu', { branchId });
        set({ status: 'loading' });
        try {
            const { data: env, error: rpcError } = await supabase.rpc('get_qr_menu', { p_branch_id: branchId });

            if (rpcError) throw rpcError;

            set({
                data: env.data || [],
                version: env.version || 0,
                status: 'success',
                error: null
            });
            console.log('[HYDRATION_TRACE] success:get_qr_menu', { version: env.version });
        } catch (err: any) {
            console.error('[HYDRATION_TRACE] error:get_qr_menu', err);
            set({ status: 'error', error: err.message });
        }
    }
}));
