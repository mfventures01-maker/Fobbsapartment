import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
dotenv.config({ path: resolve(__dirname, '../.env') });
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Setup Supabase Admin Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Check if user provided key via command line or env
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    console.error('Please set SUPABASE_SERVICE_ROLE_KEY in your .env or export it in the terminal.');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

const business_id = '601576d8-9a10-476d-bad1-a1b46f5e830d';

const usersToCreate = [
    {
        email: 'superadmin@fobbs.com',
        password: 'Test@1234',
        role: 'super_admin',
        business_id: null,
        full_name: 'Test Super Admin',
    },
    {
        email: 'ceo@fobbs.com',
        password: 'Test@1234',
        role: 'ceo',
        business_id: business_id,
        full_name: 'Test CEO',
    },
    {
        email: 'manager@fobbs.com',
        password: 'Test@1234',
        role: 'manager',
        business_id: business_id,
        full_name: 'Test Manager',
    },
    {
        email: 'staff@fobbs.com',
        password: 'Test@1234',
        role: 'staff',
        business_id: business_id,
        full_name: 'Test Staff',
    },
];

async function createTestUsers() {
    console.log('🚀 Starting creation of test users...');

    for (const u of usersToCreate) {
        console.log(`\nProcessing user: ${u.email}...`);

        // 1. Check if user already exists
        // The Admin API has listUsers, wait, let's just attempt to create or delete first
        // Actually, create user using auth.admin.createUser
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: u.email,
            password: u.password,
            email_confirm: true,
            user_metadata: { full_name: u.full_name },
        });

        let userId;

        if (authError) {
            if (authError.message.includes('already exists') || authError.status === 422) {
                console.log(`User ${u.email} already exists in Auth. Updating...`);
                // We can find the user ID and update password if needed, but let's just fetch them.
                // Wait, there's no easy get-by-email unless we use admin.listUsers
                const { data: usersData, error: listUserError } = await supabaseAdmin.auth.admin.listUsers();
                if (usersData?.users) {
                    const existingUser = usersData.users.find((x) => x.email === u.email);
                    if (existingUser) {
                        userId = existingUser.id;
                        // Update password
                        await supabaseAdmin.auth.admin.updateUserById(userId, { password: u.password, email_confirm: true });
                        console.log(`Updated existing auth user password for ${u.email} (${userId})`);
                    }
                }
            } else {
                console.error(`❌ Failed to create auth user ${u.email}:`, authError.message);
                continue;
            }
        } else if (authData?.user) {
            userId = authData.user.id;
            console.log(`✅ Created auth user: ${u.email} (${userId})`);
        }

        if (!userId) {
            console.error(`❌ Could not resolve user ID for ${u.email}`);
            continue;
        }

        // 2. Insert or Update Profile
        const profilePayload = {
            user_id: userId,
            role: u.role,
            business_id: u.business_id,
            full_name: u.full_name,
            is_active: true,
            // For staff role, let's give a default department to avoid 500s across the app
            ...(u.role === 'staff' ? { department: 'restaurant' } : {})
        };

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert(profilePayload, { onConflict: 'user_id' });

        if (profileError) {
            console.error(`❌ Failed to link profile for ${u.email}:`, profileError.message);
        } else {
            console.log(`✅ Linked profile for ${u.email} with role ${u.role}`);
        }
    }

    console.log('\n========================================');
    console.log('🎉 Output Final Login Summary:');
    console.log('========================================');
    for (const u of usersToCreate) {
        console.log(`Role: ${u.role.toUpperCase()}`);
        console.log(`Email: ${u.email} / Password: ${u.password}`);
        console.log(`Route Expectation: /${u.role.replace('_', '-')}`);
        console.log('----------------------------------------');
    }
}

createTestUsers();
