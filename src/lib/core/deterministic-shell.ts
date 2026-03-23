// 🛸 ANTI-GRAVITY FINAL CHECKPOINT: DETERMINISTIC SYMMETRY ENFORCEMENT
// Purpose: Zero-tolerance UUID sanitization and RPC payload enforcement.
// Law: "Frontend Must Obey the Database Like Gravity"

import { RealtimeChannel } from '@supabase/supabase-js';
import { callRPC } from '../rpcClient';
import { supabase as singletonClient } from '../supabaseClient';

// ============================================
// ENHANCED TYPES
// ============================================

export type TerminalType = 'qr' | 'pos' | 'mobile' | 'manager';
export type OrderStatus = 'open' | 'paid' | 'void';
export type KitchenStatus = 'pending' | 'queued' | 'preparing' | 'ready' | 'served';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'qr_pay';

export interface SystemState {
    version: number;
    timestamp: string;
    shift: {
        success: boolean;
        shift_id: string | null;
        cash_balance: number;
        error?: string;
    };
    active_orders: Order[];
    kitchen_queue: KitchenOrder[];
    inventory_alerts: InventoryAlert[];
    branch_id: string;
    terminal_type: string | null;
}

export interface Order {
    id: string;
    customer_name: string;
    total: number;
    status: OrderStatus;
    kitchen_status: KitchenStatus;
    created_at: string;
    items?: OrderItem[];
    idempotency_key?: string;
}

export interface OrderItem {
    id: string;
    name: string;
    qty: number;
    unit_price: number;
    line_total: number;
}

export interface KitchenOrder {
    order_id: string;
    customer_name: string;
    kitchen_status: KitchenStatus;
    items: Array<{ name: string; qty: number }>;
    created_at: string;
}

export interface InventoryAlert {
    item_id: string;
    name: string;
    current_stock: number;
    min_stock: number;
    alert_level: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'OK';
}

export interface PendingAction {
    id: string;
    action: string;
    params: any;
    timestamp: number;
    status: 'pending' | 'synced' | 'failed';
    retryCount: number;
    lastError?: string;
}

export interface ShellStateEnhanced {
    status: 'BOOTING' | 'MIRRORING' | 'TRANSMITTING' | 'ERROR' | 'RECONNECTING';
    state: SystemState | null;
    lastSync: number | null;
    pendingActions: PendingAction[];
    failedActions: PendingAction[];
    syncLag: number;
    error?: Error;
    diff?: any; // Precise diff for animations
}

// ============================================
// 🔒 ANTI-GRAVITY UTILITIES (PHASE 1)
// ============================================

