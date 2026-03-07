import { supabase } from "@/lib/supabaseClient";

export async function getInventory(businessId: string, branchId: string) {
    const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("business_id", businessId)
        .eq("branch_id", branchId);

    if (error) throw error;
    return data;
}

export async function restockInventory(_inventoryId: string, _amount: number) {
    // Assuming a direct table update or an RPC in the future
    // For now we'll just throw if they try to do a raw access
    throw new Error("Direct inventory mutation disabled. Use proper RPC if needed.");
}
