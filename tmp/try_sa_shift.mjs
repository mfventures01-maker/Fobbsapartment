
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tqcosuyxdynowgwmfsjm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxY29zdXl4ZHlub3dnd21mc2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMzQ2NDYsImV4cCI6MjA4NDYxMDY0Nn0.gUEd1mGFvxv-7Fx0DkuYPASZ1s4ng9y7N65ew_BRZoc';

const s = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Signing in as Super Admin...");
    const { data: auth, error: authErr } = await s.auth.signInWithPassword({
        email: 'superadmin@fobbs.com',
        password: 'Test@1234'
    });

    if (authErr) {
        console.error("Auth Fail:", authErr.message);
        return;
    }

    console.log("UID:", auth.user.id);

    console.log("Requesting shift...");
    const { data: shift, error: shiftErr } = await s.rpc('request_shift');
    if (shiftErr) console.error("Shift Error:", JSON.stringify(shiftErr, null, 2));
    else console.log("Shift Success:", JSON.stringify(shift, null, 2));
}

run();
