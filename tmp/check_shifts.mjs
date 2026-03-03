
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read VITE_ variables from .env manually to be safe
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1];
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1];

const supabase = createClient(url, key);

async function checkShifts() {
    console.log("Checking shifts table structure...");
    const { data: cols, error: colError } = await supabase
        .from('shifts')
        .select('*')
        .limit(1);

    if (colError) {
        console.error("Error accessing shifts:", colError);
        return;
    }

    if (cols && cols.length > 0) {
        console.log("Columns found:", Object.keys(cols[0]));
    } else {
        console.log("No rows in shifts table. Checking if we can get info from metadata...");
        // Try to insert a very minimal row to see what fails or works?
        // Actually, let's just check the migrations again very carefully.
    }
}

checkShifts();
