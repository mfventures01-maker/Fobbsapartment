
export type PaymentStatus = 'pending' | 'confirmed' | 'voided';
export type ShiftStatus = 'open' | 'closed';

export interface PaymentIntent {
    id: string;
    order_id: string;
    business_id: string;
    branch_id: string;
    staff_id: string;
    shift_id: string | null;
    expected_amount: number;
    payment_type: string;
    status: PaymentStatus;
    external_reference?: string;
    created_at: string;
}

export interface Shift {
    id: string;
    business_id: string;
    branch_id: string;
    staff_id: string;
    start_time: string;
    end_time?: string;
    status: ShiftStatus;
    metadata?: any;
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
    amount: number;
    payment_type: string;
    payment_reference?: string;
    status: 'created' | 'verified' | 'reversed' | 'disputed';
    created_at: string;
}
