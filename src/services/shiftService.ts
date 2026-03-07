import { supabase } from "@/lib/supabaseClient";

export async function requestShift() {
    const { data, error } = await supabase.rpc("request_shift");
    if (error) throw error;
    return data;
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
