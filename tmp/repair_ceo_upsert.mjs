
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tqcosuyxdynowgwmfsjm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxY29zdXl4ZHlub3dnd21mc2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMzQ2NDYsImV4cCI6MjA4NDYxMDY0Nn0.gUEd1mGFvxv-7Fx0DkuYPASZ1s4ng9y7N65ew_BRZoc';

const s = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Signing in as CEO...");
    const { data: auth, error: authErr } = await s.auth.signInWithPassword({
        email: 'ceo@fobbs.com',
        password: 'Test@1234'
    });

    if (authErr) {
        console.error("Auth Fail:", authErr.message);
        return;
    }

    const user = auth.user;

    console.log("Updating membership via upsert...");
    const { data: updated, error: updateErr } = await s.from('business_memberships').insert({
        user_id: user.id,
        business_id: '601576d8-9a10-476d-bad1-a1b46f5e830d',
        branch_id: '629000ff-8a27-46e3-9eba-b603207565af',
        department_id: 'bar',
        role: 'ceo'
    }, { onConflict: 'user_id, business_id' }).select();

    if (updateErr) console.error("Upsert Err:", updateErr.message);
    else console.log("Upsert Success:", JSON.stringify(updated, null, 2));

    console.log("Trying request_shift RPC...");
    const { data: shift, error: shiftErr } = await s.rpc('request_shift');
    if (shiftErr) console.error("Shift Error:", JSON.stringify(shiftErr, null, 2));
    else console.log("Shift Success:", JSON.stringify(shift, null, 2));
}

run();
