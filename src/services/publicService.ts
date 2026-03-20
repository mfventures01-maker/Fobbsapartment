import { callRPC } from '../lib/rpcClient';

/**
 * 🧱 PUBLIC TERMINAL SERVICE LAYER - ANTI-GRAVITY ALIGNED
 */

export async function createPublicOrder(
    businessId: string,
    locationId: string,
    cart: any[],
    customerName?: string,
    customerPhone?: string,
    tableId?: string,
    metadata?: any
) {
    try {
        const data = await callRPC<{ order_id: string; total: number }>('public', 'create_qr_order_gateway', {
            p_org_id: businessId,
            p_location_id: locationId,
            p_customer_name: customerName || null,
            p_customer_phone: customerPhone || null,
            p_cart: cart,
            p_table_id: tableId || null,
            p_metadata: metadata || {},
            _idempotency_key: crypto.randomUUID()
        });
        return { success: true, ...data };
    } catch (err: any) {
        console.error('[PUBLIC SERVICE] Order Error:', err.message);
        return { success: false, error: err.message };
    }
}

export async function createPublicPaymentIntent(orderId: string, paymentMethod: string) {
    const data = await callRPC<{ success: boolean }>('public', 'create_payment_intent', {
        p_order_id: orderId,
        p_payment_method: paymentMethod,
        _idempotency_key: crypto.randomUUID()
    });
    return { ...data };
}

export async function getPublicOrderStatus(orderId: string) {
    const data = await callRPC<any>('public', 'get_order_status', {
        p_order_id: orderId,
        _idempotency_key: crypto.randomUUID()
    });
    return { ...data };
}
