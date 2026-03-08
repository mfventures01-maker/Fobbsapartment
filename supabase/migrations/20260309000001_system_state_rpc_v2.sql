-- CARSS EVENT-DRIVEN STATE SYNCHRONIZATION (EDSS)
-- Integrated RPC to fetch complete system state in one authoritative database query.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_system_state(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
    v_shift JSONB;
    v_pending_orders_count INT;
    v_pending_payments_count INT;
    v_recent_tx JSONB;
    v_revenue_today NUMERIC := 0;
    v_revenue_hour NUMERIC := 0;
    v_pending_intents JSONB;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Authoritative Active Shift
    SELECT jsonb_build_object(
        'id', id,
        'status', status,
        'start_time', start_time,
        'ends_at', ends_at,
        'closed_at', closed_at,
        'variance', variance
    ) INTO v_shift
    FROM public.shifts
    WHERE staff_id = v_user_id AND status <> 'closed'
    ORDER BY start_time DESC LIMIT 1;

    -- 2. Pending Orders
    SELECT COUNT(*) INTO v_pending_orders_count
    FROM public.orders
    WHERE org_id = p_business_id AND status = 'open';

    -- 3. Pending Payment Intents Array (For Manager settlement queue)
    SELECT COUNT(*) INTO v_pending_payments_count
    FROM public.payment_intents
    WHERE org_id = p_business_id AND status = 'pending';
    
    SELECT COALESCE(jsonb_agg(pi), '[]'::jsonb) INTO v_pending_intents
    FROM (
        SELECT id, expected_amount, status, payment_type, created_at, external_reference, 
               (SELECT jsonb_build_object('customer_name', o.customer_name, 'table_reference', o.table_reference) 
                FROM orders o WHERE o.id = payment_intents.order_id) as order_data
        FROM public.payment_intents
        WHERE org_id = p_business_id AND status = 'pending'
    ) pi;

    -- 4. Recent Transactions & Aggregates
    SELECT COALESCE(jsonb_agg(tx), '[]'::jsonb) INTO v_recent_tx
    FROM (
        SELECT t.id, t.amount, t.payment_type, t.status, t.created_at, t.payment_reference, 
               t.shift_id,
               b.name as branch_name
        FROM public.transactions t
        LEFT JOIN public.branches b ON b.id = t.branch_id
        WHERE t.business_id = p_business_id
        ORDER BY t.created_at DESC
        LIMIT 50
    ) tx;

    SELECT COALESCE(SUM(amount), 0) INTO v_revenue_today
    FROM public.transactions
    WHERE business_id = p_business_id AND created_at >= CURRENT_DATE;

    SELECT COALESCE(SUM(amount), 0) INTO v_revenue_hour
    FROM public.transactions
    WHERE business_id = p_business_id AND created_at >= (NOW() - INTERVAL '1 hour');

    RETURN jsonb_build_object(
        'active_shift', v_shift,
        'pending_orders_count', COALESCE(v_pending_orders_count, 0),
        'pending_payments_count', COALESCE(v_pending_payments_count, 0),
        'pending_intents', COALESCE(v_pending_intents, '[]'::jsonb),
        'recent_transactions', v_recent_tx,
        'revenue_today', v_revenue_today,
        'revenue_hour', v_revenue_hour,
        'timestamp', NOW()
    );
END;
$$;

COMMIT;
