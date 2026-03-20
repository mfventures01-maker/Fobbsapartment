import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient'; // retained for realtime channel subscriptions ONLY
import { callRPC } from '../lib/rpcClient';

export interface SystemSnapshot {
    shift: {
        id: string;
        status: string;
        staff_id: string;
        started_at: string;
    } | null;
    orders: {
        open_orders: number;
        pending_payment: number;
        today_total: number;
    };
    revenue: {
        today: number;
        last_hour: number;
        shift_total: number;
        shift_cash: number;
        shift_pos: number;
        shift_transfer: number;
    };
    payments: {
        pending_intents: number;
        intents_list: any[];
    };
    open_shifts: number;
    active_terminals: number;
    active_terminal_list: any[];
    recent_transactions: any[];
    branch_performance: any[];
    inventory_alerts: {
        id: string;
        name: string;
        current_stock: number;
        min_stock: number;
        category: string;
    }[];
    alerts: any[];
    timestamp: string;
}

export interface SystemState {
    state: SystemSnapshot | null;
    loading: boolean;
    lastUpdated: string | null;
    lastRealtimeEvent: number;
    error: string | null;

    hydrate: (businessId: string, locationId?: string) => Promise<void>;
    refresh: (businessId: string, locationId?: string) => Promise<void>;
    subscribe: (businessId: string, locationId: string) => () => void;
}

let isOperationInProgress = false;

export const useSystemStore = create<SystemState>((set, get) => ({
    state: null,
    loading: false,
    lastUpdated: null,
    lastRealtimeEvent: Date.now(),
    error: null,

    hydrate: async (businessId: string, locationId?: string) => {
        if (!businessId || isOperationInProgress) return;

        // --- REALTIME SAFETY LAYER (10-Minute Reconciliation) ---
        const now = Date.now();
        const lastEvent = get().lastRealtimeEvent;
        const tenMinutes = 10 * 60 * 1000;

        // If we are already hydrated and had a recent event, skip redundant RPC
        if (get().state && (now - lastEvent < tenMinutes)) {
            return;
        }

        isOperationInProgress = true;
        set({ loading: true, error: null });

        try {
            const data = await callRPC<SystemSnapshot>('staff', 'get_system_state', {
                p_business_id: businessId,
                p_location_id: locationId,
                _idempotency_key: crypto.randomUUID()
            });

            if (data) {
                set({
                    state: data as SystemSnapshot,
                    lastUpdated: new Date().toISOString(),
                    lastRealtimeEvent: Date.now(),
                    loading: false
                });
            }
        } catch (error: any) {
            console.error('[SYSTEM STORE] Rehydration failed:', error);
            set({ error: error.message, loading: false });
        } finally {
            isOperationInProgress = false;
        }
    },

    refresh: async (businessId: string, locationId?: string) => {
        set({ lastRealtimeEvent: Date.now() });
        return get().hydrate(businessId, locationId);
    },

    subscribe: (businessId: string, locationId: string) => {
        console.log('[SSOT] Enabling Realtime Sync for Branch:', locationId);

        const channel = supabase.channel(`branch-operational-sync-${locationId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `location_id=eq.${locationId}`
            }, () => get().refresh(businessId, locationId))
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'transactions',
                filter: `branch_id=eq.${locationId}`
            }, () => get().refresh(businessId, locationId))
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'shifts',
                filter: `branch_id=eq.${locationId}`
            }, () => get().refresh(businessId, locationId))
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'payment_intents',
                filter: `branch_id=eq.${locationId}`
            }, () => get().refresh(businessId, locationId))
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'terminal_sessions',
                filter: `branch_id=eq.${locationId}`
            }, () => get().refresh(businessId, locationId))
            .subscribe();

        return () => {
            console.log('[SSOT] Disabling Location Sync');
            supabase.removeChannel(channel);
        };
    }
}));
