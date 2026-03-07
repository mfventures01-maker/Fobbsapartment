
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

    const email = `bartender_${Date.now()}@fobbs.com`;
    console.log(`Creating staff user: ${email}...`);
    const inviteRes = await fetch(`${supabaseUrl}/functions/v1/create-staff-user`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            email: email,
            full_name: 'Stress Bartender',
            role: 'staff',
            department: 'bar',
            branch_id: '629000ff-8a27-46e3-9eba-b603207565af',
            business_id: '601576d8-9a10-476d-bad1-a1b46f5e830d'
        })
    });

    const inviteData = await inviteRes.json();
    console.log("Create Result:", JSON.stringify(inviteData, null, 2));

    if (inviteData.ok) {
        // How to set password without token?
        // Maybe I can find the token in staff_invitations?
        console.log("Checking staff_invitations for token...");
        const invRes = await fetch(`${supabaseUrl}/rest/v1/staff_invitations?email=eq.${email}`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${token}` }
        });
        console.log("Invitations:", await invRes.json());
    }
}
run();
