import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Logging in as CEO...");
    const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
        email: 'ceo@fobbs.com',
        password: 'Test@1234'
    });

    if (authError) {
        console.error("Auth Error:", authError);
        return;
    }

    console.log("Logged in. Inspecting locations...");
    const { data: locations, error: locError } = await supabase.from('locations').select('*');
    if (locError) {
        console.error("Location Error:", locError);
    } else {
        console.log("Locations:", JSON.stringify(locations, null, 2));
    }

    console.log("Inspecting orders (last 5)...");
    const { data: orders, error: orderError } = await supabase.from('orders').select('id, location_id, created_at').order('created_at', { ascending: false }).limit(5);
    if (orderError) {
        console.error("Order Error:", orderError);
    } else {
        console.log("Orders:", JSON.stringify(orders, null, 2));
    }
}

run();
