// 🧬 CARSS CLIENT CORE: DETERMINISTIC EXECUTION ENGINE
// Purpose: Enforce the same state machine as the backend.
// Law: Perfect symmetry between front and back end.

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase as singletonClient } from '../supabaseClient';
import { callRPC } from '../rpcClient';

// === TYPES ===
export type OrderStatus = 'open' | 'paid' | 'void';
export type KitchenStatus = 'pending' | 'preparing' | 'ready' | 'served';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'qr_pay';
export type TerminalType = 'qr' | 'pos' | 'mobile' | 'manager';

export interface DeterministicIdentity {
    user_id: string | null;
    business_id: string;
    branch_id: string;
    role: 'customer' | 'staff' | 'manager' | 'admin' | string;
    staff_id: string | null;
    permissions: Record<string, any>;
    terminal_type: TerminalType;
    session_id: string;
}

export interface ShiftContext {
    shift_id: string;
    branch_id: string;
    started_at: string;
    is_active: boolean;
    staff_id: string | null;
}

export interface Order {
    id: string;
    branch_id: string;
    shift_id: string;
    customer_name: string | null;
    status: OrderStatus;
    total_amount: number;
    discount_amount: number;
    created_at: string;
    paid_at: string | null;
    void_reason: string | null;
    terminal_type: TerminalType;
    session_id: string;
}

export interface OrderItem {
    id: string;
    order_id: string;
    item_id: string;
    name: string;
    price: number;
    quantity: number;
    subtotal: number;
}

export interface OrderWithDetails extends Order {
    items: OrderItem[];
    kitchen_status?: KitchenStatus;
}

// === FLOW STATES ===
export type OrderFlowState =
    | { step: 'INIT' }
    | { step: 'VALIDATING_IDENTITY'; identity: DeterministicIdentity | null }
    | { step: 'RESOLVING_SHIFT' }
    | { step: 'SHIFT_RESOLVED'; shift: ShiftContext }
    | { step: 'CREATING_ORDER' }
    | { step: 'ORDER_CREATED'; order: Order }
    | { step: 'ADDING_ITEMS'; items_added: number }
    | { step: 'APPLYING_DISCOUNT'; discount_applied: number }
    | { step: 'PROCESSING_PAYMENT' }
    | { step: 'PAYMENT_CONFIRMED'; payment_id: string }
    | { step: 'COMPLETED'; order: OrderWithDetails }
    | { step: 'VOIDING' }
    | { step: 'VOIDED'; reason: string }
    | { step: 'ERROR'; error: Error; rollback_data?: any };

// === THE CLIENT ===
export class CARSSClient {
    private state: OrderFlowState = { step: 'INIT' };
    private identity: DeterministicIdentity | null = null;
    private shift: ShiftContext | null = null;
    private currentOrder: Order | null = null;
    private readonly terminalType: TerminalType;
    private readonly sessionId: string;

    constructor(_url: string, _key: string, terminalType: TerminalType) {
        // 🧪 ANTI-GRAVITY EXORCISM: Using singleton via rpcClient
        this.terminalType = terminalType;
        this.sessionId = Math.random().toString(36).substring(2, 15);
    }

    // === TELEMETRY ===
    private async logEvent(
        eventType: string,
        rpcName: string,
        payload: any,
        response?: any,
        error?: any
    ): Promise<void> {
        // Redundant with global rpcClient logging, but keeping for specialized telemetry
        if (!this.identity) return;
        callRPC(this.terminalType, 'log_deterministic_event', {
            p_order_id: this.currentOrder?.id || null,
            p_branch_id: this.identity.branch_id,
            p_event_type: eventType,
            p_rpc_name: rpcName,
            p_payload: payload,
            p_identity: this.identity
        }).catch(() => { });
    }

    private async callRPC<T>(name: string, payload: any): Promise<T> {
        // 🛡️ ANTI-GRAVITY: Routing through global Truth Gate
        return callRPC<T>(this.terminalType, name, payload);
    }

    // === DETERMINISTIC METHODS ===

