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
    await supabase.auth.signInWithPassword({
        email: 'ceo@fobbs.com', password: 'Test@1234'
    });

    // Step 1: Specific query from prompt
    const { data: txList } = await supabase
        .from('transactions')
        .select(`*`)
        .eq('order_id', '3f86735f-2a9a-4ee2-9891-ad39db96ba49')
        .order('created_at', { ascending: false })
        .limit(1);

    let tx1;
    if (txList && txList.length > 0) {
        tx1 = txList[0];
    } else {
        // Fallback to the ID mentioned or latest
        const { data: latestList } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', '4d89fd0a-9df0-431c-8e7c-09ba13b7183b');
        if (latestList && latestList.length > 0) {
            tx1 = latestList[0];
        } else {
            const { data: backup } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(1);
            if (backup) tx1 = backup[0];
        }
    }

    if (tx1 && tx1.shift_id) {
        const { data: sData } = await supabase.from('shifts').select('*').eq('id', tx1.shift_id).single();
        tx1.shifts = sData;
    }

    // Step 2 & 3
    const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', '601576d8-9a10-476d-bad1-a1b46f5e830d')
        .eq('id', '4d89fd0a-9df0-431c-8e7c-09ba13b7183b');

    const { data: tx2 } = await supabase
        .from('transactions')
        .select('id, created_at, business_id')
        .eq('business_id', '601576d8-9a10-476d-bad1-a1b46f5e830d')
        .order('created_at', { ascending: false })
        .limit(5);

    const results = {
        tx: tx1,
        count: count,
        dashboard_ids: tx2?.map(t => t.id)
    };

    fs.writeFileSync('verify_results.json', JSON.stringify(results, null, 2), 'utf-8');
    process.exit(0);
}

run();
