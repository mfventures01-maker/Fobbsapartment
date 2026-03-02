import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Service Role Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BUSINESS_ID = '601576d8-9a10-476d-bad1-a1b46f5e830d';

const users = [
    { email: 'rest_staff1@fobbs.com', password: 'Test@1234', full_name: 'Restaurant Staff 1', role: 'staff', department: 'Restaurant' },
    { email: 'rest_staff2@fobbs.com', password: 'Test@1234', full_name: 'Restaurant Staff 2', role: 'staff', department: 'Restaurant' },
    { email: 'bar_staff1@fobbs.com', password: 'Test@1234', full_name: 'Bar Staff 1', role: 'staff', department: 'Bar' },
    { email: 'bar_staff2@fobbs.com', password: 'Test@1234', full_name: 'Bar Staff 2', role: 'staff', department: 'Bar' },
    { email: 'manager_sim@fobbs.com', password: 'Test@1234', full_name: 'Simulation Manager', role: 'manager', department: null },
];

async function setup() {
    console.log('🚀 Starting Simulation Setup...');

    // 1. Ensure Departments exist
    console.log('--- Setting up Departments ---');
    const { data: depts, error: dError } = await supabase
        .from('departments')
        .upsert([
            { name: 'Restaurant', business_id: BUSINESS_ID },
            { name: 'Bar', business_id: BUSINESS_ID }
        ], { onConflict: 'name,business_id' }) // I hope this works now or I'll handle it
        .select();

    if (dError) {
        console.warn('Upsert departments failed, trying select...', dError.message);
    }

    // Fetch departments to get IDs
    const { data: allDepts } = await supabase.from('departments').select('*').eq('business_id', BUSINESS_ID);
    const deptMap = {};
    allDepts?.forEach(d => deptMap[d.name] = d.id);
    console.log('Departments:', deptMap);

    // 2. Create Users
    console.log('--- Setting up Users ---');
    for (const u of users) {
        console.log(`Processing ${u.email}...`);

        // Auth User
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: u.email,
            password: u.password,
            email_confirm: true,
            user_metadata: { full_name: u.full_name }
        });

        let userId = authData?.user?.id;
        if (authError) {
            if (authError.message.includes('already exists')) {
                const { data: list } = await supabase.auth.admin.listUsers();
                userId = list.users.find(x => x.email === u.email)?.id;
            } else {
                console.error(`Error creating ${u.email}:`, authError.message);
                continue;
            }
        }

        // Profile
        await supabase.from('profiles').upsert({
            user_id: userId,
            full_name: u.full_name,
            role: u.role,
            business_id: BUSINESS_ID,
            department: u.department,
            status: 'active',
            is_active: true
        });

        // Membership
        const membershipPayload = {
            user_id: userId,
            business_id: BUSINESS_ID,
            role: u.role,
            department_id: u.department ? deptMap[u.department] : null
        };

        await supabase.from('business_memberships').upsert(membershipPayload, { onConflict: 'user_id,business_id' });

        console.log(`✅ ${u.full_name} ready.`);
    }

    console.log('🎉 Setup Complete.');
}

setup();
