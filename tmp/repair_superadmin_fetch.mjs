
const supabaseUrl = 'https://tqcosuyxdynowgwmfsjm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxY29zdXl4ZHlub3dnd21mc2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMzQ2NDYsImV4cCI6MjA4NDYxMDY0Nn0.gUEd1mGFvxv-7Fx0DkuYPASZ1s4ng9y7N65ew_BRZoc';

async function run() {
    console.log("Signing in as Super Admin...");

    // Auth
    const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey
        },
        body: JSON.stringify({
            email: 'superadmin@fobbs.com',
            password: 'Test@1234'
        })
    });

    const authData = await authRes.json();
    if (authData.error) {
        console.error("Auth Fail:", authData.error_description || authData.error);
        return;
    }

    const token = authData.access_token;
    const uid = authData.user.id;
    console.log("UID:", uid);

    // Update Profile
    console.log("Updating profile...");
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${uid}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${token}`,
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            branch_id: '629000ff-8a27-46e3-9eba-b603207565af',
            department: 'bar'
        })
    });

    const updateData = await updateRes.json();
    console.log("Update Result:", JSON.stringify(updateData, null, 2));

    // Request Shift (Will still likely fail if business_id is missing from profile)
    console.log("Requesting shift...");
    const shiftRes = await fetch(`${supabaseUrl}/rest/v1/rpc/request_shift`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
    });

    const shiftData = await shiftRes.json();
    console.log("Shift Result:", JSON.stringify(shiftData, null, 2));
}

run();
