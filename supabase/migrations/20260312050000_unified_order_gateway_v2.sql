-- CARSS PHASE 3: UNIFIED ORDER GATEWAY V2
-- Supporting Idempotency and Unified Path for QR/Staff.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_order_gateway(
    p_source TEXT,
    p_business_id UUID,
    p_location_id UUID,
    p_staff_id UUID DEFAULT NULL,
    p_table_id TEXT DEFAULT NULL,
    p_customer_name TEXT DEFAULT NULL,
    p_customer_phone TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_external_reference TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_item RECORD;
    v_subtotal NUMERIC := 0;
    v_shift_id UUID := NULL;
    v_payment_intent_id UUID;
    v_item_count INTEGER := 0;
    v_idem_key TEXT;
BEGIN
    v_idem_key := COALESCE(p_external_reference, gen_random_uuid()::text);

    -- 0. Idempotency Check
    SELECT id INTO v_order_id FROM public.orders WHERE external_reference = v_idem_key;
    IF FOUND THEN
        SELECT id INTO v_payment_intent_id FROM public.payment_intents WHERE order_id = v_order_id LIMIT 1;
        RETURN jsonb_build_object(
            'success', true,
            'order_id', v_order_id,
            'payment_intent_id', v_payment_intent_id,
            'idempotent', true
        );
    END IF;

    -- A. Validation
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order gateway violation: Empty item list prohibited.';
    END IF;

    -- B. Compute Totals
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(price NUMERIC, quantity NUMERIC) LOOP
        v_subtotal := v_subtotal + (COALESCE(v_item.price, 0) * COALESCE(v_item.quantity, 1));
        v_item_count := v_item_count + 1;
    END LOOP;

    -- C. Resolve Shift
    IF p_staff_id IS NOT NULL THEN
        SELECT id INTO v_shift_id 
        FROM public.shifts 
        WHERE staff_id = p_staff_id AND status = 'open' 
        LIMIT 1;
        
        IF v_shift_id IS NULL AND p_source <> 'qr' THEN
             RAISE EXCEPTION 'Staff order denied: No active shift found for staff_id %', p_staff_id;
        END IF;
    END IF;

    -- D. Insert Order
    INSERT INTO public.orders (
        org_id,
        location_id,
        customer_name,
        customer_phone,
        status,
        subtotal,
        total,
        created_by,
        shift_id,
        metadata,
        external_reference,
        table_reference
    ) VALUES (
        p_business_id,
        p_location_id,
        COALESCE(p_customer_name, 'Guest Order'),
        p_customer_phone,
        'open',
        v_subtotal,
        v_subtotal,
        p_staff_id,
        v_shift_id,
        p_metadata || jsonb_build_object('gateway_source', p_source),
        v_idem_key,
        p_table_id
    ) RETURNING id INTO v_order_id;

    -- E. Insert Items
    INSERT INTO public.order_items (
        org_id,
        order_id,
        name,
        qty,
        unit_price,
        line_total
    )
    SELECT 
        p_business_id,
        v_order_id,
        COALESCE(x->>'name', 'Unknown Item'),
        COALESCE((x->>'quantity')::INTEGER, (x->>'qty')::INTEGER, 1),
        COALESCE((x->>'price')::NUMERIC, (x->>'unit_price')::NUMERIC, 0),
        COALESCE((x->>'price')::NUMERIC, (x->>'unit_price')::NUMERIC, 0) * COALESCE((x->>'quantity')::INTEGER, (x->>'qty')::INTEGER, 1)
    FROM jsonb_array_elements(p_items) AS x;

    -- F. Create Payment Intent
    INSERT INTO public.payment_intents (
        order_id,
        business_id,
        branch_id,
        staff_id,
        shift_id,
        expected_amount,
        status,
        payment_type
    ) VALUES (
        v_order_id,
        p_business_id,
        p_location_id,
        p_staff_id,
        v_shift_id,
        v_subtotal,
        'pending',
        'gateway_' || p_source
    ) RETURNING id INTO v_payment_intent_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'payment_intent_id', v_payment_intent_id,
        'total', v_subtotal,
        'item_count', v_item_count
    );
END;
$$;

COMMIT;
