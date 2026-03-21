// 🛸 ANTI-GRAVITY: PURE REFLECTION LAYER
// Purpose: Zero-Hydration, Zero-Race Shell for CARSS Terminals.
// Law: No local state. Only the Mirror.

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// ============================================
// TYPES - Backend Mirror
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

export type ShellState =
    | { status: 'BOOTING'; reason?: string }
    | { status: 'MIRRORING'; state: SystemState; lastSync: number }
    | { status: 'TRANSMITTING'; action: string; timestamp: number }
    | { status: 'ERROR'; error: Error; state: SystemState | null };

// ============================================
// THE SHELL
// ============================================

export class DeterministicShell {
    private supabase: SupabaseClient;
    private channel: RealtimeChannel | null = null;
    private state: ShellState = { status: 'BOOTING', reason: 'Initializing' };
    private identity: any = null;
    private readonly terminalType: TerminalType;
    private branchId: string | null = null;
    private subscribers: Map<string, (state: ShellState) => void> = new Map();
    private pendingActions: Map<string, Promise<any>> = new Map();

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

    async transmit<R = any>(
        action: string,
        params: Record<string, any>
    ): Promise<R> {
        const key = `${action}:${Date.now()}:${Math.random().toString(36).substring(2, 11)}`;

        if (this.pendingActions.has(key)) return this.pendingActions.get(key) as Promise<R>;

        this.state = { status: 'TRANSMITTING', action, timestamp: Date.now() };
        this.notifySubscribers();

        const promise = this.executeAction<R>(action, params, key);
        this.pendingActions.set(key, promise);

        try {
            const result = await promise;
            return result;
        } finally {
            this.pendingActions.delete(key);
        }
    }

    private async executeAction<R>(action: string, params: Record<string, any>, key: string): Promise<R> {
        try {
            const enrichedParams = {
                ...params,
                p_terminal_type: this.terminalType
            };

            const { data, error } = await this.supabase.rpc(action, enrichedParams);
            if (error) throw error;

            return data as R;
        } catch (error) {
            this.state = { status: 'ERROR', error: error as Error, state: (this.state as any).state || null };
            this.notifySubscribers();
            throw error;
        }
    }

    async startMirroring(branchId?: string): Promise<void> {
        this.branchId = branchId || await this.resolveBranchId();

        // Postgres notification channel handled by Supabase Realtime
        this.channel = this.supabase.channel(`system-state-${this.branchId}`);

        this.channel
            .on('broadcast', { event: 'state_update' }, (payload) => {
                const newState = payload.payload.state as SystemState;
                this.state = { status: 'MIRRORING', state: newState, lastSync: Date.now() };
                this.notifySubscribers();
            })
            .subscribe();

        // Initial fetch to lock the mirror
        const initialState = await this.getState();
        this.state = { status: 'MIRRORING', state: initialState, lastSync: Date.now() };
        this.notifySubscribers();
    }

    private async resolveBranchId(): Promise<string> {
        const { data, error } = await this.supabase.rpc('get_my_identity');
        if (error) throw error;
        this.identity = data;
        return data.branch_id;
    }

    subscribe(callback: (state: ShellState) => void): () => void {
        const id = Math.random().toString(36).substring(2, 11);
        this.subscribers.set(id, callback);
        callback(this.state);
        return () => this.subscribers.delete(id);
    }

    private notifySubscribers(): void {
        this.subscribers.forEach(callback => callback(this.state));
    }

    // SELECTORS (Derived from state, never stored)
    getSnapshot(): SystemState | null {
        return this.state.status === 'MIRRORING' ? this.state.state : null;
    }

    // HELPERS
    async stopMirroring(): Promise<void> {
        if (this.channel) await this.channel.unsubscribe();
    }
}
