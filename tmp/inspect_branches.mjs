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

    console.log("Inspecting branches...");
    const { data: branches, error } = await supabase.from('branches').select('*');
    if (error) {
        console.error("Branch Error:", error);
    } else {
        console.log("Branches:", JSON.stringify(branches, null, 2));
    }
}

run();
