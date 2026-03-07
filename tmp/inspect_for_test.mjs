import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tqcosuyxdynowgwmfsjm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxY29zdXl4ZHlub3dnd21mc2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMzQ2NDYsImV4cCI6MjA4NDYxMDY0Nn0.gUEd1mGFvxv-7Fx0DkuYPASZ1s4ng9y7N65ew_BRZoc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    await supabase.auth.signInWithPassword({ email: 'superadmin@fobbs.com', password: 'Test@1234' });
    const { data: profiles } = await supabase.from('profiles').select('user_id, email').limit(10);

    for (const p of profiles) {
        if (!p.email) continue;
        const { data, error } = await supabase.auth.signInWithPassword({ email: p.email, password: 'Test@1234' });
        if (!error) {
            console.log(`Successfully logged in as ${p.email}`);
        } else {
            console.log(`Failed to log in as ${p.email}: ${error.message}`);
        }
    }
}
run();
