import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSubmit() {
    console.log("Submitting test order via RPC create_public_order...");

    // Mimic the payload from RestaurantPublic.tsx
    const payload = {
        p_business_id: '601576d8-9a10-476d-bad1-a1b46f5e830d',
        p_location_id: null,
        p_items: [
            { name: "Akara + Pap", quantity: 1, price: 2500 }
        ],
        p_customer_name: "Test Guest",
        p_customer_phone: "08000000000",
        p_metadata: {
            source: 'qr_menu',
            room_number: "N/A",
            table_number: "N/A",
            delivery_method: "Room Delivery",
            notes: "Test order",
            payment_method_preference: "Cash"
        },
        p_external_reference: 'd35f79a8-aabc-4123-8cda-' + Math.floor(Math.random() * 999999).toString().padStart(12, '0')
    };

    const { data: gatewayResult, error: gatewayError } = await supabase.rpc('create_public_order', payload);

    if (gatewayError) {
        console.error("RPC Error:", JSON.stringify(gatewayError, null, 2));
        return;
    }

    console.log("RPC Success. Result:", gatewayResult);

    const orderId = typeof gatewayResult === 'string' ? gatewayResult : (gatewayResult ? gatewayResult.order_id : null);

    if (!orderId) {
        console.error("Failed to extract orderId from gatewayResult", gatewayResult);
        return;
    }

    console.log("Extracted order_id:", orderId);

    const { data: order, error: queryError } = await supabase.from('orders').select('id, org_id, status, created_by, created_at').eq('id', orderId).single();
    if (queryError) {
        console.error("Query Error:", queryError);
        return;
    }

    console.log("Order row found:");
    console.log(order);

    // Validation
    if (order.org_id !== '601576d8-9a10-476d-bad1-a1b46f5e830d') {
        console.error("Validation failed: org_id mismatch!");
    } else if (order.status !== 'pending_payment') {
        console.error("Validation failed: status is not pending_payment!");
    } else if (order.created_by !== null) {
        console.error("Validation failed: created_by should be NULL!");
    } else {
        console.log("✅ All validations passed! Guest order successfully bypasses staff shift check and attaches to correct org_id.");
    }
}

testSubmit().catch(console.error);
