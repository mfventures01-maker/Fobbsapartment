-- 🛡️ ATOMIC Settle Order (ANTI-GRAVITY FINAL PHASE)
-- Purpose: Consolidate create_payment_intent and confirm_payment_intent into ONE atomic RPC.

BEGIN;

CREATE OR REPLACE FUNCTION public.settle_order(
    p_order_id UUID,
    p_payment_type TEXT,
    p_external_reference TEXT DEFAULT NULL,
    p_terminal_type TEXT DEFAULT 'staff'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_intent_id UUID;
    v_tx_id UUID;
    v_confirming_staff_id UUID;
    v_shift_id UUID;
    v_business_id UUID;
    v_branch_id UUID;
BEGIN
    -- 1. Identify Confirming Authority
    v_confirming_staff_id := auth.uid();
    IF v_confirming_staff_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- 2. Validate Order (Lock)
    SELECT * INTO v_order 
    FROM public.orders 
    WHERE id = p_order_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_order.status = 'paid' OR v_order.status = 'closed' THEN
        RAISE EXCEPTION 'Order is already paid or closed';
    END IF;

    v_business_id := v_order.org_id;
    v_branch_id := v_order.location_id;

    -- 3. Resolve Shift for Attribution
    SELECT id INTO v_shift_id 
    FROM public.shifts 
    WHERE staff_id = v_confirming_staff_id 
    AND status = 'open' 
    LIMIT 1;

    IF v_shift_id IS NULL THEN
        SELECT id INTO v_shift_id 
        FROM public.shifts 
        WHERE branch_id = v_branch_id 
        AND status = 'open' 
        LIMIT 1;
    END IF;

    IF p_terminal_type = 'staff' AND v_shift_id IS NULL THEN
        RAISE EXCEPTION 'Shift Violation: Transaction blocked. No open shift.';
    END IF;

    -- 4. Create Payment Intent (Confirmed)
    INSERT INTO public.payment_intents (
        order_id,
        business_id,
        branch_id,
        staff_id,
        shift_id,
        expected_amount,
        status,
        payment_type,
        external_reference,
        approved_by,
        approved_at
    ) VALUES (
        p_order_id,
        v_business_id,
        v_branch_id,
        v_confirming_staff_id,
        v_shift_id,
        v_order.total,
        'confirmed',
        p_payment_type,
        p_external_reference,
        v_confirming_staff_id,
        now()
    ) RETURNING id INTO v_intent_id;

    -- 5. Create Transaction Record
    INSERT INTO public.transactions (
        business_id, 
        branch_id, 
        staff_id, 
        amount, 
        payment_type, 
        payment_reference,
        status, 
        created_at,
        order_id, 
        payment_intent_id, 
        shift_id
    ) VALUES (
        v_business_id, 
        v_branch_id, 
        v_confirming_staff_id,
        v_order.total, 
        p_payment_type::payment_method_v2, 
        p_external_reference,
        'verified', 
        now(),
        p_order_id, 
        v_intent_id, 
        v_shift_id
    ) RETURNING id INTO v_tx_id;

    -- 6. Close Order
    UPDATE public.orders 
    SET status = 'paid', updated_at = now(), shift_id = COALESCE(shift_id, v_shift_id)
    WHERE id = p_order_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'intent_id', v_intent_id,
        'transaction_id', v_tx_id,
        'status', 'paid',
        'shift_attributed', v_shift_id
    );
END;
$$;

COMMIT;
