import { callRPC } from '../lib/rpcClient';

/**
 * 🧱 KITCHEN TERMINAL SERVICE LAYER
 * Isolation enforced by callRPC('kitchen', ...)
 */

export async function getKitchenSnapshot(locationId: string) {
    return callRPC<{ tickets: any[], server_time: string }>('kitchen', 'get_kitchen_snapshot', {
        p_location_id: locationId,
        _idempotency_key: crypto.randomUUID()
    });
}

export async function updatePreparationStatus(orderId: string, newStatus: string) {
    return callRPC<{ success: boolean }>('kitchen', 'update_preparation_status', {
        p_order_id: orderId,
        p_new_status: newStatus,
        _idempotency_key: crypto.randomUUID()
    });
}
