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
    items: any[],
    customerName?: string,
    metadata?: any,
    idempotencyKey?: string
) {
    // 🛡️ ZERO-TRUST GATEWAY — IDs resolved from auth.uid() on server
    const data = await callRPC<{ order_id: string; status: string; payment_intent_id: string }>(
        'staff', 'universal_order_gateway', {
        p_items: items,
        p_customer_name: customerName || 'Staff Guest',
        p_metadata: metadata || {},
        _idempotency_key: idempotencyKey
    }
    );
    return { success: true, ...data };
}

export async function settleOrderV2(
    orderId: string,
    paymentType: string,
    externalReference?: string,
    idempotencyKey?: string
) {
    const data = await callRPC<{ success: boolean; transaction_id: string }>(
        'staff', 'settle_order_v2', {
        p_order_id: orderId,
        p_payment_type: paymentType,
        p_external_reference: externalReference,
        _idempotency_key: idempotencyKey
    }
    );
    return { ...data };
}

export async function confirmPaymentIntent(
    intentId: string,
    externalReference?: string,
    idempotencyKey?: string
) {
    // Deprecated in favor of settleOrderV2 (Atomic settlement + ledger sync)
    // For backward compatibility, default to cash settlement
    return await settleOrderV2(intentId, 'cash', externalReference, idempotencyKey);
}
