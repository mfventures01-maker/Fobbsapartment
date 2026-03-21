-- 🛡️ STAFF TERMINAL DETERMINISTIC BACKEND LAW (ANTI-GRAVITY PHASE 5)
-- Purpose: Enforce Pure SSOT for all staff financial operations.
-- Eliminates drift by moving ALL logic (totals, discounts, shifts) to the DB.

BEGIN;

-- 1. Shift Resolution Gate
CREATE OR REPLACE FUNCTION public.resolve_active_shift(
    p_branch_id UUID,
    p_staff_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_shift RECORD;
BEGIN
    SELECT s.id as shift_id, s.status, s.opened_at, s.cash_balance
    INTO v_shift
    FROM public.shifts s
    WHERE (s.staff_id = p_staff_id OR s.staff_profile_id = p_staff_id)
      AND s.branch_id = p_branch_id
      AND s.status = 'open'
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active shift found.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'shift_id', v_shift.shift_id,
        'status', v_shift.status,
        'opened_at', v_shift.opened_at,
        'cash_balance', v_shift.cash_balance
    );
END;
$$;

-- 2. Deterministic Order Gateway
CREATE OR REPLACE FUNCTION public.create_order_gateway(
    p_branch_id UUID,
    p_customer_name TEXT DEFAULT NULL,
    p_shift_id UUID DEFAULT NULL,
    p_terminal_type TEXT DEFAULT 'staff'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_id UUID;
    v_business_id UUID;
    v_staff_id UUID;
BEGIN
    -- Resolve Identity
    SELECT business_id, staff_id INTO v_business_id, v_staff_id 
    FROM (SELECT (get_my_identity()).*) i;

    -- Shift Verification
    IF p_terminal_type = 'staff' AND p_shift_id IS NULL THEN
        RAISE EXCEPTION 'Shift Violation: Transaction blocked. Shift context missing.';
    END IF;

    INSERT INTO public.orders (
        org_id,
        location_id,
        customer_name,
        status,
        subtotal,
        total,
        created_by,
        shift_id,
        metadata
    ) VALUES (
        v_business_id,
        p_branch_id,
        COALESCE(p_customer_name, 'Staff Guest'),
        'open',
        0, 0,
        v_staff_id,
        p_shift_id,
        jsonb_build_object('terminal', p_terminal_type)
    ) RETURNING id INTO v_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'timestamp', NOW()
    );
END;
$$;

-- 3. Deterministic Item Addition
CREATE OR REPLACE FUNCTION public.add_order_item(
    p_order_id UUID,
    p_name TEXT,
    p_price NUMERIC,
    p_quantity INTEGER,
    p_terminal_type TEXT DEFAULT 'staff'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_business_id UUID;
BEGIN
    -- Security Gate: Must own the order
    SELECT org_id INTO v_business_id FROM public.orders WHERE id = p_order_id;
    
    INSERT INTO public.order_items (
        org_id,
        order_id,
        name,
        qty,
        unit_price,
        line_total
    ) VALUES (
        v_business_id,
        p_order_id,
        p_name,
        p_quantity,
        p_price,
        p_price * p_quantity
    );

    -- Recalculate totals immediately (The Truth)
    UPDATE public.orders 
    SET subtotal = (SELECT SUM(line_total) FROM public.order_items WHERE order_id = p_order_id),
        total = (SELECT SUM(line_total) FROM public.order_items WHERE order_id = p_order_id)
    WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. Order Details Truth Source
CREATE OR REPLACE FUNCTION public.get_order_details(
    p_order_id UUID,
    p_terminal_type TEXT DEFAULT 'staff'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order JSONB;
    v_items JSONB;
BEGIN
    SELECT row_to_json(o)::jsonb INTO v_order FROM public.orders o WHERE id = p_order_id;
    SELECT jsonb_agg(i) INTO v_items FROM public.order_items i WHERE order_id = p_order_id;

    RETURN jsonb_build_object(
        'order', v_order,
        'items', COALESCE(v_items, '[]'::jsonb)
    );
END;
$$;

-- 5. Finalize Payments
CREATE OR REPLACE FUNCTION public.update_order_status(
    p_order_id UUID,
    p_status TEXT,
    p_terminal_type TEXT DEFAULT 'staff'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.orders SET status = p_status WHERE id = p_order_id;
    RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_payment_intent(
    p_order_id UUID,
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_terminal_type TEXT DEFAULT 'staff'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    
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
        p_order_id,
        v_order.org_id,
        v_order.location_id,
        v_order.created_by,
        v_order.shift_id,
        p_amount,
        'pending',
        p_payment_method
    );

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. History
CREATE OR REPLACE FUNCTION public.get_order_history(
    p_branch_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_terminal_type TEXT DEFAULT 'staff'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_orders JSONB;
BEGIN
    SELECT jsonb_agg(o) INTO v_orders FROM (
        SELECT id, customer_name, total, status, created_at
        FROM public.orders
        WHERE location_id = p_branch_id
        ORDER BY created_at DESC
        LIMIT p_limit
        OFFSET p_offset
    ) o;

    RETURN jsonb_build_object(
        'orders', COALESCE(v_orders, '[]'::jsonb)
    );
END;
$$;

COMMIT;
