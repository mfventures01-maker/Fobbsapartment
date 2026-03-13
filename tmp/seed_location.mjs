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

    // Try to get column names by querying a non-existent row
    console.log("Inspecting locations schema...");
    const { data, error } = await supabase.from('locations').select('*').limit(1);

    // We can't see columns if no rows exist via JS client easily unless we have the types or error message.
    // But we can try to insert the "deterministic" location to see if it works.

    console.log("Attempting to insert deterministic location...");
    const deterministicLocation = {
        id: '7b18c9c0-324a-4c7c-a582-8ca06c83d1d8',
        org_id: '601576d8-9a10-476d-bad1-a1b46f5e830d',
        name: 'Fobbs Bar Service',
        city: 'Asaba',
        address: 'Asaba Central District'
    };

    const { data: insertData, error: insertError } = await supabase.from('locations').upsert(deterministicLocation);

    if (insertError) {
        console.error("Insert Error:", insertError);
    } else {
        console.log("Insert Success:", insertData);
    }

    // Check locations again
    const { data: locations } = await supabase.from('locations').select('*');
    console.log("Locations now:", JSON.stringify(locations, null, 2));
}

run();
