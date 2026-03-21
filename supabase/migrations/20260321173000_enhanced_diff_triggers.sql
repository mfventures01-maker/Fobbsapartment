-- 🛸 ANTI-GRAVITY PHASE 5: ENHANCED OPERATIONAL SYMMETRY
-- Purpose: Enhanced Diff-Tracking Triggers for high-fidelity animations.

BEGIN;

-- 1. Create the Enhanced Notification Function
CREATE OR REPLACE FUNCTION public.notify_state_change_with_diff()
RETURNS TRIGGER AS $$
DECLARE
    v_branch_id UUID;
    v_old_state JSONB;
    v_new_state JSONB;
    v_diff JSONB;
    v_action TEXT;
    v_state JSONB;
BEGIN
    -- Determine branch_id based on table
    IF TG_TABLE_NAME = 'orders' THEN
        v_branch_id := COALESCE(NEW.branch_id, OLD.branch_id);
        v_old_state := to_jsonb(OLD);
        v_new_state := to_jsonb(NEW);
        
        IF TG_OP = 'INSERT' THEN
            v_action := 'INSERT';
            v_diff := jsonb_build_object('added', v_new_state, 'changed_fields', jsonb_build_object());
        ELSIF TG_OP = 'DELETE' THEN
            v_action := 'DELETE';
            v_diff := jsonb_build_object('removed', v_old_state, 'changed_fields', jsonb_build_object());
        ELSE
            v_action := 'UPDATE';
            -- Calculate precise field diffs
            WITH changed_fields AS (
                SELECT jsonb_object_agg(key, jsonb_build_object('old', old_val, 'new', new_val)) as changes
                FROM jsonb_each(v_new_state) n
                JOIN jsonb_each(v_old_state) o USING (key)
                WHERE n.value IS DISTINCT FROM o.value
            )
            SELECT COALESCE(changes, '{}'::jsonb) INTO v_diff FROM changed_fields;
            
            v_diff := jsonb_build_object('changed_fields', v_diff, 'new_state', v_new_state, 'old_state', v_old_state);
        END IF;
        
    ELSIF TG_TABLE_NAME = 'order_items' THEN
        SELECT branch_id INTO v_branch_id FROM orders WHERE id = COALESCE(NEW.order_id, OLD.order_id);
        v_old_state := to_jsonb(OLD);
        v_new_state := to_jsonb(NEW);
        v_action := TG_OP;
        
        v_diff := jsonb_build_object(
            'order_id', COALESCE(NEW.order_id, OLD.order_id),
            'item_changes', 
            CASE 
                WHEN TG_OP = 'INSERT' THEN jsonb_build_object('added', v_new_state)
                WHEN TG_OP = 'DELETE' THEN jsonb_build_object('removed', v_old_state)
                ELSE jsonb_build_object('changed_fields', v_new_state - v_old_state)
            END
        );
        
    ELSIF TG_TABLE_NAME = 'inventory' THEN
        v_branch_id := COALESCE(NEW.branch_id, OLD.branch_id);
        v_old_state := to_jsonb(OLD);
        v_new_state := to_jsonb(NEW);
        v_action := 'STOCK_UPDATE';
        
        IF OLD.current_stock IS DISTINCT FROM NEW.current_stock THEN
            v_diff := jsonb_build_object(
                'item_id', NEW.id,
                'name', NEW.name,
                'previous_stock', OLD.current_stock,
                'new_stock', NEW.current_stock,
                'delta', NEW.current_stock - OLD.current_stock,
                'alert_level', 
                    CASE 
                        WHEN NEW.current_stock <= 0 THEN 'OUT_OF_STOCK'
                        WHEN NEW.current_stock <= NEW.min_stock THEN 'LOW_STOCK'
                        ELSE 'OK'
                    END
            );
        ELSE
            RETURN NEW; 
        END IF;
    ELSE
        RETURN NEW;
    END IF;
    
    -- BROADCAST WITH V2 SCHEAMA (diff + metadata)
    PERFORM pg_notify(
        'system_state_channel',
        jsonb_build_object(
            'branch_id', v_branch_id,
            'action', v_action,
            'table', TG_TABLE_NAME,
            'record_id', COALESCE(NEW.id, OLD.id),
            'diff', v_diff,
            'timestamp', EXTRACT(EPOCH FROM NOW())::BIGINT,
            'version', 2
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RE-ATTACH TRIGGERS
DROP TRIGGER IF EXISTS orders_state_change ON orders;
CREATE TRIGGER orders_state_change
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION notify_state_change_with_diff();

DROP TRIGGER IF EXISTS order_items_state_change ON order_items;
CREATE TRIGGER order_items_state_change
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW EXECUTE FUNCTION notify_state_change_with_diff();

DROP TRIGGER IF EXISTS inventory_state_change ON inventory;
CREATE TRIGGER inventory_state_change
    AFTER UPDATE ON inventory
    FOR EACH ROW 
    WHEN (OLD.current_stock IS DISTINCT FROM NEW.current_stock)
    EXECUTE FUNCTION notify_state_change_with_diff();

COMMIT;
