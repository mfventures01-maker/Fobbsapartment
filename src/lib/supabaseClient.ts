
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey && !supabaseAnonKey.includes('<PUBLIC_ANON_KEY_FROM_SUPABASE>')) {
    try {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
    } catch (error) {
        console.error("Failed to initialize Supabase client:", error);
    }
} else {
    console.warn("Supabase functionality is disabled: invalid or missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
    if (supabaseAnonKey?.includes('<PUBLIC_ANON_KEY_FROM_SUPABASE>')) {
        console.error("CRITICAL: .env file has placeholder VITE_SUPABASE_ANON_KEY. Please update it with the real key.");
    }
}

export { supabase };
