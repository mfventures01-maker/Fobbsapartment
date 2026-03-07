import { supabase } from "@/lib/supabaseClient";

export async function createOrderGateway(
    items: any[],
    source: string,
    businessId: string,
    locationId: string,
    staffId?: string,
    tableId?: string,
    customerName?: string,
    customerPhone?: string,
    metadata?: any
) {
    const { data, error } = await supabase.rpc("create_order_gateway", {
        p_items: items,
        p_source: source,
        p_business_id: businessId,
        p_location_id: locationId,
        p_staff_id: staffId || null,
        p_table_id: tableId || null,
        p_customer_name: customerName || null,
        p_customer_phone: customerPhone || null,
        p_metadata: metadata || {}
    });

    if (error) throw error;

    return data;
}
