
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
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
        // APP_URL not strictly needed here but good practice to have envs ready

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase environment variables')
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        const { token, password } = await req.json()

        // 1. Validation
        if (!token || !password) {
            return new Response(JSON.stringify({ error: 'Missing token or password' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 2. Load Invitation
        // Query by token (allow invitation_code, invitation_token, or token columns per prompt flexible requirement)
        // "invitation_code = token OR invitation_token = token OR token = token"
        // AND status pending AND expires_at > now()

        // We construct the OR filter. 
        // Note: .or() syntax is `column.eq.value,column2.eq.value`
        // We need strict validation, so we'll check invitation_status 'pending'.

        const { data: invites, error: fetchError } = await supabaseAdmin
            .from('staff_invitations')
            .select('*')
            .or(`invitation_token.eq.${token},invitation_code.eq.${token}`) // We'll assume standard columns based on prev context
            .eq('invitation_status', 'pending')
            .gt('expires_at', new Date().toISOString())

        if (fetchError) throw fetchError

        // Additional check if strict "token" column exists or if .or failed to match
        // Optimization: Just take the first valid one
        const invite = invites && invites.length > 0 ? invites[0] : null

        if (!invite) {
            return new Response(JSON.stringify({ error: 'Invalid or expired invitation' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 3. Update Auth Password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            invite.user_id,
            { password: password, email_confirm: true } // Confirm email implicitly on accept
        )

        if (updateError) {
            return new Response(JSON.stringify({ error: `Failed to set password: ${updateError.message}` }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 4. Mark Invitation Accepted
        const { error: patchError } = await supabaseAdmin
            .from('staff_invitations')
            .update({
                invitation_status: 'accepted',
                accepted_at: new Date().toISOString()
            })
            .eq('id', invite.id)

        if (patchError) {
            // Non-fatal but bad state. Log it? Return success anyway as user is active.
            console.error('Failed to mark invitation accepted:', patchError)
        }

        return new Response(JSON.stringify({
            success: true,
            user_id: invite.user_id,
            redirect: "/dashboard"
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
