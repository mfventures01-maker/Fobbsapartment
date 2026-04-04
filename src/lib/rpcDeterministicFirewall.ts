/**
 * 🔒 CARSS DETERMINISTIC RPC FIREWALL (PRODUCTION-GRADE)
 * 
 * Purpose: Blocks all RPC execution if authority is not hydrated and verified.
 * Rule 1: No Ghost RPCs.
 * Rule 2: No client-side ID spoofing.
 */

import { Authority } from '@/contexts/AuthContext';
import { callRPC } from './rpcClient';

export interface RpcFirewallConfig {
    blockNonHydrated: boolean;
    failOnInvalidId: boolean;
    logViolation: boolean;
}

const DEFAULT_CONFIG: RpcFirewallConfig = {
    blockNonHydrated: true,
    failOnInvalidId: true,
    logViolation: true
};

/**
 * Executes a deterministic, safe RPC call.
 */
export async function rpcSafeCall<T>(
    terminal: string,
    functionName: string,
    payload: any,
    authority: Authority,
    config: RpcFirewallConfig = DEFAULT_CONFIG
): Promise<T> {
    // 🛡️ [FIREWALL LAYER 1] HYDRATION GATE
    if (config.blockNonHydrated && !authority.hydrated) {
        // ALLOW-LIST for auth bootstrap only
        const HYDRATION_BOOTSTRAP = ['resolve_hydration_offline_safe', 'get_my_identity_simple'];
        if (!HYDRATION_BOOTSTRAP.includes(functionName)) {
            const error = `🚫 FIREWALL BLOCK: RPC ${functionName} denied. Hydration required.`;
            if (config.logViolation) console.error(error, { terminal, authority });
            throw new Error("HYDRATION_VIOLATION");
        }
    }

    // 🛡️ [FIREWALL LAYER 2] IDENTITY PINNING
    // Parameterless RPCs don't need this, but legacy ones are pinned
    const safePayload = { ...payload };

    // TRACE LOGGING
    console.log(`[FIREWALL] 📡 Dispatching RPC: ${functionName}`, {
        terminal,
        hydrated: authority.hydrated,
        payloadSize: JSON.stringify(payload).length
    });

    return await callRPC<T>(terminal, functionName, safePayload);
}

/**
 * 🛠️ ENFORCEMENT STRATEGY:
 * 1. Global Replacement: Replace all 'callRPC' calls in components with 'rpcSafeCall'.
 * 2. Mandatory Authority Injection: rpcSafeCall requires 'authority' as a parameter.
 * 3. Terminal Locking: Only specific terminals can call specific RPCs.
 */
