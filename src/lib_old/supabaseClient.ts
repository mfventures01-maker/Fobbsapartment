
import { createClient } from "@supabase/supabase-js";

// Fix: Use process.env instead of import.meta.env to resolve TS ImportMeta errors
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://tqcosuyxdynowgwmfsjm.supabase.co";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "tqcosuyxdynowgwmfsjm";

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fix: Use process.env for environment variable checks
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    "Fobbs Apartments: Using default Supabase credentials. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in production."
  );
}