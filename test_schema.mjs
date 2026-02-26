import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });
dotenv.config({ path: resolve(__dirname, '.env.production') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tqcosuyxdynowgwmfsjm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Checking Schema for business_memberships...");
    const { data: cols, error } = await supabase.from('business_memberships').select('*').limit(1);
    console.log("business_memberships:", cols, error ? error.message : "");

    console.log("Checking profiles...");
    const { data: pCols, error: pError } = await supabase.from('profiles').select('*').limit(1);
    console.log("profiles:", pCols, pError ? pError.message : "");

    console.log("Checking current_user_role()...");
    const { data: roleData, error: roleError } = await supabase.rpc('current_user_role');
    console.log("current_user_role:", roleData, roleError ? roleError.message : "");
}

checkSchema();
