
const supabaseUrl = 'https://tqcosuyxdynowgwmfsjm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxY29zdXl4ZHlub3dnd21mc2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMzQ2NDYsImV4cCI6MjA4NDYxMDY0Nn0.gUEd1mGFvxv-7Fx0DkuYPASZ1s4ng9y7N65ew_BRZoc';

async function run() {
    console.log("Signing in as Super Admin...");
    const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
        body: JSON.stringify({ email: 'superadmin@fobbs.com', password: 'Test@1234' })
    });
    const authData = await authRes.json();
    const token = authData.access_token;

    console.log("Inserting department 'Bar' as SA...");
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/departments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${token}`,
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            business_id: '601576d8-9a10-476d-bad1-a1b46f5e830d',
            branch_id: '629000ff-8a27-46e3-9eba-b603207565af',
            name: 'Bar'
        })
    });

    console.log("Insert Result:", await insertRes.json());
}
run();
