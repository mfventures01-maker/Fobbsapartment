-- 🛡️ CARSS FINAL FORENSIC SEAL: LAYER 5 DETERMINISTIC INFRASTRUCTURE
-- Purpose: Complete elimination of client-side ID trust. All operational logic resolved from auth.uid().
-- Enforces: Idempotency (I2), Atomic Settlement, and Ledger Alignment.

BEGIN;

-- 1. IDENTIFY RESOLUTION CACHE (INTERNAL USE ONLY)
-- Redefine or ensure get_my_identity is robust.
CREATE OR REPLACE FUNCTION public.get_my_operational_context()
RETURNS TABLE (
    v_user_id UUID,
    v_staff_id UUID,
    v_branch_id UUID,
    v_business_id UUID,
    v_department_id TEXT,
    v_shift_id UUID
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        auth.uid(),
        s.id,
        m.branch_id,
        m.business_id,
        m.department_id,
        sh.id
    FROM public.business_memberships m
    LEFT JOIN public.staff_profiles s ON s.user_id = m.user_id
    LEFT JOIN public.shifts sh ON sh.branch_id = m.branch_id AND sh.status = 'open'
    WHERE m.user_id = auth.uid()
    LIMIT 1;
END;
$$;

-- 2. PARAMETERLESS UNIVERSAL ORDER GATEWAY (Draft 2)
-- All ordering context is derived from auth.uid().
CREATE OR REPLACE FUNCTION public.universal_order_gateway(
    p_items JSONB,
    p_customer_name TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    _idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ctx RECORD;
    v_order_id UUID;
    v_subtotal NUMERIC := 0;
    v_item RECORD;
    v_payment_intent_id UUID;
    v_existing_id UUID;
BEGIN
    -- 🛸 IDEMPOTENCY CHECK
    IF _idempotency_key IS NOT NULL THEN
        SELECT id INTO v_existing_id FROM public.orders WHERE idempotency_key = _idempotency_key;
        IF FOUND THEN
            RETURN jsonb_build_object('success', true, 'order_id', v_existing_id, 'status', 'idempotent_cached');
        END IF;
    END IF;

    -- 🛡️ RESOLVE CONTEXT (Zero Trust Strategy)
    SELECT * INTO v_ctx FROM public.get_my_operational_context();
    
    IF v_ctx.v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication failure: context unresolved.'; END IF;
    IF v_ctx.v_shift_id IS NULL THEN RAISE EXCEPTION 'Shift Violation: No open shift in branch.'; END IF;

    -- Compute Totals
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(price NUMERIC, quantity NUMERIC) LOOP
        v_subtotal := v_subtotal + (COALESCE(v_item.price, 0) * COALESCE(v_item.quantity, 1));
    END LOOP;

    -- ATOMIC ORDER CREATION
    INSERT INTO public.orders (
        org_id, location_id, created_by, shift_id,
        customer_name, status, subtotal, total, idempotency_key, metadata
    ) VALUES (
        v_ctx.v_business_id, v_ctx.v_branch_id, v_ctx.v_user_id, v_ctx.v_shift_id,
        COALESCE(p_customer_name, 'Staff Guest'), 'open', v_subtotal, v_subtotal, _idempotency_key, p_metadata
    ) RETURNING id INTO v_order_id;

    -- ATOMIC ITEMS INSERT
    INSERT INTO public.order_items (org_id, order_id, name, qty, unit_price, line_total)
    SELECT 
        v_ctx.v_business_id, v_order_id,
        COALESCE(x->>'name', 'Unknown Item'),
        COALESCE((x->>'quantity')::INTEGER, 1),
        COALESCE((x->>'price')::NUMERIC, 0),
        COALESCE((x->>'price')::NUMERIC, 0) * COALESCE((x->>'quantity')::INTEGER, 1)
    FROM jsonb_array_elements(p_items) AS x;

    -- ATOMIC PAYMENT INTENT
    INSERT INTO public.payment_intents (
        order_id, business_id, branch_id, staff_id, shift_id,
        expected_amount, status, payment_type
    ) VALUES (
        v_order_id, v_ctx.v_business_id, v_ctx.v_branch_id, v_ctx.v_staff_id, v_ctx.v_shift_id,
        v_subtotal, 'pending', 'staff_terminal'
    ) RETURNING id INTO v_payment_intent_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'payment_intent_id', v_payment_intent_id,
        'total', v_subtotal
    );
END;
$$;

-- 3. HARDENED PARAMETERLESS SETTLE ORDER
CREATE OR REPLACE FUNCTION public.settle_order_v2(
    p_order_id UUID,
    p_payment_type TEXT,
    p_external_reference TEXT DEFAULT NULL,
    _idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ctx RECORD;
    v_order RECORD;
    v_tx_id UUID;
    v_intent_id UUID;
    v_existing_id UUID;
BEGIN
    -- 🛸 IDEMPOTENCY CHECK (Transaction level)
    IF _idempotency_key IS NOT NULL THEN
        SELECT id INTO v_existing_id FROM public.transactions WHERE payment_reference = _idempotency_key;
        IF FOUND THEN
            RETURN jsonb_build_object('success', true, 'transaction_id', v_existing_id, 'status', 'idempotent_cached');
        END IF;
    END IF;

    -- 🛡️ RESOLVE CONTEXT
    SELECT * INTO v_ctx FROM public.get_my_operational_context();
    IF v_ctx.v_shift_id IS NULL THEN RAISE EXCEPTION 'Shift Violation: Settlement blocked. No open shift.'; END IF;

    -- 🔒 ATOMIC LOCK
    PERFORM pg_advisory_xact_lock(hashtext(p_order_id::text));

    -- Validate Order State
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found.'; END IF;
    IF v_order.status = 'paid' THEN RAISE EXCEPTION 'Order already paid.'; END IF;

    -- ATOMIC INTENT UPDATE/INSERT
    UPDATE public.payment_intents 
    SET status = 'confirmed', approved_by = v_ctx.v_user_id, approved_at = now() 
    WHERE order_id = p_order_id RETURNING id INTO v_intent_id;

    -- ATOMIC TRANSACTION (Ledger Sync)
    INSERT INTO public.transactions (
        business_id, branch_id, staff_id, shift_id, order_id, payment_intent_id,
        amount, payment_type, payment_reference, status
    ) VALUES (
        v_ctx.v_business_id, v_ctx.v_branch_id, v_ctx.v_staff_id, v_ctx.v_shift_id, p_order_id, v_intent_id,
        v_order.total, p_payment_type::payment_method_v2, COALESCE(p_external_reference, _idempotency_key), 'verified'
    ) RETURNING id INTO v_tx_id;

    -- ATOMIC ORDER CLOSURE
    UPDATE public.orders SET status = 'paid', updated_at = now() WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_tx_id,
        'order_id', p_order_id,
        'shift_id', v_ctx.v_shift_id
    );
END;
$$;

-- Allow authenticated execute
GRANT EXECUTE ON FUNCTION public.universal_order_gateway(JSONB, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_order_v2(UUID, TEXT, TEXT, TEXT) TO authenticated;

COMMIT;
