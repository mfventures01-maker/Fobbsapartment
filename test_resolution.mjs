import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });

const url = process.env.VITE_SUPABASE_URL || '';
const key = process.env.VITE_SUPABASE_ANON_KEY || '';

const s = createClient(url, key);

(async () => {
    try {
        const { data: auth, error: authErr } = await s.auth.signInWithPassword({
            email: 'superadmin@fobbs.com',
            password: 'Test@1234'
        });

        if (authErr) {
            console.error('Auth error:', authErr.message);
            process.exit(1);
        }

        const { data: mem, error: memErr } = await s.from('business_memberships').select('*').eq('user_id', auth.user.id);

        if (memErr) {
            console.error('Membership error:', memErr.message);
            process.exit(1);
        }

        console.log('MEMBERSHIPS:', mem);

        if (!mem || mem.length === 0) {
            console.log('No memberships found.');
            process.exit(1);
        }

        const rolePriority = { super_admin: 1, ceo: 2, manager: 3, staff: 4 };
        const sorted = [...mem].sort((a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99));

        const resolvedRole = sorted[0].role;
        console.log('RESOLVED ROLE:', resolvedRole);

        if (resolvedRole === 'super_admin') {
            console.log('Current Route: /super-admin');
        } else if (resolvedRole === 'ceo') {
            console.log('Current Route: /ceo');
        } else if (resolvedRole === 'manager') {
            console.log('Current Route: /manager');
        } else if (resolvedRole === 'staff') {
            console.log('Current Route: /staff');
        } else {
            console.log('Current Route: /unauthorized');
        }
    } catch (err) {
        console.error('Test script error:', err);
    }
})();
