import { callRPC } from '../lib/rpcClient';

/**
 * 🧱 MANAGER TERMINAL SERVICE LAYER — ANTI-GRAVITY DETERMINISTIC
 *
 * ⚠️ RULE: All mutation functions accept idempotencyKey from the caller.
 * Keys are generated ONCE in the UI component via useIdempotentMutation.
 */

export async function approveShift(shiftId: string, idempotencyKey: string) {
    return callRPC<{ success: boolean }>('manager', 'approve_shift_close', {
        p_shift_id: shiftId,
        _idempotency_key: idempotencyKey
    });
}

export async function approveShiftOpen(shiftId: string, idempotencyKey: string) {
    return callRPC<{ success: boolean }>('manager', 'approve_shift_open', {
        p_shift_id: shiftId,
        _idempotency_key: idempotencyKey
    });
}

export async function rejectShiftOpen(shiftId: string, reason: string, idempotencyKey: string) {
    return callRPC<{ success: boolean }>('manager', 'reject_shift_open', {
        p_shift_id: shiftId,
        p_reason: reason,
        _idempotency_key: idempotencyKey
    });
}
