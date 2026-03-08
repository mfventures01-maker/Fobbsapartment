import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { SHIFT_STATUS } from '../constants/shiftStatus';

export interface SystemState {
    active_shift: any | null;
    pending_orders_count: number;
    pending_payments_count: number;
    recent_transactions: any[];
    timestamp: string | null;
    status: 'idle' | 'loading' | 'synced' | 'error';
    error: string | null;

    // Actions
    hydrate: (businessId: string) => Promise<void>;
    setupTelemetry: (businessId: string) => void;
    shutdownTelemetry: () => void;
}

// Keep a reference to the active channel to unsubscribe later
let channelInstance: any = null;
let pollInterval: any = null;

export const useSystemStore = create<SystemState>((set, get) => ({
    active_shift: null,
    pending_orders_count: 0,
    pending_payments_count: 0,
    recent_transactions: [],
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

            // Expected data structure from the new RPC
            if (data) {
                set({
                    active_shift: data.active_shift,
                    pending_orders_count: data.pending_orders_count,
                    pending_payments_count: data.pending_payments_count,
                    recent_transactions: data.recent_transactions,
                    timestamp: data.timestamp,
                    status: 'synced'
                });
            }
        } catch (error: any) {
            console.error('[EDSS] Rehydration failed:', error);
            set({ status: 'error', error: error.message });
        }
    },

    setupTelemetry: (businessId: string) => {
        const { hydrate, shutdownTelemetry } = get();

        // Prevent duplicate setups
        shutdownTelemetry();

        console.log('[EDSS] Connecting Realtime Observability Layer...');

        channelInstance = supabase.channel('carss-global-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => {
                console.log('[EDSS] Auth-Shift State Change Detected');
                hydrate(businessId);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                console.log('[EDSS] Order State Change Detected');
                hydrate(businessId);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_intents' }, () => {
                console.log('[EDSS] Payment Intent State Change Detected');
                hydrate(businessId);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
                console.log('[EDSS] Transaction Generated');
                hydrate(businessId);
            })
            .subscribe((status) => {
                console.log('[EDSS] Supabase Sync Status:', status);
            });

        // Resilience: 20s Polling Hook
        pollInterval = setInterval(() => {
            console.log('[EDSS] Enforcing periodic sync verification (20s)');
            hydrate(businessId);
        }, 20000);
    },

    shutdownTelemetry: () => {
        if (channelInstance) {
            console.log('[EDSS] Dismantling Observability Layer');
            supabase.removeChannel(channelInstance);
            channelInstance = null;
        }
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    }
}));
