
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env');
let envConfig = {};
try {
    if (fs.existsSync(envPath)) {
        const envFile = fs.readFileSync(envPath, 'utf8');
        envFile.split('\n').forEach(line => {
            const [key, val] = line.split('=');
            if (key && val) envConfig[key.trim()] = val.trim();
        });
    }
} catch (e) { }

const supabaseUrl = envConfig['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL;
const supabaseKey = envConfig['VITE_SUPABASE_ANON_KEY'] || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
    console.log('--- Finding Preview Data ---');

    // 1. Create User (for Login)
    const email = `preview.manager.${Date.now()}@fobbs.com`;
    const password = 'password123';

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        console.log("Signup failed, trying login...");
    }

    const userId = authData.user ? authData.user.id : null;
    if (userId) {
        // Try to set role
        await supabase.from('profiles').upsert({
            user_id: userId,
            role: 'manager',
            business_id: '7102604d-e99d-48ef-968b-59d4c7943d74',
            full_name: 'Preview Manager',
            department: 'Management'
        }, { onConflict: 'user_id' });
    }

    // 2. Find ANY open order
    const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('id, total')
        .eq('status', 'open')
        .limit(1);

    let orderId = null;

    if (orders && orders.length > 0) {
        orderId = orders[0].id;
        console.log(`Found existing open order: ${orderId}`);
    } else {
        console.log("No open orders found. Attempting to create one...");
        // Try insert
        const { data: newOrder, error: insertError } = await supabase
            .from('orders')
            .insert({
                status: 'open',
                total: 8000,
                org_id: '7102604d-e99d-48ef-968b-59d4c7943d74',
                location_id: '7102604d-e99d-48ef-968b-59d4c7943d74', // Fallback
                created_by: userId
            })
            .select()
            .single();

        if (newOrder) {
            orderId = newOrder.id;
            console.log(`Created new order: ${orderId}`);
        } else {
            console.error("Failed to create order. RLS likely blocking.");
        }
    }

    if (orderId && userId) {
        console.log(`\n=== PREVIEW READY ===`);
        console.log(`ORDER_ID=${orderId}`);
        console.log(`EMAIL=${email}`);
        console.log(`PASSWORD=${password}`);
        console.log(`CEO_TOKEN=${"carss-secure-ceo"}`);
        console.log(`=====================\n`);
    } else {
        console.error("Failed to setup preview data.");
    }
}

setup();
