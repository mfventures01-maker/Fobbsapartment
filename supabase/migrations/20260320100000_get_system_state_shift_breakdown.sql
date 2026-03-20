-- CARSS SYSTEM STATE ENHANCEMENT: SHIFT BREAKDOWN & INVENTORY ALERTS
-- Aim: Expose granular revenue breakdown and critical inventory levels directly from the authoritative SSOT provider.
-- This enforces Rule 3 (Store Terminal) and Rule 8 (Anomaly Visibility) by providing pre-calculated alerts.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_system_state(
    p_business_id UUID,
    p_location_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
    v_shift RECORD;
    v_open_orders_count INT;
    v_pending_payment_count INT;
    v_revenue_today NUMERIC := 0;
    v_revenue_hour NUMERIC := 0;
    v_revenue_shift NUMERIC := 0;
    v_revenue_shift_cash NUMERIC := 0;
    v_revenue_shift_pos NUMERIC := 0;
    v_revenue_shift_transfer NUMERIC := 0;
    v_open_shifts_count INT := 0;
    v_orders_today_count INT := 0;
    v_pending_intents_count INT;
    v_alerts JSONB := '[]'::jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- A. Resolve Authority
    SELECT role INTO v_user_role FROM public.business_memberships WHERE user_id = v_user_id LIMIT 1;
    
    -- B. Enforce Location Requirement for Non-Global Roles
    IF p_location_id IS NULL AND v_user_role NOT IN ('ceo', 'owner', 'super_admin') THEN
        RAISE EXCEPTION 'Location isolation violation: Operational terminal requires explicit location_id.';
    END IF;

    -- C. SCOPED ACTIVE SHIFT
    SELECT id, status, staff_id, start_time INTO v_shift
    FROM public.shifts
    WHERE business_id = p_business_id
    AND (p_location_id IS NULL OR branch_id = p_location_id)
    AND status <> 'closed'
    AND (staff_id = v_user_id OR v_user_role IN ('manager', 'ceo', 'owner', 'super_admin'))
    ORDER BY start_time DESC LIMIT 1;

    -- D. AGGREGATES
    -- Orders
    SELECT COUNT(*) INTO v_open_orders_count FROM public.orders WHERE org_id = p_business_id AND (p_location_id IS NULL OR location_id = p_location_id) AND status = 'open';
    SELECT COUNT(*) INTO v_pending_payment_count FROM public.orders WHERE org_id = p_business_id AND (p_location_id IS NULL OR location_id = p_location_id) AND status = 'pending_payment';
    SELECT COUNT(*) INTO v_orders_today_count FROM public.orders WHERE org_id = p_business_id AND (p_location_id IS NULL OR location_id = p_location_id) AND created_at >= CURRENT_DATE;

    -- Revenue (Authoritative SSOT)
    SELECT COALESCE(SUM(amount), 0) INTO v_revenue_today FROM public.transactions WHERE business_id = p_business_id AND (p_location_id IS NULL OR branch_id = p_location_id) AND created_at >= CURRENT_DATE AND status IN ('verified', 'completed');
    SELECT COALESCE(SUM(amount), 0) INTO v_revenue_hour FROM public.transactions WHERE business_id = p_business_id AND (p_location_id IS NULL OR branch_id = p_location_id) AND created_at >= NOW() - INTERVAL '1 hour' AND status IN ('verified', 'completed');

    -- Shift Breakdown (The Mirror Core)
    IF v_shift.id IS NOT NULL THEN
        SELECT 
            COALESCE(SUM(amount), 0),
            COALESCE(SUM(CASE WHEN payment_type = 'cash' THEN amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN payment_type = 'pos' THEN amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN payment_type IN ('transfer', 'wallet') THEN amount ELSE 0 END), 0)
        INTO v_revenue_shift, v_revenue_shift_cash, v_revenue_shift_pos, v_revenue_shift_transfer
        FROM public.transactions
        WHERE shift_id = v_shift.id AND status IN ('verified', 'completed');
    END IF;

    -- Payment Intents
    SELECT COUNT(*) INTO v_pending_intents_count FROM public.payment_intents WHERE org_id = p_business_id AND (p_location_id IS NULL OR branch_id = p_location_id) AND status = 'pending';

    -- Open Shifts
    SELECT COUNT(*) INTO v_open_shifts_count FROM public.shifts WHERE business_id = p_business_id AND (p_location_id IS NULL OR branch_id = p_location_id) AND status NOT IN ('closed', 'rejected');

    -- E. ASSEMBLE
    RETURN jsonb_build_object(
        'shift', CASE WHEN v_shift.id IS NOT NULL THEN jsonb_build_object(
            'id', v_shift.id,
            'status', v_shift.status,
            'staff_id', v_shift.staff_id,
            'started_at', v_shift.start_time
        ) ELSE NULL END,
        'revenue', jsonb_build_object(
            'today', COALESCE(v_revenue_today, 0),
            'last_hour', COALESCE(v_revenue_hour, 0),
            'shift_total', COALESCE(v_revenue_shift, 0),
            'shift_cash', COALESCE(v_revenue_shift_cash, 0),
            'shift_pos', COALESCE(v_revenue_shift_pos, 0),
            'shift_transfer', COALESCE(v_revenue_shift_transfer, 0)
        ),
        'orders', jsonb_build_object(
            'open_orders', COALESCE(v_open_orders_count, 0),
            'pending_payment', COALESCE(v_pending_payment_count, 0),
            'today_total', COALESCE(v_orders_today_count, 0)
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
                    WHERE org_id = p_business_id AND (p_location_id IS NULL OR branch_id = p_location_id) AND status = 'pending'
                    ORDER BY created_at DESC LIMIT 50
                ) pi
            )
        ),
        'recent_transactions', (
            SELECT COALESCE(jsonb_agg(tx), '[]'::jsonb) FROM (
                SELECT id, amount, payment_type, status, created_at, branch_id
                FROM public.transactions
                WHERE business_id = p_business_id AND (p_location_id IS NULL OR branch_id = p_location_id)
                ORDER BY created_at DESC LIMIT 20
            ) tx
        ),
        'branch_performance', (
            SELECT COALESCE(jsonb_agg(bp), '[]'::jsonb) FROM (
                SELECT 
                    b.id, b.name,
                    COALESCE(SUM(t.amount), 0) as revenue,
                    (SELECT COUNT(*) FROM public.orders o WHERE o.location_id = b.id AND o.created_at >= CURRENT_DATE) as order_count
                FROM public.branches b
                LEFT JOIN public.transactions t ON t.branch_id = b.id AND t.created_at >= CURRENT_DATE AND t.status IN ('verified', 'completed')
                WHERE b.business_id = p_business_id AND (p_location_id IS NULL OR b.id = p_location_id)
                GROUP BY b.id, b.name
            ) bp
        ),
        'inventory_alerts', (
            SELECT COALESCE(jsonb_agg(i), '[]'::jsonb) FROM (
                SELECT id, name, current_stock, min_stock, category
                FROM public.inventory
                WHERE business_id = p_business_id 
                AND (p_location_id IS NULL OR branch_id = p_location_id)
                AND current_stock < min_stock
                ORDER BY current_stock ASC LIMIT 10
            ) i
        ),
        'alerts', (
            SELECT COALESCE(jsonb_agg(a), '[]'::jsonb) FROM (
                SELECT id, event_type, metadata, created_at FROM public.system_events 
                WHERE (metadata->>'business_id')::UUID = p_business_id AND (p_location_id IS NULL OR (metadata->>'branch_id')::UUID = p_location_id)
                ORDER BY created_at DESC LIMIT 10
            ) a
        ),
        'timestamp', NOW()
    );
END;
$$;

COMMIT;
