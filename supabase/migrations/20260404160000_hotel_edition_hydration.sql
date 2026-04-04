-- 🛡️ CARSS FINAL FORENSIC SEAL: HOTEL EDITION HYDRATION GATEway
-- Purpose: Support single-payload JSONB for get_system_state to ensure schema alignment.
-- All operations resolve from internal identity spine (auth.uid()), but accept payload for validation.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_system_state(payload JSONB DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ctx RECORD;
    v_open_orders_count INT;
    v_pending_payment_count INT;
    v_revenue_today NUMERIC := 0;
    v_revenue_hour NUMERIC := 0;
    v_revenue_shift NUMERIC := 0;
    v_open_shifts_count INT := 0;
    v_orders_today_count INT := 0;
    v_pending_intents_count INT;
    v_alerts JSONB := '[]'::jsonb;
    v_branch_id UUID;
    v_business_id UUID;
BEGIN
    -- 🛡️ [ANTI-GRAVITY] RESOLVE CONTEXT
    SELECT * INTO v_ctx FROM public.get_my_operational_context();
    
    IF v_ctx.v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- Use payload IDs if provided (and user is authorized), else use internal context
    -- For staff, we STRICTLY use internal context. For CEO/Admin, we allow payload override for branch-switching.
    IF payload IS NOT NULL AND (v_ctx.v_role IN ('ceo', 'super_admin', 'admin', 'owner')) THEN
        v_branch_id := (payload->>'branch_id')::UUID;
        v_business_id := (payload->>'business_id')::UUID;
    ELSE
        v_branch_id := v_ctx.v_branch_id;
        v_business_id := v_ctx.v_business_id;
    END IF;

    IF v_business_id IS NULL THEN RAISE EXCEPTION 'Business context missing'; END IF;

    -- B. Order Aggregates
    SELECT COUNT(*) INTO v_open_orders_count
    FROM public.orders
    WHERE org_id = v_business_id AND location_id = v_branch_id AND status = 'open';

    SELECT COUNT(*) INTO v_pending_payment_count
    FROM public.orders
    WHERE org_id = v_business_id AND location_id = v_branch_id AND status = 'pending_payment';

    SELECT COUNT(*) INTO v_orders_today_count
    FROM public.orders
    WHERE org_id = v_business_id AND location_id = v_branch_id AND created_at >= CURRENT_DATE;

    -- C. Revenue Intelligence
    SELECT COALESCE(SUM(amount), 0) INTO v_revenue_today
    FROM public.transactions
    WHERE business_id = v_business_id AND branch_id = v_branch_id AND created_at >= CURRENT_DATE AND status IN ('verified', 'completed');

    SELECT COALESCE(SUM(amount), 0) INTO v_revenue_hour
    FROM public.transactions
    WHERE business_id = v_business_id AND branch_id = v_branch_id AND created_at >= NOW() - INTERVAL '1 hour' AND status IN ('verified', 'completed');

    IF v_ctx.v_shift_id IS NOT NULL THEN
        SELECT COALESCE(SUM(amount), 0) INTO v_revenue_shift
        FROM public.transactions
        WHERE shift_id = v_ctx.v_shift_id AND status IN ('verified', 'completed');
    END IF;

    -- D. Payment Intents
    SELECT COUNT(*) INTO v_pending_intents_count
    FROM public.payment_intents
    WHERE business_id = v_business_id AND branch_id = v_branch_id AND status = 'pending';

    -- Alerts (Unmatched Payments)
    SELECT jsonb_agg(jsonb_build_object('message', 'Unmatched Payment Detected: ' || reference, 'detected_at', detected_at))
    INTO v_alerts
    FROM public.unmatched_payments
    WHERE status = 'unmatched' AND detected_at >= CURRENT_DATE - INTERVAL '1 day'
    LIMIT 10;

    -- E. Assemble Canonical Snapshot
    RETURN jsonb_build_object(
        'business_id', v_business_id,
        'branch_id', v_branch_id,
        'shift', CASE WHEN v_ctx.v_shift_id IS NOT NULL THEN jsonb_build_object(
            'id', v_ctx.v_shift_id,
            'status', 'open'
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
        'recent_transactions', (
            SELECT COALESCE(jsonb_agg(tx), '[]'::jsonb) FROM (
                SELECT id, amount, payment_type, status, created_at, branch_id
                FROM public.transactions
                WHERE business_id = v_business_id AND branch_id = v_branch_id
                ORDER BY created_at DESC
                LIMIT 15
            ) tx
        ),
        'alerts', COALESCE(v_alerts, '[]'::jsonb),
        'timestamp', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_system_state(JSONB) TO authenticated;

COMMIT;
