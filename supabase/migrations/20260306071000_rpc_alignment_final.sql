-- CARSS RPC ALIGNMENT
-- AIM: Updating RPC functions to use the standardized 'awaiting_approval' status.

BEGIN;

-- 1. Standardize submit_shift_declaration
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
    SELECT * INTO v_shift FROM public.shifts WHERE id = p_shift_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Shift not found'); END IF;
    
    SELECT 
        COALESCE(SUM(CASE WHEN payment_type = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_type = 'pos' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_type = 'transfer' THEN amount ELSE 0 END), 0)
    INTO v_exp_cash, v_exp_pos, v_exp_transfer
    FROM public.transactions
    WHERE shift_id = p_shift_id AND status IN ('verified', 'completed');

    UPDATE public.shifts SET
        declared_cash = p_cash, declared_pos = p_pos, declared_transfer = p_transfer,
        expected_cash = v_exp_cash, expected_pos = v_exp_pos, expected_transfer = v_exp_transfer,
        expected_revenue = (v_exp_cash + v_exp_pos + v_exp_transfer),
        total_revenue = (v_exp_cash + v_exp_pos + v_exp_transfer),
        variance = (p_cash + p_pos + p_transfer) - (v_exp_cash + v_exp_pos + v_exp_transfer),
        status = 'awaiting_approval',
        updated_at = NOW()
    WHERE id = p_shift_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 2. Standardize approve_shift (Close)
CREATE OR REPLACE FUNCTION public.approve_shift(p_shift_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.shifts SET
        status = 'closed',
        closed_at = NOW(),
        manager_approval_id = auth.uid(),
        updated_at = NOW()
    WHERE id = p_shift_id AND status = 'awaiting_approval';

    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Shift not awaiting closure approval'); END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. Standardize approve_shift_open
CREATE OR REPLACE FUNCTION public.approve_shift_open(p_shift_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.shifts SET status = 'open', updated_at = NOW() 
    WHERE id = p_shift_id AND status = 'requested';

    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Shift not found or not in requested state'); END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

COMMIT;
