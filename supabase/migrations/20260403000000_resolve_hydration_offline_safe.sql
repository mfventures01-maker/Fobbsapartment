-- ============================================================
-- ANTI-GRAVITY: resolve_hydration_offline_safe v2
-- Fixes: profiles.business_id may not exist in all environments.
-- Solution: reads business_id via branches.business_id join instead.
-- ============================================================

CREATE OR REPLACE FUNCTION public.resolve_hydration_offline_safe()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid;
  v_role        text;
  v_branch_id   uuid;
  v_full_name   text;
  v_department  text;
  v_is_active   boolean;
  v_business_id uuid;
  v_staff_id    uuid;
  v_shift_id    uuid;
BEGIN
  -- 1. Confirm authenticated session
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'canHydrate', false,
      'error', 'NOT_AUTHENTICATED'
    );
  END IF;

  -- 2. Read core identity from profiles (no business_id — use branch join instead)
  SELECT
    p.role,
    p.branch_id,
    p.full_name,
    p.department,
    COALESCE(p.is_active, true)
  INTO v_role, v_branch_id, v_full_name, v_department, v_is_active
  FROM public.profiles p
  WHERE p.user_id = v_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'canHydrate', false,
      'error', 'PROFILE_NOT_FOUND',
      'user_id', v_user_id
    );
  END IF;

  IF NOT v_is_active THEN
    RETURN jsonb_build_object(
      'canHydrate', false,
      'error', 'ACCOUNT_INACTIVE',
      'user_id', v_user_id
    );
  END IF;

  -- 3. Resolve business_id from branches table (correct relational path)
  IF v_branch_id IS NOT NULL THEN
    SELECT b.business_id INTO v_business_id
    FROM public.branches b
    WHERE b.id = v_branch_id
    LIMIT 1;
  END IF;

  -- 4. Resolve staff_id from staff_profiles
  SELECT id INTO v_staff_id
  FROM public.staff_profiles
  WHERE user_id = v_user_id
  LIMIT 1;

  -- 5. Resolve active shift (graceful — skip if table missing or no shift)
  IF v_staff_id IS NOT NULL THEN
    BEGIN
      SELECT id INTO v_shift_id
      FROM public.business_memberships
      WHERE user_id = v_user_id
        AND status = 'active'
      LIMIT 1;
    EXCEPTION WHEN undefined_table THEN
      v_shift_id := NULL;
    END;
  END IF;

  -- 6. Return full hydration payload
  RETURN jsonb_build_object(
    'canHydrate',   true,
    'user_id',      v_user_id,
    'role',         v_role,
    'branch_id',    v_branch_id,
    'business_id',  v_business_id,
    'staff_id',     v_staff_id,
    'active_shift', v_shift_id,
    'full_name',    v_full_name,
    'department',   v_department
  );
END;
$$;

-- Permissions
REVOKE ALL ON FUNCTION public.resolve_hydration_offline_safe() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_hydration_offline_safe() TO authenticated;

COMMENT ON FUNCTION public.resolve_hydration_offline_safe() IS
  'v2: Resolves business_id via branches join, not profiles.business_id. '
  'Parameterless — uses auth.uid(). Returns canHydrate + full identity payload.';
