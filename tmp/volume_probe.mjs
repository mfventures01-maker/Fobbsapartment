
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tqcosuyxdynowgwmfsjm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxY29zdXl4ZHlub3dnd21mc2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMzQ2NDYsImV4cCI6MjA4NDYxMDY0Nn0.gUEd1mGFvxv-7Fx0DkuYPASZ1s4ng9y7N65ew_BRZoc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function probe() {
    await supabase.auth.signInWithPassword({
        email: 'ceo@fobbs.com', password: 'Test@1234'
    });

    const tables = ['orders', 'transactions', 'shifts', 'inventory', 'staff_profiles', 'payment_intents', 'audit_logs', 'qr_codes'];
    const results = [];

    for (const table of tables) {
        const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
        results.push({ table, count });
    }

    console.table(results);
}
probe();
