
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

    const user = auth.user;
    console.log("UID:", user.id);

    console.log("Checking memberships...");
    const { data: members } = await s.from('business_memberships').select('*');
    console.log("Memberships:", JSON.stringify(members, null, 2));

    if (!members || members.length === 0) {
        console.log("No membership found. Updating profile with context...");
        const { data: profiles, error: profErr } = await s.from('profiles').update({
            branch_id: '629000ff-8a27-46e3-9eba-b603207565af',
            department: 'bar'
        }).eq('user_id', user.id).select();

        if (profErr) console.error("Prof Update Error:", profErr.message);
        else console.log("Profile updated:", JSON.stringify(profiles, null, 2));
    } else {
        console.log("Existing membership found. Updating it...");
        const { data: updated, error: updateErr } = await s.from('business_memberships').update({
            branch_id: '629000ff-8a27-46e3-9eba-b603207565af',
            department_id: 'bar'
        }).eq('user_id', user.id).select();

        if (updateErr) console.error("Update Err:", updateErr.message);
        else console.log("Updated Membership:", JSON.stringify(updated, null, 2));
    }

    console.log("Trying request_shift RPC...");
    const { data: shift, error: shiftErr } = await s.rpc('request_shift');
    if (shiftErr) console.error("Shift Error:", JSON.stringify(shiftErr, null, 2));
    else console.log("Shift Data:", JSON.stringify(shift, null, 2));
}

run();
