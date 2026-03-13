import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Logging in as CEO...");
    await supabase.auth.signInWithPassword({
        email: 'ceo@fobbs.com',
        password: 'Test@1234'
    });

    console.log("Inspecting orders (last 5)...");
    const { data: orders } = await supabase.from('orders').select('id, org_id, location_id, created_at').order('created_at', { ascending: false }).limit(5);
    console.log("Orders:", JSON.stringify(orders, null, 2));
}

run();
