-- CARSS KITCHEN TERMINAL ISOLATION: DETERMINISTIC PREPARATION STATE
-- Aim: Separate "Payment Status" from "Preparation Status" to allow the Kitchen Terminal to operate as a pure mirror of workflow progress.
-- This enforces Rule 3 (Kitchen Terminal) and enables Rule 7 (Real-time Synchronization).

BEGIN;

-- 1. Extend Orders table with Preparation State
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS preparation_status TEXT DEFAULT 'pending' CHECK (preparation_status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled'));

-- 2. Create Kitchen Snapshot RPC
-- Purpose: Canonical feed for the Kitchen Terminal, restricted by Branch/Location.
CREATE OR REPLACE FUNCTION public.get_kitchen_snapshot(
    p_location_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_open_tickets JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Query for open/active orders requiring preparation
    SELECT jsonb_agg(x) INTO v_open_tickets FROM (
        SELECT 
            o.id, 
            o.customer_name, 
            o.table_reference,
            o.preparation_status,
            o.created_at,
            o.status as payment_status,
            (SELECT jsonb_agg(oi) FROM (
                SELECT id, name, qty as quantity FROM public.order_items WHERE order_id = o.id
            ) oi) as items
        FROM public.orders o
        WHERE o.location_id = p_location_id
        AND o.preparation_status IN ('pending', 'preparing', 'ready')
        ORDER BY o.created_at ASC
    ) x;

    RETURN jsonb_build_object(
        'tickets', COALESCE(v_open_tickets, '[]'::jsonb),
        'server_time', NOW()
    );
END;
$$;

-- 3. Create Preparation Status Update RPC
-- Purpose: The ONLY way to move an order through the kitchen workflow.
CREATE OR REPLACE FUNCTION public.update_preparation_status(
    p_order_id UUID,
    p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF p_new_status NOT IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid preparation status: %', p_new_status;
    END IF;

    UPDATE public.orders
    SET preparation_status = p_new_status,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Log to System Events for real-time telemetry (Rule 1.5)
    INSERT INTO public.system_events (event_type, metadata)
    VALUES ('kitchen_update', jsonb_build_object(
        'order_id', p_order_id,
        'new_status', p_new_status,
        'actor_id', auth.uid()
    ));

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'status', p_new_status
    );
END;
$$;

COMMIT;
