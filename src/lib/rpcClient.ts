// 🛸 ANTI-GRAVITY RPC CLIENT: THE TRUTH GATE
// Purpose: Deterministic RPC transmission with Zero-Tolerance UUID sanitization.
// Law: "If it enters, it is correct. If it is wrong, it never enters."

import { supabase as rawClient } from './supabaseClient';
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

// ============================================
// 🔒 ANTI-GRAVITY SCHEMAS (PHASE 2)
// ============================================

export const rpcSchemas: Record<string, { required: string[] }> = {
    // ─── IDENTITY & AUTH (READ — no required mutation fields) ───────────────
    get_my_identity_simple: { required: [] },
    resolve_hydration_offline_safe: { required: [] },
    get_my_branches: { required: [] },
    get_intent_by_id: { required: ['p_intent_id'] },

    // ─── MENU (READ) ────────────────────────────────────────────────────────
    get_qr_menu: { required: ['p_branch_id'] },
    get_order_status: { required: ['p_order_id'] },

    // ─── ORDER GATEWAYS (MUTATION) ──────────────────────────────────────────
    create_qr_order_gateway: {
        required: ['p_org_id', 'p_branch_id', 'p_cart']
    },
    universal_order_gateway: {
        required: ['p_items'] // Zero-trust: business, branch, staff resolved on server
    },
    add_order_item: {
        required: ['p_order_id', 'p_name', 'p_price', 'p_quantity']
    },

    // ─── PAYMENT (MUTATION) ─────────────────────────────────────────────────
    settle_order: {
        required: ['p_order_id', 'p_payment_type']
    },
    create_payment_intent: {
        required: ['p_order_id', 'p_payment_type']
    },
    settle_order_v2: {
        required: ['p_order_id', 'p_payment_type']
    },
    confirm_payment_intent: {
        required: ['p_intent_id']
    },

    // ─── SHIFT LIFECYCLE (MUTATION) ─────────────────────────────────────────
    open_staff_shift: {
        required: ['p_business_id', 'p_branch_id', 'p_staff_id']
    },
    resolve_active_shift: {
        required: [] // Parameterless
    },
    end_shift: {
        required: []   // shift_id injected from context
    },
    submit_shift_declaration: {
        required: ['p_shift_id', 'p_cash', 'p_pos', 'p_transfer']
    },

    // ─── MANAGER ACTIONS (MUTATION) ─────────────────────────────────────────
    approve_shift_close: { required: ['p_shift_id'] },
    approve_shift_open: { required: ['p_shift_id'] },
    reject_shift_open: { required: ['p_shift_id', 'p_reason'] },

    // ─── SYSTEM STATE (READ) ────────────────────────────────────────────────
    get_system_state: {
        required: ['payload'] // Hotel Edition: Single JSONB payload
    },

    // ─── LOGGING (FIRE-AND-FORGET) ───────────────────────────────────────────
    log_deterministic_event: {
        required: ['p_branch_id', 'p_terminal_type', 'p_event_type', 'p_rpc_name', 'p_payload', 'p_identity']
    },
    log_frontend_error: {
        required: ['rpc', 'payload', 'error', 'terminal_type']
    }
};

/**
 * 🇳🇬 NIGERIAN CURRENCY NORMALIZATION
 * Prevents floating point errors by converting Naira (decimal) to Kobo (integer).
 */
const normalizeNairaToKobo = (payload: any) => {
    const amountFields = ['amount', 'p_amount', 'p_declaration_amount', 'p_price', 'total', 'subtotal'];
    const normalized = { ...payload };

    Object.keys(normalized).forEach(key => {
        if (amountFields.includes(key) && typeof normalized[key] === 'number') {
            // If it's already a large integer (likely kobo), don't multiply again
            // Standard NGN transactions don't exceed 100M Naira (10B kobo)
            if (normalized[key] % 1 !== 0 || normalized[key] < 1000000) {
                normalized[key] = Math.round(normalized[key] * 100);
            }
        }
    });

    return normalized;
};

