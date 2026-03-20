import { create } from 'zustand';
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
    ceo_snapshot?: any;
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
    error: null,

    hydrate: async (businessId: string, locationId?: string) => {
        if (!businessId || isOperationInProgress) return;

        isOperationInProgress = true;
        set({ loading: !get().state, error: null }); // Only show loader if we have no state

        try {
            // ✅ Step 1: DRIFT ZERO Protocol — Authoritative RPC only
            const data = await callRPC<SystemSnapshot>('staff', 'get_system_state', {
                p_business_id: businessId,
                p_location_id: locationId,
                _idempotency_key: crypto.randomUUID()
            });

            if (data) {
                set({
                    state: data as SystemSnapshot,
                    lastUpdated: new Date().toISOString(),
                    loading: false
                });
            }
        } catch (error: any) {
            console.error('[SYSTEM STORE] Refresh failed:', error);
            set({ error: error.message, loading: false });
        } finally {
            isOperationInProgress = false;
        }
    },

    refresh: async (businessId: string, locationId?: string) => {
        return get().hydrate(businessId, locationId);
    },

    subscribe: (_businessId: string, locationId: string) => {
        // 🚫 Step 1: REALTIME DISABLED - DRIFT ZERO MODE
        console.warn(`[ANTI-GRAVITY] Realtime subscription for ${locationId} blocked. Polling heartbeat is active.`);
        return () => { }; // Return no-op cleanup
    }
}));
