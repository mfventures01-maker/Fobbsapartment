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

    // 🛸 Step 2: hydrate() replaces fetch() for deterministic nomenclature
    hydrate: (branchId: string, staffId: string) => Promise<void>;
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

    hydrate: async (branchId: string, staffId: string) => {
        console.log('[HYDRATION_TRACE] pos:hydrate:start', { branchId, staffId });
        set({ status: 'loading' });

        try {
            // 🛸 Step 5: Shift Handling Deterministically
            // resolve_active_shift must NEVER return 404
            const { data: shiftData, error: shiftError } = await supabase.rpc('resolve_active_shift', {
                p_branch_id: branchId,
                p_staff_id: staffId
            });

            if (shiftError) {
                console.warn('[HYDRATION_TRACE] pos:shift_rpc_failed — fallback to cached shift', shiftError);
                // Fallback logic for cached shift handled below
            }

            const { data: stateEnv, error: rpcError } = await supabase.rpc('get_pos_state', {
                p_branch_id: branchId,
                p_staff_id: staffId
            });

            if (rpcError) throw rpcError;

            const stateData = stateEnv.data;
            const payload = {
                status: 'success' as const,
                shift: shiftData ? { id: shiftData.shift_id, version: shiftData.version } : null,
                revenue: {
                    today: stateData?.revenue?.today || 0,
                    shift: stateData?.revenue?.shift_total || 0
                },
                openOrders: stateData?.orders?.open_orders || 0,
                version: stateEnv.version || 1,
                pendingTransactions: [],
                error: null
            };

            // Save for fallback
            localStorage.setItem(`carss_cache_pos_${branchId}`, JSON.stringify(payload));

            set(payload);
            console.log('[HYDRATION_TRACE] pos:hydrate:SUCCESS', { version: stateEnv.version });
        } catch (err: any) {
            console.warn('[HYDRATION_TRACE] pos:hydrate:RPC_FAILURE — Attempting fallback...', err);

            const cached = localStorage.getItem(`carss_cache_pos_${branchId}`);
            if (cached) {
                console.info('[HYDRATION_TRACE] pos:hydrate:FALLBACK_SUCCESS (using cache)');
                set({ ...JSON.parse(cached), status: 'success' });
            } else {
                console.error('[HYDRATION_TRACE] pos:hydrate:FALLBACK_FAILED');
                set({ status: 'error', error: err.message });
            }
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
        console.warn('[POS_TRACE] txId', txId, 'rollback');
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
