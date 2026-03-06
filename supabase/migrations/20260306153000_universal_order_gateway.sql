-- CARSS UNIVERSAL ORDER GATEWAY
-- Unifies all ordering channels (QR, Waiter, WhatsApp, Web) into a single deterministic database gateway.

BEGIN;

-- 1. Ensure public.payment_intents.staff_id is nullable for Guest/QR Orders
-- This is critical to allow orders without a logged-in staff member.
ALTER TABLE public.payment_intents ALTER COLUMN staff_id DROP NOT NULL;

-- 2. Implementation of public.create_order_gateway
-- Every ordering channel (QR Menu, Waiter Terminal, WhatsApp) must call this function.
CREATE OR REPLACE FUNCTION public.create_order_gateway(
    p_source TEXT,
    p_business_id UUID,
    p_location_id UUID,
    p_staff_id UUID DEFAULT NULL,
    p_table_id TEXT DEFAULT NULL,
    p_customer_name TEXT DEFAULT NULL,
    p_customer_phone TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb,
    p_metadata JSONB DEFAULT '{}'::jsonb
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
BEGIN
    -- A. Validation: Ensure items provided
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order gateway violation: Empty item list prohibited.';
    END IF;

    -- B. Compute Financially Deterministic Totals
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(price NUMERIC, quantity NUMERIC) LOOP
        v_subtotal := v_subtotal + (COALESCE(v_item.price, 0) * COALESCE(v_item.quantity, 1));
        v_item_count := v_item_count + 1;
    END LOOP;

    -- C. Resolve Active Shift for Staff (if provided)
    -- This ensures the financial trail is linked to the staff's current shift.
    IF p_staff_id IS NOT NULL THEN
        SELECT id INTO v_shift_id 
        FROM public.shifts 
        WHERE staff_id = p_staff_id AND status = 'open' 
        LIMIT 1;
    END IF;

    -- D. Atomically Insert Order
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
        metadata
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
        p_metadata || jsonb_build_object(
            'gateway_source', p_source, 
            'table_id', p_table_id,
            'timestamp', NOW()
        )
    ) RETURNING id INTO v_order_id;

    -- E. Atomically Insert Order Items
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

    -- F. Atomically Create Payment Intent
    -- This readies the order for the CARSS settlement pipeline immediately.
    -- Once this row is inserted, the Staff terminal will see it via Realtime.
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
        p_source || '_order' -- Tracks source as primary payment type before method selection
    ) RETURNING id INTO v_payment_intent_id;

    -- G. Return Forensic Success Payload
    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'payment_intent_id', v_payment_intent_id,
        'total', v_subtotal,
        'item_count', v_item_count,
        'gateway_source', p_source
    );

EXCEPTION WHEN OTHERS THEN
    RAISE; -- Allow caller to see detailed error
END;
$$;

COMMIT;
