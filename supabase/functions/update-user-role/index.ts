import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // 1. Auth Check
        const { data: { user } } = await supabaseClient.auth.getUser()
        if (!user) throw new Error('Unauthorized')

        // 2. Load Caller Profile
        const { data: callerProfile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (profileError || !callerProfile) throw new Error('Profile not found')

        const allowed = ['ceo', 'super_admin', 'owner']
        if (!allowed.includes(callerProfile.role)) {
            throw new Error('Insufficient privileges')
        }

        // 3. Parse Input
        const { user_id, role } = await req.json()
        if (!user_id || !role) throw new Error('Missing user_id or role')

        // 4. Validate Role Transition
        const ceoRoles = ['manager', 'staff', 'viewer']
        const adminRoles = ['super_admin', 'owner', 'ceo', 'manager', 'staff', 'viewer']

        if (['ceo', 'owner'].includes(callerProfile.role) && !ceoRoles.includes(role)) {
            throw new Error('CEO can only set roles: ' + ceoRoles.join(', '))
        }
        if (callerProfile.role === 'super_admin' && !adminRoles.includes(role)) {
            throw new Error('Invalid role')
        }

        // 5. Check Target User (Tenant Boundary)
        // We need to fetch target user profile to ensure they are in same business for CEO
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: targetProfile, error: targetError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('user_id', user_id)
            .single()

        if (targetError || !targetProfile) throw new Error('Target user not found')

        if (['ceo', 'owner'].includes(callerProfile.role)) {
            if (targetProfile.business_id !== callerProfile.business_id) {
                throw new Error('Cannot manage user from another business')
            }
        }

        // 6. Update Role
        const { data: updated, error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
                role,
                last_updated: new Date().toISOString() // using last_updated as activity log equivalent or use metadata
            })
            .eq('user_id', user_id)
            .select()
            .single()

        if (updateError) throw updateError

        return new Response(
            JSON.stringify({ ok: true, profile: updated }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
