
import { supabase } from './supabaseClient';
import toast from 'react-hot-toast';

export type PaymentMethod = 'cash' | 'transfer' | 'pos' | 'card' | 'wallet';
export type TransactionStatus = 'created' | 'verified' | 'reversed' | 'disputed';

export interface Transaction {
    id?: string;
    business_id: string;
    branch_id: string;
    department_id?: string;
    staff_id: string;
    shift_id?: string; // Phase 2 will enforce this
    amount: number;
    payment_type: PaymentMethod;
    payment_reference?: string;
    payment_intent_id?: string; // New traceability field
    external_reference?: string; // New traceability field
    status: TransactionStatus;
    created_at?: string;
}

const OFFLINE_QUEUE_KEY = 'carss_offline_tx_queue';

class TransactionService {
    private isSyncing = false;

    constructor() {
        // Start sync engine immediately
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.syncQueue());
            this.syncQueue();
        }
    }

    /**
     * Primary Write Model: UI -> Supabase (Primary) | IndexedDB (Resilience)
     */
    async createTransaction(tx: Omit<Transaction, 'status'>): Promise<{ success: boolean; data?: any; error?: any }> {
        const fullTx: Transaction = {
            ...tx,
            status: 'created',
            created_at: new Date().toISOString()
        };

        try {
            if (!supabase) throw new Error('Supabase not initialized');
            // 1. Attempt Supabase Write
            const { data, error } = await supabase
                .from('transactions')
                .insert([fullTx])
                .select()
                .single();

            if (error) throw error;

            toast.success('Transaction secured in cloud ledger.');
            return { success: true, data };

        } catch (error: any) {
            // 2. Resilience Flow: Queue locally if network fails
            console.error('[CARSS-FINTECH] Primary write failed, initiating resilience flow:', error);
            this.queueLocally(fullTx);

            toast.error('Network unstable. Transaction queued for offline sync.');
            return { success: false, error: 'Queued for offline sync' };
        }
    }

    private queueLocally(tx: Transaction) {
        const queue = this.getQueue();
        queue.push({ ...tx, id: tx.id || `offline_${Date.now()}` });
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    }

    private getQueue(): Transaction[] {
        const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    }

    private setQueue(queue: Transaction[]) {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    }

    /**
     * Deterministic Sync Logic
     */
    async syncQueue() {
        if (this.isSyncing || !navigator.onLine) return;

        const queue = this.getQueue();
        if (queue.length === 0) return;

        this.isSyncing = true;
        console.log(`[CARSS-FINTECH] Syncing ${queue.length} offline transactions...`);

        const remainingQueue: Transaction[] = [];

        for (const tx of queue) {
            try {
                if (!supabase) throw new Error('Supabase not initialized');
                // Remove temporary ID before insert
                const { id, ...txData } = tx as any;
                const finalData = id.startsWith('offline_') ? txData : { id, ...txData };

                const { error } = await supabase.from('transactions').insert([finalData]);
                if (error) throw error;
            } catch (err) {
                console.error('[CARSS-FINTECH] Sync failed for transaction:', tx.id, err);
                remainingQueue.push(tx);
            }
        }

        this.setQueue(remainingQueue);
        this.isSyncing = false;

        if (remainingQueue.length === 0) {
            toast.success('All offline transactions synchronized.');
        }
    }

    /**
     * Explicit State Transitions
     */
    async transitionStatus(transactionId: string, newStatus: TransactionStatus, actorId: string, reason?: string) {
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

        if (!supabase) throw new Error('Supabase not initialized');

        const { data, error } = await supabase
            .from('transactions')
            .update(update)
            .eq('id', transactionId)
            .select();

        if (error) {
            toast.error('Status transition failed.');
            throw error;
        }

        toast.success(`Transaction ${newStatus} successfully.`);
        return data;
    }

    getOfflineCount(): number {
        return this.getQueue().length;
    }

    /**
     * Real-Time Audit Stream
     */
    subscribeToTransactions(businessId: string, callback: (payload: any) => void) {
        const client = supabase;
        if (!client) return () => { };

        const channel = client
            .channel(`transactions_${businessId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'transactions',
                    filter: `business_id=eq.${businessId}`
                },
                (payload) => {
                    console.log('[CARSS-FINTECH] Real-time activity detected:', payload);
                    callback(payload);
                    this.syncQueue();
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[CARSS-FINTECH] Real-time audit channel established.');
                }
            });

        return () => {
            client.removeChannel(channel);
        };
    }
}

export const transactionService = new TransactionService();
