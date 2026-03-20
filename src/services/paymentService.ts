import { callRPC } from '../lib/rpcClient';

/**
 * Staff terminal payment operations.
 * All calls MUST pass terminal: 'staff'. Firewall enforces this.
 */

export async function confirmPaymentIntent(intentId: string, externalReference?: string) {
    return callRPC<{ success: boolean; transaction_id: string }>('staff', 'confirm_payment_intent', {
        p_intent_id: intentId,
        p_external_reference: externalReference || null
    });
}
