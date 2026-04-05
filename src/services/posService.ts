import { usePOSStore } from '../store/posStore';
import { useBarCartStore } from '../store/barCartStore';
import { supabase } from '../lib/supabaseClient';

/**
 * 🛸 ANTI-GRAVITY POS SERVICE
 * Deterministically orchestrates the migration of items from the Bar Cart to the POS ledger.
 */

// Step 1: Grab Items from Bar Cart Deterministically
export const barCartToPos = async (staffId: string, branchId: string) => {
    const barItems = useBarCartStore.getState().items;
    if (!barItems.length) return { success: false, message: 'No items in bar cart' };

    // Generate temporary txId for optimistic tracking
    const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    console.log('[POS_TRACE] barCartToPos:INITIATING', { txId, count: barItems.length });

    usePOSStore.getState().applyOptimisticUpdate({ txId, items: barItems });

    return { success: true, txId, items: barItems };
};

// Step 2: Create Optimistic Transaction in POS
export const commitBarCartTransaction = async (txId: string, items: any[], staffId: string, branchId: string) => {
    try {
        console.log('[POS_TRACE] commitBarCartTransaction:BACKEND_CONFIRM_START', { txId });

        // Optimistic update already applied; now confirm with backend RPC
        // Note: The RPC name 'confirmTransaction' must match the database function
        const { data: env, error: rpcError } = await supabase.rpc('confirm_transaction', {
            p_tx_id: txId,
            p_staff_id: staffId,
            p_branch_id: branchId,
            p_items: items,
        });

        if (rpcError) throw rpcError;

        // Forensic commit: update POS slice with confirmed revenue/order totals
        usePOSStore.getState().commitTransaction({
            txId,
            confirmed: true,
            revenue: env.revenue_total // RPC should return computed total
        });

        // Step 3: Clear Bar Cart only after successful POS commit
        useBarCartStore.getState().clearItems(items);

        console.log('[POS_TRACE] commitBarCartTransaction:SUCCESS', { txId });
        return { success: true, data: env };
    } catch (err: any) {
        // Rollback on backend rejection
        usePOSStore.getState().rollbackTransaction(txId);
        console.error('[POS_TRACE] Transaction rollback:FAILURE', { txId, error: err.message });
        return { success: false, error: err.message };
    }
};

// Step 3: Execute Full Flow
export const moveBarCartToPOS = async (staffId: string, branchId: string) => {
    const { success, txId, items } = await barCartToPos(staffId, branchId);
    if (!success) return { success: false, message: 'No items to process' };

    return await commitBarCartTransaction(txId!, items!, staffId, branchId);
};
