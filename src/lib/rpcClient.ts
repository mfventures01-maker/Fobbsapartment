import { supabase } from './supabaseClient';
import { enforceTerminalAccess } from './rpcFirewall';
import type { TerminalType } from './rpcFirewall';

// Re-export TerminalType so consumers can import from a single place
export type { TerminalType };

const PUBLIC_RPC_ALLOWLIST = [
    "get_qr_menu",
    "create_qr_order_gateway"
];

/**
 * 🚨 THE ONLY WAY ANY RPC CAN EXECUTE — CARSS Central Nervous System
 *
 * Usage:
 *   callRPC<ResponseType>('staff', 'rpc_function_name', { p_key: 'value' })
 *
 * ALL of the following are enforced before execution:
 *   1. Terminal is authorized to call the RPC (firewall)
 *   2. Idempotency key is always present
 *   3. Hard throw on any backend error (no silent pass)
 */
export async function callRPC<T>(
    terminal: TerminalType,
    functionName: string,
    payload: Record<string, any>
): Promise<T> {
    // 🛡️ STEP 0: SESSION GUARD (Temporal Integrity)
    // Prevents "trying to work" before authentication exists.
    const { data: { session } } = await supabase.auth.getSession();
    const isAuthenticated = !!session?.user;
    const isPublicRPC = PUBLIC_RPC_ALLOWLIST.includes(functionName);

    // BLOCK unauthenticated RPCs that aren't public
    if (!isAuthenticated && !isPublicRPC) {
        throw new Error(`[ANTI-GRAVITY] RPC BLOCKED: ${functionName} requires authentication`);
    }

    // 🚨 ANTI-GRAVITY CHECKPOINT — TERMINAL ACCESS FIREWALL (MANDATORY)
    enforceTerminalAccess(terminal, functionName);

    // 🧬 ENSURE IDEMPOTENCY ON EVERY CALL
    if (!payload._idempotency_key) {
        payload._idempotency_key = crypto.randomUUID();
    }

    // 🔗 EXECUTE RPC — Only path to Supabase RPC in the entire codebase
    const { data, error } = await supabase.rpc(functionName, payload);

    // 💥 HARD FAILURE — errors NEVER silently pass
    if (error) {
        throw new Error(`[RPC FAILURE] ${functionName} → ${error.message}`);
    }

    return data as T;
}
