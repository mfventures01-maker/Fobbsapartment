-- 🛸 ANTI-GRAVITY: ORDER GATEWAY HARDENING (FINAL REVISION)
-- Purpose: Unifies the create_qr_order_gateway function with the 12-key Anti-Gravity signature.
-- Law: Exact parameter alignment. Deterministic execution. UUID type-strict handle.
-- Fix: Resolved operator mismatch (42883) by converting p_idempotency_key to UUID.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_qr_order_gateway(
    p_idempotency_key UUID,
    p_org_id UUID,
    p_branch_id UUID,
    p_business_id UUID,
    p_cart JSONB,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_table_id TEXT,
    p_terminal_type TEXT,
    p_shift_id UUID,
    p_staff_id UUID,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_id UUID;
    v_existing_id UUID;
    v_subtotal NUMERIC := 0;
    v_item RECORD;
BEGIN
    -- 1. 🛡️ IDEMPOTENCY CHECK (Deterministic Replay)
    -- Fixed: Comparison is now UUID = UUID
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_existing_id 
        FROM public.orders 
        WHERE idempotency_key = p_idempotency_key;
        
        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true, 
                'order_id', v_existing_id, 
                'status', 'idempotent_cached'
            );
        END IF;
    END IF;

    -- 2. 🧮 COMPUTE TOTALS (Truth calculation in Layer 0)
    FOR v_item IN 
        SELECT * FROM jsonb_to_recordset(p_cart) 
        AS x(name TEXT, qty INTEGER, price NUMERIC) 
    LOOP
        v_subtotal := v_subtotal + (COALESCE(v_item.price, 0) * COALESCE(v_item.qty, 1));
    END LOOP;

    -- 3. 📦 INSERT ORDER (Standardized Mapping)
    INSERT INTO public.orders (
        org_id,
        location_id, -- Maps back to schema's branch column
        customer_name,
        customer_phone,
        status,
        subtotal,
        total,
        created_by, -- staff_id
        shift_id,
        table_reference,
        idempotency_key,
        metadata
    ) VALUES (
        p_org_id,
        p_branch_id,
        COALESCE(p_customer_name, 'Guest Order'),
        p_customer_phone,
        'open',
        v_subtotal,
        v_subtotal,
        p_staff_id,
        p_shift_id,
        p_table_id,
        p_idempotency_key,
        p_metadata || jsonb_build_object(
            'gateway_source', 'anti_gravity_qr',
            'terminal_type', p_terminal_type,
            'p_idempotency_key', p_idempotency_key
        )
    ) RETURNING id INTO v_order_id;

    -- 4. 📎 INSERT ORDER ITEMS
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

    -- 5. 💳 INITIALIZE PAYMENT INTENT
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
        p_branch_id,
        p_staff_id,
        p_shift_id,
        v_subtotal,
        'pending',
        'gateway_qr'
    );

    -- 6. 🟢 SUCCESS RETURN
    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'total', v_subtotal,
        'status', 'created'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', SQLSTATE
    );
END;
$$;

COMMIT;
