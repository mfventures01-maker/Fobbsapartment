-- PHASE B: SHIFT DECLARATION & VARIANCE ENGINE
-- AIM: Atomic calculation of shift totals and variance.

BEGIN;

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
    v_expected NUMERIC;
    v_shift RECORD;
BEGIN
    -- 1. Lock shift and verify status
    SELECT * INTO v_shift FROM public.shifts WHERE id = p_shift_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Shift not found');
    END IF;
    
    IF v_shift.status <> 'pending_declaration' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Shift is not in pending_declaration state (Current: ' || v_shift.status || ')');
    END IF;

    -- 2. Calculate Expected Revenue from transactions
    -- Includes all payment types linked to this shift_id
    SELECT COALESCE(SUM(amount), 0) INTO v_expected
    FROM public.transactions
    WHERE shift_id = p_shift_id
    AND status NOT IN ('reversed', 'cancelled');

    -- 3. Perform Atomic Update
    UPDATE public.shifts SET
        declared_cash = p_cash,
        declared_pos = p_pos,
        declared_transfer = p_transfer,
        expected_revenue = v_expected,
        total_revenue = v_expected,
        variance = (p_cash + p_pos + p_transfer) - v_expected,
        status = 'awaiting_manager_approval',
        updated_at = NOW()
    WHERE id = p_shift_id;

    -- 4. Log Audit
    INSERT INTO public.audit_logs (event_type, actor_id, resource_type, resource_id, old_value, new_value)
    VALUES ('SHIFT_DECLARATION', auth.uid(), 'shifts', p_shift_id, to_jsonb(v_shift), to_jsonb((SELECT s FROM public.shifts s WHERE id = p_shift_id)));

    RETURN jsonb_build_object(
        'success', true, 
        'expected', v_expected, 
        'declared', (p_cash + p_pos + p_transfer),
        'variance', (p_cash + p_pos + p_transfer) - v_expected
    );
END;
$$;

COMMIT;
