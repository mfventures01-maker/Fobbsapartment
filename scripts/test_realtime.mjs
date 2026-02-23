import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log("Signing in as ceo@fobbs.com...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'ceo@fobbs.com',
        password: 'Test@1234'
    });

    if (authError) {
        console.error("Auth error:", authError);
        return;
    }

    console.log("Logged in successfully. Getting business_id...");
    const { data: profile } = await supabase.from('business_memberships').select('business_id').eq('user_id', authData.user.id).single();

    const businessId = profile?.business_id || '601576d8-9a10-476d-bad1-a1b46f5e830d';

    const { data: branches } = await supabase.from('branches').select('id').eq('business_id', businessId).limit(1);
    const branchId = branches?.[0]?.id || null;

    console.log(`Inserting for Business: ${businessId}, Branch: ${branchId}`);

    console.log("Waiting 30s for dashboard to load...");
    await new Promise(r => setTimeout(r, 30000));

    // A: Insert Orphan Transaction
    console.log("A) Inserting Orphan Transaction (88800 POS)...");
    const { data: tx1, error: tx1Err } = await supabase.from('transactions').insert({
        business_id: businessId, branch_id: branchId, department_id: 'restaurant',
        staff_id: authData.user.id, amount: 88800, payment_type: 'pos', status: 'verified'
    });
    if (tx1Err) console.error("TX1 Error:", tx1Err);

    await new Promise(r => setTimeout(r, 3000));

    // B: Insert Missing Transaction Intent
    console.log("B) Inserting Payment Intent (Pending, 50000 Transfer)...");
    const orderId = crypto.randomUUID();
    const { data: intent, error: piError } = await supabase.from('payment_intents').insert({
        business_id: businessId, branch_id: branchId, staff_id: authData.user.id,
        expected_amount: 50000, payment_type: 'transfer', status: 'pending', order_id: orderId
    }).select().single();
    if (piError) { console.error("PI Error:", piError); return; }

    await new Promise(r => setTimeout(r, 3000));

    // C: Insert Matching Transaction
    console.log("C) Inserting Matching Transaction (50000 Transfer)...");
    const { error: tx2Err } = await supabase.from('transactions').insert({
        business_id: businessId, branch_id: branchId, department_id: 'front_desk',
        staff_id: authData.user.id, amount: 50000, payment_type: 'transfer', status: 'verified',
        payment_intent_id: intent.id
    });
    if (tx2Err) console.error("TX2 Error:", tx2Err);

    console.log("Live Test Data Injection Complete.");
}

run();
