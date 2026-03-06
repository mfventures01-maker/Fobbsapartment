-- CARSS SHIFT REVENUE LOCK ENGINE
-- AIM: Fraud-resistant shift reconciliation, record locking, and CEO audited telemetry.

BEGIN;

-- 1. ASSET FOUNDATION: Declare shift_declarations Table (Step 3)
CREATE TABLE IF NOT EXISTS public.shift_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES public.shifts(id),
    staff_id UUID NOT NULL REFERENCES auth.users(id),
    
    declared_cash NUMERIC(15, 2) NOT NULL DEFAULT 0,
    declared_pos NUMERIC(15, 2) NOT NULL DEFAULT 0,
    declared_transfer NUMERIC(15, 2) NOT NULL DEFAULT 0,
    declared_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    
    system_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    variance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for shift_declarations
ALTER TABLE public.shift_declarations ENABLE ROW LEVEL SECURITY;

-- Policies for shift_declarations
DROP POLICY IF EXISTS "Staff can view own declarations" ON public.shift_declarations;
CREATE POLICY "Staff can view own declarations" ON public.shift_declarations
    FOR SELECT USING (auth.uid() = staff_id);

DROP POLICY IF EXISTS "Management can view all declarations" ON public.shift_declarations;
CREATE POLICY "Management can view all declarations" ON public.shift_declarations
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('manager', 'ceo', 'owner', 'super_admin'))
    );

-- 2. SCHEMA EVOLUTION: Ensure traceability for orders
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shift_id') THEN
        ALTER TABLE public.orders ADD COLUMN shift_id UUID REFERENCES public.shifts(id);
    END IF;
END $$;

