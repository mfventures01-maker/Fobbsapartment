// 🛸 ANTI-GRAVITY PHASE 5.2: ENHANCED DETERMINISTIC SHELL
// Purpose: Zero-Hydration Mirror with Diff Tracking, Timeout, Retry, and sync lag monitoring.

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

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
// ENHANCED DETERMINISTIC SHELL
// ============================================

export class DeterministicShell {
    private supabase: SupabaseClient;
    private channel: RealtimeChannel | null = null;
    private state: ShellStateEnhanced = {
        status: 'BOOTING',
        state: null,
        lastSync: null,
        pendingActions: [],
        failedActions: [],
        syncLag: 0
    };
    private identity: any = null;
    private readonly terminalType: TerminalType;
    public branchId: string | null = null;
    private subscribers: Map<string, (state: ShellStateEnhanced) => void> = new Map();
    private pendingActionPromises: Map<string, { resolve: Function; reject: Function }> = new Map();
    private syncTimeout: NodeJS.Timeout | null = null;
    private readonly SYNC_TIMEOUT_MS = 3000;
    private readonly MAX_RETRIES = 3;

    constructor(supabaseUrl: string, supabaseKey: string, terminalType: TerminalType) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.terminalType = terminalType;
    }

    async getState(): Promise<SystemState> {
        if (!this.branchId) {
            this.branchId = await this.resolveBranchId();
        }

        const { data, error } = await this.supabase.rpc('get_system_state', {
            p_branch_id: this.branchId,
            p_terminal_type: this.terminalType
        });

        if (error) throw error;
        return data;
    }

    // ============================================
    // ENHANCED TRANSMIT WITH RETRY & TIMEOUT
    // ============================================

    async transmit<R = any>(
        action: string,
        params: Record<string, any>,
        idempotencyKey?: string,
        retryCount: number = 0
    ): Promise<R> {
        const key = idempotencyKey || `${action}:${Date.now()}:${Math.random().toString(36).substring(2, 11)}`;

        // Anti-Gravity: Check shift active for POS operations
        if (this.terminalType === 'pos') {
            const shiftActive = this.state.state?.shift?.success;
            const mutations = ['create_order_gateway', 'add_order_item', 'apply_discount', 'create_payment_intent', 'void_order'];
            if (mutations.includes(action) && !shiftActive) {
                throw new Error('🛸 SYMMETRY_VIOLATION: No active shift. Terminal locked.');
            }
        }

        // Track lifecycle
        const pendingAction: PendingAction = {
            id: key,
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
            this.pendingActionPromises.set(key, { resolve, reject });

            // Sync Confirmation Timeout
            const timeout = setTimeout(async () => {
                const actionIndex = this.state.pendingActions.findIndex(a => a.id === key);
                if (actionIndex !== -1) {
                    const actionItem = this.state.pendingActions[actionIndex];
                    actionItem.status = 'failed';
                    actionItem.lastError = 'DESYNC_TIMEOUT: Action may have succeeded in backend but not mirrored.';
                    this.state.failedActions.push(actionItem);
                    this.state.pendingActions.splice(actionIndex, 1);

                    if (retryCount < this.MAX_RETRIES) {
                        console.warn(`🔄 DESYNC_RETRY: ${actionItem.action} (${retryCount + 1}/${this.MAX_RETRIES})`);
                        try {
                            const res = await this.transmit(actionItem.action, actionItem.params, `${key}:retry`, retryCount + 1);
                            resolve(res);
                        } catch (e: any) { reject(e); }
                    } else {
                        reject(new Error(`🛸 RADIUS_FATAL: Action ${actionItem.action} failed to sync after ${this.MAX_RETRIES} attempts.`));
                    }
                }
                this.pendingActionPromises.delete(key);
            }, this.SYNC_TIMEOUT_MS);

            // Execute RPC
            this.executeAction<R>(action, params, key)
                .then(result => {
                    clearTimeout(timeout);
                    // Resolve happens in mirroring when pg_notify confirms the state shift
                })
                .catch(error => {
                    clearTimeout(timeout);
                    this.pendingActionPromises.delete(key);
                    const idx = this.state.pendingActions.findIndex(a => a.id === key);
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

    private async executeAction<R>(action: string, params: Record<string, any>, key: string): Promise<R> {
        try {
            const enrichedParams = { ...params, p_terminal_type: this.terminalType };
            const { data, error } = await this.supabase.rpc(action, enrichedParams);
            if (error) throw error;
            return data as R;
        } catch (error) {
            throw error;
        }
    }

    // ============================================
    // ENHANCED MIRRORING WITH DIFFS
    // ============================================

    async startMirroring(branchId?: string): Promise<void> {
        this.branchId = branchId || await this.resolveBranchId();

        this.channel = this.supabase.channel(`system-state-${this.branchId}-${this.terminalType}`);

        this.channel
            .on('broadcast', { event: 'state_update' }, async (payload) => {
                const notification = payload.payload;
                const { diff, timestamp } = notification;

                // 1. Fetch Fresh State (Phase 1 Law)
                const newState = await this.getState();
                const lag = Date.now() - (timestamp * 1000);

                // 2. Resolve Synced Actions
                const syncedActionKey = notification.record_id; // Simple mapping
                if (syncedActionKey && this.pendingActionPromises.has(syncedActionKey)) {
                    const { resolve } = this.pendingActionPromises.get(syncedActionKey)!;
                    this.state.pendingActions = this.state.pendingActions.filter(a => a.id !== syncedActionKey);
                    this.pendingActionPromises.delete(syncedActionKey);
                    resolve(newState);
                }

                // 3. Update Mirror
                this.state = {
                    ...this.state,
                    status: 'MIRRORING',
                    state: newState,
                    lastSync: Date.now(),
                    syncLag: lag,
                    diff: diff // Drive animations
                };

                this.notifySubscribers();

                if (this.syncTimeout) clearTimeout(this.syncTimeout);
                this.syncTimeout = setTimeout(() => {
                    if (this.state.syncLag > this.SYNC_TIMEOUT_MS) {
                        this.state.status = 'RECONNECTING';
                        this.notifySubscribers();
                    }
                }, this.SYNC_TIMEOUT_MS);
            })
            .subscribe();

        // Initial fetch
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
        const { data, error } = await this.supabase.rpc('get_my_identity');
        if (error) throw error;
        this.identity = data;
        this.branchId = data.branch_id;
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
        return this.transmit('create_order_gateway', { p_customer_name: customerName });
    }

    async addItem(orderId: string, name: string, price: number, quantity: number): Promise<any> {
        return this.transmit('add_order_item', {
            p_order_id: orderId,
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
                await this.transmit(action.action, action.params, `${action.id}:retry`, action.retryCount + 1);
            } catch (e) {
                console.error(`DESYNC_FATAL: Retry failed for ${action.id}`);
            }
        }
    }

    async stopMirroring(): Promise<void> {
        if (this.channel) await this.channel.unsubscribe();
    }
}
