import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: orgs } = await supabase.from('orgs').select('*');
    const { data: locations } = await supabase.from('locations').select('*');
    const fs = await import('fs');
    fs.writeFileSync('db_dump.json', JSON.stringify({ orgs, locations }, null, 2));
}
run();