const assertValidPayload = (payload: any, rpcName: string) => {
    // Keys that contain '_id' as substring but are NOT UUID entity references
    const UUID_EXEMPT_KEYS = new Set(['_idempotency_key', 'p_idempotency_key', 'terminal_type', 'p_terminal_type']);

    const invalidFields = Object.entries(payload).filter(([key, value]) => {
        // 🛡️ UUID SANITIZATION — only check actual entity reference fields
        if (!UUID_EXEMPT_KEYS.has(key) && (key.includes('_id') || key.includes('id_') || key === 'id')) {
            if (value === "unassigned" || value === "null" || value === "") return true;
            return value !== null && value !== undefined && typeof value !== 'object' && !isValidUUID(value);
        }

        // 🇳🇬 NIGERIAN AMOUNT VALIDATION
        const amountFields = ['amount', 'p_amount', 'p_declaration_amount', 'p_price', 'total'];
        if (amountFields.includes(key) && typeof value === 'number') {
            // Anti-Gravity: Forbidden Float Law
            if (value % 1 !== 0) return true;
        }

        return false;
    });

    if (invalidFields.length > 0) {
        console.error(`[ANTI-GRAVITY] ❌ INVALID PAYLOAD DETECTED in ${rpcName}`, invalidFields);
        throw new Error(`Payload rejected: invalid data type (UUID/Float) in ${rpcName}. ${invalidFields.map(f => `${f[0]}=${f[1]}`).join(', ')}`);
    }
};

class RPCClient {
    private currentContext: any = null;

    setInjectionContext(context: any) {
        this.currentContext = context;
    }

    // ⛔ ANTI-GRAVITY LAW §4: Hydration gate check
    // If the authority object exists in context, block transactional calls until hydrated.
    private assertHydrated(functionName: string, terminal: string): void {
        // Public/read operations are always allowed
        const PUBLIC_RPC_ALLOWLIST = new Set([
            'get_my_identity_simple',
            'resolve_hydration_offline_safe'
        ]);
        if (terminal === 'public' || PUBLIC_RPC_ALLOWLIST.has(functionName)) return;

        const authority = this.currentContext?.authority;
        const isBlocked = authority && authority.hydrated === false;

        // ─── TRACE POINT 7: RPC FIREWALL CHECK ──────────────────────────────
        console.log('[HYDRATION_TRACE] RPC_FIREWALL', JSON.stringify({
            rpcName: functionName,
            blocked: !!isBlocked,
            reason: isBlocked ? 'NOT_HYDRATED' : null
        }));

        if (isBlocked) {
            throw new Error(
                `⛔ [HYDRATION GATE] RPC "${functionName}" blocked. ` +
                `Identity not yet hydrated by backend. Wait for authority.hydrated=true.`
            );
        }
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
        // ⛔ ANTI-GRAVITY LAW §4: Hydration gate — first check, no exceptions
        this.assertHydrated(functionName, terminal);

        const start = Date.now();
        const context = this.getTerminalContext();

        // Auto-inject context and idempotency
        let fullPayload: any;

        // 🛡️ [ANTI-GRAVITY] 🇳🇬 NORMALIZE NAIRA -> KOBO
        const basePayload = normalizeNairaToKobo({
            ...payload,
            ...context,
            terminal_type: terminal,
            p_terminal_type: terminal, // Mirror for parameter naming drift
            _idempotency_key: payload._idempotency_key || payload.p_idempotency_key || crypto.randomUUID()
        });

        if (functionName === 'resolve_active_shift') {
            // 🛡️ [ANTI-GRAVITY] DETERMINISTIC SHIFT ENGINE (LAYER 4)
            // Parameterless RPC: Rely entirely on auth.uid() internally.
            fullPayload = {};
        } else if (functionName === 'universal_order_gateway' || functionName === 'settle_order_v2') {
            // 🛡️ [ANTI-GRAVITY] ZERO-TRUST GATEWAY (LAYER 5)
            // Resolve all IDs (branch, staff, shift) from database truth.
            fullPayload = payload;
        } else if (functionName === 'create_qr_order_gateway') {
            // 🛸 SURGEON PROTOCOL: EXACT 12-KEY ALIGNMENT
            fullPayload = payload;

            console.log('🛸 RPC PAYLOAD', JSON.stringify(fullPayload, null, 2));
            const keys = Object.keys(fullPayload);
            if (keys.length !== 12 || !keys.every(k => k.startsWith('p_'))) {
                console.error("Payload Structure Failed:", Object.keys(fullPayload));
                throw new Error("🚫 STRICT PAYLOAD VIOLATION: create_qr_order_gateway payload must contain EXACTLY 12 matching keys.");
            }
        } else {
            if (functionName === 'get_active_shift') {
                console.warn("[DEPRECATED] get_active_shift call detected. Routing should favor resolve_active_shift.");
            }
            fullPayload = basePayload;
        }

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

        console.log(`[RPC] ${functionName} → ATTEMPT`, fullPayload);

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

            // 🛡️ [ANTI-GRAVITY] OFFLINE QUEUEING
            // Nigerian connectivity gap: Queue for replay if transactional.
            import('./offlineRpcQueue').then(({ offlineQueue }) => {
                offlineQueue.enqueue(terminal, functionName, fullPayload);
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
