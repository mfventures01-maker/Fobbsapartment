
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tqcosuyxdynowgwmfsjm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxY29zdXl4ZHlub3dnd21mc2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMzQ2NDYsImV4cCI6MjA4NDYxMDY0Nn0.gUEd1mGFvxv-7Fx0DkuYPASZ1s4ng9y7N65ew_BRZoc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function probe() {
    await supabase.auth.signInWithPassword({
        email: 'ceo@fobbs.com', password: 'Test@1234'
    });

    console.log("IDENTIFYING BUSINESS CONTEXT...");
    const { data: memberships } = await supabase.from('business_memberships').select('business_id, branch_id, role');
    console.log("MEMBERSHIPS:", memberships);

    if (memberships?.length) {
        const id = memberships[0].business_id;
        const { data: business } = await supabase.from('businesses').select('*').eq('id', id).single();
        console.log("ACTIVE BUSINESS:", business);

        const { data: branches } = await supabase.from('branches').select('*').eq('business_id', id);
        console.log("BRANCHES:", branches);
    }
}
probe();
