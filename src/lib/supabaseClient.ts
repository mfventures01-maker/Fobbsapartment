import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const baseClient: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// === ANTI-GRAVITY BRIDGE ===
if (typeof window !== "undefined") {
    Object.defineProperty(window, "__carss__", {
        value: {
            getClient: () => baseClient,
            timestamp: Date.now()
        },
        writable: false,
        configurable: false
    });

    console.log("🛸 CARSS PORTAL: STABLE");
}

export const supabase = baseClient;
