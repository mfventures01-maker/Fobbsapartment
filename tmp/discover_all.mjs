
const supabaseUrl = 'https://tqcosuyxdynowgwmfsjm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxY29zdXl4ZHlub3dnd21mc2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMzQ2NDYsImV4cCI6MjA4NDYxMDY0Nn0.gUEd1mGFvxv-7Fx0DkuYPASZ1s4ng9y7N65ew_BRZoc';

async function run() {
    console.log("Signing in as CEO...");
    const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
        body: JSON.stringify({ email: 'ceo@fobbs.com', password: 'Test@1234' })
    });
    const authData = await authRes.json();
    const token = authData.access_token;

    console.log("Fetching all memberships CEO can see...");
    const memRes = await fetch(`${supabaseUrl}/rest/v1/business_memberships`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${token}` }
    });
    const memberships = await memRes.json();
    console.log("Memberships seen by CEO:", JSON.stringify(memberships, null, 2));

    console.log("Fetching all profiles CEO can see...");
    const profRes = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${token}` }
    });
    const profiles = await profRes.json();
    console.log("Profiles seen by CEO:", JSON.stringify(profiles, null, 2));
}
run();
