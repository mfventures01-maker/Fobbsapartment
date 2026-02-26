import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envFile = fs.existsSync('.env.production') ? '.env.production' : '.env';
dotenv.config({ path: envFile });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) { console.error("MISSING SERVICE ROLE KEY"); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser(userId) {
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

    const { data: memberships } = await supabase
        .from('business_memberships')
        .select('*')
        .eq('user_id', userId);

    fs.writeFileSync('user_data2.json', JSON.stringify({ profile, memberships }, null, 2), 'utf-8');
}

checkUser('0ff6df72-2349-4fcf-8c81-3731d84676f4');
