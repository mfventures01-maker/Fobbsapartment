-- 🛡️ ANTI-GRAVITY PHASE 7: FORENSIC AUDIT & SYMMETRY FIX
-- Purpose: Resolve "function not unique" errors and implement client-side error logging.
-- Objective: Canonicalize get_my_identity and ensure log_frontend_error exists.

BEGIN;

-- 1. DROP REDUNDANT IDENTITIES
-- We must explicitly drop all variants to clear the "not unique" ambiguity.
DROP FUNCTION IF EXISTS public.get_my_identity();
DROP FUNCTION IF EXISTS public.get_my_identity(TEXT);

-- 2. CANONICAL IDENTITY RESOLUTION (V3)
CREATE OR REPLACE FUNCTION public.get_my_identity(p_terminal_type TEXT DEFAULT 'staff')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_membership RECORD;
    v_staff RECORD;
BEGIN
    v_user_id := auth.uid();
    
    -- Resolve Membership (Business + Role + Branch)
    SELECT 
        m.role,
        m.business_id,
        m.branch_id,
        m.department_id,
        d.name as department_name
    INTO v_membership
    FROM public.business_memberships m
    LEFT JOIN public.departments d ON d.id = m.department_id
    WHERE m.user_id = v_user_id
    LIMIT 1;

    -- Resolve Staff Proxy (Operational Identity)
    SELECT id INTO v_staff FROM public.staff_profiles WHERE user_id = v_user_id LIMIT 1;

    RETURN jsonb_build_object(
        'user_id', v_user_id,
        'role', COALESCE(v_membership.role, 'customer'),
        'business_id', v_membership.business_id,
        'branch_id', v_membership.branch_id,
        'department_id', v_membership.department_id,
        'department_name', v_membership.department_name,
        'staff_id', v_staff.id,
        'terminal_type', p_terminal_type,
        'authenticated', (v_user_id IS NOT NULL),
        'timestamp', NOW(),
        'status', CASE WHEN v_user_id IS NOT NULL THEN 'authorized' ELSE 'unauthorized' END
    );
END;
$$;

-- 3. FRONTEND ERROR LOGGING (FORENSIC GATE)
CREATE OR REPLACE FUNCTION public.log_frontend_error(
    rpc TEXT DEFAULT NULL,
    payload JSONB DEFAULT NULL,
    error TEXT DEFAULT NULL,
    terminal_type TEXT DEFAULT 'unknown'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.deterministic_event_log (
        terminal_type,
        event_type,
        rpc_name,
        payload,
        error,
        identity
    ) VALUES (
        terminal_type,
        'FRONTEND_ERROR',
        COALESCE(rpc, 'UI_FATAL'),
        COALESCE(payload, '{}'::jsonb),
        jsonb_build_object('message', error),
        COALESCE((SELECT get_my_identity(terminal_type)), '{}'::jsonb)
    );
END;
$$;

-- 4. GRANT ACCESS
GRANT EXECUTE ON FUNCTION public.get_my_identity(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_identity(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.log_frontend_error(TEXT, JSONB, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_frontend_error(TEXT, JSONB, TEXT, TEXT) TO anon;

COMMIT;
