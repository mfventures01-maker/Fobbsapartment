-- 🛸 CARSS AG RESTART SEQUENCE (FORENSIC RESET)
-- Purpose: Fully reset the CARSS Hotel Edition portal, close active shifts, and ensure RPC integrity.
-- AG Directive: This is a surgical reset to clear backend deadlocks and stale sessions.

BEGIN;

-- 1. Close All Active Shifts (Step 1)
-- Invariant: No branch should be locked in a state that blocks new shift creation during a global reset.
UPDATE public.shifts 
SET status = 'closed', 
    closed_at = NOW(),
    metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{restart_sequence}', 'true')
WHERE status = 'open';

-- 2. Invalidate Active Staff Profiles (Step 2)
-- Ensures the next login triggers a full security handshake and hydration.
UPDATE public.profiles 
SET is_active = false,
    status = 'inactive'
WHERE is_active = true OR status = 'active';

-- 3. Core RPC Assurance (Step 3)
-- Re-defining log_guest_event and ensuring fallback logic.

CREATE OR REPLACE FUNCTION public.log_guest_event(
    p_event_type TEXT,
    p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Use the robust audit_logs table as the event sink
    INSERT INTO public.audit_logs (
        event_type, 
        actor_id, 
        metadata, 
        success,
        correlation_id
    )
    VALUES (
        p_event_type, 
        auth.uid(), 
        p_payload, 
        true,
        COALESCE(p_payload->>'correlation_id', (p_payload->>'_idempotency_key'))
    );
END;
$$;

-- Ensure get_my_operational_context is robust (Identity Spine)
CREATE OR REPLACE FUNCTION public.get_my_operational_context()
RETURNS TABLE (
    v_user_id UUID,
    v_staff_id UUID,
    v_branch_id UUID,
    v_business_id UUID,
    v_department_id TEXT,
    v_role TEXT,
    v_shift_id UUID
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        auth.uid(),
        s.id,
        m.branch_id,
        m.business_id,
        m.department_id,
        m.role,
        sh.id
    FROM public.business_memberships m
    LEFT JOIN public.staff_profiles s ON s.user_id = m.user_id
    LEFT JOIN public.shifts sh ON sh.branch_id = m.branch_id AND sh.status = 'open'
    WHERE m.user_id = auth.uid()
    LIMIT 1;
END;
$$;

-- 🎖️ AG STATUS: SYSTEM RESET COMPLETE. READY FOR RE-HYDRATION.
COMMIT;
