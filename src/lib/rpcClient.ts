// 🛸 ANTI-GRAVITY RPC CLIENT: THE TRUTH GATE
// Purpose: Deterministic RPC transmission with Zero-Tolerance UUID sanitization.
// Law: "If it enters, it is correct. If it is wrong, it never enters."

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const rawClient = createClient(supabaseUrl, supabaseKey);

// ============================================
// 🔒 ANTI-GRAVITY UTILITIES (PHASE 1)
// ============================================

export const isValidUUID = (value: any): boolean => {
    if (!value || typeof value !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
};

export const sanitizeUUID = (value: any): string | null => {
    return isValidUUID(value) ? value : null;
};

const assertValidPayload = (payload: any, rpcName: string) => {
    const invalidFields = Object.entries(payload).filter(([key, value]) => {
        // Check all fields ending in _id or containing id_ or named 'id'
        if (key.includes('_id') || key.includes('id_') || key === 'id') {
            // Forbidden values check (Rogue Strings)
            if (value === "unassigned" || value === "null" || value === "") return true;
            // UUID format check if not null/undefined
            return value !== null && value !== undefined && !isValidUUID(value);
        }
        return false;
    });

    if (invalidFields.length > 0) {
        console.error(`[ANTI-GRAVITY] ❌ INVALID UUID DETECTED in RPC: ${rpcName}`, invalidFields);
        throw new Error(`Payload rejected: invalid UUID detected in ${rpcName}. Rogue values: ${invalidFields.map(f => `${f[0]}=${f[1]}`).join(', ')}`);
    }
};

export const rpcSchemas: Record<string, { required: string[] }> = {
    confirm_payment_intent: {
        required: ['payment_intent_id', 'amount', 'payment_method', 'staff_id', 'shift_id', 'terminal_type', 'business_id', 'branch_id']
    },
    get_system_state: {
        required: ['p_business_id', 'p_branch_id', 'p_terminal_type']
    },
    resolve_active_shift: {
        required: ['p_branch_id']
    },
    create_order_gateway: {
        required: ['p_branch_id', 'p_terminal_type']
    },
    add_order_item: {
        required: ['p_order_id', 'p_name', 'p_price', 'p_quantity', 'p_terminal_type']
    }
};

class RPCClient {
    private currentContext: any = null;

    setInjectionContext(context: any) {
        this.currentContext = context;
    }

    private validatePayload(rpcName: string, payload: any) {
        const schema = rpcSchemas[rpcName];
        if (!schema) {
            console.warn(`[ANTI-GRAVITY] Unregistered RPC schema: ${rpcName}. Bypassing strict validation temporarily.`);
            return;
        }

        for (const field of schema.required) {
            if (!(field in payload)) {
                throw new Error(`🚫 Missing required field: ${field} in RPC: ${rpcName}`);
            }
        }
    }

    private getTerminalContext() {
        if (!this.currentContext) {
            return {
                staff_id: null,
                business_id: null,
                branch_id: null,
                shift_id: null
            };
        }
        return {
            staff_id: sanitizeUUID(this.currentContext.staffId),
            business_id: sanitizeUUID(this.currentContext.authority?.businessId),
            branch_id: sanitizeUUID(this.currentContext.branchId || this.currentContext.locationId),
            shift_id: sanitizeUUID(this.currentContext.shiftId)
        };
    }

    async call<T = any>(functionName: string, payload: any = {}, terminal: string = 'staff'): Promise<T> {
        const start = Date.now();
        const context = this.getTerminalContext();

        // Auto-inject context and idempotency
        const fullPayload = {
            ...payload,
            ...context,
            terminal_type: terminal,
            p_terminal_type: terminal, // Mirror for parameter naming drift
            _idempotency_key: payload._idempotency_key || payload.p_idempotency_key || crypto.randomUUID()
        };

        // 🛡️ ANTI-GRAVITY ENFORCEMENT (PHASE 2-3)
        assertValidPayload(fullPayload, functionName);
        this.validatePayload(functionName, fullPayload);

        // 🔐 SHIFT ENFORCEMENT (GLOBAL GATE)
        const isTransactional = ['create_payment_intent', 'create_order_gateway', 'add_order_item'].includes(functionName);
        if (isTransactional && terminal !== 'public' && terminal !== 'ceo' && functionName !== 'resolve_active_shift') {
            if (!fullPayload.shift_id) {
                throw new Error("🚫 No active shift found in Payload. Transaction blocked.");
            }
        }

        console.log(`[RPC] ${functionName} → START`, fullPayload);

        try {
            const { data, error } = await rawClient.rpc(functionName, fullPayload);

            if (error) {
                console.error(`[RPC] ${functionName} → ERROR`, error);
                throw new Error(`[RPC FAILURE] ${functionName} → ${error.message}`);
            }

            const duration = Date.now() - start;
            console.log(`[RPC] ${functionName} → SUCCESS ✅ (${duration}ms)`, data);

            return data as T;
        } catch (err: any) {
            const duration = Date.now() - start;
            console.error(`[RPC] ${functionName} → FAILURE 💥 (${duration}ms)`, {
                error: err instanceof Error ? err.message : err,
                payload: fullPayload
            });

            // Log error to backend if needed
            if (functionName !== 'log_frontend_error') {
                const logPayload = {
                    rpc: functionName,
                    payload: fullPayload,
                    error: err?.message || String(err),
                    terminal_type: terminal
                };

                // Use .then() to avoid lint issues with .catch() on fire-and-forget
                rawClient.rpc('log_frontend_error', logPayload).then(({ error: logErr }) => {
                    if (logErr) console.warn('[RPC] Error logging failure:', logErr);
                });
            }

            throw err;
        }
    }
}

export const rpcClient = new RPCClient();

export const callRPC = <T = any>(terminal: any, fn: string, payload: any) => rpcClient.call<T>(fn, payload, terminal);
export const callRPCWithContext = <T = any>(terminal: any, fn: string, payload: any) => rpcClient.call<T>(fn, payload, terminal);
export const setRPCInjectionContext = (context: any) => rpcClient.setInjectionContext(context);
