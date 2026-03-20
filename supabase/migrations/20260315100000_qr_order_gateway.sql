-- CARSS QR Order Gateway Stabilization
-- Purpose: Implementation of a dedicated QR order gateway to bypass staff identity requirements.

CREATE OR REPLACE FUNCTION public.create_qr_order_gateway(
    p_org_id UUID,
    p_location_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_cart JSONB,
    p_table_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_subtotal NUMERIC := 0;
    v_item RECORD;
BEGIN

    -- 1. Compute Totals & Parse Cart (Server-Side Enforcement)
    FOR v_item IN 
        SELECT * FROM jsonb_to_recordset(p_cart) 
        AS x(name TEXT, qty INTEGER, price NUMERIC) 
    LOOP
        v_subtotal := v_subtotal + (COALESCE(v_item.price, 0) * COALESCE(v_item.qty, 1));
    END LOOP;

    -- 2. Insert Order Shell (Deterministic Table Identity)
    INSERT INTO public.orders (
        org_id,
        location_id,
        customer_name,
        customer_phone,
        status,
        subtotal,
        discount,
        total,
        created_by,
        table_reference,
        metadata
    )
    VALUES (
        p_org_id,
        p_location_id,
        COALESCE(p_customer_name, 'Guest Order'),
        p_customer_phone,
        'open',
        v_subtotal,
        0,
        v_subtotal,
        NULL,
        p_table_id,
        p_metadata || jsonb_build_object(
            'gateway_source', 'qr_menu', 
            'p_cart_length', jsonb_array_length(p_cart),
            'computed_at', now()
        )
    )
    RETURNING id INTO v_order_id;

    -- 3. Insert Order Items (Deterministic Item Insertion)
    INSERT INTO public.order_items (
        org_id,
        order_id,
        name,
        qty,
        unit_price,
        line_total
    )
    SELECT 
        p_org_id,
        v_order_id,
        COALESCE(item.name, 'Unknown Item'),
        COALESCE(item.qty, 1),
        COALESCE(item.price, 0),
        COALESCE(item.price, 0) * COALESCE(item.qty, 1)
    FROM jsonb_to_recordset(p_cart) AS item(name TEXT, qty INTEGER, price NUMERIC);

    -- 4. Create Payment Intent (Deterministic Payment Flow)
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
        p_org_id,
        p_location_id,
        NULL,
        NULL,
        v_subtotal,
        'pending',
        'gateway_qr'
    );

    RETURN v_order_id;

END;
$$;
