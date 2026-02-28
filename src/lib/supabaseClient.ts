import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) throw new Error("Missing VITE_SUPABASE_URL environment variable.");
if (!supabaseAnonKey) throw new Error("Missing VITE_SUPABASE_ANON_KEY environment variable.");
if (supabaseAnonKey.includes('<PUBLIC_ANON_KEY_FROM_SUPABASE>')) {
    throw new Error("CRITICAL: .env file has placeholder VITE_SUPABASE_ANON_KEY. Please update it with the real key.");
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    }
});

export { supabase };
