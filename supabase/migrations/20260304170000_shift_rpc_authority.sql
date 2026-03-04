-- CARSS RPC AUTHORITY ENFORCEMENT
-- AIM: Moving high-stakes shift operations to RPC functions to ensure frontend cannot bypass security rules.

BEGIN;

-- 1. start_shift() RPC
-- Purpose: Atomically initialize a shift with manager oversight request.
CREATE OR REPLACE FUNCTION public.start_shift()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_membership RECORD;
    v_existing_shift UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- A. Check for existing open/pending shifts (The Gate)
    SELECT id INTO v_existing_shift FROM public.shifts 
    WHERE staff_id = v_user_id AND status <> 'closed' 
    LIMIT 1;

    IF v_existing_shift IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'You already have an active or pending shift.');
    END IF;

    -- B. Get Membership Context
    SELECT business_id, branch_id, department_id INTO v_membership 
    FROM public.business_memberships 
    WHERE user_id = v_user_id;

    IF NOT FOUND THEN
        -- Fallback to profiles for legacy support if needed
        SELECT business_id, branch_id, department INTO v_membership 
        FROM public.profiles 
        WHERE user_id = v_user_id;
    END IF;

    IF v_membership.business_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Membership context not found.');
    END IF;

    -- C. Initialize Shift
    INSERT INTO public.shifts (
        staff_id, business_id, branch_id, department_id,
        status, start_time,
        declared_cash, declared_pos, declared_transfer
    ) VALUES (
        v_user_id, v_membership.business_id, v_membership.branch_id, v_membership.department_id,
        'awaiting_manager_open', NOW(),
        0, 0, 0
    );

    RETURN jsonb_build_object('success', true);
END;
$$;


-- 2. end_shift() RPC
-- Purpose: Atomically transition shift to declaration phase.
CREATE OR REPLACE FUNCTION public.end_shift()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_shift_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    SELECT id INTO v_shift_id FROM public.shifts 
    WHERE staff_id = v_user_id AND status = 'open' 
    LIMIT 1;

    IF v_shift_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active shift found to end.');
    END IF;

    UPDATE public.shifts SET
        status = 'pending_declaration',
        ends_at = NOW(),
        updated_at = NOW()
    WHERE id = v_shift_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

COMMIT;