export const isValidUUID = (value: any): boolean => {
    if (!value || typeof value !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
};

export const sanitizeUUID = (value: any): string | null => {
    return isValidUUID(value) ? value : null;
};

const assertValidPayload = (payload: any, rpcName: string) => {
    const invalidFields = Object.entries(payload).filter(([key, value]) => {
        // Check all fields ending in _id or containing id_ or named 'id'
        if (key.includes('_id') || key.includes('id_') || key === 'id') {
            // Forbidden values check (Rogue Strings)
            if (value === "unassigned" || value === "null" || value === "") return true;
            // UUID format check if not null/undefined
            return value !== null && value !== undefined && !isValidUUID(value);
        }
        return false;
    });

    if (invalidFields.length > 0) {
        console.error(`[ANTI-GRAVITY] ❌ INVALID UUID DETECTED in RPC: ${rpcName}`, invalidFields);
        throw new Error(`Payload rejected: invalid UUID detected. Rogue values: ${invalidFields.map(f => `${f[0]}=${f[1]}`).join(', ')}`);
    }
};

// ============================================
// THE DETERMINISTIC SHELL (PHASE 2-4)
// ============================================

export class DeterministicShell {
    static validateQRFormat(url: string): boolean {
        const qrRegex = /\/qr\/[0-9a-fA-F-]{36}/;
        return qrRegex.test(url);
    }

    static scanQRCode(scannedUrl: string): { branchId: string | null; valid: boolean } {
        if (!this.validateQRFormat(scannedUrl)) return { branchId: null, valid: false };
        const parts = scannedUrl.split('/');
        return { branchId: sanitizeUUID(parts[parts.length - 1]), valid: true };
    }

    private channel: RealtimeChannel | null = null;
    private state: ShellStateEnhanced = {
        status: 'BOOTING',
        state: null,
        lastSync: null,
        pendingActions: [],
        failedActions: [],
        syncLag: 0
    };
    private readonly terminalType: TerminalType;
    public branchId: string | null = null;
    private subscribers: Map<string, (state: ShellStateEnhanced) => void> = new Map();
    private pendingActionPromises: Map<string, { resolve: Function; reject: Function }> = new Map();
    private syncTimeoutConstant = 3000;
    private maxRetries = 3;

    constructor(_url: string, _key: string, terminalType: TerminalType) {
        this.terminalType = terminalType;
    }

    async getState(): Promise<SystemState> {
        if (!this.branchId) {
            this.branchId = await this.resolveBranchId();
        }

        return this.callRPC<SystemState>('get_system_state', {
            p_branch_id: sanitizeUUID(this.branchId),
            p_terminal_type: this.terminalType
        });
    }

    // ============================================
    // DETERMINISTIC RPC WRAPPER (PHASE 4)
    // ============================================

    private async callRPC<R>(fn: string, payload: any): Promise<R> {
        return callRPC<R>(this.terminalType, fn, payload);
    }

    // ============================================
    // TRANSMIT WITH AUTOMATIC IDEMPOTENCY KEY
    // ============================================

    async transmit<R = any>(
        action: string,
        params: Record<string, any>,
        retryCount: number = 0
    ): Promise<R> {
        const idempotencyKey = params.p_idempotency_key || `IG:${this.branchId}:${action}:${Date.now()}:${Math.random().toString(36).substring(2, 7)}`;

        const pendingAction: PendingAction = {
            id: idempotencyKey,
            action,
            params,
            timestamp: Date.now(),
            status: 'pending',
            retryCount
        };

        this.state.pendingActions.push(pendingAction);
        this.state.status = 'TRANSMITTING';
        this.notifySubscribers();

        return new Promise((resolve, reject) => {
            this.pendingActionPromises.set(idempotencyKey, { resolve, reject });

            const timeout = setTimeout(async () => {
                const actionIndex = this.state.pendingActions.findIndex(a => a.id === idempotencyKey);
                if (actionIndex !== -1) {
                    const actionItem = this.state.pendingActions[actionIndex];
                    actionItem.status = 'failed';
                    actionItem.lastError = 'DESYNC_TIMEOUT';

                    if (retryCount < this.maxRetries) {
                        try {
                            const res = await this.transmit(actionItem.action, { ...actionItem.params, p_idempotency_key: idempotencyKey }, retryCount + 1);
                            resolve(res);
                        } catch (e: any) { reject(e); }
                    } else {
                        this.state.failedActions.push(actionItem);
                        this.state.pendingActions.splice(actionIndex, 1);
                        reject(new Error(`🛸 RADIUS_FATAL: Action ${actionItem.action} timed out.`));
                    }
                }
                this.pendingActionPromises.delete(idempotencyKey);
            }, this.syncTimeoutConstant);

            this.callRPC<R>(action, { ...params, p_idempotency_key: idempotencyKey, p_terminal_type: this.terminalType })
                .then(() => {
                    clearTimeout(timeout);
                })
                .catch((error: any) => {
                    clearTimeout(timeout);
                    this.pendingActionPromises.delete(idempotencyKey);
                    const idx = this.state.pendingActions.findIndex(a => a.id === idempotencyKey);
                    if (idx !== -1) {
                        const failAction = this.state.pendingActions[idx];
                        failAction.status = 'failed';
                        failAction.lastError = error.message;
                        this.state.failedActions.push(failAction);
                        this.state.pendingActions.splice(idx, 1);
                    }
                    this.notifySubscribers();
                    reject(error);
                });
        });
    }

    // ============================================
    // ENHANCED MIRRORING WITH DIFFS
    // ============================================

    async startMirroring(branchId?: string): Promise<void> {
        this.branchId = sanitizeUUID(branchId) || await this.resolveBranchId();

        this.channel = singletonClient.channel(`system-state-${this.branchId}-${this.terminalType}`);

        this.channel
            .on('broadcast', { event: 'state_update' }, async (payload) => {
                const notification = payload.payload;
                const { diff, timestamp } = notification;

                const newState = await this.getState();
                const lag = Date.now() - (timestamp * 1000);

                const syncedActionKey = notification.record_id;
                if (syncedActionKey && this.pendingActionPromises.has(syncedActionKey)) {
                    const { resolve } = this.pendingActionPromises.get(syncedActionKey)!;
                    this.state.pendingActions = this.state.pendingActions.filter(a => a.id !== syncedActionKey);
                    this.pendingActionPromises.delete(syncedActionKey);
                    resolve(newState);
                }

                this.state = {
                    ...this.state,
                    status: 'MIRRORING',
                    state: newState,
                    lastSync: Date.now(),
                    syncLag: lag,
                    diff: diff
                };

                this.notifySubscribers();
            })
            .subscribe();

        const initialState = await this.getState();
        this.state = {
            ...this.state,
            status: 'MIRRORING',
            state: initialState,
            lastSync: Date.now(),
            syncLag: 0
        };
        this.notifySubscribers();
    }

    private async resolveBranchId(): Promise<string> {
        const data = await this.callRPC<any>('get_my_identity', {});
        this.branchId = sanitizeUUID(data.branch_id);
        return data.branch_id;
    }

    subscribe(callback: (state: ShellStateEnhanced) => void): () => void {
        const id = Math.random().toString(36).substring(2, 11);
        this.subscribers.set(id, callback);
        callback(this.state);
        return () => this.subscribers.delete(id);
    }

    private notifySubscribers(): void {
        this.subscribers.forEach(callback => callback(this.state));
    }

    // SEMANTIC HELPERS
    async createOrder(customerName?: string): Promise<{ id: string }> {
        return this.transmit('create_order_gateway', {
            p_customer_name: customerName,
            p_branch_id: sanitizeUUID(this.branchId),
            p_shift_id: sanitizeUUID(this.state.state?.shift?.shift_id)
        });
    }

    async addItem(orderId: string, name: string, price: number, quantity: number): Promise<any> {
        return this.transmit('add_order_item', {
            p_order_id: sanitizeUUID(orderId),
            p_name: name,
            p_price: price,
            p_quantity: quantity
        });
    }

    async retryFailedActions(): Promise<void> {
        const failed = [...this.state.failedActions];
        this.state.failedActions = [];
        for (const action of failed) {
            try {
                await this.transmit(action.action, action.params, action.retryCount + 1);
            } catch (e) {
                console.error(`DESYNC_FATAL: Retry failed for ${action.id}`);
            }
        }
    }

    async stopMirroring(): Promise<void> {
        if (this.channel) await this.channel.unsubscribe();
    }
}
