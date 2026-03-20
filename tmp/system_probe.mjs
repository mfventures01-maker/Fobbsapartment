
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env') });

const supabaseUrl = 'https://tqcosuyxdynowgwmfsjm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxY29zdXl4ZHlub3dnd21mc2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMzQ2NDYsImV4cCI6MjA4NDYxMDY0Nn0.gUEd1mGFvxv-7Fx0DkuYPASZ1s4ng9y7N65ew_BRZoc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function probe() {
    console.log("--- ANTI-GRAVITY SYSTEM PROBE START ---");

    // 1. AUTHENTICATION
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'ceo@fobbs.com',
        password: 'Test@1234'
    });

    if (authErr) {
        console.error("AUTH FAILURE:", authErr.message);
        return;
    }
    console.log("AUTH SUCCESS: CEO Session established.");

    const businessId = '601576d8-9a10-476d-bad1-a1b46f5e830d'; // From USER prompt

    // 2. TERMINAL SESSIONS (3.3)
    const { data: sessions } = await supabase.from('terminal_sessions').select('*');
    console.log("\n[3.3] TERMINAL SESSIONS ANALYSIS");
    if (sessions) {
        const stats = sessions.reduce((acc, s) => {
            const key = `${s.terminal_type}:${s.status}`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        console.table(stats);
    }

    // 3. STAFF ACTIVITY (3.4)
    const { data: memberships } = await supabase.from('business_memberships').select('role, user_id').eq('is_active', true);
    console.log("\n[3.4] STAFF ACTIVITY SUMMARY");
    console.log(`Active Business Memberships: ${memberships?.length || 0}`);

    // 4. LOW STOCK ANALYSIS (4.3)
    const { data: lowStock } = await supabase.from('inventory')
        .select('name, current_stock, min_stock, unit')
        .eq('business_id', businessId)
        .lte('current_stock', 5); // Example threshold
    console.log("\n[4.3] LOW STOCK ALERT MAP");
    console.table(lowStock);

    // 5. QR ANALYTICS (5.2)
    const { data: qrCodes } = await supabase.from('qr_codes').select('*').eq('business_id', businessId);
    console.log("\n[5.2] QR CODE INVENTORY");
    console.log(`Tracked QR Codes: ${qrCodes?.length || 0}`);

    // 6. REVENUE / SYSTEM STATE (Executive Summary)
    const { data: state, error: stateErr } = await supabase.rpc('get_system_state', {
        p_business_id: businessId
    });

    console.log("\n[10] EXECUTIVE SNAPSHOT");
    if (stateErr) {
        console.error("STATE RPC ERROR:", stateErr.message);
    } else {
        console.log("System Status: 🟢 OPERATIONAL");
        console.log(`Revenue Today: ₦${state.revenue?.today || 0}`);
        console.log(`Open Orders: ${state.orders?.open_orders || 0}`);
        console.log(`Active Terminals: ${state.active_terminals || 0}`);
    }

    console.log("\n--- PROBE COMPLETE ---");
}

probe();
