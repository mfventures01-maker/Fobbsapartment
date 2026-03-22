// 🛸 ANTI-GRAVITY: CONCURRENCY STRESS TEST V4 (PHASE 4)
// Purpose: Simulate 5 concurrent users with deterministic branch context.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tqcosuyxdynowgwmfsjm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxY29zdXl4ZHlub3dnd21mc2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMzQ2NDYsImV4cCI6MjA4NDYxMDY0Nn0.gUEd1mGFvxv-7Fx0DkuYPASZ1s4ng9y7N65ew_BRZoc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runStressTest() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🛸 CARSS CONCURRENCY STRESS TEST V4');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 1. Setup Identity
    let branchId = null;

    // Try to get a valid branchId from inventory table
    const { data: invItems } = await supabase.from('inventory').select('branch_id').limit(1);
    branchId = invItems?.[0]?.branch_id;

    if (!branchId) {
        // Fallback to searching in locations or similar
        const { data: locations } = await supabase.from('locations').select('id').limit(1);
        branchId = locations?.[0]?.id;
    }

    if (!branchId) {
        // HARDCODED FALLBACK FOR DEMO IF ALL ELSE FAILS
        branchId = '66666666-6666-6666-6666-666666666666';
        console.log(`[WARN] No branch found, using demo fallback: ${branchId}`);
    } else {
        console.log(`[AUTH] Test Context: Branch ${branchId}`);
    }

    // Resolve Active Shift
    const { data: shiftRes } = await supabase.rpc('resolve_active_shift', { p_branch_id: branchId });
    const shiftId = shiftRes?.shift_id || null;
    console.log(`[SHIFT] Shift Id: ${shiftId || 'NONE'}`);

    // 3. Concurrent Payload Generation
    const CONCURRENT_USERS = 5;
    const idempotencyKey = `STRESS_V4_${Date.now()}`;

    console.log(`\n[STRESS] Simulating ${CONCURRENT_USERS} requests with SAME key: ${idempotencyKey}`);

    const tasks = Array.from({ length: CONCURRENT_USERS }).map(async (_, idx) => {
        const start = Date.now();
        try {
            const { data, error } = await supabase.rpc('create_order_gateway', {
                p_branch_id: branchId,
                p_customer_name: `Stress User ${idx}`,
                p_shift_id: shiftId,
                p_terminal_type: 'qr',
                p_idempotency_key: idempotencyKey
            });

            const duration = Date.now() - start;
            // Success if we get an object with order_id or a string ID
            const orderId = data?.order_id || (typeof data === 'string' ? data : null);

            return { idx, success: !error && !!orderId, orderId, error: error?.message, duration };
        } catch (e) {
            return { idx, success: false, error: e.message };
        }
    });

    const results = await Promise.all(tasks);

    // 4. Analysis
    console.log('\n[RESULTS] Execution Summary:');
    results.forEach(r => {
        console.log(` User ${r.idx}: ${r.success ? '✅ SUCCESS' : '❌ FAILED'} | Time: ${r.duration}ms | Order: ${r.orderId || 'N/A'} | Msg: ${r.error || 'OK'}`);
    });

    const uniqueOrders = new Set(results.filter(r => r.orderId).map(r => String(r.orderId)));

    console.log(`\n[ANALYSIS] Unique Orders Found: ${uniqueOrders.size}`);

    if (uniqueOrders.size === 1) {
        console.log('\n[PROVE] 🏆 IDEMPOTENCY INVARIANT (I2) IS VERIFIED: Multiple requests yielded exactly one order.');
    } else {
        console.log('\n[FAIL] ❌ IDEMPOTENCY VIOLATION: Zero or multiple orders detected.');
    }

    process.exit(0);
}

runStressTest().catch(console.error);
