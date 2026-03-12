-- CARSS PHASE 2: SSOT ENFORCEMENT & FINANCIAL AUDIT TRAIL
-- Aim: Centralize all state calculations into the database and enforce an immutable audit ledger.

BEGIN;

-- 1. Immutable Event Ledger (Banking-Grade Audit Trail)
CREATE TABLE IF NOT EXISTS public.system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    actor_id UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

-- CEO and Managers can view events
CREATE POLICY "Management view system events" ON public.system_events
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('manager', 'ceo', 'owner', 'super_admin'))
    );

-- 2. Unmatched Payments (Nigerian Operational Reconciliation)
CREATE TABLE IF NOT EXISTS public.unmatched_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    reference TEXT UNIQUE, -- Payment Session ID / POS Ref
    sender_data TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    matched_order_id UUID REFERENCES public.orders(id),
    status TEXT NOT NULL DEFAULT 'unmatched' CHECK (status IN ('unmatched', 'manually_matched', 'reversed')),
    metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.unmatched_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Management manage unmatched payments" ON public.unmatched_payments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('manager', 'ceo', 'owner', 'super_admin'))
    );

-- 3. Refactor get_system_state() into the Canonical SSOT Provider
CREATE OR REPLACE FUNCTION public.get_system_state(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_shift_id UUID;
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

    -- A. Authoritative Active Shift
    SELECT id, status, staff_id, start_time INTO v_shift
    FROM public.shifts
    WHERE (staff_id = v_user_id OR EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.user_id = v_user_id AND p.role IN ('manager', 'ceo', 'owner', 'super_admin')
    ))
    AND status <> 'closed'
    AND business_id = p_business_id
    ORDER BY start_time DESC LIMIT 1;

    -- If it's a staff member, narrow to their specific active shift
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_user_id AND role IN ('manager', 'ceo', 'owner', 'super_admin')) THEN
        SELECT id, status, staff_id, start_time INTO v_shift
        FROM public.shifts
        WHERE staff_id = v_user_id AND status <> 'closed'
        AND business_id = p_business_id
        ORDER BY start_time DESC LIMIT 1;
    END IF;

    -- B. Order Aggregates (Open and Pending Payment)
    SELECT COUNT(*) INTO v_open_orders_count
    FROM public.orders
    WHERE org_id = p_business_id AND status = 'open';

    SELECT COUNT(*) INTO v_pending_payment_count
    FROM public.orders
    WHERE org_id = p_business_id AND status = 'pending_payment';

    SELECT COUNT(*) INTO v_orders_today_count
    FROM public.orders
    WHERE org_id = p_business_id AND created_at >= CURRENT_DATE;

    -- C. Revenue Intelligence
    SELECT COALESCE(SUM(amount), 0) INTO v_revenue_today
    FROM public.transactions
    WHERE business_id = p_business_id AND created_at >= CURRENT_DATE AND status IN ('verified', 'completed');

    SELECT COALESCE(SUM(amount), 0) INTO v_revenue_hour
    FROM public.transactions
    WHERE business_id = p_business_id AND created_at >= NOW() - INTERVAL '1 hour' AND status IN ('verified', 'completed');

    IF v_shift.id IS NOT NULL THEN
        SELECT COALESCE(SUM(amount), 0) INTO v_revenue_shift
        FROM public.transactions
        WHERE shift_id = v_shift.id AND status IN ('verified', 'completed');
    END IF;

    -- D. Payment Intents
    SELECT COUNT(*) INTO v_pending_intents_count
    FROM public.payment_intents
    WHERE org_id = p_business_id AND status = 'pending';

    SELECT COUNT(*) INTO v_open_shifts_count
    FROM public.shifts
    WHERE business_id = p_business_id AND status IN ('open', 'pending_declaration', 'awaiting_close_approval');

    -- E. Assemble Canonical Snapshot
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
                    WHERE org_id = p_business_id AND status = 'pending'
                ) pi
            )
        ),
        'recent_transactions', (
            SELECT COALESCE(jsonb_agg(tx), '[]'::jsonb) FROM (
                SELECT id, amount, payment_type, status, created_at, branch_id
                FROM public.transactions
                WHERE business_id = p_business_id
                ORDER BY created_at DESC
                LIMIT 20
            ) tx
        ),
        'branch_performance', (
            SELECT COALESCE(jsonb_agg(bp), '[]'::jsonb) FROM (
                SELECT 
                    b.id, 
                    b.name,
                    COALESCE(SUM(t.amount), 0) as revenue,
                    (SELECT COUNT(*) FROM public.orders o WHERE o.location_id = b.id AND o.created_at >= CURRENT_DATE) as order_count,
                    (SELECT COUNT(*) FROM public.business_memberships bm WHERE bm.branch_id = b.id AND bm.status = 'active') as staff_count
                FROM public.branches b
                LEFT JOIN public.transactions t ON t.branch_id = b.id AND t.created_at >= CURRENT_DATE AND t.status IN ('verified', 'completed')
                WHERE b.business_id = p_business_id
                GROUP BY b.id, b.name
            ) bp
        ),
        'alerts', v_alerts,
        'timestamp', NOW()
    );
END;
$$;

-- 4. Audit Trail Automation (Triggers)
CREATE OR REPLACE FUNCTION public.log_system_event()
RETURNS TRIGGER AS $$
DECLARE
    v_event_type TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_event_type := TG_TABLE_NAME || '_CREATED';
    ELSIF TG_OP = 'UPDATE' THEN
        v_event_type := TG_TABLE_NAME || '_UPDATED';
        -- Specific transitions
        IF TG_TABLE_NAME = 'orders' AND OLD.status <> NEW.status AND NEW.status = 'paid' THEN
            v_event_type := 'ORDER_PAID';
        ELSIF TG_TABLE_NAME = 'payment_intents' AND OLD.status <> NEW.status AND NEW.status = 'confirmed' THEN
            v_event_type := 'PAYMENT_CONFIRMED';
        ELSIF TG_TABLE_NAME = 'shifts' AND OLD.status <> NEW.status THEN
            v_event_type := 'SHIFT_STATE_CHANGE_' || UPPER(NEW.status);
        END IF;
    END IF;

    INSERT INTO public.system_events (event_type, entity_type, entity_id, actor_id, metadata)
    VALUES (
        v_event_type, 
        TG_TABLE_NAME, 
        NEW.id, 
        COALESCE(auth.uid(), (NEW.metadata->>'staff_id')::UUID), 
        to_jsonb(NEW)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to key tables
DROP TRIGGER IF EXISTS trg_log_order_event ON public.orders;
CREATE TRIGGER trg_log_order_event AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE PROCEDURE public.log_system_event();

DROP TRIGGER IF EXISTS trg_log_tx_event ON public.transactions;
CREATE TRIGGER trg_log_tx_event AFTER INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE PROCEDURE public.log_system_event();

DROP TRIGGER IF EXISTS trg_log_shift_event ON public.shifts;
CREATE TRIGGER trg_log_shift_event AFTER INSERT OR UPDATE ON public.shifts FOR EACH ROW EXECUTE PROCEDURE public.log_system_event();

COMMIT;
