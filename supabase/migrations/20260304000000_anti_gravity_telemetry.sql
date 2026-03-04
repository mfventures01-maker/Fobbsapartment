-- ANTI-GRAVITY TELEMETRY & SHIFT OPEN APPROVAL
-- AIM: Implement the full operational pipeline with manager-enforced opening and telemetry.

BEGIN;

-- 1. Extend shift_status enum
-- We can't use ALTER TYPE ... ADD VALUE inside a transaction block easily across all Postgres versions,
-- but for Supabase/Postgres 14+ it works if we handle it carefully.
-- However, given the transaction block, we might need to do it separately or just use DO block.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'shift_status' AND e.enumlabel = 'awaiting_manager_open') THEN
        ALTER TYPE shift_status ADD VALUE 'awaiting_manager_open' BEFORE 'open';
    END IF;
END $$;

-- 2. CREATE RPC: manager_open_shift
CREATE OR REPLACE FUNCTION public.manager_open_shift(p_shift UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_shift RECORD;
    v_manager_role TEXT;
BEGIN
    -- Verify authority
    SELECT role INTO v_manager_role FROM public.business_memberships WHERE user_id = auth.uid();
    IF v_manager_role NOT IN ('manager', 'ceo', 'owner', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;

    -- Lock and verify
    SELECT * INTO v_shift FROM public.shifts WHERE id = p_shift FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Shift not found');
    END IF;

    IF v_shift.status <> 'awaiting_manager_open' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Shift is not pending opening approval');
    END IF;

    -- Approve opening
    UPDATE public.shifts SET 
        status = 'open',
        updated_at = NOW()
    WHERE id = p_shift;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. CREATE RPC: manager_close_shift (Legacy approve_shift alias/upgrade)
CREATE OR REPLACE FUNCTION public.manager_close_shift(p_shift UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN public.approve_shift(p_shift);
END;
$$;

-- 4. Audit update for manager_open_shift
-- (Existing audit trigger trg_audit_shift_status_change will handle the status change)

COMMIT;
