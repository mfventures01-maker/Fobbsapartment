import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

interface RoomBookingState {
    data: any[];
    version: number;
    status: 'idle' | 'loading' | 'success' | 'error';
    error: string | null;
    fetch: (branchId: string) => Promise<void>;
}

export const useRoomBookingStore = create<RoomBookingState>((set) => ({
    data: [],
    version: 0,
    status: 'idle',
    error: null,

    fetch: async (branchId: string) => {
        console.log('[HYDRATION_TRACE] fetch:get_room_bookings', { branchId });
        set({ status: 'loading' });
        try {
            const { data: env, error: rpcError } = await supabase.rpc('get_room_bookings', { p_branch_id: branchId });

            if (rpcError) throw rpcError;

            set({
                data: env.data || [],
                version: env.version || 0,
                status: 'success',
                error: null
            });
            console.log('[HYDRATION_TRACE] success:get_room_bookings', { version: env.version });
        } catch (err: any) {
            console.error('[HYDRATION_TRACE] error:get_room_bookings', err);
            set({ status: 'error', error: err.message });
        }
    }
}));
