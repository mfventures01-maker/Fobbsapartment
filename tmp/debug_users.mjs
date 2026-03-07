
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tqcosuyxdynowgwmfsjm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxY29zdXl4ZHlub3dnd21mc2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMzQ2NDYsImV4cCI6MjA4NDYxMDY0Nn0.gUEd1mGFvxv-7Fx0DkuYPASZ1s4ng9y7N65ew_BRZoc';

const s = createClient(supabaseUrl, supabaseKey);

async function findUsers() {
    console.log("Signing in as CEO...");
    const { data: auth, error: authErr } = await s.auth.signInWithPassword({
        email: 'ceo@fobbs.com',
        password: 'Test@1234'
    });

    if (authErr) {
        console.error("Auth Fail:", authErr.message);
        return;
    }

    console.log("Fetching memberships...");
    const { data: members, error: memErr } = await s.from('business_memberships').select('*').limit(10);
    if (memErr) console.error("Mem Err:", memErr.message);
    else console.log("Memberships:", JSON.stringify(members, null, 2));

    console.log("Fetching profiles...");
    const { data: profiles, error: profErr } = await s.from('profiles').select('*').limit(10);
    if (profErr) console.error("Prof Err:", profErr.message);
    else console.log("Profiles:", JSON.stringify(profiles, null, 2));
}

findUsers();
