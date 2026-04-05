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

    fetch: (branchId: string, staffId: string) => Promise<void>;
    createTransactionOptimistic: (tx: { id: string; amount: number }) => void;
    confirmTransaction: (txId: string, backendVersion: number) => void;
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

    fetch: async (branchId: string, staffId: string) => {
        console.log('[HYDRATION_TRACE] fetch:pos_deterministic', { branchId, staffId });
        set({ status: 'loading' });
        try {
            // Step A: Resolve Shift Identity
            const { data: shiftData, error: shiftError } = await supabase.rpc('resolve_active_shift', {
                p_branch_id: branchId,
                p_staff_id: staffId
            });
            if (shiftError) throw shiftError;

            // Step B: Resolve Full System State (Standardized Envelope)
            // We use get_pos_state as a shorthand for the envelope-wrapped system state
            const { data: stateEnv, error: rpcError } = await supabase.rpc('get_pos_state', {
                p_branch_id: branchId,
                p_staff_id: staffId
            });
            if (rpcError) throw rpcError;

            const stateData = stateEnv.data;

            set({
                status: 'success',
                shift: shiftData ? { id: shiftData.shift_id, version: shiftData.version } : null,
                revenue: {
                    today: stateData?.revenue?.today || 0,
                    shift: stateData?.revenue?.shift_total || 0
                },
                openOrders: stateData?.orders?.open_orders || 0,
                version: stateEnv.version || 1,
                pendingTransactions: [],
                error: null
            });
            console.log('[HYDRATION_TRACE] success:pos_deterministic', { version: stateEnv.version });
        } catch (err: any) {
            console.error('[HYDRATION_TRACE] error:pos_deterministic', err);
            set({ status: 'error', error: err.message });
        }
    },

    createTransactionOptimistic: (tx) => {
        console.log('[POS_TRACE] txId', tx.id, 'optimistic:creating', tx.amount);
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

    confirmTransaction: (txId: string, backendVersion: number) => {
        console.log('[POS_TRACE] txId', txId, 'confirmed:version', backendVersion);
        set((state) => ({
            pendingTransactions: state.pendingTransactions.filter(t => t.id !== txId),
            version: backendVersion,
        }));
    },

    rollbackTransaction: (txId: string) => {
        console.warn('[POS_TRACE] txId', txId, 'rollback:failed');
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
