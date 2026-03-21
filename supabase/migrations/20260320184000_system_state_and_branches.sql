-- Fix 1: get_system_state corrected column 'status' vs 'preparation_status'
CREATE OR REPLACE FUNCTION public.get_system_state(
  _idempotency_key UUID DEFAULT gen_random_uuid(),
  p_business_id UUID DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_business UUID;
    v_location UUID;
    v_orders JSONB;
    v_kitchen JSONB;
    v_inventory JSONB;
    v_shifts JSONB;
BEGIN
    -- Resolve user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: No session';
    END IF;

    -- Resolve business context
    SELECT business_id INTO v_business
    FROM business_memberships
    WHERE user_id = v_user_id
    LIMIT 1;

    IF p_business_id IS NOT NULL THEN
        v_business := p_business_id;
    END IF;

    v_location := p_branch_id;

    -- ORDERS
    SELECT COALESCE(jsonb_agg(o), '[]'::jsonb) INTO v_orders
    FROM (
        SELECT id, status, total, created_at, location_id
        FROM orders
        WHERE org_id = v_business
        AND (v_location IS NULL OR location_id = v_location)
        ORDER BY created_at DESC
        LIMIT 20
    ) o;

    -- KITCHEN
    SELECT COALESCE(jsonb_agg(o), '[]'::jsonb) INTO v_kitchen
    FROM (
        SELECT id, status, created_at, location_id
        FROM orders
        WHERE org_id = v_business
        AND status IN ('preparing', 'ready', 'in_progress')
        AND (v_location IS NULL OR location_id = v_location)
        ORDER BY created_at DESC
        LIMIT 20
    ) o;

    -- INVENTORY
    SELECT COALESCE(jsonb_agg(i), '[]'::jsonb) INTO v_inventory
    FROM (
        SELECT id, name, current_stock, location_id
        FROM inventory
        WHERE business_id = v_business
        AND (v_location IS NULL OR location_id = v_location)
        LIMIT 100
    ) i;

    -- SHIFTS
    SELECT COALESCE(jsonb_agg(s), '[]'::jsonb) INTO v_shifts
    FROM (
        SELECT id, status, total_revenue, start_time, end_time
        FROM shifts
        WHERE business_id = v_business
        AND (v_location IS NULL OR location_id = v_location)
        ORDER BY start_time DESC
        LIMIT 5
    ) s;

    RETURN jsonb_build_object(
        'business_id', v_business,
        'location_id', v_location,
        'user_id', v_user_id,
        'orders', v_orders,
        'kitchen', v_kitchen,
        'inventory', v_inventory,
        'shifts', v_shifts,
        'timestamp', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_system_state(UUID, UUID, UUID) TO authenticated;

-- Fix 2: Create get_my_branches
CREATE OR REPLACE FUNCTION public.get_my_branches(
  _idempotency_key UUID DEFAULT gen_random_uuid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_branches JSONB;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: No session';
    END IF;

    SELECT COALESCE(jsonb_agg(b), '[]'::jsonb) INTO v_branches
    FROM (
        SELECT 
            b.id,
            b.name,
            b.address,
            b.business_id,
            b.status
        FROM branches b
        INNER JOIN business_memberships bm ON b.business_id = bm.business_id
        WHERE bm.user_id = v_user_id
        ORDER BY b.name ASC
    ) b;

    RETURN jsonb_build_object(
        'branches', v_branches,
        'user_id', v_user_id,
        'timestamp', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_branches(UUID) TO authenticated;
