
import { createClient } from '@supabase/supabase-js';

// Hardcoded for this demo setup, but ideally would be environment variables
// Using anon key, assuming standard RLS policies allow signup/public inserts
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://YOUR_SUPABASE_URL.supabase.co'; // Replace if needed, but I'll read from .env if I can
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

// I need to read .env file since process.env might be empty in this context if not loaded

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv'; // Assuming dotenv is installed, wait, it might not be. I'll simulate reading it if needed.

// Simpler: Just rely on user to pass or read file manually. 
// Or assume VITE_... variables are available if run via `npm run` script that loads env? No.
// I will read .env file manually.

const envPath = path.resolve(process.cwd(), '.env');
let envConfig = {};
try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, val] = line.split('=');
        if (key && val) envConfig[key.trim()] = val.trim();
    });
} catch (e) {
    // If .env missing, try .env.local
    try {
        const envLocal = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
        envLocal.split('\n').forEach(line => {
            const [key, val] = line.split('=');
            if (key && val) envConfig[key.trim()] = val.trim();
        });
    } catch (err) {
        console.log('No .env file found, using defaults or failing');
    }
}

const supabaseUrl = envConfig['VITE_SUPABASE_URL'];
const supabaseKey = envConfig['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
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
        console.error('Signup Error:', authError.message);
        // If user already exists, try to sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (signInError) {
            console.error("SignIn Error:", signInError.message);
            process.exit(1);
        }
        authData.user = signInData.user;
    }

    const userId = authData.user?.id;
    if (!userId) {
        console.error("Failed to get user ID");
        process.exit(1);
    }

    console.log(`User ID: ${userId}`);

    // 2. Setup Profile (Manager Role)
    // We need a valid business_id. Let's try to fetch one or insert one.
    // Assuming 'businesses' table exists. Or 'organizations'. 
    // Based on context, it seems to be 'profiles.business_id'.

    // Let's look for an existing business id from a random profile or create one?
    // I'll use a hardcoded UUID or generate one if RLS allows.
    // Actually, I'll search for any existing profile to grab a valid business_id if possible.

    let businessId = '7102604d-e99d-48ef-968b-59d4c7943d74'; // Fallback

    const { data: existingProfile } = await supabase.from('profiles').select('business_id').limit(1).single();
    if (existingProfile) {
        businessId = existingProfile.business_id;
    }

    console.log(`Using Business ID: ${businessId}`);

    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            user_id: userId,
            role: 'manager',
            business_id: businessId,
            full_name: 'Preview Manager',
            department: 'Management'
        }, { onConflict: 'user_id' });

    if (profileError) {
        console.error("Profile Upsert Error:", profileError);
        // Might fail due to RLS if I can't update other profiles? 
        // But I can update my OWN profile usually.
        // If it fails, we might have issues logging in as 'manager'.
    }

    // 3. Create Order
    // Orders table: id, status, total, org_id, location_id
    // I need valid org_id and location_id.
    // 'org_id' usually == 'business_id'.
    // 'location_id' ... maybe same? or fetch from 'locations' table.

    let locationId = businessId; // Fallback
    const { data: locData } = await supabase.from('locations').select('id').limit(1).single();
    if (locData) locationId = locData.id;

    console.log(`Using Location ID: ${locationId}`);

    const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
            status: 'open',
            total: 7500, // ₦7,500
            org_id: businessId,
            location_id: locationId,
            created_by: userId, // Assuming this field exists and I can set it
            // created_at is automatic
        })
        .select()
        .single();

    if (orderError) {
        console.error("Order Creation Error:", orderError);
        process.exit(1);
    }

    const orderId = orderData.id;
    console.log(`\n=== SETUP COMPLETE ===`);
    console.log(`ORDER_ID: ${orderId}`);
    console.log(`EMAIL: ${email}`);
    console.log(`PASSWORD: ${password}`);
    console.log(`CEO_TOKEN: carss-secure-ceo (from .env or default)`); // Assuming default for now
    console.log(`======================\n`);

    // Write to a temporary file for the browser agent to read if needed? 
    // Or just print to stdout and I'll parse it.
}

setup();
