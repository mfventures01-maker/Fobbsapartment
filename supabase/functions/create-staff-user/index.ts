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

        // 1. Check if caller is admin
        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) throw new Error('Unauthorized: Not logged in')

        // Check caller role in profiles
        // Querying by user_id
        const { data: callerProfile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .single()

        // Fallback query if user_id migration not run yet (try 'id')
        let actualProfile = callerProfile
        if (!callerProfile) {
            const { data: callerProfileId } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()
            actualProfile = callerProfileId
        }

        if (!actualProfile || !['owner', 'ceo', 'manager'].includes(actualProfile.role)) {
            throw new Error('Unauthorized: Insufficient privileges')
        }

        // 2. Create User
        // We need SERVICE_ROLE_KEY to use auth.admin
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { email, password, full_name, role, department, business_id } = await req.json()

        if (!email || !password || !business_id) {
            throw new Error('Missing required fields')
        }

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name, role, department, business_id }
        })

        if (createError) throw createError
        if (!newUser.user) throw new Error('User creation failed returning null')

        // 3. Upsert Profile
        const { error: upsertError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                user_id: newUser.user.id,
                full_name,
                role: role || 'staff',
                department,
                business_id,
                updated_at: new Date().toISOString()
            })

        if (upsertError) {
            console.error("Profile upsert failed:", upsertError)
            return new Response(
                JSON.stringify({ error: "User created but profile failed: " + upsertError.message }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        return new Response(
            JSON.stringify({ user: newUser.user, message: "Staff created successfully" }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
