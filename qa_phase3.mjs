import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });
dotenv.config({ path: resolve(__dirname, '.env.production') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tqcosuyxdynowgwmfsjm.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPhase3() {
    console.log("=== PHASE 3: RLS Isolation Test ===");

    // Test CEO
    const { data: ceoAuth, error: ceoError } = await supabase.auth.signInWithPassword({
        email: 'ceo@fobbs.com',
        password: 'Test@1234'
    });

    if (ceoError) {
        console.error("CEO Login failed:", ceoError.message);
    } else {
        console.log("CEO Login successful. User ID:", ceoAuth.user.id);
        const { data: ceoBiz, error: ceoBizError } = await supabase.from('businesses').select('*');
        console.log("CEO Businesses:", ceoBiz?.length, ceoBizError || "OK");
        if (ceoBiz) {
            console.log("CEO Visible IDs:", ceoBiz.map(b => b.id).join(', '));
        }
    }

    // Test Manager
    const { data: mAuth, error: mError } = await supabase.auth.signInWithPassword({
        email: 'manager@fobbs.com',
        password: 'Test@1234'
    });

    if (mError) {
        console.error("Manager Login failed:", mError.message);
    } else {
        console.log("Manager Login successful. User ID:", mAuth.user.id);
        const { data: mBiz, error: mBizError } = await supabase.from('businesses').select('*');
        console.log("Manager Businesses:", mBiz?.length, mBizError || "OK");
        if (mBiz) {
            console.log("Manager Visible IDs:", mBiz.map(b => b.id).join(', '));
        }
    }

    // Test Staff
    const { data: sAuth, error: sError } = await supabase.auth.signInWithPassword({
        email: 'staff@fobbs.com',
        password: 'Test@1234'
    });

    if (sError) {
        console.error("Staff Login failed:", sError.message);
    } else {
        console.log("Staff Login successful. User ID:", sAuth.user.id);
        const { data: sBiz, error: sBizError } = await supabase.from('businesses').select('*');
        console.log("Staff Businesses:", sBiz?.length, sBizError || "OK");
        if (sBiz) {
            console.log("Staff Visible IDs:", sBiz.map(b => b.id).join(', '));
        }
    }
}

testPhase3();
