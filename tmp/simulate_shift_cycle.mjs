import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// For a full simulation, we need a staff role token or we just execute direct SQL using service_role key to bypass RLS/Auth requirement in script. 
// OR we can use the test user 'staff@fobbs.com' we created earlier, authenticate, and perform the actions.
const supabase = createClient(supabaseUrl, supabaseKey);

async function simulate() {
    try {
        console.log("---- SHIFT CYCLE SIMULATION ----");

        // 0. Login as staff
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'staff@fobbs.com',
            password: 'Test@1234'
        });
        if (authError) throw authError;
        console.log("✅ Authenticated as Staff");

        // 1. Start Shift
        const { data: staffUser } = await supabase.auth.getUser();
        console.log("Staff User:", staffUser.user.id);

        const { data: rpcStart, error: errStart } = await supabase.rpc('start_shift');
        if (errStart) console.log("Start Shift Error (might already exist):", errStart.message);
        else console.log("✅ Shift Started (awaiting manager)");

        const { data: shiftRec, error: fetchErr } = await supabase.from('shifts')
            .select('*').eq('staff_id', staffUser.user.id).order('start_time', { ascending: false }).limit(1).single();
        if (fetchErr) throw fetchErr;

        // Auto approve shift
        console.log(`Current shift status: ${shiftRec.status}, ID: ${shiftRec.id}`);
        if (shiftRec.status === 'awaiting_manager_open') {
            // Let's use service key to approve it, or manager login
            const adminSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
            await adminSupabase.from('shifts').update({ status: 'open' }).eq('id', shiftRec.id);
            console.log("✅ Manager Approved Shift (Forced via Service Key)");
        }

        // 2. Create Transaction
        const { data: orderRes, error: orderErr } = await supabase.rpc('create_staff_order', {
            p_business_id: shiftRec.business_id,
            p_location_id: null,
            p_items: [{ name: "Test Cola", price: 1500, quantity: 2 }],
            p_metadata: { customer_name: "Simulated Guest" },
            p_external_reference: crypto.randomUUID()
        });
        if (orderErr) throw orderErr;
        console.log(`✅ Order Created: ${orderRes.order_id}`);

        // Confirm Payment mapped to the shift
        const adminSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { data: confirmRes, error: confirmErr } = await adminSupabase.rpc('confirm_payment_intent', {
            p_intent_id: orderRes.payment_intent_id,
            p_external_reference: 'sim-ref-123'
        });
        if (confirmErr) throw confirmErr;
        console.log(`✅ Payment Confirmed: ${confirmRes.transaction_id}`);

        // 3. End Shift
        const { data: endRes, error: endErr } = await supabase.rpc('end_shift');
        if (endErr) throw endErr;
        console.log("✅ Shift Ended (Transitioned to pending_declaration)");

        // Verify ends_at
        const { data: checkEnd } = await supabase.from('shifts').select('ends_at, status').eq('id', shiftRec.id).single();
        console.log(`Shift ends_at: ${checkEnd.ends_at}, status: ${checkEnd.status}`);

        // 4. Declare Totals
        const { data: declRes, error: declErr } = await supabase.rpc('submit_shift_declaration', {
            p_shift_id: shiftRec.id,
            p_cash: 3000,
            p_pos: 0,
            p_transfer: 0
        });
        if (declErr) throw declErr;
        console.log("✅ Shift Declared");

        // 5. Manager Close
        const { data: closeRes, error: closeErr } = await adminSupabase.rpc('approve_shift_close', {
            p_shift_id: shiftRec.id
        });
        if (closeErr) throw closeErr;
        console.log("✅ Shift Closed by Manager");

        const { data: finalShift } = await supabase.from('shifts').select('status, variance, expected_revenue, closed_at').eq('id', shiftRec.id).single();
        console.log("🎉 Final Shift State:", finalShift);

    } catch (e) {
        console.error("Simulation failed:", e);
    }
}
simulate();
