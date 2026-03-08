import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // try to get 1 location and 1 org
    const { data: orgs } = await supabase.from('orgs').select('*').limit(1);
    console.log("Orgs:", orgs);
    const { data: locations } = await supabase.from('locations').select('*').limit(1);
    console.log("Locations:", locations);
}
run();
