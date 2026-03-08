import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

export interface SystemState {
    active_shift: any | null;
    pending_orders_count: number;
    pending_payments_count: number;
    recent_transactions: any[];
    pending_intents: any[];
    revenue_today: number;
    revenue_hour: number;
    timestamp: string | null;
    status: 'idle' | 'loading' | 'synced' | 'error';
    error: string | null;

    hydrate: (businessId: string) => Promise<void>;
}

export const useSystemStore = create<SystemState>((set) => ({
    active_shift: null,
    pending_orders_count: 0,
    pending_payments_count: 0,
    recent_transactions: [],
    pending_intents: [],
    revenue_today: 0,
    revenue_hour: 0,
    timestamp: null,
    status: 'idle',
    error: null,

    hydrate: async (businessId: string) => {
        if (!businessId) return;
        set({ status: 'loading', error: null });
        try {
            console.log('[EDSS] Rehydrating system state from canonical DB...');
            const { data, error } = await supabase.rpc('get_system_state', {
                p_business_id: businessId
            });

            if (error) throw error;

            if (data) {
                set({
                    active_shift: data.active_shift,
                    pending_orders_count: data.pending_orders_count,
                    pending_payments_count: data.pending_payments_count,
                    recent_transactions: data.recent_transactions,
                    pending_intents: data.pending_intents,
                    revenue_today: data.revenue_today,
                    revenue_hour: data.revenue_hour,
                    timestamp: data.timestamp,
                    status: 'synced'
                });
            }
        } catch (error: any) {
            console.error('[EDSS] Rehydration failed:', error);
            set({ status: 'error', error: error.message });
        }
    }
}));
