import { AntiGravityViolation } from './forbidden';

// 🔒 THE TERMINAL ISOLATION FIREWALL
// Centrally defined here to avoid circular dependencies
export type TerminalType = 'staff' | 'kitchen' | 'store' | 'manager' | 'ceo' | 'public';

export const TERMINAL_RPC_ACCESS: Record<TerminalType, string[]> = {
    staff: [
        'open_staff_shift',
        'close_staff_shift',
        'universal_order_gateway',
        'confirm_payment_intent',
        'create_payment_intent',
        'get_order_with_intent',
        'get_system_state',
        'end_shift',
        'submit_shift_declaration',
        'get_active_shift',
        'get_shift_by_id',
        'get_active_inventory',
        'get_intent_by_id',
        'set_intent_payment_method',
        'register_terminal',
        'push_user_notification'
    ],
    manager: [
        'approve_shift_declaration',
        'approve_shift_close',
        'approve_shift_open',
        'resolve_shift_anomalies',
        'get_shift_summary',
        'get_shift_by_id'
    ],
    kitchen: [
        'get_kitchen_snapshot',
        'update_preparation_status',
        'get_system_state'
    ],
    ceo: [
        'get_ceo_dashboard',
        'lock_branch_revenue_day',
        'queue_ceo_alert',
        'get_notification_outbox',
        'get_staff_list',
        'get_ceo_snapshot',
        'get_platform_businesses',
        'register_terminal',
        'push_user_notification',
        'get_audit_logs'
    ],
    store: [
        'record_inventory_in',
        'record_inventory_out',
        'get_inventory_levels'
    ],
    public: [
        'create_qr_order_gateway',
        'create_payment_intent',
        'get_order_status',
        'log_guest_event'
    ]
};

/**
 * 🔒 Validates that a terminal type is allowed to execute the requested RPC.
 * Throws AntiGravityViolation on any unauthorized access attempt.
 */
export const enforceTerminalAccess = (terminal: TerminalType, rpcFunction: string) => {
    const allowed = TERMINAL_RPC_ACCESS[terminal];
    if (!allowed || !allowed.includes(rpcFunction)) {
        throw new AntiGravityViolation(`Terminal '${terminal}' lacks authorization to execute '${rpcFunction}'`);
    }
};
