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
    const idemKey = externalReference || crypto.randomUUID();

    const { data, error } = await supabase.rpc("create_public_order", {
        p_business_id: businessId,
        p_location_id: locationId,
        p_items: items,
        p_customer_name: customerName || null,
        p_customer_phone: customerPhone || null,
        p_metadata: metadata || {},
        p_external_reference: idemKey
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
    const idemKey = externalReference || crypto.randomUUID();

    const { data, error } = await supabase.rpc("create_staff_order", {
        p_business_id: businessId,
        p_location_id: locationId,
        p_items: items,
        p_metadata: metadata || {},
        p_external_reference: idemKey
    });

    if (error) throw error;
    return data;
}
