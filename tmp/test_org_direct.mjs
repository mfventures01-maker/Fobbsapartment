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

    console.log("Directly querying org by ID...");
    const { data: org, error } = await supabase.from('orgs').select('*').eq('id', '601576d8-9a10-476d-bad1-a1b46f5e830d');
    if (error) console.error("Org Error:", error);
    console.log("Org:", org);
}

run();
