
export type PaymentStatus = 'pending' | 'confirmed' | 'voided';
export type ShiftStatus = 'requested' | 'open' | 'pending_declaration' | 'awaiting_approval' | 'closed' | 'rejected';

export interface Profile {
    user_id: string;
    role: 'super_admin' | 'ceo' | 'manager' | 'staff' | 'owner';
    business_id: string;
    department?: string;
    full_name: string;
}

export interface PaymentIntent {
    id: string;
    order_id: string;
    org_id: string;
    branch_id: string;
    staff_id: string;
    shift_id: string | null;
    expected_amount: number;
    payment_type: string;
    status: PaymentStatus;
    external_reference?: string;
    created_at: string;
    order?: Order;
}

export interface Shift {
    id: string;
    staff_id: string;
    business_id: string;
    branch_id: string;
    department_id: string;
    start_time: string;
    ends_at?: string | null;
    status: ShiftStatus;
    created_at?: string;

    // Declaration Fields
    declared_cash: number;
    declared_pos: number;
    declared_transfer: number;
    declared_total?: number; // Generated in DB

    // Reconciliation Fields
    expected_cash?: number;
    expected_pos?: number;
    expected_transfer?: number;
    expected_total?: number;
    expected_revenue?: number;
    total_revenue?: number;
    variance?: number;
    final_declaration_id?: string;
    manager_approval_id?: string;
    closed_at?: string | null;
}

export interface ShiftReconciliation {
    id: string;
    shift_id: string;
    staff_id: string;
    business_id: string;
    expected_cash: number;
    counted_cash: number;
    expected_pos: number;
    pos_machine_total: number;
    expected_transfer: number;
    transfer_total: number;
    variance: number;
    manager_approved: boolean;
    manager_id?: string;
    approval_notes?: string;
    created_at: string;
}

export interface Transaction {
    id: string;
    business_id: string;
    branch_id: string;
    staff_id: string;
    order_id?: string;
    payment_intent_id?: string;
    shift_id?: string;
    department_id: string;
    amount: number;
    payment_type: string;
    payment_reference?: string;
    status: 'created' | 'verified' | 'reversed' | 'disputed';
    created_at: string;
}

export interface Order {
    id: string;
    org_id: string;
    location_id: string;
    staff_id?: string;
    customer_id?: string;
    total: number;
    status: 'open' | 'paid' | 'served' | 'void' | 'cancelled';
    created_at: string;
    updated_at: string;
    notes?: string;
    table_reference?: string;
    customer_name?: string;
}

export interface OrderItem {
    id: string;
    order_id: string;
    org_id: string;
    name: string;
    qty: number;
    price: number;
    subtotal: number;
    created_at: string;
}

export interface InventoryItem {
    id: string;
    business_id: string;
    branch_id: string;
    department_id: string;
    name: string;
    sku?: string;
    unit: string;
    current_stock: number;
    min_stock: number;
    cost_price: number;
    sale_price: number;
    last_restocked_at?: string;
}

