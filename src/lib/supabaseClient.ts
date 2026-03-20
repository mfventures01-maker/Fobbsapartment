import { createClient } from '@supabase/supabase-js';
import { forbiddenQuery } from './forbidden';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const baseClient = createClient(supabaseUrl, supabaseKey);

// 🔒 LOCK DOWN - NO DIRECT TABLE ACCESS
export const supabase = new Proxy(baseClient, {
    get(target, prop) {
        // Allow auth and channel operations (these are safe)
        if (prop === 'auth' || prop === 'channel' || prop === 'removeChannel') {
            return target[prop as keyof typeof target];
        }

        // BLOCK ALL TABLE ACCESS
        if (prop === 'from') {
            return forbiddenQuery;
        }

        // Allow RPC calls only
        if (prop === 'rpc') {
            return target.rpc.bind(target);
        }

        // Block everything else by default
        console.warn(`[ANTI-GRAVITY] Access to supabase.${String(prop)} blocked`);
        return undefined;
    }
});
