-- 🛸 ANTI-GRAVITY: SYSTEM BOOTSTRAP KERNEL (LAYER 0)
-- Purpose: Provide the single, authoritative entry point for terminal ignition.
-- Law: One Awakening. Every terminal resolves its entire reality in a single atomic snapshot.

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
    v_version_timestamp BIGINT;
    v_result JSONB;
BEGIN
    -- 1. 🧬 RESOLVE IDENTITY & CONTEXT
    -- If parameters are null, attempt to resolve from auth.uid()
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

    -- 3. ⚖️ RESOLVE ACTIVE SHIFT (Deterministic)
    -- This enforces the 'Execution Context' law: Every staff action must belong to a shift.
    SELECT id, status, version 
    INTO v_shift_data 
    FROM public.shifts 
    WHERE staff_id = v_staff_data.id 
      AND branch_id = v_branch_data.id 
      AND status = 'open' 
    LIMIT 1;

    -- If no shift exists, we don't force one here (let the app handle Open Shift UI),
    -- but we return the null state deterministically.

    -- 4. 🕒 GENERATE VERSION SNAPSHOT
    v_version_timestamp := EXTRACT(EPOCH FROM NOW())::BIGINT;

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
        'version', v_version_timestamp
    );

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.system_bootstrap(UUID, UUID) TO authenticated;

COMMIT;
