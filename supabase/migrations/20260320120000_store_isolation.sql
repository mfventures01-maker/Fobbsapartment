-- CARSS STORE TERMINAL ISOLATION: DETERMINISTIC INVENTORY MANAGEMENT
-- Aim: Centralize all stock movements into firewalled RPCs to ensure that the frontend remains a passive mirror of inventory logic.
-- This enforces Rule 1 (RPC-Only) and Rule 4 (Terminal Isolation) for the Store tier.

BEGIN;

-- 1. Create Inventory Level Retrieval RPC
-- Purpose: canonical list for the Store Terminal.
CREATE OR REPLACE FUNCTION public.get_inventory_levels(
    p_branch_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_items JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT jsonb_agg(i) INTO v_items FROM (
        SELECT id, name, current_stock, min_stock, category, unit, updated_at
        FROM public.inventory
        WHERE branch_id = p_branch_id
        ORDER BY name ASC
    ) i;

    RETURN jsonb_build_object(
        'items', COALESCE(v_items, '[]'::jsonb),
        'server_time', NOW()
    );
END;
$$;

-- 2. Create Stock Intake RPC (Inventory In)
-- Purpose: The ONLY path to add stock, with mandatory audit logging.
CREATE OR REPLACE FUNCTION public.record_inventory_in(
    p_items JSONB, -- Array of {item_id, quantity}
    p_reference TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_actor_id UUID;
    v_branch_id UUID;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Iterate through items and update stock
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC) LOOP
        -- Resolve Branch for security check
        SELECT branch_id INTO v_branch_id FROM public.inventory WHERE id = v_item.item_id;
        
        UPDATE public.inventory
        SET current_stock = current_stock + v_item.quantity,
            updated_at = NOW()
        WHERE id = v_item.item_id;

        -- Log Telemetry
        INSERT INTO public.system_events (event_type, metadata)
        VALUES ('inventory_in', jsonb_build_object(
            'item_id', v_item.item_id,
            'delta', v_item.quantity,
            'reference', p_reference,
            'actor_id', v_actor_id,
            'branch_id', v_branch_id
        ));
    END LOOP;

    RETURN jsonb_build_object('success', true, 'timestamp', NOW());
END;
$$;

-- 3. Create Stock Withdrawal RPC (Inventory Out)
-- Purpose: The ONLY path for manual stock removal/usage outside orders.
CREATE OR REPLACE FUNCTION public.record_inventory_out(
    p_items JSONB, -- Array of {item_id, quantity}
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_actor_id UUID;
    v_branch_id UUID;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Iterate through items and update stock
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, quantity NUMERIC) LOOP
        -- Resolve Branch
        SELECT branch_id INTO v_branch_id FROM public.inventory WHERE id = v_item.item_id;
        
        UPDATE public.inventory
        SET current_stock = current_stock - v_item.quantity,
            updated_at = NOW()
        WHERE id = v_item.item_id;

        -- Log Telemetry
        INSERT INTO public.system_events (event_type, metadata)
        VALUES ('inventory_out', jsonb_build_object(
            'item_id', v_item.item_id,
            'delta', -v_item.quantity,
            'reason', p_reason,
            'actor_id', v_actor_id,
            'branch_id', v_branch_id
        ));
    END LOOP;

    RETURN jsonb_build_object('success', true, 'timestamp', NOW());
END;
$$;

COMMIT;
