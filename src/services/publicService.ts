import { callRPC } from '../lib/rpcClient';

/**
 * 🧱 PUBLIC TERMINAL SERVICE LAYER — ANTI-GRAVITY DETERMINISTIC
 *
 * ⚠️ RULE: These functions do NOT generate idempotency keys.
 * The KEY must be created ONCE by the calling component (useRef / useIdempotentMutation)
 * and passed in via the payload. This enforces single-origin key generation.
 */

export async function createPublicOrder(
    businessId: string,
    locationId: string,
    cart: any[],
    customerName?: string,
    customerPhone?: string,
    tableId?: string | null,
    metadata?: any,
    idempotencyKey?: string          // ← Caller provides the key
) {
    try {
        const payload = {
            p_idempotency_key: idempotencyKey || crypto.randomUUID(),
            p_org_id: businessId,
            p_branch_id: locationId,
            p_business_id: businessId,
            p_cart: cart,
            p_customer_name: customerName || null,
            p_customer_phone: customerPhone || null,
            p_table_id: tableId || null,
            p_terminal_type: 'public',
            p_shift_id: null,
            p_staff_id: null,
            p_metadata: metadata || {}
        };
        const data = await callRPC<{ order_id: string; total: number }>('public', 'create_qr_order_gateway', payload);
        return { success: true, ...data };
    } catch (err: any) {
        console.error('[PUBLIC SERVICE] Order Error:', err.message);
        return { success: false, error: err.message };
    }
}

export async function createPublicPaymentIntent(
    orderId: string,
    paymentMethod: string,
    idempotencyKey?: string           // ← Caller provides the key
) {
    const data = await callRPC<{ success: boolean }>('public', 'create_payment_intent', {
        p_order_id: orderId,
        p_payment_method: paymentMethod,
        _idempotency_key: idempotencyKey
    });
    return { ...data };
}

export async function getPublicOrderStatus(orderId: string) {
    // READ-ONLY — no idempotency key needed
    const data = await callRPC<any>('public', 'get_order_status', {
        p_order_id: orderId
    });
    return { ...data };
}
