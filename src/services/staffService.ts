import { callRPC } from '../lib/rpcClient';
import { Shift } from '../types/database';

/**
 * 🧱 STAFF TERMINAL SERVICE LAYER — ANTI-GRAVITY DETERMINISTIC
 *
 * ⚠️ RULE: Functions that mutate state require an idempotencyKey from the caller.
 * Read functions (getActiveShift, getShiftById) do NOT use idempotency keys.
 */

export async function getActiveShift(): Promise<Shift | null> {
    // READ-ONLY DETERMINISTIC — parameterless per Layer 4 architecture
    const data = await callRPC<Shift | null>('staff', 'resolve_active_shift', {});
    return data;
}

export async function getShiftById(shiftId: string): Promise<Shift | null> {
    // READ-ONLY — no idempotency key
    const data = await callRPC<Shift | null>('staff', 'get_shift_by_id', {
        p_shift_id: shiftId
    });
    return data;
}

export async function requestShift(
    businessId: string,
    locationId: string,
    staffId: string,
    idempotencyKey: string           // ← Caller provides key (from useIdempotentMutation)
) {
    const data = await callRPC<{ shift_id: string }>('staff', 'open_staff_shift', {
        p_business_id: businessId,
        p_branch_id: locationId,
        p_staff_id: staffId,
        _idempotency_key: idempotencyKey
    });
    return { success: true, ...data };
}

export async function endShift(idempotencyKey: string) {
    const data = await callRPC<{ success: boolean }>('staff', 'end_shift', {
        _idempotency_key: idempotencyKey
    });
    return { ...data };
}

export async function submitDeclaration(
    cash: number,
    pos: number,
    transfer: number,
    shiftId: string,
    idempotencyKey: string           // ← Caller provides key
) {
    const data = await callRPC<{ success: boolean }>('staff', 'submit_shift_declaration', {
        p_shift_id: shiftId,
        p_cash: cash,
        p_pos: pos,
        p_transfer: transfer,
        _idempotency_key: idempotencyKey
    });
    return { ...data };
}

export async function createStaffOrder(
    businessId: string,
    locationId: string,
    staffId: string,
    items: any[],
    metadata?: any,
    externalReference?: string,
    idempotencyKey?: string          // ← Caller provides key
) {
    const data = await callRPC<{ order_id: string; status: string; payment_intent_id: string }>(
        'staff', 'universal_order_gateway', {
        p_source: 'staff',
        p_business_id: businessId,
        p_branch_id: locationId,
        p_staff_id: staffId,
        p_items: items,
        p_metadata: metadata || {},
        p_external_reference: externalReference || null,
        _idempotency_key: idempotencyKey
    }
    );
    return { success: true, ...data };
}

export async function confirmPaymentIntent(
    intentId: string,
    externalReference?: string,
    idempotencyKey?: string          // ← Caller provides key
) {
    const data = await callRPC<{ success: boolean; transaction_id: string }>(
        'staff', 'confirm_payment_intent', {
        p_intent_id: intentId,
        p_external_reference: externalReference || null,
        _idempotency_key: idempotencyKey
    }
    );
    return { ...data };
}
