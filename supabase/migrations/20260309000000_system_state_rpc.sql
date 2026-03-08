-- CARSS EVENT-DRIVEN STATE SYNCHRONIZATION (EDSS)
-- RPC to fetch complete system state in one authoritative database query.

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
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Authoritative Active Shift
    -- Checks for any non-closed shift belonging to the current user
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

    -- 3. Pending Payment Intents
    SELECT COUNT(*) INTO v_pending_payments_count
    FROM public.payment_intents
    WHERE business_id = p_business_id AND status = 'pending';

    -- 4. Recent Transactions
    SELECT COALESCE(jsonb_agg(tx), '[]'::jsonb) INTO v_recent_tx
    FROM (
        SELECT id, amount, payment_type, status, created_at, payment_reference 
        FROM public.transactions
        WHERE business_id = p_business_id
        ORDER BY created_at DESC
        LIMIT 10
    ) tx;

    RETURN jsonb_build_object(
        'active_shift', v_shift,
        'pending_orders_count', COALESCE(v_pending_orders_count, 0),
        'pending_payments_count', COALESCE(v_pending_payments_count, 0),
        'recent_transactions', v_recent_tx,
        'timestamp', NOW()
    );
END;
$$;

COMMIT;
