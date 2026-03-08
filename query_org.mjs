import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: orgs } = await supabase.from('businesses').select('*');
    console.log("Businesses:", orgs);

    if (orgs && orgs.length > 0) {
        const { data: branches } = await supabase.from('branches').select('*').eq('business_id', orgs[0].id);
        console.log("Branches:", branches);
    }
}
run();
