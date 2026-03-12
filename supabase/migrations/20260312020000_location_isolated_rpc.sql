-- CARSS PHASE 3: LOCATION ISOLATION REFACTOR
-- Targets: get_system_state RPC to enforce strict location scoping.
-- Standardizes operational boundary at the branch/location level.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_system_state(
    p_business_id UUID,
    p_location_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_shift RECORD;
    v_open_orders_count INT;
    v_pending_payment_count INT;
    v_revenue_today NUMERIC := 0;
    v_revenue_hour NUMERIC := 0;
    v_revenue_shift NUMERIC := 0;
    v_open_shifts_count INT := 0;
    v_orders_today_count INT := 0;
    v_pending_intents_count INT;
    v_alerts JSONB := '[]'::jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. SCOPED ACTIVE SHIFT (Local to this Branch)
    SELECT id, status, staff_id, start_time INTO v_shift
    FROM public.shifts
    WHERE business_id = p_business_id
    AND branch_id = p_location_id
    AND status <> 'closed'
    AND (staff_id = v_user_id OR EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.user_id = v_user_id AND p.role IN ('manager', 'ceo', 'owner', 'super_admin')
    ))
    ORDER BY start_time DESC LIMIT 1;

    -- 2. LOCATION-ISOLATED AGGREGATES
    -- Orders
    SELECT COUNT(*) INTO v_open_orders_count
    FROM public.orders
    WHERE org_id = p_business_id AND location_id = p_location_id AND status = 'open';

    SELECT COUNT(*) INTO v_pending_payment_count
    FROM public.orders
    WHERE org_id = p_business_id AND location_id = p_location_id AND status = 'pending_payment';

    SELECT COUNT(*) INTO v_orders_today_count
    FROM public.orders
    WHERE org_id = p_business_id AND location_id = p_location_id AND created_at >= CURRENT_DATE;

    -- Revenue (Transactional Ledger)
    SELECT COALESCE(SUM(amount), 0) INTO v_revenue_today
    FROM public.transactions
    WHERE business_id = p_business_id AND branch_id = p_location_id AND created_at >= CURRENT_DATE AND status IN ('verified', 'completed');

    SELECT COALESCE(SUM(amount), 0) INTO v_revenue_hour
    FROM public.transactions
    WHERE business_id = p_business_id AND branch_id = p_location_id AND created_at >= NOW() - INTERVAL '1 hour' AND status IN ('verified', 'completed');

    IF v_shift.id IS NOT NULL THEN
        SELECT COALESCE(SUM(amount), 0) INTO v_revenue_shift
        FROM public.transactions
        WHERE shift_id = v_shift.id AND status IN ('verified', 'completed');
    END IF;

    -- Payment Intents (Local Branch Only)
    SELECT COUNT(*) INTO v_pending_intents_count
    FROM public.payment_intents
    WHERE org_id = p_business_id AND branch_id = p_location_id AND status = 'pending';

    -- Open Shifts in Branch
    SELECT COUNT(*) INTO v_open_shifts_count
    FROM public.shifts
    WHERE business_id = p_business_id AND branch_id = p_location_id AND status IN ('open', 'declaration_submitted', 'awaiting_close_approval');

    -- 3. ASSEMBLE PROJECTED STATE
    RETURN jsonb_build_object(
        'shift', CASE WHEN v_shift.id IS NOT NULL THEN jsonb_build_object(
            'id', v_shift.id,
            'status', v_shift.status,
            'staff_id', v_shift.staff_id,
            'started_at', v_shift.start_time
        ) ELSE NULL END,
        'orders', jsonb_build_object(
            'open_orders', COALESCE(v_open_orders_count, 0),
            'pending_payment', COALESCE(v_pending_payment_count, 0),
            'today_total', COALESCE(v_orders_today_count, 0)
        ),
        'revenue', jsonb_build_object(
            'today', COALESCE(v_revenue_today, 0),
            'last_hour', COALESCE(v_revenue_hour, 0),
            'shift_total', COALESCE(v_revenue_shift, 0)
        ),
        'open_shifts', v_open_shifts_count,
        'payments', jsonb_build_object(
            'pending_intents', COALESCE(v_pending_intents_count, 0),
            'intents_list', (
                SELECT COALESCE(jsonb_agg(pi), '[]'::jsonb) FROM (
                    SELECT id, expected_amount as amount, status, payment_type, created_at,
                           (SELECT jsonb_build_object('customer_name', o.customer_name, 'table_reference', o.table_reference) 
                            FROM orders o WHERE o.id = payment_intents.order_id) as order_data
                    FROM public.payment_intents
                    WHERE org_id = p_business_id AND branch_id = p_location_id AND status = 'pending'
                ) pi
            )
        ),
        'recent_transactions', (
            SELECT COALESCE(jsonb_agg(tx), '[]'::jsonb) FROM (
                SELECT id, amount, payment_type, status, created_at, branch_id
                FROM public.transactions
                WHERE business_id = p_business_id AND branch_id = p_location_id
                ORDER BY created_at DESC
                LIMIT 20
            ) tx
        ),
        'alerts', (
            SELECT COALESCE(jsonb_agg(a), '[]'::jsonb) FROM (
                SELECT id, event_type, metadata, created_at
                FROM public.system_events
                WHERE (metadata->>'business_id')::UUID = p_business_id 
                AND (metadata->>'branch_id')::UUID = p_location_id
                ORDER BY created_at DESC LIMIT 10
            ) a
        ),
        'timestamp', NOW()
    );
END;
$$;

COMMIT;
