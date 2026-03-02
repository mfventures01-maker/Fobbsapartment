import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BUSINESS_ID = '601576d8-9a10-476d-bad1-a1b46f5e830d';

const simulationStaff = [
    { email: 'rest_staff1@fobbs.com', full_name: 'Restaurant Staff 1', role: 'staff', department: 'Restaurant' },
    { email: 'rest_staff2@fobbs.com', full_name: 'Restaurant Staff 2', role: 'staff', department: 'Restaurant' },
    { email: 'bar_staff1@fobbs.com', full_name: 'Bar Staff 1', role: 'staff', department: 'Bar' },
    { email: 'bar_staff2@fobbs.com', full_name: 'Bar Staff 2', role: 'staff', department: 'Bar' },
    { email: 'manager_sim@fobbs.com', full_name: 'Simulation Manager', role: 'manager', department: null }
];

async function setup() {
    console.log('🚀 Logging in as CEO...');
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'ceo@fobbs.com',
        password: 'Test@1234'
    });

    if (loginError) {
        console.error('CEO Login failed:', loginError.message);
        return;
    }

    console.log('--- Creating Simulation Staff via Edge Function ---');
    for (const staff of simulationStaff) {
        console.log(`Inviting ${staff.email}...`);
        try {
            const response = await fetch(`${supabaseUrl}/functions/v1/create-staff-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    'apikey': supabaseAnonKey
                },
                body: JSON.stringify({
                    ...staff,
                    business_id: BUSINESS_ID
                })
            });
            const result = await response.json();
            if (response.ok) {
                console.log(`✅ ${staff.email} result:`, result.message || 'Success');
            } else {
                console.warn(`⚠️ ${staff.email} failed:`, result.error || result);
            }
        } catch (e) {
            console.error(`❌ Error inviting ${staff.email}:`, e.message);
        }
    }
}

setup();
