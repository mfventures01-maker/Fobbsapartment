import { createClient } from '@supabase/supabase-js';
import { blockDirectAccess } from './forbidden';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const baseClient = createClient(supabaseUrl, supabaseKey);

export const db = new Proxy({}, {
    get() {
        blockDirectAccess();
    }
});

// 🔒 LOCK DOWN - NO DIRECT TABLE OR CHANNEL ACCESS (Step 3: Realtime Violation Fix)
export const supabase = new Proxy(baseClient, {
    get(target, prop) {
        // Allow auth operations (Sign In/Out/Session)
        if (prop === 'auth') {
            return target[prop as keyof typeof target];
        }

        // BLOCK ALL DIRECT TABLE ACCESS (Step 1)
        if (prop === 'from' || prop === 'insert' || prop === 'update' || prop === 'delete') {
            blockDirectAccess();
        }

        // BLOCK ALL DIRECT CHANNEL ACCESS (Step 3)
        if (prop === 'channel' || prop === 'removeChannel' || prop === 'getSubscriptions') {
            return () => {
                console.error(`[ANTI-GRAVITY VIOLATION] Direct Supabase.channel access is forbidden. Use RPC-only communication.`);
                throw new Error('AntiGravityViolation: Direct realtime access is prohibited under the Drift Zero Protocol.');
            };
        }

        // Allow RPC calls (must move through rpcClient.ts for firewall)
        if (prop === 'rpc') {
            return target.rpc.bind(target);
        }

        // Block everything else by default
        console.warn(`[ANTI-GRAVITY] Access to supabase.${String(prop)} blocked`);
        return undefined;
    }
});

