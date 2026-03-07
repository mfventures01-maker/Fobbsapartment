
const supabaseUrl = 'https://tqcosuyxdynowgwmfsjm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxY29zdXl4ZHlub3dnd21mc2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMzQ2NDYsImV4cCI6MjA4NDYxMDY0Nn0.gUEd1mGFvxv-7Fx0DkuYPASZ1s4ng9y7N65ew_BRZoc';

async function run() {
    console.log("Signing in as Manager...");
    const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
        body: JSON.stringify({ email: 'manager@fobbs.com', password: 'Test@1234' })
    });

    const authData = await authRes.json();
    if (authData.error) {
        console.error("Auth Fail:", authData.error_description || authData.error);
        return;
    }

    console.log("UID:", authData.user.id);
    const token = authData.access_token;

    console.log("Checking memberships...");
    const memRes = await fetch(`${supabaseUrl}/rest/v1/business_memberships`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${token}` }
    });
    console.log("Memberships:", await memRes.json());
}
run();
