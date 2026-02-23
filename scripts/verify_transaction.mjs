import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Signing in... ");
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'ceo@fobbs.com', password: 'Test@1234'
    });

    // Step 1: Query transaction
    console.log("\n--- STEP 1 ---");
    let tx1;
    const { data: t1, error: tx1Err } = await supabase
        .from('transactions')
        .select(`
            id, business_id, department_id, staff_id, amount, payment_type, created_at, order_id, shift_id,
            shifts (id, staff_id, staff_user_id, business_id, ends_at)
        `)
        .eq('order_id', '3f86735f-2a9a-4ee2-9891-ad39db96ba49')
        .order('created_at', { ascending: false })
        .limit(1);

    if (tx1Err) {
        console.log("TX1 Error retrieving specific order_id. User may not have inserted it. Falling back to latest.");
    }

    if (!t1 || t1.length === 0) {
        console.log("Target order_id not found. Attempting to get the absolute latest transaction to verify constraints instead.");
        const { data: latest, error: latErr } = await supabase
            .from('transactions')
            .select(`
                id, business_id, department_id, staff_id, amount, payment_type, created_at, order_id, shift_id,
                shifts (id, staff_id, staff_user_id, business_id, ends_at)
            `)
            .order('created_at', { ascending: false })
            .limit(1);
        if (latest && latest.length > 0) {
            tx1 = latest[0];
            console.log("Found latest transaction instead:", tx1.id);
        } else {
            console.log("No transactions found at all.");
        }
    } else {
        tx1 = t1[0];
    }

    if (tx1) {
        console.log("Transaction Data:", JSON.stringify(tx1, null, 2));
    }

    // Step 2: Confirm business scope
    console.log("\n--- STEP 2 ---");
    const countTarget = tx1?.id || '4d89fd0a-9df0-431c-8e7c-09ba13b7183b';
    const { count, error: countErr } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', '601576d8-9a10-476d-bad1-a1b46f5e830d')
        .eq('id', countTarget);
    console.log(`Count for tx ${countTarget} in business 601576d8-9a10-476d-bad1-a1b46f5e830d:`, count);

    const { data: tx2, error: tx2Err } = await supabase
        .from('transactions')
        .select('*')
        .eq('business_id', '601576d8-9a10-476d-bad1-a1b46f5e830d')
        .order('created_at', { ascending: false })
        .limit(5);

    const results = {
        step1: tx1,
        step2_count: count,
        step3_latest: tx2?.map(t => t.id)
    };
    fs.writeFileSync('verify_results.json', JSON.stringify(results, null, 2), 'utf-8');
    process.exit(0);
}
run();
