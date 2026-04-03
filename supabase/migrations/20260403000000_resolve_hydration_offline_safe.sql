-- ============================================================
-- ANTI-GRAVITY: resolve_hydration_offline_safe
-- Single source of truth for frontend identity hydration.
-- Reads from profiles + staff_profiles + business_memberships.
-- No parameters. Uses auth.uid() internally.
-- Returns everything the frontend needs in one call.
-- ============================================================

CREATE OR REPLACE FUNCTION public.resolve_hydration_offline_safe()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid;
  v_profile    record;
  v_staff_id   uuid;
  v_shift_id   uuid;
BEGIN
  -- 1. Confirm authenticated session
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'canHydrate', false,
      'error', 'NOT_AUTHENTICATED'
    );
  END IF;

  -- 2. Read identity from profiles table (primary source of truth)
  SELECT
    p.role,
    p.branch_id,
    p.business_id,
    p.full_name,
    p.department,
    p.is_active
  INTO v_profile
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

  IF NOT v_profile.is_active THEN
    RETURN jsonb_build_object(
      'canHydrate', false,
      'error', 'ACCOUNT_INACTIVE',
      'user_id', v_user_id
    );
  END IF;

  -- 3. Resolve staff_id from staff_profiles (if exists)
  SELECT id INTO v_staff_id
  FROM public.staff_profiles
  WHERE user_id = v_user_id
  LIMIT 1;

  -- 4. Resolve active shift (if staff has a running shift)
  IF v_staff_id IS NOT NULL THEN
    -- Check business_memberships table for active shift
    -- Gracefully skip if table doesn't exist
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

  -- 5. Return full hydration payload
  RETURN jsonb_build_object(
    'canHydrate',   true,
    'user_id',      v_user_id,
    'role',         v_profile.role,
    'branch_id',    v_profile.branch_id,
    'business_id',  v_profile.business_id,
    'staff_id',     v_staff_id,
    'active_shift', v_shift_id,
    'full_name',    v_profile.full_name,
    'department',   v_profile.department
  );
END;
$$;

-- Grant execution to authenticated users only
REVOKE ALL ON FUNCTION public.resolve_hydration_offline_safe() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_hydration_offline_safe() TO authenticated;

COMMENT ON FUNCTION public.resolve_hydration_offline_safe() IS
  'Deterministic hydration RPC. No parameters. Uses auth.uid(). '
  'Returns role, branch_id, business_id, staff_id, active_shift. '
  'canHydrate=false means the frontend must block all downstream operations.';
