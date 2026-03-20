-- ANTI-GRAVITY IDENTITY SPINE: DETERMINISTIC RESOLUTION ENGINE
-- Refactor Rule 1: Identity is resolved ONLY via RPC.
-- Purpose: Complete elimination of direct 'business_memberships' queries from frontend.

BEGIN;

-- 1. Identity Resolution RPC
-- Path: AuthContext.tsx -> callRPC('get_my_identity')
CREATE OR REPLACE FUNCTION public.get_my_identity()
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
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Identity Violation: No authenticated session found.';
    END IF;

    -- Resolve Membership (Business + Role)
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
        'role', v_membership.role,
        'business_id', v_membership.business_id,
        'branch_id', v_membership.branch_id,
        'department_id', v_membership.department_id,
        'department_name', v_membership.department_name,
        'staff_id', v_staff.id,
        'timestamp', NOW(),
        'status', 'authorized'
    );
END;
$$;

-- 2. Branch Resolution RPC
-- Path: BranchContext.tsx -> callRPC('get_my_branches')
CREATE OR REPLACE FUNCTION public.get_my_branches()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_business_id UUID;
    v_branches JSONB;
BEGIN
    v_user_id := auth.uid();
    
    -- Resolve business context first
    SELECT business_id INTO v_business_id 
    FROM public.business_memberships 
    WHERE user_id = v_user_id;

    SELECT jsonb_agg(b) INTO v_branches FROM (
        SELECT id, name, city as location
        FROM public.branches
        WHERE business_id = v_business_id
    ) b;

    RETURN jsonb_build_object(
        'branches', COALESCE(v_branches, '[]'::jsonb),
        'server_time', NOW()
    );
END;
$$;

COMMIT;
