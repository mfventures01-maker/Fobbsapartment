import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Checking DB connection and schema cache...");

    // sign in as ceo
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'ceo@fobbs.com', password: 'Test@1234'
    });
    if (authErr) { console.error("Login failed:", authErr.message); return; }

    // check transactions
    const { error: txErr } = await supabase.from('transactions').select('id').limit(1);
    console.log("transactions table:", txErr ? txErr.message : "Exists");

    // check payment_intents
    const { error: piErr } = await supabase.from('payment_intents').select('id').limit(1);
    console.log("payment_intents table:", piErr ? piErr.message : "Exists");

    // check dashboard_financial_integrity
    const { error: dashErr } = await supabase.from('dashboard_financial_integrity').select('*').limit(1);
    console.log("dashboard_financial_integrity view:", dashErr ? dashErr.message : "Exists");

}

run();
