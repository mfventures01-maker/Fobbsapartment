-- 🛸 ANTI-GRAVITY: SYSTEM BOOTSTRAP KERNEL (LAYER 0) — DETERMINISTIC VERSION REPAIR
-- Purpose: Kill the 'Hydration Loop' by providing a deterministic version clock.
-- Law: Version = State Change. If the database hasn't changed, the version hasn't changed.

BEGIN;

CREATE OR REPLACE FUNCTION public.system_bootstrap(
    p_staff_id UUID DEFAULT NULL,
    p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_staff_data RECORD;
    v_branch_data RECORD;
    v_shift_data RECORD;
    v_version_clock BIGINT;
    v_result JSONB;
BEGIN
    -- 1. 🧬 RESOLVE IDENTITY & CONTEXT
    IF p_staff_id IS NULL THEN
        SELECT id, branch_id, org_id INTO v_staff_data FROM public.staff WHERE user_id = auth.uid() LIMIT 1;
    ELSE
        SELECT id, branch_id, org_id INTO v_staff_data FROM public.staff WHERE id = p_staff_id;
    END IF;

    IF v_staff_data IS NULL THEN
        RAISE EXCEPTION 'Identity Resolution Failed — Staff context not found.';
    END IF;

    -- 2. 📍 RESOLVE BRANCH & BUSINESS
    SELECT b.id, b.name, b.business_id, biz.name as business_name 
    INTO v_branch_data 
    FROM public.branches b
    JOIN public.businesses biz ON b.business_id = biz.id
    WHERE b.id = COALESCE(p_branch_id, v_staff_data.branch_id);

    -- 3. ⚖️ RESOLVE ACTIVE SHIFT (Execution Context)
    SELECT id, status, version 
    INTO v_shift_data 
    FROM public.shifts 
    WHERE staff_id = v_staff_data.id 
      AND branch_id = v_branch_data.id 
      AND status = 'open' 
    LIMIT 1;

    -- 4. 🕒 🧩 THE FIX: DETERMINISTIC VERSION CLOCK
    -- We derive version from the most recent operational event in the branch.
    -- If no events, we fallback to the shift version or 0.
    SELECT COALESCE(MAX(event_id), 0) INTO v_version_clock
    FROM public.operational_events
    WHERE branch_id = v_branch_data.id;
    
    -- If v_version_clock is still 0, use shift version if available
    IF v_version_clock = 0 AND v_shift_data.version IS NOT NULL THEN
        v_version_clock := v_shift_data.version;
    END IF;

    -- 5. 🛰️ ASSEMBLE RESULT
    v_result := jsonb_build_object(
        'status', 'alive',
        'identity', jsonb_build_object(
            'staff_id', v_staff_data.id,
            'user_id', auth.uid(),
            'branch_id', v_branch_data.id,
            'business_id', v_branch_data.business_id
        ),
        'context', jsonb_build_object(
            'branch_name', v_branch_data.name,
            'business_name', v_branch_data.business_name
        ),
        'execution_context', CASE 
            WHEN v_shift_data.id IS NOT NULL THEN jsonb_build_object(
                'shift_id', v_shift_data.id,
                'status', v_shift_data.status,
                'version', v_shift_data.version
            )
            ELSE NULL 
        END,
        'version', v_version_clock -- ⚡ DETERMINISTIC LOGICAL CLOCK
    );

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.system_bootstrap(UUID, UUID) TO authenticated;

COMMIT;
