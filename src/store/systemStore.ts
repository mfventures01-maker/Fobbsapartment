import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

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
    };
    payments: {
        pending_intents: number;
        intents_list: any[];
    };
    open_shifts: number;
    active_terminals: number;
    recent_transactions: any[];
    branch_performance: any[];
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
let refreshInterval: any = null;

export const useSystemStore = create<SystemState>((set, get) => ({
    state: null,
    loading: false,
    lastUpdated: null,
    error: null,

    hydrate: async (businessId: string, locationId?: string) => {
        if (!businessId || isOperationInProgress) return;
        isOperationInProgress = true;

        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase.rpc('get_system_state', {
                p_business_id: businessId,
                p_location_id: locationId
            });

            if (error) throw error;

            if (data) {
                set({
                    state: data as SystemSnapshot,
                    lastUpdated: new Date().toISOString(),
                    loading: false
                });
            }

            // PHASE 5 — STATE DRIFT CORRECTION
            if (!refreshInterval) {
                console.log('[SSOT] Initialized 45s Re-anchor Interval');
                refreshInterval = setInterval(() => {
                    const current = get();
                    if (current.state) {
                        current.refresh(businessId, locationId);
                    }
                }, 45000);
            }

        } catch (error: any) {
            console.error('[EDSS] Rehydration failed:', error);
            set({ error: error.message, loading: false });
        } finally {
            isOperationInProgress = false;
        }
    },

    refresh: async (businessId: string, locationId?: string) => {
        return get().hydrate(businessId, locationId);
    },

    subscribe: (businessId: string, locationId: string) => {
        console.log('[SSOT] Enabling Realtime Sync for Branch:', locationId);

        // Standardizing on 'location_id' for commonality, but 'branch_id' is the DB column for many.
        // Orders uses 'location_id', others use 'branch_id'.

        const channels = [
            supabase.channel(`branch-orders-${locationId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'orders',
                    filter: `location_id=eq.${locationId}`
                }, (payload) => {
                    const current = get().state;
                    if (!current) return;
                    set({
                        state: {
                            ...current,
                            orders: {
                                ...current.orders,
                                today_total: current.orders.today_total + 1,
                                open_orders: current.orders.open_orders + 1
                            }
                        }
                    });
                })
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `location_id=eq.${locationId}`
                }, (payload) => {
                    const current = get().state;
                    if (!current) return;
                    const oldStatus = (payload.old as any)?.status;
                    const newStatus = (payload.new as any)?.status;

                    if (oldStatus !== 'completed' && newStatus === 'completed') {
                        set({
                            state: {
                                ...current,
                                orders: { ...current.orders, open_orders: Math.max(0, current.orders.open_orders - 1) }
                            }
                        });
                    }
                })
                .subscribe(),

            supabase.channel(`branch-tx-${locationId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'transactions',
                    filter: `branch_id=eq.${locationId}`
                }, (payload) => {
                    const current = get().state;
                    if (!current) return;
                    const amount = Number((payload.new as any).amount || 0);
                    set({
                        state: {
                            ...current,
                            revenue: {
                                ...current.revenue,
                                today: current.revenue.today + amount,
                                last_hour: current.revenue.last_hour + amount
                            },
                            recent_transactions: [(payload.new as any), ...current.recent_transactions].slice(0, 50)
                        }
                    });
                })
                .subscribe(),

            supabase.channel(`branch-shifts-${locationId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'shifts',
                    filter: `branch_id=eq.${locationId}`
                }, () => get().refresh(businessId, locationId))
                .subscribe(),

            supabase.channel(`branch-intents-${locationId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'payment_intents',
                    filter: `branch_id=eq.${locationId}`
                }, () => get().refresh(businessId, locationId))
                .subscribe(),

            supabase.channel(`branch-presence-${locationId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'terminal_sessions',
                    filter: `branch_id=eq.${locationId}`
                }, () => get().refresh(businessId, locationId))
                .subscribe()
        ];

        return () => {
            console.log('[SSOT] Disabling Location Sync');
            channels.forEach(channel => channel.unsubscribe());
            if (refreshInterval) {
                clearInterval(refreshInterval);
                refreshInterval = null;
            }
        };
    }
}));
