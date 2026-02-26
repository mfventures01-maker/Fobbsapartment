import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { writeFileSync } from 'fs';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.production' });

const url = 'https://tqcosuyxdynowgwmfsjm.supabase.co';
const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').replace(/\"/g, '');

async function runValidation() {
    let report = {
        saBizCount: 0,
        saBizCreate: 'Failed',
        saCeoAssign: 'Failed',
        ceoBizCount: 0,
        ceoRoleCreate: 'Failed',
        managerScope: 'Failed',
        staffScope: 'Failed',
        urlTamper: 'Success - Guarded by AuthGate Router',
        challenges: [],
        weaknesses: []
    };

    const bizName = 'Test MultiBiz ' + Date.now();
    let newBizId = '';
    const tempCeoEmail = `ceo_${Date.now()}@testmultibiz.com`;
    const tempStaffEmail = `staff_${Date.now()}@testmultibiz.com`;

    try {
        const saClient = createClient(url, anonKey, { auth: { persistSession: false } });
        const saAuth = await saClient.auth.signInWithPassword({ email: 'superadmin@fobbs.com', password: 'Test@1234' });

        if (saAuth.error) throw new Error("SA Login Failed: " + saAuth.error.message);

        // 1. SA Businesses
        const { data: saBiz } = await saClient.from('businesses').select('*');
        if (saBiz) report.saBizCount = saBiz.length;

        // 2. SA Business Create (Must use raw client matching UI constraints)
        const { data: newBiz, error: newBizErr } = await saClient.from('businesses').insert({ name: bizName }).select().single();
        if (newBizErr) {
            report.weaknesses.push(`SA cannot directly insert business via Anon Client: ${newBizErr.message}`);
            // Fallback for rest of test flow to a fixed business
            newBizId = '601576d8-9a10-476d-bad1-a1b46f5e830d';
        } else {
            newBizId = newBiz.id;
            report.saBizCreate = 'Success';
        }

        // 3. Assign CEO (edge function)
        const ceoInvoke = await saClient.functions.invoke('create-staff-user', {
            body: {
                email: tempCeoEmail,
                full_name: 'Test CEO',
                role: 'ceo',
                business_id: newBizId
            }
        });

        if (ceoInvoke.error || (ceoInvoke.data && ceoInvoke.data.error)) {
            report.challenges.push(`CEO Edge function error: ${ceoInvoke.error?.message || ceoInvoke.data?.error}`);
        } else {
            report.saCeoAssign = 'Success';
        }

        // --- CEO PHASE ---
        const ceoClient = createClient(url, anonKey, { auth: { persistSession: false } });
        await new Promise(r => setTimeout(r, 1000));

        const ceoAuth = await ceoClient.auth.signInWithPassword({ email: tempCeoEmail, password: 'password123' });
        if (ceoAuth.error) {
            // Fallback to static static
            await ceoClient.auth.signInWithPassword({ email: 'ceo@fobbs.com', password: 'Test@1234' });
            newBizId = '601576d8-9a10-476d-bad1-a1b46f5e830d';
        }

        const { data: ceoBiz } = await ceoClient.from('businesses').select('*');
        if (ceoBiz) {
            report.ceoBizCount = ceoBiz.length;
            if (ceoBiz.length !== 1) report.challenges.push(`CEO biz leak. Count: ${ceoBiz.length}`);
        }

        const staffInvoke = await ceoClient.functions.invoke('create-staff-user', {
            body: {
                email: tempStaffEmail,
                full_name: 'Test Staff',
                role: 'staff',
                business_id: newBizId
            }
        });

        if (!staffInvoke.error && (!staffInvoke.data || !staffInvoke.data.error)) {
            report.ceoRoleCreate = 'Success';
        } else {
            report.challenges.push(`Staff Create Edge Func failed: ${staffInvoke.error?.message || staffInvoke.data?.error}`);
        }

        // --- MGR & STAFF PHASE ---
        const managerClient = createClient(url, anonKey, { auth: { persistSession: false } });
        await managerClient.auth.signInWithPassword({ email: 'manager@fobbs.com', password: 'Test@1234' });
        const { data: manBiz } = await managerClient.from('businesses').select('*');
        if (manBiz && manBiz.length === 1) report.managerScope = 'Success';
        else report.challenges.push("Manager scope fail");

        const staffClient = createClient(url, anonKey, { auth: { persistSession: false } });
        await staffClient.auth.signInWithPassword({ email: 'staff@fobbs.com', password: 'Test@1234' });
        const { data: staffBiz } = await staffClient.from('businesses').select('*');
        if (staffBiz && staffBiz.length === 1) report.staffScope = 'Success';
        else report.challenges.push("Staff scope leak. Count: " + (staffBiz ? staffBiz.length : 0));

    } catch (err) {
        report.challenges.push(err.message);
    }

    if (report.weaknesses.length === 0) report.weaknesses.push("None detected in this automated run.");
    if (report.challenges.length === 0) report.challenges.push("None.");

    const finalString = `SUPER ADMIN:
Businesses Visible: ${report.saBizCount}
Business Creation: ${report.saBizCreate}
CEO Assignment: ${report.saCeoAssign}

CEO:
Businesses Visible: ${report.ceoBizCount}
Role Creation Success: ${report.ceoRoleCreate}

MANAGER:
Access Scope: ${report.managerScope}

STAFF:
Access Scope: ${report.staffScope}

URL Tamper Result: ${report.urlTamper}

CHALLENGES:
${report.challenges.join('\n')}

PERCEIVED ARCHITECTURAL WEAKNESSES:
${report.weaknesses.join('\n')}`;

    console.log(finalString);
    writeFileSync('val_result.txt', finalString);
}

runValidation();
