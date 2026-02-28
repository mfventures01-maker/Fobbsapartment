import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

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

    createPaymentIntent: (
        payload: Omit<PaymentIntent, 'id' | 'status' | 'created_at' | 'updated_at'>
    ) => Promise<PaymentIntent>;

    refreshIntent: (intentId?: string) => Promise<void>;

    reset: () => void;
}

export const usePaymentEngine = create<PaymentEngine>((set, get) => ({
    currentIntent: null,
    status: 'idle',
    loading: false,
    clientRequestId: null,

    createPaymentIntent: async (payload) => {
        // Generate UUID to lock UI / track request locally
        const reqId = crypto.randomUUID();

        set({
            loading: true,
            clientRequestId: reqId,
            status: 'idle'
        });

        try {
            const { data, error } = await supabase
                .from('payment_intents')
                .insert({
                    ...payload,
                    status: 'pending'
                })
                .select('*')
                .single();

            if (error) throw error;

            set({
                currentIntent: data,
                status: data.status,
                loading: false
            });

            // Refetch immediately after creation as required
            await get().refreshIntent(data.id);

            return data;
        } catch (error) {
            set({ loading: false, status: 'error' });
            throw error;
        }
    },

    refreshIntent: async (intentId?: string) => {
        const idToFetch = intentId || get().currentIntent?.id;
        if (!idToFetch) return;

        set({ loading: true });
        try {
            const { data, error } = await supabase
                .from('payment_intents')
                .select('*')
                .eq('id', idToFetch)
                .single();

            if (error) throw error;

            set({
                currentIntent: data,
                status: data.status,
                loading: false
            });
        } catch (e) {
            console.error('[engine] Payment intent refresh failed:', e);
            set({ loading: false });
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
