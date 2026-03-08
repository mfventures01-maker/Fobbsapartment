import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: orgs, error } = await supabase.from('orgs').select('*').eq('id', '601576d8-9a10-476d-bad1-a1b46f5e830d');
    console.log("Orgs Check:", orgs, error);
}
run();
