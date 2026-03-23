// 🛸 CARSS OFFLINE RPC QUEUE: NIGERIAN CONNECTIVITY RESILIENCE
// Purpose: Store failed RPCs during network drops and replay them when back online.
// Law: "A transaction never dies, it only waits for a bar of signal."

import { callRPC } from './rpcClient';

interface QueuedRPC {
    id: string;
    terminal: string;
    fn: string;
    payload: any;
    timestamp: number;
    retryCount: number;
}

const STORAGE_KEY = 'carss-offline-rpc-queue';

class OfflineRPCQueue {
    private queue: QueuedRPC[] = [];
    private isProcessing = false;

    constructor() {
        this.loadQueue();
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.processQueue());
            // Proactive periodic check
            setInterval(() => this.processQueue(), 30000);
        }
    }

    private loadQueue() {
        if (typeof window === 'undefined') return;
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                this.queue = JSON.parse(stored);
                console.log(`[OFFLINE] 📦 Loaded ${this.queue.length} pending transactions from storage.`);
            } catch (e) {
                console.error('[OFFLINE] ❌ Failed to parse stored queue:', e);
                this.queue = [];
            }
        }
    }

    private saveQueue() {
        if (typeof window === 'undefined') return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    }

    /**
     * Enqueue a failed RPC for later replay.
     */
    enqueue(terminal: string, fn: string, payload: any) {
        // Only queue transactional RPCs (mutations)
        const transactionalPrefixes = ['create_', 'update_', 'delete_', 'submit_', 'add_'];
        const isTransactional = transactionalPrefixes.some(p => fn.startsWith(p)) || fn.includes('gateway');

        if (!isTransactional) {
            console.warn(`[OFFLINE] 🚦 Skipping non-transactional RPC: ${fn}`);
            return;
        }

        const id = payload._idempotency_key || crypto.randomUUID();

        // Prevent duplicates
        if (this.queue.some(item => item.id === id)) return;

        console.log(`[OFFLINE] 🛡️ Enqueuing transaction: ${fn} (ID: ${id})`);

        this.queue.push({
            id,
            terminal,
            fn,
            payload,
            timestamp: Date.now(),
            retryCount: 0
        });

        this.saveQueue();
    }

    /**
     * Attempt to replay all queued RPCs.
     */
    async processQueue() {
        if (this.isProcessing || this.queue.length === 0 || !navigator.onLine) return;

        this.isProcessing = true;
        console.log(`[OFFLINE] 📡 Resuming ${this.queue.length} pending transactions...`);

        const remaining: QueuedRPC[] = [];

        for (const item of this.queue) {
            try {
                console.log(`[OFFLINE] 🚀 Replaying: ${item.fn} (ID: ${item.id}) attempt ${item.retryCount + 1}`);
                await callRPC(item.terminal, item.fn, {
                    ...item.payload,
                    _is_replay: true,
                    _replay_timestamp: item.timestamp
                });
                console.log(`[OFFLINE] ✅ Replay Success: ${item.id}`);
            } catch (err: any) {
                console.error(`[OFFLINE] ❌ Replay Failed: ${item.id} - ${err.message}`);
                item.retryCount++;

                // Max retries (e.g. 10) before moving to "Dead Letter" or permanent failure
                if (item.retryCount < 10) {
                    remaining.push(item);
                } else {
                    console.error(`[OFFLINE] ⚠️ Dropped transaction after ${item.retryCount} failures: ${item.id}`);
                }
            }
        }

        this.queue = remaining;
        this.saveQueue();
        this.isProcessing = false;

        if (this.queue.length > 0) {
            console.log(`[OFFLINE] ⏳ ${this.queue.length} items still pending.`);
        } else {
            console.log(`[OFFLINE] ✨ All transactions synchronized.`);
        }
    }

    getPendingCount() {
        return this.queue.length;
    }
}

export const offlineQueue = new OfflineRPCQueue();
