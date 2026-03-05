-- CARSS SHIFT CLOSING & FINANCIAL RECONCILIATION
-- AIM: Enforce the closing lifecycle (open -> pending_declaration -> awaiting_close_approval -> closed)

BEGIN;

-- 1. Ensure statuses are available (already added in request alignment, but being safe)
-- Note: we use 'awaiting_close_approval' as requested in the new requirement.

-- 2. submit_shift_declaration() RPC
-- Purpose: Staff submits totals. Transitions from 'pending_declaration' to 'awaiting_close_approval'.
CREATE OR REPLACE FUNCTION public.submit_shift_declaration(
    p_shift_id UUID,
    p_cash NUMERIC,
    p_pos NUMERIC,
    p_transfer NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_exp_cash NUMERIC;
    v_exp_pos NUMERIC;
    v_exp_transfer NUMERIC;
    v_shift RECORD;
BEGIN
    -- A. Lock shift and verify ownership
    SELECT * INTO v_shift FROM public.shifts WHERE id = p_shift_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Shift not found');
    END IF;

    IF v_shift.staff_id <> auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied: Shift ownership mismatch');
    END IF;

    IF v_shift.status <> 'pending_declaration' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Shift is not in pending_declaration state');
    END IF;

    -- B. Aggregate System Totals from Transactions
    SELECT 
        COALESCE(SUM(CASE WHEN payment_type = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_type = 'pos' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_type = 'transfer' THEN amount ELSE 0 END), 0)
    INTO v_exp_cash, v_exp_pos, v_exp_transfer
    FROM public.transactions
    WHERE shift_id = p_shift_id
    AND status IN ('verified', 'completed');

    -- C. Atomic Update with Variance Calculation
    UPDATE public.shifts SET
        status = 'awaiting_close_approval',
        declared_cash = p_cash,
        declared_pos = p_pos,
        declared_transfer = p_transfer,
        expected_cash = v_exp_cash,
        expected_pos = v_exp_pos,
        expected_transfer = v_exp_transfer,
        expected_revenue = (v_exp_cash + v_exp_pos + v_exp_transfer), -- Backwards compatibility
        variance = (p_cash + p_pos + p_transfer) - (v_exp_cash + v_exp_pos + v_exp_transfer),
        updated_at = NOW()
    WHERE id = p_shift_id;

    -- D. Telemetry Log
    INSERT INTO public.audit_logs (event_type, actor_id, resource_id, new_value)
    VALUES ('SHIFT_DECLARATION_SUBMITTED', auth.uid(), p_shift_id, jsonb_build_object(
        'declared_total', (p_cash + p_pos + p_transfer),
        'system_total', (v_exp_cash + v_exp_pos + v_exp_transfer),
        'variance', (p_cash + p_pos + p_transfer) - (v_exp_cash + v_exp_pos + v_exp_transfer)
    ));

    RETURN jsonb_build_object(
        'success', true, 
        'system_total', (v_exp_cash + v_exp_pos + v_exp_transfer),
        'declared_total', (p_cash + p_pos + p_transfer),
        'variance', (p_cash + p_pos + p_transfer) - (v_exp_cash + v_exp_pos + v_exp_transfer)
    );
END;
$$;

-- 3. approve_shift_close() RPC
-- Purpose: Manager approves reconciliation and closes shift permanently.
CREATE OR REPLACE FUNCTION public.approve_shift_close(p_shift_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_manager_role TEXT;
BEGIN
    -- A. Verify Manager Permission
    SELECT role INTO v_manager_role FROM public.business_memberships WHERE user_id = auth.uid();
    IF v_manager_role NOT IN ('manager', 'ceo', 'owner', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;

    -- B. Verify Status and Atomic Close
    UPDATE public.shifts SET 
        status = 'closed', 
        closed_at = NOW(),
        ends_at = NOW(), -- Compatibility
        updated_at = NOW()
    WHERE id = p_shift_id AND status IN ('awaiting_close_approval', 'awaiting_manager_approval');

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Shift not found or not awaiting close approval');
    END IF;

    -- C. Telemetry
    INSERT INTO public.audit_logs (event_type, actor_id, resource_id, new_value)
    VALUES ('SHIFT_CLOSED', auth.uid(), p_shift_id, jsonb_build_object('status', 'closed'));

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. State Machine Guard Rail Reinforcement
CREATE OR REPLACE FUNCTION public.shift_state_guard()
RETURNS TRIGGER AS $$
BEGIN
    -- Transitions allowed:
    -- requested → open (manager)
    -- requested → rejected (manager)
    -- open → pending_declaration (staff/system)
    -- pending_declaration → awaiting_close_approval (staff)
    -- awaiting_close_approval → closed (manager)
    -- awaiting_close_approval → rejected (manager)

    IF OLD.status = 'requested' AND NEW.status NOT IN ('open', 'rejected') THEN
        RAISE EXCEPTION 'Invalid Transition from requested to %', NEW.status;
    END IF;

    IF OLD.status = 'open' AND NEW.status NOT IN ('pending_declaration') THEN
        RAISE EXCEPTION 'Invalid Transition from open to %', NEW.status;
    END IF;

    IF OLD.status = 'pending_declaration' AND NEW.status NOT IN ('awaiting_close_approval', 'open') THEN
        RAISE EXCEPTION 'Invalid Transition from pending_declaration to %', NEW.status;
    END IF;

    IF OLD.status = 'awaiting_close_approval' AND NEW.status NOT IN ('closed', 'rejected') THEN
        RAISE EXCEPTION 'Invalid Transition from awaiting_close_approval to %', NEW.status;
    END IF;

    IF OLD.status = 'closed' THEN
        RAISE EXCEPTION 'Immutable State: Shift already closed';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
