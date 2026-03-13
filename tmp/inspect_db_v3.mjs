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

    console.log("Logged in. Inspecting orgs...");
    const { data: orgs, error: orgError } = await supabase.from('orgs').select('*');
    if (orgError) {
        console.error("Org Error:", orgError);
    } else {
        console.log("Orgs:", JSON.stringify(orgs, null, 2));
    }

    console.log("Inspecting businesses...");
    const { data: biz, error: bizError } = await supabase.from('businesses').select('*');
    if (bizError) {
        console.error("Biz Error:", bizError);
    } else {
        console.log("Businesses:", JSON.stringify(biz, null, 2));
    }

    console.log("Inspecting locations...");
    const { data: locations, error: locError } = await supabase.from('locations').select('*');
    if (locError) {
        console.error("Location Error:", locError);
    } else {
        console.log("Locations:", JSON.stringify(locations, null, 2));
    }
}

run();
