import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tqcosuyxdynowgwmfsjm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxY29zdXl4ZHlub3dnd21mc2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMzQ2NDYsImV4cCI6MjA4NDYxMDY0Nn0.gUEd1mGFvxv-7Fx0DkuYPASZ1s4ng9y7N65ew_BRZoc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("=== CARSS 1-BARTENDER 50-ORDER CONCURRENCY STRESS TEST (V4) ===");

    // 1. AUTH
    const { data: auth } = await supabase.auth.signInWithPassword({
        email: 'superadmin@fobbs.com',
        password: 'Test@1234'
    });

    const BUSINESS_ID = '601576d8-9a10-476d-bad1-a1b46f5e830d';
    const BRANCH_ID = '629000ff-8a27-46e3-9eba-b603207565af';
    const TEST_EMAIL = 'superadmin@fobbs.com';
    const TEST_UID = auth.user.id;

    console.log(`User: ${TEST_EMAIL}, UID: ${TEST_UID}`);

    // 2. OPEN SHIFT
    console.log("Opening Shift...");
    await supabase.rpc('request_shift');
    const { data: sData } = await supabase.from('shifts').select('*').eq('staff_id', TEST_UID).neq('status', 'closed').single();
    if (sData.status !== 'open') await supabase.rpc('approve_shift_open', { p_shift_id: sData.id });

    console.log(`Shift ${sData.id} open.`);

    // 3. SEED INVENTORY
    console.log("Seeding SIM Item...");
    const { data: drinks } = await supabase.from('inventory').upsert({
        business_id: BUSINESS_ID, branch_id: BRANCH_ID, department_id: 'bar',
        name: 'STRESS_RELIABILITY_DRINK', sale_price: 1500, current_stock: 5000, unit: 'pcs'
    }).select();

    const invId = drinks[0].id;
    await supabase.from('menu_inventory_recipes').upsert({
        menu_item_id: 'STRESS_RELIABILITY_DRINK', inventory_id: invId, quantity_required: 1
    });

    // 4. BLAST 50 ORDERS
    const TOTAL = 50;
    console.log(`Blast loading ${TOTAL} orders...`);
    const startTime = Date.now();
    const results = { gateway: 0, confirm: 0 };

    const blast = async (i) => {
        // We use a fresh client to simulate concurrent connections
        const client = createClient(supabaseUrl, supabaseKey);
        await client.auth.signInWithPassword({ email: TEST_EMAIL, password: 'Test@1234' });

        const { data: gData, error: gError } = await client.rpc('create_order_gateway', {
            p_source: 'staff_terminal', p_business_id: BUSINESS_ID, p_location_id: BRANCH_ID,
            p_staff_id: TEST_UID, p_items: [{ name: 'STRESS_RELIABILITY_DRINK', price: 1500, quantity: 1 }]
        });

        if (!gError && gData) {
            results.gateway++;
            // Rapid confirmation
            const { error: cError } = await client.rpc('confirm_payment_intent', {
                p_intent_id: gData.payment_intent_id,
                p_external_reference: `STRESS-P-${i}`
            });
            if (!cError) results.confirm++;
        }
    };

    // Use concurrency of 10 for simulation of 10 concurrent requests
    const CHUNK = 10;
    for (let i = 0; i < TOTAL; i += CHUNK) {
        await Promise.all([...Array(CHUNK).keys()].map(idx => blast(i + idx)));
    }

    const duration = Date.now() - startTime;
    console.log(`Blast finished in ${duration}ms.`);

    // 5. RECONCILIATION
    const { data: shiftFinal } = await supabase.from('shifts').select('*').eq('id', sData.id).single();
    console.log(`Current Total Revenue: ${shiftFinal.total_revenue}`);

    await supabase.rpc('submit_shift_declaration', {
        p_shift_id: sData.id, p_cash: shiftFinal.total_revenue, p_pos: 0, p_transfer: 0
    });
    await supabase.rpc('approve_shift_close', { p_shift_id: sData.id });

    // 6. FINAL INTEGRITY
    const { data: postInv } = await supabase.from('inventory').select('*').eq('id', invId).single();
    console.log(`SUMMARY: Gateway ${results.gateway}, Confirm ${results.confirm}`);
    console.log(`Initial: 5000, Remaining: ${postInv.current_stock}, Deducted: ${5000 - postInv.current_stock}`);
    console.log(`Total Sales Expected: 75000, Actual: ${shiftFinal.total_revenue}`);
    console.log("=== STRESS TEST COMPLETED ===");
}
run();
