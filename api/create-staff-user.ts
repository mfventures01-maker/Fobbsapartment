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

// Helper for consistent JSON responses
function jsonResponse(body: any, status: number) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
        }
    });
}

export default async function handler(request: Request) {
    // 1. Method Check
    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    // 2. Auth Header Check
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        return jsonResponse({ error: 'Missing Authorization header' }, 401);
    }
    const token = authHeader.replace('Bearer ', '');

    // 3. Env Vars Check
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return jsonResponse({ error: 'Server configuration error: Missing env vars' }, 500);
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
            return jsonResponse({ error: 'Invalid auth token' }, 401);
        }

        const { data: callerProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role, business_id')
            .eq('user_id', callerUser.id)
            .single();

        if (profileError || !callerProfile) {
            return jsonResponse({ error: 'Caller profile not found' }, 403);
        }

        const allowedRoles = ['owner', 'ceo', 'manager'];
        if (!allowedRoles.includes(callerProfile.role)) {
            return jsonResponse({ error: 'Unauthorized: Insufficient permissions' }, 403);
        }

        // 6. Parse & Validate Body
        const body: CreateStaffRequest = await request.json();
        const { full_name, email, role, department } = body;

        if (!full_name || !email || !role) {
            return jsonResponse({ error: 'Missing full_name, email, or role' }, 400);
        }

        // Validate Role
        if (!['manager', 'staff'].includes(role)) {
            return jsonResponse({ error: 'Invalid role. Must be manager or staff' }, 400);
        }

        // Validate Department if Staff
        let validDept = null;
        if (role === 'staff') {
            if (!department) {
                return jsonResponse({ error: 'Department is required for staff role' }, 400);
            }
            const validDepts = ['restaurant', 'bar', 'reception', 'housekeeping'];
            if (!validDepts.includes(department.toLowerCase())) {
                return jsonResponse({ error: `Invalid department. Must be one of: ${validDepts.join(', ')}` }, 400);
            }
            validDept = department.toLowerCase();
        }

        // 7. Invite User
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: { full_name }
        });

        if (inviteError) {
            return jsonResponse({ error: `Invite failed: ${inviteError.message}` }, 400);
        }
        if (!inviteData.user) {
            return jsonResponse({ error: 'Invite failed: No user returned' }, 500);
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
            return jsonResponse({ error: `Profile creation failed: ${upsertError.message}` }, 500);
        }

        // 9. Success Response
        return jsonResponse({
            success: true,
            user_id: inviteData.user.id,
            message: 'Invitation sent successfully'
        }, 200);

    } catch (error: any) {
        return jsonResponse({ error: error.message || 'Internal Server Error' }, 500);
    }
}
