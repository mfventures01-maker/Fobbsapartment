import { supabase } from './supabaseClient';
import { enforceTerminalAccess } from './rpcFirewall';
import type { TerminalType } from './rpcFirewall';

/**
 * 🚧 FIREWALL-WRAPPED EDGE FUNCTION CALLER
 *
 * Edge Functions are out-of-band admin operations (e.g. creating users, sending outbox).
 * They bypass the RPC path but MUST still pass the terminal access firewall.
 *
 * Usage:
 *   callEdgeFunction('ceo', 'create-staff-user', { email, role })
 */

// Separately tracked Edge Function whitelist per terminal
export const TERMINAL_EDGE_FUNCTION_ACCESS: Record<TerminalType, string[]> = {
    staff: [],
    kitchen: [],
    store: [],
    manager: [],
    ceo: ['create-staff-user', 'deactivate-user', 'update-user-role', 'send-outbox'],
    public: [],
};

export async function callEdgeFunction<T>(
    terminal: TerminalType,
    functionName: string,
    body: Record<string, any>
): Promise<T> {
    // 🚨 ANTI-GRAVITY CHECKPOINT
    const allowed = TERMINAL_EDGE_FUNCTION_ACCESS[terminal];
    if (!allowed || !allowed.includes(functionName)) {
        throw new Error(
            `[ANTI-GRAVITY VIOLATION] Terminal '${terminal}' is not authorized to invoke Edge Function '${functionName}'`
        );
    }

    const { data, error } = await supabase.functions.invoke(functionName, { body });

    if (error) {
        throw new Error(`[EDGE FUNCTION FAILURE] ${functionName} → ${error.message}`);
    }

    return data as T;
}
