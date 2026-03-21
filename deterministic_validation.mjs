import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://tqcosuyxdynowgwmfsjm.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxY29zdXl4ZHlub3dnd21mc2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMzQ2NDYsImV4cCI6MjA4NDYxMDY0Nn0.gUEd1mGFvxv-7Fx0DkuYPASZ1s4ng9y7N65ew_BRZoc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function runValidation() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧬 DETERMINISTIC VALIDATION (NODE ADAPTER)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 1. Authenticate as CEO
    console.log('🔐 AUTHENTICATING AS CEO...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'ceo@fobbs.com',
        password: 'Test@1234'
    });

    if (authError) {
        console.error('❌ AUTH FAILURE:', authError.message);
        process.exit(1);
    }
    console.log('✅ AUTH SUCCESS:', authData.user.email);

    // 2. Identity Resolution
    console.log('\n🧬 STEP 1: IDENTITY RESOLUTION');
    const { data: identity, error: identityError } = await supabase.rpc('get_my_identity');

    if (identityError || !identity) {
        console.error('❌ IDENTITY FAILURE:', identityError);
        process.exit(1);
    }
    console.table(identity);

    // 3. Shift Resolution
    console.log('\n🔐 STEP 2: SHIFT RESOLUTION');
    const { data: shift, error: shiftError } = await supabase.rpc('resolve_active_shift', {
        p_branch_id: identity.branch_id
    });

    let hasActiveShift = false;
    let shiftId = null;
    if (shiftError) {
        console.warn('⚠️ NO ACTIVE SHIFT:', shiftError.message);
    } else {
        console.table(shift);
        hasActiveShift = true;
        shiftId = shift.shift_id;
    }

    // 4. RPC Integrity
    console.log('\n📡 STEP 3: RPC INTEGRITY AUDIT');
    const functions = [
        'get_my_identity',
        'resolve_active_shift',
        'create_order_gateway',
        'add_order_item',
        'apply_discount',
        'update_order_status',
        'create_payment_intent',
        'get_order_details',
        'get_order_history'
    ];

    const results = [];
    for (const fn of functions) {
        try {
            const { error } = await supabase.rpc(fn, {});
            if (error && error.message.includes('function')) {
                results.push({ fn, status: '❌ MISSING', error: error.message });
            } else {
                results.push({ fn, status: '✅ AVAILABLE' });
            }
        } catch (err) {
            results.push({ fn, status: '❌ CRASH', error: err.message });
        }
    }
    console.table(results);

    // 5. Order Creation
    let orderResult = 'SKIPPED';
    if (hasActiveShift) {
        console.log('\n💰 STEP 4: ORDER CREATION');
        const { data: order, error } = await supabase.rpc('create_order_gateway', {
            p_branch_id: identity.branch_id,
            p_customer_name: 'AG Validation Test (Node)',
            p_shift_id: shiftId
        });

        if (error || !order?.order_id) {
            console.error('❌ ORDER CREATION FAILED:', error);
            orderResult = 'FAIL';
        } else {
            console.table(order);
            orderResult = 'PASS';
        }
    }

    // 6. Verdict
    console.log('\n📊 FINAL SYSTEM VERDICT');
    const verdict = {
        identity: identity.authenticated ? 'PASS' : 'FAIL',
        branch_context: identity.branch_id ? 'PASS' : 'FAIL',
        shift: hasActiveShift ? 'ACTIVE' : 'NO_SHIFT',
        rpc_integrity: results.every(r => r.status === '✅ AVAILABLE') ? 'PASS' : 'FAIL',
        order_execution: orderResult
    };
    console.table(verdict);

    if (verdict.identity === 'PASS' && verdict.rpc_integrity === 'PASS') {
        console.log('\n🎯 SYSTEM STATUS: DETERMINISTIC READY');
    } else {
        console.error('\n❌ SYSTEM STATUS: BROKEN');
    }
}

runValidation();
