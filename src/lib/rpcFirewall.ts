import { AntiGravityViolation } from './forbidden';

// 🔒 THE TERMINAL ISOLATION FIREWALL
// Centrally defined here to avoid circular dependencies
export type TerminalType = 'staff' | 'kitchen' | 'store' | 'manager' | 'ceo' | 'public';

export const TERMINAL_RPC_ACCESS: Record<TerminalType, string[]> = {
    public: [
        'get_my_identity',
        'get_my_branches',
        'get_system_state',
        'create_qr_order_gateway',
        'get_order_status'
    ],
    staff: [
        'open_staff_shift',
        'end_shift',
        'submit_shift_declaration',
        'get_active_shift',
        'get_shift_by_id',
        'get_active_inventory',
        'universal_order_gateway',
        'get_intent_by_id',
        'set_intent_payment_method',
        'confirm_payment_intent',
        'register_terminal'
    ],
    kitchen: [
        'get_kitchen_snapshot',
        'update_preparation_status'
    ],
    store: [
        'get_inventory_levels',
        'record_inventory_in',
        'record_inventory_out'
    ],
    manager: [
        'get_shift_by_id',
        'approve_shift_open',
        'approve_shift_close',
        'reject_shift_open',
        'approve_shift_declaration'
    ],
    ceo: [
        'get_staff_list',
        'get_audit_logs',
        'get_platform_businesses'
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
