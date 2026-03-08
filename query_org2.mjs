import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: orgs } = await supabase.from('orgs').select('*');
    console.log("Orgs:", orgs);

    if (orgs && orgs.length > 0) {
        const { data: locations } = await supabase.from('locations').select('*').eq('org_id', orgs[0].id);
        console.log("Locations:", locations);
    }
}
run();
