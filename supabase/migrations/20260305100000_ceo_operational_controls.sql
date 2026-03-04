-- CARSS CEO OPERATIONAL CONTROLS
-- AIM: Providing the highest authority RPCs for multi-branch management.

BEGIN;

-- 1. create_branch()
CREATE OR REPLACE FUNCTION public.create_branch(
    p_business_id UUID,
    p_name TEXT,
    p_code TEXT,
    p_city TEXT,
    p_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_branch_id UUID;
BEGIN
    -- Authority Check: Only CEO/Owner can create branches
    IF public.current_user_role_v2() NOT IN ('ceo', 'owner', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: CEO authority required.');
    END IF;

    INSERT INTO public.branches (business_id, name, code, city, address)
    VALUES (p_business_id, p_name, p_code, p_city, p_address)
    RETURNING id INTO v_branch_id;

    RETURN jsonb_build_object('success', true, 'branch_id', v_branch_id);
END;
$$;

-- 2. create_department()
CREATE OR REPLACE FUNCTION public.create_department(
    p_business_id UUID,
    p_branch_id UUID,
    p_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_dept_id UUID;
BEGIN
    IF public.current_user_role_v2() NOT IN ('ceo', 'owner', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized.');
    END IF;

    INSERT INTO public.departments (business_id, branch_id, name)
    VALUES (p_business_id, p_branch_id, p_name)
    RETURNING id INTO v_dept_id;

    RETURN jsonb_build_object('success', true, 'department_id', v_dept_id);
END;
$$;

-- 3. disable_staff()
CREATE OR REPLACE FUNCTION public.disable_staff(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF public.current_user_role_v2() NOT IN ('ceo', 'owner', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized.');
    END IF;

    -- Update profile status
    UPDATE public.profiles 
    SET status = 'suspended', updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Update membership status if applicable
    UPDATE public.business_memberships
    SET status = 'inactive', updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

COMMIT;