-- 3. CORE ENGINE: implementation of submit_shift_declaration RPC (Step 2 & 4)
CREATE OR REPLACE FUNCTION public.submit_shift_declaration(
    p_shift_id UUID,
    p_cash NUMERIC,
    p_pos NUMERIC,
    p_transfer NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_system_total NUMERIC;
    v_declared_total NUMERIC;
    v_variance NUMERIC;
    v_shift RECORD;
BEGIN
    -- A. Lock and Verify Shift
    SELECT * INTO v_shift FROM public.shifts WHERE id = p_shift_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Shift not found');
    END IF;

    IF v_shift.staff_id <> auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;

    -- B. Verify Status 
    IF v_shift.status NOT IN ('open', 'pending_declaration') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Shift status must be open or pending_declaration to submit declaration (Current: ' || v_shift.status || ')');
    END IF;

    -- C. Compute System Revenue (Step 1 of Prompt)
    -- Must come from verified transactions only.
    SELECT COALESCE(SUM(amount), 0) INTO v_system_total
    FROM public.transactions
    WHERE shift_id = p_shift_id 
    AND status IN ('verified', 'completed');

    -- D. Calculate Totals and Variance (Step 2 of Prompt)
    v_declared_total := p_cash + p_pos + p_transfer;
    v_variance := v_declared_total - v_system_total;

    -- E. Persist Declaration (Step 3 of Prompt)
    INSERT INTO public.shift_declarations (
        shift_id, staff_id, 
        declared_cash, declared_pos, declared_transfer, 
        declared_total, system_total, variance
    ) VALUES (
        p_shift_id, auth.uid(),
        p_cash, p_pos, p_transfer,
        v_declared_total, v_system_total, v_variance
    );

    -- F. Lock Shift for Manager Review (Step 4 of Prompt)
    -- Transition status to 'awaiting_close_approval'
    UPDATE public.shifts SET
        status = 'awaiting_close_approval'::public.shift_status,
        declared_cash = p_cash,
        declared_pos = p_pos,
        declared_transfer = p_transfer,
        expected_revenue = v_system_total,
        total_revenue = v_system_total,
        variance = v_variance,
        updated_at = NOW()
    WHERE id = p_shift_id;

    -- G. Telemetry log (Audit)
    INSERT INTO public.audit_logs (event_type, actor_id, resource_id, metadata, business_uuid)
    VALUES ('SHIFT_DECLARATION_SUBMITTED', auth.uid(), p_shift_id::text, jsonb_build_object(
        'declared_total', v_declared_total,
        'system_total', v_system_total,
        'variance', v_variance,
        'cash', p_cash,
        'pos', p_pos,
        'transfer', p_transfer
    ), v_shift.business_id);

    RETURN jsonb_build_object(
        'success', true,
        'declared_total', v_declared_total,
        'system_total', v_system_total,
        'variance', v_variance
    );
END;
$$;

-- 4. CORE ENGINE: Implementation of approve_shift_close RPC (Step 5)
CREATE OR REPLACE FUNCTION public.approve_shift_close(p_shift_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_shift RECORD;
    v_allowed_variance NUMERIC := 0.00; -- Change this to business_settings threshold later
BEGIN
    -- A. Authority Check
    IF NOT EXISTS (
        SELECT 1 FROM public.business_memberships 
        WHERE user_id = auth.uid() 
        AND role IN ('manager', 'ceo', 'owner', 'super_admin')
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;

    -- B. Resolve and Lock Shift
    SELECT * INTO v_shift FROM public.shifts WHERE id = p_shift_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Shift not found');
    END IF;

    IF v_shift.status::text <> 'awaiting_close_approval' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Shift is not in awaiting_close_approval state (Current: ' || v_shift.status || ')');
    END IF;

    -- C. Enforce Variance Rule (Step 5 of Prompt)
    IF ABS(v_shift.variance) > v_allowed_variance THEN
        RAISE EXCEPTION 'CARSS REVENUE LOCK: Variance (N%) exceeds allowed threshold (N%). Shift cannot be closed without manual reconciliation.', v_shift.variance, v_allowed_variance;
    END IF;

    -- D. Final Closure
    UPDATE public.shifts SET
        status = 'closed'::public.shift_status,
        closed_at = NOW(),
        updated_at = NOW(),
        manager_approval_id = auth.uid()
    WHERE id = p_shift_id;

    -- E. Telemetry
    INSERT INTO public.audit_logs (event_type, actor_id, resource_id, metadata, business_uuid)
    VALUES ('SHIFT_CLOSED', auth.uid(), p_shift_id::text, jsonb_build_object('status', 'closed'), v_shift.business_id);

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. IMMUTABILITY LAYER: Lock Financial Records (Step 6)
CREATE OR REPLACE FUNCTION public.prevent_closed_shift_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_shift_status TEXT;
    v_shift_id UUID;
BEGIN
    -- Resolve shift_id based on table
    IF TG_TABLE_NAME IN ('transactions', 'payment_intents', 'orders') THEN
        v_shift_id := NEW.shift_id;
    END IF;

    IF v_shift_id IS NOT NULL THEN
        SELECT status::text INTO v_shift_status FROM public.shifts WHERE id = v_shift_id;
        IF v_shift_status = 'closed' THEN
            RAISE EXCEPTION 'CARSS REVENUE LOCK: Action blocked. Shift % is permanently closed. Financial records are immutable.', v_shift_id;
        END IF;

        IF v_shift_status = 'awaiting_close_approval' AND TG_OP = 'INSERT' THEN
            RAISE EXCEPTION 'CARSS REVENUE LOCK: Action blocked. Shift % is awaiting closure approval. No new records allowed.', v_shift_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply Lock Triggers
DROP TRIGGER IF EXISTS trg_prevent_closed_transactions ON public.transactions;
CREATE TRIGGER trg_prevent_closed_transactions
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE PROCEDURE public.prevent_closed_shift_activity();

DROP TRIGGER IF EXISTS trg_prevent_closed_intents ON public.payment_intents;
CREATE TRIGGER trg_prevent_closed_intents
BEFORE INSERT OR UPDATE ON public.payment_intents
FOR EACH ROW EXECUTE PROCEDURE public.prevent_closed_shift_activity();

DROP TRIGGER IF EXISTS trg_prevent_closed_orders ON public.orders;
CREATE TRIGGER trg_prevent_closed_orders
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE PROCEDURE public.prevent_closed_shift_activity();

-- 6. AUDIT TELEMETRY: CEO Dashboard View (Step 7)
CREATE OR REPLACE VIEW public.ceo_shift_audit_telemetry AS
SELECT
    s.id AS shift_id,
    s.staff_id,
    p.full_name AS staff_name,
    sd.system_total,
    sd.declared_total,
    sd.variance,
    sd.declared_cash,
    sd.declared_pos,
    sd.declared_transfer,
    s.status,
    s.start_time,
    s.closed_at,
    sd.created_at AS declaration_timestamp
FROM public.shifts s
JOIN public.shift_declarations sd ON s.id = sd.shift_id
LEFT JOIN public.profiles p ON s.staff_id = p.user_id;

COMMIT;