    async validateIdentity(): Promise<DeterministicIdentity> {
        this.state = { step: 'VALIDATING_IDENTITY', identity: null };
        const identityResult = await this.callRPC<DeterministicIdentity>('get_my_identity', {
            p_terminal_type: this.terminalType
        });

        this.identity = {
            ...identityResult,
            terminal_type: this.terminalType,
            session_id: this.sessionId
        };

        this.state = { step: 'VALIDATING_IDENTITY', identity: this.identity };
        return this.identity;
    }

    async resolveShift(): Promise<ShiftContext> {
        if (!this.identity) throw new Error('Validate identity first');
        this.state = { step: 'RESOLVING_SHIFT' };

        const shift = await this.callRPC<ShiftContext>('resolve_active_shift', {
            branch_id: this.identity.branch_id,
            staff_id: this.identity.staff_id,
            terminal_type: this.terminalType,
            business_id: this.identity.business_id
        });

        if (!shift.is_active) throw new Error('No active shift found');

        this.shift = shift;
        this.state = { step: 'SHIFT_RESOLVED', shift };
        return shift;
    }

    async createOrder(customerName?: string): Promise<Order> {
        if (!this.identity) throw new Error('Validate identity first');
        if (this.terminalType === 'pos' && !this.shift) throw new Error('Resolve shift first');

        this.state = { step: 'CREATING_ORDER' };

        const order = await this.callRPC<Order>('create_order_gateway', {
            p_branch_id: this.identity.branch_id,
            p_shift_id: this.shift?.shift_id || null,
            p_customer_name: customerName || (this.terminalType === 'qr' ? 'QR Customer' : null),
            p_terminal_type: this.terminalType,
            p_session_id: this.sessionId,
            p_staff_id: this.identity.staff_id
        });

        this.currentOrder = order;
        this.state = { step: 'ORDER_CREATED', order };
        return order;
    }

    async addItem(itemId: string, quantity: number, priceOverride?: number): Promise<OrderItem> {
        if (!this.currentOrder) throw new Error('No active order');

        this.state = { step: 'ADDING_ITEMS', items_added: (this.state.step === 'ADDING_ITEMS' ? this.state.items_added : 0) + 1 };

        const item = await this.callRPC<OrderItem>('add_order_item', {
            p_order_id: this.currentOrder.id,
            p_item_id: itemId,
            p_quantity: quantity,
            p_price_override: priceOverride
        });

        return item;
    }

    async applyDiscount(amount: number): Promise<{ discount: number; new_total: number }> {
        if (!this.currentOrder) throw new Error('No active order');
        this.state = { step: 'APPLYING_DISCOUNT', discount_applied: amount };

        return await this.callRPC<{ discount: number; new_total: number }>('apply_discount', {
            p_order_id: this.currentOrder.id,
            p_amount: amount,
            p_staff_id: this.identity?.staff_id
        });
    }

    async processPayment(amount: number, method: PaymentMethod): Promise<{ status: OrderStatus; payment_id: string }> {
        if (!this.currentOrder) throw new Error('No active order');
        this.state = { step: 'PROCESSING_PAYMENT' };

        const result = await this.callRPC<{ status: OrderStatus; payment_id: string }>('create_payment_intent', {
            p_order_id: this.currentOrder.id,
            p_amount: amount,
            p_payment_method: method,
            p_terminal_type: this.terminalType,
            p_session_id: this.sessionId,
            p_staff_id: this.identity?.staff_id
        });

        this.state = { step: 'PAYMENT_CONFIRMED', payment_id: result.payment_id };
        return result;
    }

    async getOrderDetails(orderId: string): Promise<OrderWithDetails> {
        return this.callRPC<OrderWithDetails>('get_order_details', {
            p_order_id: orderId,
            p_terminal_type: this.terminalType
        });
    }

    async getOrderHistory(limit: number = 20, offset: number = 0): Promise<{ orders: Order[]; total: number }> {
        if (!this.identity) throw new Error('Validate identity first');
        return this.callRPC<{ orders: Order[]; total: number }>('get_order_history', {
            p_branch_id: this.identity.branch_id,
            p_limit: limit,
            p_offset: offset,
            p_staff_id: this.identity.staff_id
        });
    }

    // === HELPERS ===
    getCurrentState() { return this.state; }
}
