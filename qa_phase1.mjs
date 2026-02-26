import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });
dotenv.config({ path: resolve(__dirname, '.env.production') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tqcosuyxdynowgwmfsjm.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runPhase1() {
    console.log("=== PHASE 1: Role Resolution Determinism ===");

    // Login as Super Admin (from previous context, we know this is superadmin@fobbs.com / Test@1234)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'superadmin@fobbs.com',
        password: 'Test@1234'
    });

    if (authError) {
        console.error("Login failed:", authError.message);
        return;
    }

    console.log("Login successful. User ID:", authData.user.id);

    // Trigger a request that queries businesses
    const { data: bData, error: bError } = await supabase.from('businesses').select('*');

    if (bError) {
        console.error("Businesses query failed:", bError.message);
    } else {
        console.log(`Businesses query successful. Fetched ${bData.length} records.`);
        console.log("Business IDs:", bData.map(b => b.id).join(", "));
    }

    // Confirm current_user_role() resolves to super_admin
    const { data: roleData, error: roleError } = await supabase.rpc('current_user_role');

    if (roleError) {
        console.error("current_user_role() failed:", roleError.message);
    } else {
        console.log("current_user_role() resolved to:", roleData);
    }
}

runPhase1();
