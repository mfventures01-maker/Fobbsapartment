import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const rawClient = createClient(supabaseUrl, supabaseKey);

export const rpcSchemas: Record<string, { required: string[] }> = {
    confirm_payment_intent: {
        required: ['payment_intent_id', 'amount', 'payment_method', 'staff_id', 'shift_id', 'terminal_type', 'business_id', 'branch_id']
    },
    get_system_state: {
        required: ['p_business_id', 'p_branch_id', 'terminal_type', 'staff_id', 'business_id', 'branch_id']
    },
    log_frontend_error: {
        required: ['rpc', 'payload', 'error', 'terminal_type']
    },
    create_qr_order_gateway: {
        required: ['items', 'business_id', 'terminal_type']
    },
    get_qr_menu: {
        required: ['p_branch_id', 'terminal_type']
    },
    resolve_active_shift: {
        required: ['staff_id', 'terminal_type', 'business_id', 'branch_id']
    },
    create_order_gateway: {
        required: ['p_branch_id', 'terminal_type']
    },
    add_order_item: {
        required: ['p_order_id', 'p_name', 'p_price', 'p_quantity', 'terminal_type']
    },
    apply_discount: {
        required: ['p_order_id', 'p_amount', 'terminal_type']
    },
    update_order_status: {
        required: ['p_order_id', 'p_status', 'terminal_type']
    },
    create_payment_intent: {
        required: ['p_order_id', 'p_amount', 'p_payment_method', 'terminal_type']
    },
    void_order: {
        required: ['p_order_id', 'p_reason', 'terminal_type']
    },
    get_order_details: {
        required: ['p_order_id', 'terminal_type']
    },
    get_order_history: {
        required: ['p_branch_id', 'p_limit', 'p_offset', 'terminal_type']
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
                branch_id: null,
                shift_id: null
            };
        }
        return {
            staff_id: this.currentContext.staffId,
            business_id: this.currentContext.authority?.businessId,
            branch_id: this.currentContext.authority?.branchId,
            branch_id: this.currentContext.locationId,
            shift_id: this.currentContext.shiftId || "unassigned"
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
            _idempotency_key: payload._idempotency_key || crypto.randomUUID()
        };

        // 🛡️ Pre-validation
        this.validatePayload(functionName, fullPayload);

        // 🔐 SHIFT ENFORCEMENT (GLOBAL GATE) for transactional endpoints
        // Note: We avoid infinite recursion by not checking shift for resolve_active_shift
        const isTransactional = ['create_payment_intent', 'create_order_gateway', 'add_order_item'].includes(functionName);
        if (isTransactional && terminal !== 'public' && terminal !== 'ceo' && functionName !== 'resolve_active_shift') {
            if (!context.shift_id || context.shift_id === 'unassigned') {
                throw new Error("🚫 No active shift. Cannot process transaction.");
            }
        }

        console.log(`[RPC] ${functionName} → START`, {
            timestamp: new Date().toISOString(),
            payload: fullPayload
        });

        try {
            const { data, error } = await rawClient.rpc(functionName, fullPayload);

            if (error) {
                throw new Error(`[RPC FAILURE] ${functionName} → ${error.message}`);
            }

            const duration = Date.now() - start;
            console.log(`[RPC] ${functionName} → SUCCESS (${duration}ms)`, {
                timestamp: new Date().toISOString(),
                result: data
            });

            return data as T;
        } catch (err: any) {
            const duration = Date.now() - start;
            console.error(`[RPC] ${functionName} → ERROR (${duration}ms)`, {
                timestamp: new Date().toISOString(),
                payload: fullPayload,
                error: err instanceof Error ? err.message : err
            });

            // Log error to backend as well
            if (functionName !== 'log_frontend_error') {
                rawClient.rpc('log_frontend_error', {
                    rpc: functionName,
                    payload: fullPayload,
                    error: err?.message || String(err),
                    terminal_type: terminal
                });
            }

            throw err;
        }
    }
}

export const rpcClient = new RPCClient();

// Keep legacy exports for compatibility if needed, but point them to the new instance
export const callRPC = <T = any>(terminal: any, fn: string, payload: any) => rpcClient.call<T>(fn, payload, terminal);
export const callRPCWithContext = <T = any>(terminal: any, fn: string, payload: any) => rpcClient.call<T>(fn, payload, terminal);
export const setRPCInjectionContext = (context: any) => rpcClient.setInjectionContext(context);
