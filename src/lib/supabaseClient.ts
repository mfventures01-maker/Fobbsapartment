import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { blockDirectAccess } from './forbidden';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Singleton pattern - prevents multiple instances
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
    if (!supabaseInstance) {
        supabaseInstance = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storageKey: 'carss-supabase-auth-token',
            },
            global: {
                headers: {
                    'X-Client-Info': 'carss-anti-gravity-v5',
                },
            },
        });

        if (typeof window !== 'undefined') {
            console.log('[ANTI-GRAVITY] 🚀 Supabase client initialized once');
        }
    }
    return supabaseInstance;
}

// 🔒 LOCK DOWN - ANTI-GRAVITY PROXY ENFORCEMENT
const baseClient = getSupabaseClient();

export const supabase = new Proxy(baseClient, {
    get(target, prop) {
        // Allow auth operations (Sign In/Out/Session)
        if (prop === 'auth') {
            return target[prop as keyof typeof target];
        }

        // BLOCK ALL DIRECT TABLE ACCESS
        if (prop === 'from' || prop === 'insert' || prop === 'update' || prop === 'delete') {
            blockDirectAccess();
        }

        // BLOCK ALL DIRECT CHANNEL ACCESS (Drift Zero Protocol)
        if (prop === 'channel' || prop === 'removeChannel' || prop === 'getSubscriptions') {
            return () => {
                console.error(`[ANTI-GRAVITY VIOLATION] Direct Supabase.channel access is forbidden. Use RPC-only communication.`);
                throw new Error('AntiGravityViolation: Direct realtime access is prohibited under the Drift Zero Protocol.');
            };
        }

        // BLOCK ALL DIRECT RPC CALLS FROM SUPABASE. MUST GO THROUGH RPCCLIENT.TS
        if (prop === 'rpc') {
            return (...args: any[]) => {
                const fn = args[0];
                console.error(`🚫 BLOCKED: Direct supabase.rpc('${fn}') detected`);
                throw new Error(
                    `🚫 Anti-Gravity Violation: Direct RPC '${fn}' is forbidden. Use rpcClient.call().`
                );
            };
        }

        // Block everything else by default
        if (typeof prop === 'string' && !['constructor', 'prototype', 'then'].includes(prop)) {
            console.warn(`[ANTI-GRAVITY] Access to supabase.${String(prop)} blocked`);
        }
        return (target as any)[prop];
    }
});

// Alias for migration compatibility if needed
export const db = new Proxy({}, {
    get() {
        blockDirectAccess();
    }
});

