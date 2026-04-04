-- 🛡️ CARSS LAYER 4: DETERMINISTIC SHIFT ENGINE
-- Purpose: Enforce the 'One Branch, One Shift' invariant.
-- Eliminates parameter trust and race conditions via parameterless idempotent RPC.

BEGIN;

-- 1. CLEANUP CONFLICTING CONSTRAINTS (Law 3)
-- Drop existing uniqueness constraints that allow multiple shifts per branch
DROP INDEX IF EXISTS idx_unique_open_shift_per_staff;
DROP INDEX IF EXISTS shifts_staff_id_status_key;
DROP INDEX IF EXISTS idx_unique_open_shift_per_business;

-- 2. ENFORCE CORE INVARIANT (Law 2)
-- Exactly ONE active shift per branch is mathematically enforced.
CREATE UNIQUE INDEX IF NOT EXISTS one_active_shift_per_branch 
ON public.shifts (branch_id) 
WHERE (status = 'open');

-- 3. PARAMETERLESS DETERMINISTIC RPC (Law 5 & Law 4)
-- This function relies entirely on auth.uid() and internal database truth.
CREATE OR REPLACE FUNCTION public.resolve_active_shift()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_staff_id UUID;
    v_branch_id UUID;
    v_business_id UUID;
    v_department_id TEXT;
    v_shift RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- ── RESOLVE IDENTITY (Law 1) ───────────────────────────────────────────
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session Expired: Re-authentication required.');
    END IF;

    -- Resolve context from SSOT Identity Spine
    SELECT 
        m.business_id,
        m.branch_id,
        m.department_id,
        s.id as staff_id
    INTO v_business_id, v_branch_id, v_department_id, v_staff_id
    FROM public.business_memberships m
    LEFT JOIN public.staff_profiles s ON s.user_id = m.user_id
    WHERE m.user_id = v_user_id
    LIMIT 1;

    IF v_branch_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Provisioning Failure: No branch context mapped to identity.');
    END IF;

    -- ── RESOLVE OR CREATE SHIFT (Law 4) ───────────────────────────────────
    -- Step A: Check for existing open shift in this branch
    SELECT * INTO v_shift
    FROM public.shifts
    WHERE branch_id = v_branch_id AND status = 'open'
    LIMIT 1;

    -- Step B: If no shift exists, create it atomically (Idempotent Gate)
    IF NOT FOUND THEN
        INSERT INTO public.shifts (
            branch_id,
            business_id,
            staff_id,
            department_id,
            status,
            opened_at,
            cash_balance,
            total_revenue
        ) VALUES (
            v_branch_id,
            v_business_id,
            v_staff_id,
            v_department_id,
            'open',
            v_now,
            0,
            0
        ) 
        ON CONFLICT (branch_id) WHERE status = 'open' DO NOTHING
        RETURNING * INTO v_shift;

        -- Handle concurrency race (if someone else created it exactly between SELECT and INSERT)
        IF v_shift IS NULL THEN
            SELECT * INTO v_shift
            FROM public.shifts
            WHERE branch_id = v_branch_id AND status = 'open'
            LIMIT 1;
        END IF;
    END IF;

    -- ── RETURN TRUTH ───────────────────────────────────────────────────────
    RETURN jsonb_build_object(
        'success', true,
        'id', v_shift.id,
        'status', v_shift.status,
        'opened_at', v_shift.opened_at,
        'business_id', v_shift.business_id,
        'branch_id', v_shift.branch_id,
        'staff_id', v_shift.staff_id,
        'department_id', v_shift.department_id,
        'owned_by_current_staff', (v_shift.staff_id = v_staff_id OR v_shift.staff_id = v_user_id),
        'cash_balance', v_shift.cash_balance,
        'total_revenue', v_shift.total_revenue
    );
END;
$$;

-- Allow authenticated users to resolve their branch shift
GRANT EXECUTE ON FUNCTION public.resolve_active_shift() TO authenticated;

COMMIT;
