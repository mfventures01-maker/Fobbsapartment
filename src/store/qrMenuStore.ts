import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

interface QRMenuState {
    data: any[];
    items: any[]; // Alias for data used in PR logic
    version: number;
    status: 'idle' | 'loading' | 'success' | 'error';
    error: string | null;
    optimisticUpdates: any[];
    fetch: (branchId: string) => Promise<void>;
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

    fetch: async (branchId: string) => {
        if (get().status === 'loading') return;
        console.log('[HYDRATION_TRACE] fetch:get_qr_menu', { branchId });
        set({ status: 'loading', error: null });
        try {
            // Standardized envelope: { data, version, error }
            const { data: env, error: rpcError } = await supabase.rpc('get_qr_menu', { p_branch_id: branchId });

            if (rpcError) throw rpcError;

            set({
                data: env.data || [],
                items: env.data || [],
                version: env.version || 1,
                status: 'success',
                error: null,
                optimisticUpdates: [], // Clear on successful sync
            });
            console.log('[HYDRATION_TRACE] success:get_qr_menu', { version: env.version });
        } catch (err: any) {
            console.error('[HYDRATION_TRACE] error:get_qr_menu', err);
            set({ status: 'error', error: err.message, items: [], version: 0 });
        }
    },

    applyOptimisticUpdate: (update) => {
        console.log('[HYDRATION_TRACE] qr_menu:apply_optimistic', update);
        set((state) => ({
            items: [...state.items, update.item],
            data: [...state.data, update.item],
            optimisticUpdates: [...state.optimisticUpdates, update],
        }));
    },

    rollbackOptimisticUpdate: (updateId: string) => {
        console.warn('[HYDRATION_TRACE] qr_menu:rollback_optimistic', updateId);
        set((state) => ({
            items: state.items.filter((i) => i.id !== updateId),
            data: state.data.filter((i) => i.id !== updateId),
            optimisticUpdates: state.optimisticUpdates.filter((u) => (u as any).id !== updateId),
        }));
    }
}));
