
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load ENV manually
const envPath = path.resolve(process.cwd(), '.env');
let envConfig: any = {};
try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, val] = line.split('=');
        if (key && val) envConfig[key.trim()] = val.trim();
    });
} catch (e) {
    console.log('No .env file found');
}

const supabaseUrl = envConfig['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL;
const supabaseKey = envConfig['VITE_SUPABASE_ANON_KEY'] || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
    console.log('--- Setting up Preview Data ---');

    // 1. Create User
    const email = `preview.manager.${Date.now()}@fobbs.com`;
    const password = 'password123';

    console.log(`Creating user: ${email}`);
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        console.log('Signup bypass (checking login)...');
    }

    const userId = authData.user?.id;
    if (!userId) {
        // Try sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (signInError) {
            console.error("Auth Fail:", signInError.message);
            process.exit(1);
        }
        // userId = signInData.user.id; // Not reassigned for const
    }

    const finalUserId = userId || (authData as any).user?.id;
    console.log(`User ID: ${finalUserId}`);

    // 2. Setup Profile (Manager Role)
    const businessId = '601576d8-9a10-476d-bad1-a1b46f5e830d'; // Canonical Asaba ID

    console.log(`Using Business ID: ${businessId}`);

    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            user_id: finalUserId,
            role: 'manager',
            business_id: businessId,
            full_name: 'Preview Manager',
            department: 'Management'
        }, { onConflict: 'user_id' });

    if (profileError) {
        console.error("Profile Upsert Error:", profileError);
    }

    // 3. Create Order
    let locationId = businessId;

    console.log(`Using Location ID: ${locationId}`);

    const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
            total: 7500, // ₦7,500
            org_id: businessId,
            location_id: locationId,
            created_by: finalUserId,
        })
        .select()
        .single();

    if (orderError) {
        console.error("Order Creation Error:", orderError);
        process.exit(1);
    }

    const orderId = orderData?.id;
    console.log(`\n=== SETUP COMPLETE ===`);
    console.log(`ORDER_ID: ${orderId}`);
    console.log(`EMAIL: ${email}`);
    console.log(`PASSWORD: ${password}`);
    console.log(`CEO_TOKEN: carss-secure-ceo`);
    console.log(`======================\n`);
}

setup();
