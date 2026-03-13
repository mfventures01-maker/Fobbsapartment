import { supabase } from "@/lib/supabaseClient";

export async function requestShift(businessId: string, locationId: string) {
    console.log("[SHIFT SERVICE] Initiating deterministic identity resolution...");

    // 1. Resolve Authenticated User (Hard Guard)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated. Shift creation aborted.");
    }

    // 2. Resolve Staff Profile (Operational Identity Mapping)
    const { data: staff, error: staffError } = await supabase
        .from("staff_profiles")
        .select("id, role, full_name")
        .eq("user_id", user.id)
        .single();

    if (staffError || !staff) {
        console.error("[SHIFT SERVICE] Staff identity resolution failed:", staffError);
        throw new Error("Staff profile not found. Shift creation aborted.");
    }

    const staff_id = staff.id;
    console.log("[SHIFT SERVICE] Resolved staff identity:", staff_id);

    // 3. Create Shift with Deterministic Payload
    const { data, error } = await supabase
        .from("shifts")
        .insert({
            staff_id: staff_id,
            business_id: businessId,
            branch_id: locationId,
            status: "requested",
            start_time: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        console.error("[SHIFT SERVICE] Database rejection during shift creation:", error);
        throw error;
    }

    return { success: true, data };
}

export async function endShift() {
    const { data, error } = await supabase.rpc("end_shift");
    if (error) throw error;
    return data;
}

export async function submitDeclaration(cash: number, pos: number, transfer: number, shiftId: string) {
    const { data, error } = await supabase.rpc("submit_shift_declaration", {
        p_shift_id: shiftId,
        p_cash: cash,
        p_pos: pos,
        p_transfer: transfer
    });
    if (error) throw error;
    return data;
}

export async function approveShift(shiftId: string) {
    const { data, error } = await supabase.rpc("approve_shift_close", {
        p_shift_id: shiftId
    });
    if (error) throw error;
    return data;
}

export async function approveShiftOpen(shiftId: string) {
    const { data, error } = await supabase.rpc("approve_shift_open", {
        p_shift_id: shiftId
    });
    if (error) throw error;
    return data;
}
