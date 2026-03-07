import { supabase } from "@/lib/supabaseClient";

export async function getTransactions(businessId: string, branchId?: string | null) {
    let query = supabase
        .from('transactions')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

    if (branchId) query = query.eq('branch_id', branchId);

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function transitionTransactionStatus(transactionId: string, newStatus: string, actorId: string, reason?: string) {
    const update: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
    };

    if (newStatus === 'verified') {
        update.verified_by = actorId;
        update.verified_at = new Date().toISOString();
    } else if (newStatus === 'reversed') {
        update.reversed_by = actorId;
        update.reversed_at = new Date().toISOString();
        update.reversal_reason = reason;
    }

    const { data, error } = await supabase
        .from('transactions')
        .update(update)
        .eq('id', transactionId)
        .select();

    if (error) throw error;
    return data;
}
