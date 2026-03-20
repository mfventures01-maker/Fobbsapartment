import { callRPC } from '../lib/rpcClient';

/**
 * 🧱 MANAGER TERMINAL SERVICE LAYER
 * Isolation enforced by callRPC('manager', ...)
 * Returns standardized { success: boolean, ...data } for UI compatibility
 */

export async function approveShift(shiftId: string) {
    return callRPC<{ success: boolean }>('manager', 'approve_shift_close', {
        p_shift_id: shiftId,
        _idempotency_key: crypto.randomUUID()
    });
}

export async function approveShiftOpen(shiftId: string) {
    return callRPC<{ success: boolean }>('manager', 'approve_shift_open', {
        p_shift_id: shiftId,
        _idempotency_key: crypto.randomUUID()
    });
}

export async function rejectShiftOpen(shiftId: string, reason: string) {
    return callRPC<{ success: boolean }>('manager', 'reject_shift_open', {
        p_shift_id: shiftId,
        p_reason: reason,
        _idempotency_key: crypto.randomUUID()
    });
}
