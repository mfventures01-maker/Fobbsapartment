import { supabase } from "@/lib/supabaseClient";

export async function confirmPaymentIntent(intentId: string, externalReference?: string) {
    const { data, error } = await supabase.rpc("confirm_payment_intent", {
        p_intent_id: intentId,
        p_external_reference: externalReference || null
    });

    if (error) throw error;

    return data;
}
