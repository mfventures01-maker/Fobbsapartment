import { supabase } from "@/lib/supabaseClient";

export async function createPublicOrder(
    businessId: string,
    locationId: string,
    items: any[],
    customerName?: string,
    customerPhone?: string,
    metadata?: any,
    externalReference?: string
) {
    const { data, error } = await supabase.rpc("create_order_gateway", {
        p_source: 'qr',
        p_business_id: businessId,
        p_location_id: locationId,
        p_customer_name: customerName || null,
        p_customer_phone: customerPhone || null,
        p_items: items,
        p_metadata: metadata || {},
        p_external_reference: externalReference
    });

    if (error) throw error;
    return data;
}

export async function createStaffOrder(
    businessId: string,
    locationId: string,
    items: any[],
    metadata?: any,
    externalReference?: string
) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase.rpc("create_order_gateway", {
        p_source: 'staff',
        p_business_id: businessId,
        p_location_id: locationId,
        p_staff_id: user?.id,
        p_items: items,
        p_metadata: metadata || {},
        p_external_reference: externalReference
    });

    if (error) throw error;
    return data;
}
