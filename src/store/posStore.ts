import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

interface POSState {
    status: 'idle' | 'loading' | 'success' | 'error';
    shift: { id: string; version: number } | null;
    revenue: { today: number; shift: number };
    openOrders: number;
    version: number;
    pendingTransactions: any[];
    error: string | null;

    hydrate: (branchId: string, staffId: string) => Promise<void>;
    hydrateFromSnapshot: (snapshot: any) => void;
    createTransactionOptimistic: (tx: { id: string; amount: number }) => void;
    // 🛸 Step 2: New POS deterministic bridge
    applyOptimisticUpdate: (payload: { txId: string; items: any[] }) => void;
    commitTransaction: (result: { txId: string; confirmed: boolean; revenue?: number }) => void;
    rollbackTransaction: (txId: string) => void;
}

export const usePOSStore = create<POSState>((set, get) => ({
    status: 'idle',
    shift: null,
    revenue: { today: 0, shift: 0 },
    openOrders: 0,
    version: 0,
    pendingTransactions: [],
    error: null,

    hydrate: async (branchId: string, staffId: string) => {
        console.log('[HYDRATION_TRACE] pos:hydrate:start', { branchId, staffId });
        set({ status: 'loading' });
        try {
            const { data: shiftData } = await supabase.rpc('resolve_active_shift', { p_branch_id: branchId, p_staff_id: staffId });
            const { data: stateEnv } = await supabase.rpc('get_pos_state', { p_branch_id: branchId, p_staff_id: staffId });

            const payload = {
                status: 'success' as const,
                shift: shiftData ? { id: shiftData.shift_id, version: shiftData.version } : null,
                revenue: { today: stateEnv?.data?.revenue?.today || 0, shift: stateEnv?.data?.revenue?.shift_total || 0 },
                openOrders: stateEnv?.data?.orders?.open_orders || 0,
                version: stateEnv?.version || 1,
                pendingTransactions: [],
                error: null
            };

            localStorage.setItem(`carss_cache_pos_${branchId}`, JSON.stringify(payload));
            set(payload);
        } catch (err: any) {
            const cached = localStorage.getItem(`carss_cache_pos_${branchId}`);
            if (cached) set({ ...JSON.parse(cached), status: 'success' });
            else set({ status: 'error', error: err.message });
        }
    },

    hydrateFromSnapshot: (snapshot: any) => {
        console.log('[HYDRATION_TRACE] pos:snapshot_applied 🧬', { version: snapshot.version });
        const ec = snapshot.execution_context;
        const metrics = snapshot.pos || {};

        if (!ec) {
            console.warn('[HYDRATION_TRACE] LAYER 4: NO_SHIFT (Idle Skip Applied) — Core Mirror Synchronized.');
        }

        set({
            status: 'success',
            shift: ec ? { id: ec.shift_id, version: ec.version } : null,
            revenue: {
                today: metrics.today_revenue || 0,
                shift: metrics.today_revenue || 0
            },
            openOrders: metrics.open_orders || 0,
            version: snapshot.version,
            pendingTransactions: []
        });
    },

    applyOptimisticUpdateByTxId: (txId: string, amount: number) => {
        set((state) => ({
            revenue: { ...state.revenue, shift: state.revenue.shift + amount },
            openOrders: state.openOrders + 1,
        }));
    },

    applyOptimisticUpdate: (payload) => {
        const totalAmount = payload.items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        console.log('[POS_TRACE] txId', payload.txId, 'optimistic:bridge_applied', totalAmount);
        set((state) => ({
            pendingTransactions: [...state.pendingTransactions, { id: payload.txId, amount: totalAmount, items: payload.items }],
            revenue: {
                ...state.revenue,
                shift: state.revenue.shift + totalAmount,
                today: state.revenue.today + totalAmount,
            },
            openOrders: state.openOrders + 1,
        }));
    },

    createTransactionOptimistic: (tx) => {
        set((state) => ({
            pendingTransactions: [...state.pendingTransactions, tx],
            revenue: {
                ...state.revenue,
                shift: state.revenue.shift + tx.amount,
                today: state.revenue.today + tx.amount,
            },
            openOrders: state.openOrders + 1,
        }));
    },

    commitTransaction: (result) => {
        console.log('[POS_TRACE] txId', result.txId, 'confirmed:SUCCESS');
        set((state) => {
            const tx = state.pendingTransactions.find(t => t.id === result.txId);
            if (!tx) return state;
            return {
                pendingTransactions: state.pendingTransactions.filter(t => t.id !== result.txId),
                revenue: result.revenue ? { ...state.revenue, shift: result.revenue } : state.revenue,
            };
        });
    },

    rollbackTransaction: (txId) => {
        console.warn('[POS_TRACE] txId', txId, 'rollback:COMMITTING');
        set((state) => {
            const tx = state.pendingTransactions.find(t => t.id === txId);
            if (!tx) return state;
            return {
                pendingTransactions: state.pendingTransactions.filter(t => t.id !== txId),
                revenue: {
                    shift: state.revenue.shift - tx.amount,
                    today: state.revenue.today - tx.amount,
                },
                openOrders: Math.max(0, state.openOrders - 1),
            };
        });
    }
}));
