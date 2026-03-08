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
        p_location_id: '601576d8-9a10-476d-bad1-a1b46f5e830d',
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
        p_external_reference: '503a6479-1111-4444-5555-' + Math.floor(Math.random() * 999999).toString().padStart(12, '0')
    };

    const { data: gatewayResult, error: gatewayError } = await supabase.rpc('create_public_order', payload);

    if (gatewayError) {
        console.error("RPC Error:", JSON.stringify(gatewayError, null, 2));
    } else {
        console.log("RPC Success. Result:", gatewayResult);
    }
}

testSubmit().catch(console.error);
