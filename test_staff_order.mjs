import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSubmit() {
    console.log("Submitting test order via RPC create_staff_order...");

    const payload = {
        p_business_id: '601576d8-9a10-476d-bad1-a1b46f5e830d',
        p_location_id: '601576d8-9a10-476d-bad1-a1b46f5e830d',
        p_items: [
            { name: "Akara + Pap", quantity: 1, price: 2500 }
        ],
        p_metadata: {
            source: 'pos',
            customer_name: "Test Staff Guest"
        },
        p_external_reference: '1aa26479-1111-4444-5555-' + Math.floor(Math.random() * 999999).toString().padStart(12, '0')
    };

    const { data: gatewayResult, error: gatewayError } = await supabase.rpc('create_staff_order', payload);

    if (gatewayError) {
        console.error("RPC Error:", JSON.stringify(gatewayError, null, 2));
    } else {
        console.log("RPC Success. Result:", gatewayResult);
    }
}

testSubmit().catch(console.error);
