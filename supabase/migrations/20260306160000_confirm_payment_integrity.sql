-- CARSS PAYMENT SETTLEMENT INTEGRITY: FINAL RECONCILIATION
-- AIM: Ensure that GUEST orders confirmed by STAFF are correctly linked to the staff's active shift.

BEGIN;

-- 1. Correct confirm_payment_intent to ensure shift linkage
CREATE OR REPLACE FUNCTION public.confirm_payment_intent(
    p_intent_id UUID,
    p_external_reference TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_intent RECORD;
    v_order RECORD;
    v_tx_id UUID;
    v_confirming_staff_id UUID;
    v_shift_id UUID;
BEGIN
    -- 1. Identify Confirming Authority
    v_confirming_staff_id := auth.uid();
    IF v_confirming_staff_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- 2. Resolve Active Shift for confirming staff (if not already in intent)
    SELECT id INTO v_shift_id 
    FROM public.shifts 
    WHERE staff_id = v_confirming_staff_id 
    AND status = 'open' 
    AND ends_at IS NULL
    LIMIT 1;

    -- 3. Lock & Load Intent
    SELECT * INTO v_intent 
    FROM public.payment_intents 
    WHERE id = p_intent_id 
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment Intent not found';
    END IF;
    
    IF v_intent.status::text <> 'pending' THEN
        RAISE EXCEPTION 'Payment Intent is status: % (Must be pending)', v_intent.status;
    END IF;

    -- 4. ATOMIC EXECUTION
    -- a. Create Transaction
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
        v_intent.business_id, 
        v_intent.branch_id, 
        v_confirming_staff_id,
        v_intent.expected_amount, 
        v_intent.payment_type::payment_method_v2, 
        p_external_reference,
        'verified', 
        now(),
        v_intent.order_id, 
        v_intent.id, 
        COALESCE(v_intent.shift_id, v_shift_id) -- Link to intent shift OR confirming staff shift
    ) RETURNING id INTO v_tx_id;

    -- b. Close Order
    UPDATE public.orders 
    SET status = 'paid', updated_at = now()
    WHERE id = v_intent.order_id;

    -- c. Finalize Intent
    UPDATE public.payment_intents
    SET status = 'confirmed',
        staff_id = COALESCE(staff_id, v_confirming_staff_id), -- Ensure staff_id is set
        shift_id = COALESCE(shift_id, v_shift_id),           -- Ensure shift_id is set
        approved_by = v_confirming_staff_id,
        approved_at = now(),
        external_reference = COALESCE(p_external_reference, external_reference),
        updated_at = now()
    WHERE id = p_intent_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_tx_id,
        'status', 'approved'
    );
END;
$$;

COMMIT;
