import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

interface RoomBookingState {
    data: any[];
    version: number;
    status: 'idle' | 'loading' | 'success' | 'error';
    error: string | null;
    hydrate: (branchId: string) => Promise<void>;
}

export const useRoomBookingStore = create<RoomBookingState>((set, get) => ({
    data: [],
    version: 0,
    status: 'idle',
    error: null,

    hydrate: async (branchId: string) => {
        if (get().status === 'loading') return;
        console.log('[HYDRATION_TRACE] room_booking:hydrate:start', { branchId });
        set({ status: 'loading' });
        try {
            const { data: env, error: rpcError } = await supabase.rpc('get_room_bookings', { p_branch_id: branchId });
            if (rpcError) throw rpcError;

            const payload = {
                data: env.data || [],
                version: env.version || 0,
                status: 'success' as const,
                error: null
            };

            localStorage.setItem(`carss_cache_room_${branchId}`, JSON.stringify(payload));
            set(payload);
            console.log('[HYDRATION_TRACE] room_booking:hydrate:SUCCESS', { version: env.version });
        } catch (err: any) {
            console.warn('[HYDRATION_TRACE] room_booking:hydrate:RPC_FAILURE — Fallback active', err);
            const cached = localStorage.getItem(`carss_cache_room_${branchId}`);
            if (cached) {
                set({ ...JSON.parse(cached), status: 'success' });
            } else {
                set({ status: 'error', error: err.message });
            }
        }
    }
}));
