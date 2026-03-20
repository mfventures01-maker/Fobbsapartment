import { callRPC } from '../lib/rpcClient';

/**
 * Public terminal: QR order creation — stateless, no auth required.
 * Staff terminal: POS/table order creation — requires active shift.
 * Firewall enforces the terminal boundary on both routes.
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
            p_metadata: metadata || {}
        });
        return { success: true, order_id: data.order_id };
    } catch (err: any) {
        console.error('[ORDER SERVICE] QR Order RPC Error:', err.message);
        return { success: false, error: err.message };
    }
}

export async function createStaffOrder(
    businessId: string,
    locationId: string,
    staffId: string,
    items: any[],
    metadata?: any,
    externalReference?: string
) {
    return callRPC<{ order_id: string; status: string }>('staff', 'universal_order_gateway', {
        p_source: 'staff',
        p_business_id: businessId,
        p_location_id: locationId,
        p_staff_id: staffId,
        p_items: items,
        p_metadata: metadata || {},
        p_external_reference: externalReference
    });
}
