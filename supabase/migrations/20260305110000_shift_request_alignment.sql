-- CARSS SHIFT REQUEST GUARD RAIL ALIGNMENT
-- AIM: Transition to 'requested' status for shift initialization and enforce state machine.

BEGIN;

-- 1. Evolve Shift Status Enum
-- Note: 'awaiting_manager_open' will be treated as 'requested' in the frontend.
-- But we'll add 'requested' for strict alignment with the new requirement.
ALTER TYPE public.shift_status ADD VALUE IF NOT EXISTS 'requested' BEFORE 'open';
ALTER TYPE public.shift_status ADD VALUE IF NOT EXISTS 'awaiting_close_approval' BEFORE 'closed';

-- 2. Update Status Constraint
ALTER TABLE public.shifts DROP CONSTRAINT IF EXISTS shifts_status_check;
ALTER TABLE public.shifts ADD CONSTRAINT shifts_status_check
CHECK (status IN ('requested', 'awaiting_manager_open', 'open', 'pending_declaration', 'awaiting_close_approval', 'awaiting_manager_approval', 'closed', 'rejected'));

-- 3. request_shift() RPC
CREATE OR REPLACE FUNCTION public.request_shift()
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
    WHERE staff_id = v_user_id AND status NOT IN ('closed', 'rejected') 
    LIMIT 1;

    IF v_existing_shift IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'You already have an active or pending shift.');
    END IF;

    -- B. Get Membership Context
    SELECT business_id, branch_id, department_id INTO v_membership 
    FROM public.business_memberships 
    WHERE user_id = v_user_id;

    IF NOT FOUND THEN
        SELECT business_id, branch_id, department as department_id INTO v_membership 
        FROM public.profiles 
        WHERE user_id = v_user_id;
    END IF;

    IF v_membership.business_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Membership context not found.');
    END IF;

    -- C. Initialize Shift as 'requested'
    INSERT INTO public.shifts (
        staff_id, business_id, branch_id, department_id,
        status, start_time,
        declared_cash, declared_pos, declared_transfer
    ) VALUES (
        v_user_id, v_membership.business_id, v_membership.branch_id, v_membership.department_id,
        'requested', NOW(),
        0, 0, 0
    );

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Alias start_shift to request_shift for legacy support during migration
CREATE OR REPLACE FUNCTION public.start_shift()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN public.request_shift();
END;
$$;

-- 4. Shift State Guard (The State Machine)
CREATE OR REPLACE FUNCTION public.shift_state_guard()
RETURNS TRIGGER AS $$
BEGIN
    --requested → open (manager)
    --requested → rejected (manager)
    --open → awaiting_close_approval (staff)
    --awaiting_close_approval → closed (manager)

    IF OLD.status = 'requested' AND NEW.status NOT IN ('open', 'rejected') THEN
        RAISE EXCEPTION 'Invalid Transition: requested can only move to open or rejected (Requested: %, New: %)', OLD.status, NEW.status;
    END IF;

    IF OLD.status = 'open' AND NEW.status NOT IN ('awaiting_close_approval', 'pending_declaration') THEN
        RAISE EXCEPTION 'Invalid Transition: open can only move to awaiting_close_approval or pending_declaration';
    END IF;

    IF OLD.status = 'awaiting_close_approval' AND NEW.status NOT IN ('closed', 'rejected') THEN
        RAISE EXCEPTION 'Invalid Transition: awaiting_close_approval can only move to closed or rejected';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shift_state_guard ON public.shifts;
CREATE TRIGGER trg_shift_state_guard
BEFORE UPDATE ON public.shifts
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE PROCEDURE public.shift_state_guard();

-- 5. Manager Opening Approvals
CREATE OR REPLACE FUNCTION public.approve_shift_open(p_shift_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_manager_role TEXT;
BEGIN
    SELECT role INTO v_manager_role FROM public.business_memberships WHERE user_id = auth.uid();
    IF v_manager_role NOT IN ('manager', 'ceo', 'owner', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;

    UPDATE public.shifts SET status = 'open', updated_at = NOW() 
    WHERE id = p_shift_id AND status IN ('requested', 'awaiting_manager_open');

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Shift not in a state to be opened');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_shift_open(p_shift_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_manager_role TEXT;
BEGIN
    SELECT role INTO v_manager_role FROM public.business_memberships WHERE user_id = auth.uid();
    IF v_manager_role NOT IN ('manager', 'ceo', 'owner', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;

    UPDATE public.shifts SET status = 'rejected', updated_at = NOW() 
    WHERE id = p_shift_id AND status IN ('requested', 'awaiting_manager_open');

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Shift not found or already processed');
    END IF;

    INSERT INTO public.audit_logs (event_type, actor_id, resource_id, new_value)
    VALUES ('SHIFT_OPEN_REJECTED', auth.uid(), p_shift_id, jsonb_build_object('reason', p_reason));

    RETURN jsonb_build_object('success', true);
END;
$$;

COMMIT;
