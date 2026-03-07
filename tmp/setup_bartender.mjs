
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
    if (authData.error) { console.error("CEO Login Fail:", authData.error); return; }
    const token = authData.access_token;
    const ceoUid = authData.user.id;

    console.log("Inviting stress bartender...");
    const inviteRes = await fetch(`${supabaseUrl}/functions/v1/staff-invitations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            email: `bartender_${Date.now()}@fobbs.com`,
            name: 'Stress Bartender',
            role: 'staff',
            department: 'bar',
            branch_id: '629000ff-8a27-46e3-9eba-b603207565af',
            business_id: '601576d8-9a10-476d-bad1-a1b46f5e830d',
            invited_by: ceoUid
        })
    });

    const inviteData = await inviteRes.json();
    console.log("Invite Result:", JSON.stringify(inviteData, null, 2));

    if (inviteData.invitation_token) {
        console.log("Accepting invitation...");
        const acceptRes = await fetch(`${supabaseUrl}/functions/v1/accept-invitation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey
            },
            body: JSON.stringify({
                token: inviteData.invitation_token,
                password: 'Test@1234'
            })
        });
        const acceptData = await acceptRes.json();
        console.log("Accept Result:", JSON.stringify(acceptData, null, 2));
    }
}
run();
