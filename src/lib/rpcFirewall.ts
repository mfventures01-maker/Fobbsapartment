import { AntiGravityViolation } from './forbidden';

// 🔒 THE TERMINAL ISOLATION FIREWALL
// Centrally defined here to avoid circular dependencies
export type TerminalType = 'staff' | 'kitchen' | 'store' | 'manager' | 'ceo' | 'public';

export const TERMINAL_RPC_ACCESS: Record<TerminalType, string[]> = {
    public: [
        'get_my_identity',
        'get_my_branches',
        'get_system_state',
        'get_qr_menu',
        'create_qr_order_gateway',
        'get_order_status',
        'create_payment_intent'
    ],
    staff: [
        'get_system_state',
        'log_inventory_movement'
    ],
    kitchen: [
        'get_kitchen_snapshot',
        'update_order_status'
    ],
    store: [
        'get_inventory_snapshot',
        'get_inventory_levels',
        'log_stock_receipt'
    ],
    manager: [
        'approve_shift',
        'update_inventory',
        'get_manager_snapshot',
        'reject_shift'
    ],
    ceo: [
        'disable_staff',
        'update_branch',
        'get_ceo_snapshot',
        'get_system_snapshot'
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
