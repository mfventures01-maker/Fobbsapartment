-- 🛸 ANTI-GRAVITY PHASE 1: THE IMMUTABLE STATE CONTRACT
-- Purpose: Enable perfect mirroring via get_system_state and pg_notify triggers.

BEGIN;

-- 1. THE TRUTH SOURCE: get_system_state
CREATE OR REPLACE FUNCTION public.get_system_state(
    p_branch_id UUID,
    p_terminal_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_state JSONB;
    v_shift_result JSONB;
    v_active_orders JSONB;
    v_kitchen_status JSONB;
    v_inventory_alerts JSONB;
BEGIN
    -- Resolve active shift via our existing gate
    v_shift_result := resolve_active_shift(p_branch_id);
    
    -- Get all open/paid orders for this branch (Source of Truth)
    SELECT COALESCE(jsonb_agg(o ORDER BY o.created_at DESC), '[]'::jsonb) INTO v_active_orders
    FROM (
        SELECT 
            o.id,
            o.customer_name,
            o.total,
            o.status,
            o.kitchen_status,
            o.created_at,
            (SELECT jsonb_agg(i) FROM order_items i WHERE i.order_id = o.id) as items
        FROM orders o
        WHERE o.branch_id = p_branch_id
          AND o.status IN ('open', 'paid')
          AND COALESCE(o.kitchen_status, 'pending') != 'served'
    ) o;
    
    -- Get kitchen queue (specific view of active orders)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'order_id', o.id,
            'customer_name', o.customer_name,
            'kitchen_status', COALESCE(o.kitchen_status, 'pending'),
            'items', (SELECT jsonb_agg(jsonb_build_object('name', i.name, 'qty', i.qty)) 
                      FROM order_items i WHERE i.order_id = o.id),
            'created_at', o.created_at
        ) ORDER BY o.created_at ASC
    ), '[]'::jsonb) INTO v_kitchen_status
    FROM orders o
    WHERE o.branch_id = p_branch_id
      AND COALESCE(o.kitchen_status, 'pending') IN ('pending', 'queued', 'preparing', 'ready')
      AND o.status != 'void';
    
    -- Get inventory alerts from public.inventory table
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'item_id', i.id,
            'name', i.name,
            'current_stock', i.current_stock,
            'min_stock', i.min_stock,
            'alert_level', 
                CASE 
                    WHEN i.current_stock <= 0 THEN 'OUT_OF_STOCK'
                    WHEN i.current_stock <= i.min_stock THEN 'LOW_STOCK'
                    ELSE 'OK'
                END
        )
    ), '[]'::jsonb) INTO v_inventory_alerts
    FROM public.inventory i
    WHERE i.branch_id = p_branch_id
      AND i.current_stock <= i.min_stock
      AND i.min_stock > 0;
    
    RETURN jsonb_build_object(
        'version', 1,
        'timestamp', NOW(),
        'shift', v_shift_result,
        'active_orders', v_active_orders,
        'kitchen_queue', v_kitchen_status,
        'inventory_alerts', v_inventory_alerts,
        'branch_id', p_branch_id,
        'terminal_type', p_terminal_type
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_system_state(UUID, TEXT) TO authenticated, anon;

-- 2. THE NOTIFICATION ENGINE: notify_state_change
CREATE OR REPLACE FUNCTION public.notify_state_change()
RETURNS TRIGGER AS $$
DECLARE
    v_branch_id UUID;
    v_state JSONB;
BEGIN
    -- Resolve branch_id based on table context
    IF TG_TABLE_NAME = 'orders' THEN
        v_branch_id := NEW.branch_id;
    ELSIF TG_TABLE_NAME = 'order_items' THEN
        SELECT branch_id INTO v_branch_id FROM orders WHERE id = NEW.order_id;
    ELSIF TG_TABLE_NAME = 'inventory' THEN
        v_branch_id := NEW.branch_id;
    ELSE
        RETURN NEW;
    END IF;
    
    IF v_branch_id IS NULL THEN RETURN NEW; END IF;

    -- Trigger absolute state fetch for the branch
    SELECT get_system_state(v_branch_id, NULL) INTO v_state;
    
    -- Broadcast to pg_notify for real-time mirror sync
    PERFORM pg_notify(
        'system_state_channel',
        jsonb_build_object(
            'branch_id', v_branch_id,
            'state', v_state,
            'changed_table', TG_TABLE_NAME,
            'changed_id', NEW.id,
            'timestamp', NOW()
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ATTACH TRIGGERS
DROP TRIGGER IF EXISTS orders_state_change ON orders;
CREATE TRIGGER orders_state_change
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION notify_state_change();

DROP TRIGGER IF EXISTS order_items_state_change ON order_items;
CREATE TRIGGER order_items_state_change
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW EXECUTE FUNCTION notify_state_change();

DROP TRIGGER IF EXISTS inventory_state_change ON inventory;
CREATE TRIGGER inventory_state_change
    AFTER UPDATE ON inventory
    FOR EACH ROW 
    WHEN (OLD.current_stock IS DISTINCT FROM NEW.current_stock)
    EXECUTE FUNCTION notify_state_change();

COMMIT;
