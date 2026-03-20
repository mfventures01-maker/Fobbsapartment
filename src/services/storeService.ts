import { callRPC } from '../lib/rpcClient';

/**
 * 🧱 STORE TERMINAL SERVICE LAYER
 */

export async function getInventoryLevels(branchId: string) {
    return callRPC<any[]>('store', 'get_inventory_levels', {
        p_branch_id: branchId,
        _idempotency_key: crypto.randomUUID()
    });
}

export async function recordInventoryIn(items: { item_id: string; quantity: number }[], reference?: string) {
    return callRPC<{ success: boolean }>('store', 'record_inventory_in', {
        p_items: items,
        p_reference: reference || null,
        _idempotency_key: crypto.randomUUID()
    });
}

export async function recordInventoryOut(items: { item_id: string; quantity: number }[], reason: string) {
    return callRPC<{ success: boolean }>('store', 'record_inventory_out', {
        p_items: items,
        p_reason: reason,
        _idempotency_key: crypto.randomUUID()
    });
}
