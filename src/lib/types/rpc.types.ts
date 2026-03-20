// 🔒 THE TYPE LOCK (CRITICAL PARAMETER DEFINITIONS)
export interface BaseRpcPayload {
    _idempotency_key?: string;
}

export interface UniversalOrderGatewayPayload extends BaseRpcPayload {
    p_branch_id: string;
    p_shift_id: string;
    p_items: Array<{ id: string; quantity: number }>;
    p_payment_method: string;
}

export interface ConfirmPaymentIntentPayload extends BaseRpcPayload {
    p_intent_id: string;
    p_order_id: string;
}

export interface UpdateKitchenTicketPayload extends BaseRpcPayload {
    p_ticket_id: string;
    p_status: 'preparing' | 'ready';
}

export interface ApproveShiftPayload extends BaseRpcPayload {
    p_declaration_id: string;
    p_decision: 'approved' | 'rejected';
    p_reason?: string;
}

export type RpcContracts = {
    universal_order_gateway: {
        payload: UniversalOrderGatewayPayload;
        response: { order_id: string; status: string };
    };
    confirm_payment_intent: {
        payload: ConfirmPaymentIntentPayload;
        response: { success: boolean; transaction_id: string };
    };
    update_kitchen_ticket_status: {
        payload: UpdateKitchenTicketPayload;
        response: { success: boolean };
    };
    approve_shift_declaration: {
        payload: ApproveShiftPayload;
        response: { success: boolean };
    }
};
