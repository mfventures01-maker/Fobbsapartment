// 🛸 ANTI-GRAVITY PAYMENT ENGINE — DETERMINISTIC REWRITE
// Law: "No direct table writes. Every mutation passes through the RPC firewall."
// BEFORE: used supabase.from('payment_intents').insert() — CRITICAL VIOLATION
// AFTER:  all operations via callRPC exclusively

import { create } from 'zustand';
import { callRPC } from '../lib/rpcClient';

export interface PaymentIntent {
    id: string;
    order_id: string;
    business_id: string;
    branch_id: string;
    staff_id: string;
    shift_id?: string;
    expected_amount: number;
    payment_type: string;
    status: 'pending' | 'confirmed' | 'voided';
    external_reference?: string;
}

interface PaymentEngine {
    currentIntent: PaymentIntent | null;
    status: 'idle' | 'pending' | 'confirmed' | 'voided' | 'error';
    loading: boolean;
    clientRequestId: string | null;

    createPaymentIntent: (payload: {
        order_id: string;
        payment_type: string;
        shift_id?: string;
        external_reference?: string;
        idempotencyKey: string;    // ← Caller MUST provide — no internal generation
    }) => Promise<{ intent_id: string }>;

    confirmPaymentIntent: (payload: {
        intentId: string;
        externalReference?: string;
        idempotencyKey: string;    // ← Caller MUST provide
    }) => Promise<{ success: boolean; transaction_id: string }>;

    reset: () => void;
}

export const usePaymentEngine = create<PaymentEngine>((set) => ({
    currentIntent: null,
    status: 'idle',
    loading: false,
    clientRequestId: null,

    createPaymentIntent: async ({ order_id, payment_type, shift_id, external_reference, idempotencyKey }) => {
        set({ loading: true, clientRequestId: idempotencyKey, status: 'idle' });

        try {
            // ✅ THROUGH FIREWALL ONLY — no direct table write
            const data = await callRPC<{ intent_id: string }>('staff', 'create_payment_intent', {
                p_order_id: order_id,
                p_payment_type: payment_type,
                p_shift_id: shift_id || null,
                p_external_reference: external_reference || null,
                _idempotency_key: idempotencyKey
            });

            set({ status: 'pending', loading: false });
            return data;
        } catch (error) {
            set({ loading: false, status: 'error' });
            throw error;
        }
    },

    confirmPaymentIntent: async ({ intentId, externalReference, idempotencyKey }) => {
        set({ loading: true });
        try {
            const data = await callRPC<{ success: boolean; transaction_id: string }>(
                'staff', 'confirm_payment_intent', {
                p_intent_id: intentId,
                p_external_reference: externalReference || null,
                _idempotency_key: idempotencyKey
            }
            );
            set({ status: 'confirmed', loading: false });
            return data;
        } catch (e) {
            set({ loading: false, status: 'error' });
            throw e;
        }
    },

    reset: () => {
        set({
            currentIntent: null,
            status: 'idle',
            loading: false,
            clientRequestId: null
        });
    }
}));
