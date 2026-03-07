-- CARSS ORDER ARCHITECTURE SPLIT & IDEMPOTENCY
-- Purpose:
-- 1. Create `create_public_order` (bypasses shift, created_by=NULL) and `create_staff_order` (enforces shift, requires auth).
-- 2. Adjust triggers to allow created_by = NULL to bypass shift guard if it's a public order.
-- 3. Add `external_reference` to `orders` to enforce idempotency.

BEGIN;

-- 1. Add external_reference for global uniqueness / idempotency on the frontend
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS external_reference UUID UNIQUE;

-- 2. Modify Trigger `check_active_shift_guard` to properly support the split
CREATE OR REPLACE FUNCTION public.check_active_shift_guard()
RETURNS TRIGGER AS $$
DECLARE
    v_shift RECORD;
BEGIN
    -- PUBLIC GUEST BYPASS: If order is created with NULL created_by, it dictates it's a guest order which doesn't sit inside a shift.
    IF TG_TABLE_NAME = 'orders' THEN
        IF NEW.created_by IS NULL THEN
            RETURN NEW;
        END IF;
    END IF;

    -- For payment_intents, if staff_id is null, it's public.
    IF TG_TABLE_NAME = 'payment_intents' THEN
        IF NEW.staff_id IS NULL THEN
            RETURN NEW;
        END IF;
    END IF;

    -- At this point, the acting user is a logged-in Staff/Manager
    SELECT * INTO v_shift 
    FROM public.shifts 
    WHERE staff_id = COALESCE(NEW.created_by, NEW.staff_id, auth.uid()) 
    AND status = 'open' 
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'CARSS SECURITY GATE: No active shift found. All staff operations require an open shift.';
    END IF;

    -- Auto-link shift_id if missing
    IF TG_TABLE_NAME = 'transactions' AND NEW.shift_id IS NULL THEN
        NEW.shift_id := v_shift.id;
    END IF;
    IF TG_TABLE_NAME = 'orders' AND NEW.shift_id IS NULL THEN
        NEW.shift_id := v_shift.id;
    END IF;
    IF TG_TABLE_NAME = 'payment_intents' AND NEW.shift_id IS NULL THEN
        NEW.shift_id := v_shift.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Implement create_public_order (No Shift Requirement)
CREATE OR REPLACE FUNCTION public.create_public_order(
    p_business_id UUID,
    p_location_id UUID,
    p_items JSONB,
    p_customer_name TEXT DEFAULT NULL,
    p_customer_phone TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_external_reference UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_item RECORD;
    v_subtotal NUMERIC := 0;
    v_payment_intent_id UUID;
    v_item_count INTEGER := 0;
BEGIN
    -- Validations
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order violation: Empty item list prohibited.';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(price NUMERIC, quantity NUMERIC) LOOP
        v_subtotal := v_subtotal + (COALESCE(v_item.price, 0) * COALESCE(v_item.quantity, 1));
        v_item_count := v_item_count + 1;
    END LOOP;

    -- Insert Order (created_by = NULL, status = 'pending_payment')
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
        external_reference
    ) VALUES (
        p_business_id,
        p_location_id,
        COALESCE(p_customer_name, 'Guest Order'),
        p_customer_phone,
        'pending_payment',
        v_subtotal,
        v_subtotal,
        NULL,
        NULL,
        p_metadata || jsonb_build_object('source', 'public_qr', 'timestamp', NOW()),
        p_external_reference
    ) RETURNING id INTO v_order_id;

    -- Insert Items
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

    -- Insert Intent
    INSERT INTO public.payment_intents (
        order_id,
        business_id,
        branch_id,
        staff_id,
        shift_id,
        expected_amount,
        status,
        payment_type,
        external_reference
    ) VALUES (
        v_order_id,
        p_business_id,
        p_location_id,
        NULL,
        NULL,
        v_subtotal,
        'pending',
        'public_qr_order',
        p_external_reference::text -- Optional mirror link
    ) RETURNING id INTO v_payment_intent_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'payment_intent_id', v_payment_intent_id,
        'total', v_subtotal,
        'item_count', v_item_count,
        'type', 'public'
    );
END;
$$;


-- 4. Implement create_staff_order (Strict Auth & Shift Requirement)
CREATE OR REPLACE FUNCTION public.create_staff_order(
    p_business_id UUID,
    p_location_id UUID,
    p_items JSONB,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_external_reference UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_item RECORD;
    v_subtotal NUMERIC := 0;
    v_payment_intent_id UUID;
    v_item_count INTEGER := 0;
    v_staff_id UUID;
    v_shift_id UUID;
BEGIN
    -- Validations
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order violation: Empty item list prohibited.';
    END IF;

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Staff orders require authentication';
    END IF;
    
    v_staff_id := auth.uid();

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(price NUMERIC, quantity NUMERIC) LOOP
        v_subtotal := v_subtotal + (COALESCE(v_item.price, 0) * COALESCE(v_item.quantity, 1));
        v_item_count := v_item_count + 1;
    END LOOP;

    -- Insert Order (created_by = auth.uid(), status = 'open')
    INSERT INTO public.orders (
        org_id,
        location_id,
        customer_name,
        customer_phone,
        status,
        subtotal,
        total,
        created_by,
        metadata,
        external_reference
    ) VALUES (
        p_business_id,
        p_location_id,
        p_metadata->>'customer_name',
        p_metadata->>'customer_phone',
        'open',
        v_subtotal,
        v_subtotal,
        v_staff_id,
        p_metadata || jsonb_build_object('source', 'staff_pos', 'timestamp', NOW()),
        p_external_reference
    ) RETURNING id, shift_id INTO v_order_id, v_shift_id;
    -- Note that trigger will populate shift_id automatically

    -- Insert Items
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

    -- Insert Intent
    INSERT INTO public.payment_intents (
        order_id,
        business_id,
        branch_id,
        staff_id,
        shift_id,
        expected_amount,
        status,
        payment_type,
        external_reference
    ) VALUES (
        v_order_id,
        p_business_id,
        p_location_id,
        v_staff_id,
        v_shift_id,
        v_subtotal,
        'pending',
        COALESCE(p_metadata->>'payment_method', 'pos_order'),
        p_external_reference::text
    ) RETURNING id INTO v_payment_intent_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'payment_intent_id', v_payment_intent_id,
        'total', v_subtotal,
        'item_count', v_item_count,
        'type', 'staff',
        'shift_id', v_shift_id
    );
END;
$$;

COMMIT;
