import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge',
};

interface CreateStaffRequest {
    full_name: string;
    email: string;
    role: 'manager' | 'staff';
    department?: string;
}

export default async function handler(request: Request) {
    // 1. Method Check
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    // 2. Auth Header Check
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');

    // 3. Env Vars Check
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return new Response(JSON.stringify({ error: 'Server configuration error: Missing env vars' }), { status: 500 });
    }

    // 4. Init Supabase Clients
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    // 5. Verify Caller (Auth & Role)
    try {
        const { data: { user: callerUser }, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !callerUser) {
            return new Response(JSON.stringify({ error: 'Invalid auth token' }), { status: 401 });
        }

        const { data: callerProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role, business_id')
            .eq('user_id', callerUser.id)
            .single();

        if (profileError || !callerProfile) {
            return new Response(JSON.stringify({ error: 'Caller profile not found' }), { status: 403 });
        }

        const allowedRoles = ['owner', 'ceo', 'manager'];
        if (!allowedRoles.includes(callerProfile.role)) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Insufficient permissions' }), { status: 403 });
        }

        // 6. Parse & Validate Body
        const body: CreateStaffRequest = await request.json();
        const { full_name, email, role, department } = body;

        if (!full_name || !email || !role) {
            return new Response(JSON.stringify({ error: 'Missing full_name, email, or role' }), { status: 400 });
        }

        // Validate Role
        if (!['manager', 'staff'].includes(role)) {
            return new Response(JSON.stringify({ error: 'Invalid role. Must be manager or staff' }), { status: 400 });
        }

        // Validate Department if Staff
        let validDept = null;
        if (role === 'staff') {
            if (!department) {
                return new Response(JSON.stringify({ error: 'Department is required for staff role' }), { status: 400 });
            }
            const validDepts = ['restaurant', 'bar', 'reception', 'housekeeping'];
            if (!validDepts.includes(department.toLowerCase())) {
                return new Response(JSON.stringify({ error: `Invalid department. Must be one of: ${validDepts.join(', ')}` }), { status: 400 });
            }
            validDept = department.toLowerCase();
        }

        // 7. Invite User
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: { full_name }
        });

        if (inviteError) {
            return new Response(JSON.stringify({ error: `Invite failed: ${inviteError.message}` }), { status: 400 });
        }
        if (!inviteData.user) {
            return new Response(JSON.stringify({ error: 'Invite failed: No user returned' }), { status: 500 });
        }

        // 8. Upsert Profile
        const { error: upsertError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                user_id: inviteData.user.id,
                business_id: callerProfile.business_id,
                full_name: full_name,
                role: role,
                department: validDept, // null for manager
                is_active: true,
                created_at: new Date().toISOString()
            });

        if (upsertError) {
            return new Response(JSON.stringify({ error: `Profile creation failed: ${upsertError.message}` }), { status: 500 });
        }

        // 9. Success Response
        return new Response(
            JSON.stringify({
                success: true,
                user_id: inviteData.user.id,
                message: 'Invitation sent successfully'
            }),
            { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
        );

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
    }
}
