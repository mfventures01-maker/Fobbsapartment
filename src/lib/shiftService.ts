
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
    // 🛡️ ANTI-GRAVITY REFACTOR: No direct .rpc calls outside rpcClient.ts
    const data = await callRPC<any>('staff', 'submit_shift_declaration', {
        p_shift_id: shiftId,
        p_declaration_amount: (declaration.cash || 0) + (declaration.pos || 0) + (declaration.transfer || 0), // Normalized payload
        p_metadata: declaration
    });
    return data;
}
