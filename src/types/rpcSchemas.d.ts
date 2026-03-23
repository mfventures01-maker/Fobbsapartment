// 🛸 CARSS RPC SCHEMA DEFINITIONS
// Source of Truth for all frontend ↔ backend communication.

export type TerminalType = 'qr' | 'staff' | 'ceo' | 'kitchen' | 'manager' | 'super_admin';

export interface BaseRPCPayload {
    _idempotency_key?: string;
    terminal_type?: TerminalType;
}

export interface RPCRegistry {
    // 🔐 AUTH & IDENTITY
    get_my_identity: {
        params: { p_terminal_type?: String };
        returns: {
            user_id: string;
            role: string;
            business_id: string;
            branch_id: string;
            staff_id?: string;
        };
    };

    // 🏗️ SYSTEM STATE
    get_system_state: {
        params: { p_business_id: string; p_branch_id: string; p_terminal_type: string };
        returns: any;
    };

    // 📦 ORDERS
    create_qr_order_gateway: {
        params: {
            p_org_id: string;
            p_branch_id: string;
            p_customer_name?: string;
            p_customer_phone?: string;
            p_cart: any[];
            p_table_id?: string;
            p_metadata?: any;
        };
        returns: string; // Returns Order UUID
    };

    universal_order_gateway: {
        params: {
            p_business_id: string;
            p_branch_id: string;
            p_staff_id: string;
            p_items: any[];
            p_source: string;
            p_external_reference?: string;
            p_metadata?: any;
        };
        returns: { order_id: string; status: string };
    };

    // ⏳ SHIFTS
    resolve_active_shift: {
        params: {
            business_id: string;
            branch_id: string;
            staff_id: string;
            terminal_type: string;
        };
        returns: {
            is_active: boolean;
            shift_id: string | null;
            started_at: string | null;
        };
    };

    submit_shift_declaration: {
        params: {
            p_shift_id: string;
            p_staff_id: string;
            p_branch_id: string;
            p_declaration_amount: number; // Integer (Kobo)
            p_metadata?: any;
        };
        returns: boolean;
    };

    // 📊 LOGGING
    log_deterministic_event: {
        params: {
            p_branch_id: string;
            p_terminal_type: string;
            p_event_type: string;
            p_rpc_name: string;
            p_payload: any;
            p_identity: any;
            p_order_id?: string;
        };
        returns: void;
    };

    log_frontend_error: {
        params: {
            rpc: string;
            payload: any;
            error: string;
            terminal_type: string;
        };
        returns: void;
    };
}
