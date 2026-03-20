import { callRPC } from '../lib/rpcClient';

/**
 * Staff terminal shift operations.
 * All calls MUST pass terminal: 'staff'. Firewall enforces this.
 */

export async function endShift() {
    return callRPC<{ success: boolean }>('staff', 'end_shift', {});
}

export async function submitDeclaration(cash: number, pos: number, transfer: number, shiftId: string) {
    return callRPC<{ success: boolean }>('staff', 'submit_shift_declaration', {
        p_shift_id: shiftId,
        p_cash: cash,
        p_pos: pos,
        p_transfer: transfer
    });
}

/**
 * Manager terminal shift approval operations.
 * All calls MUST pass terminal: 'manager'. Firewall enforces this.
 */

export async function approveShift(shiftId: string) {
    return callRPC<{ success: boolean }>('manager', 'approve_shift_close', {
        p_shift_id: shiftId
    });
}

export async function approveShiftOpen(shiftId: string) {
    return callRPC<{ success: boolean }>('manager', 'approve_shift_open', {
        p_shift_id: shiftId
    });
}
