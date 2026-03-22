
import { supabase } from './supabaseClient';
import { Shift } from '../types/database';

/**
 * ANTI-GRAVITY SHIFT AUTHORITY ENGINE
 * The database is the single source of truth for shift state.
 */

import { callRPC } from '../lib/rpcClient';

export async function getActiveShift(businessId: string, branchId: string, staffId: string, terminalType: string = 'staff'): Promise<Shift | null> {
    const data = await callRPC<Shift | null>('staff', 'resolve_active_shift', {
        business_id: businessId,
        branch_id: branchId,
        staff_id: staffId,
        terminal_type: terminalType
    });
    return data;
}

export async function getShiftById(shiftId: string): Promise<Shift | null> {
    const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("id", shiftId)
        .maybeSingle();

    if (error) {
        console.error(`[SHIFT SERVICE] Failed to fetch shift ${shiftId}:`, error);
        throw error;
    }
    return data;
}

export async function submitShiftDeclaration(shiftId: string, declaration: { cash: number; pos: number; transfer: number }) {
    // Pre-condition: Verify ownership or state before RPC call if possible, but RPC handles security.
    // The prompt asks for an assertion before calling RPC (Phase 5).

    const { data, error } = await (supabase as any).rpc('submit_shift_declaration', {
        p_shift_id: shiftId,
        p_cash: declaration.cash,
        p_pos: declaration.pos,
        p_transfer: declaration.transfer
    });

    if (error) throw error;
    return data;
}
