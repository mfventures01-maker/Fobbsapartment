
-- 0. Shift Management (Foundation for Reconciliation)
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL, -- References businesses(id)
    branch_id UUID NOT NULL,   -- References branches(id)
    staff_id UUID NOT NULL REFERENCES auth.users(id),
    
    start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_time TIMESTAMPTZ,
    
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1. Payment Intents (Control Layer)
CREATE TYPE payment_intent_status AS ENUM ('pending', 'confirmed', 'voided');

CREATE TABLE IF NOT EXISTS public.payment_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id),
    business_id UUID NOT NULL, -- References businesses(id)
    branch_id UUID NOT NULL,   -- References branches(id)
    staff_id UUID NOT NULL REFERENCES auth.users(id),
    shift_id UUID REFERENCES public.shifts(id), -- Nullable if shift system rollout is staged, but eventually required
    
    expected_amount NUMERIC(15, 2) NOT NULL,
    payment_type TEXT NOT NULL, -- Using TEXT to match existing enums if needed, or cast to payment_method_v2
    
    status payment_intent_status NOT NULL DEFAULT 'pending',
    external_reference TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enhance Transactions Table (Linkage)
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id),
ADD COLUMN IF NOT EXISTS payment_intent_id UUID REFERENCES public.payment_intents(id),
ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES public.shifts(id);

-- 3. Shift Reconciliations (Enforcement Layer)
CREATE TABLE IF NOT EXISTS public.shift_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES public.shifts(id),
    staff_id UUID NOT NULL REFERENCES auth.users(id),
    business_id UUID NOT NULL,
    
    expected_cash NUMERIC(15, 2) DEFAULT 0,
    counted_cash NUMERIC(15, 2) DEFAULT 0,
    
    expected_pos NUMERIC(15, 2) DEFAULT 0,
    pos_machine_total NUMERIC(15, 2) DEFAULT 0,
    
    expected_transfer NUMERIC(15, 2) DEFAULT 0,
    transfer_total NUMERIC(15, 2) DEFAULT 0,
    
    variance NUMERIC(15, 2) NOT NULL,
    
    manager_approved BOOLEAN DEFAULT FALSE,
    manager_id UUID REFERENCES auth.users(id),
    approval_notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Atomic Settlement Function
CREATE OR REPLACE FUNCTION confirm_payment_intent(
    p_intent_id UUID,
    p_external_reference TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_intent RECORD;
    v_order RECORD;
    v_tx_id UUID;
BEGIN
    -- A. Lock & Load Intent
    SELECT * INTO v_intent 
    FROM public.payment_intents 
    WHERE id = p_intent_id 
    FOR UPDATE; -- Lock this row
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment Intent not found';
    END IF;
    
    IF v_intent.status <> 'pending' THEN
        RAISE EXCEPTION 'Payment Intent is not pending (Status: %)', v_intent.status;
    END IF;

    -- B. Verify Order
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = v_intent.order_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Associated Order not found';
    END IF;
    
    IF v_order.status = 'paid' THEN
        RAISE EXCEPTION 'Order is already paid';
    END IF;

    -- C. Atomic Transaction Execution
    -- 1. Insert Transaction
    INSERT INTO public.transactions (
        business_id, branch_id, staff_id, 
        amount, payment_type, payment_reference,
        status, created_at,
        order_id, payment_intent_id, shift_id
    ) VALUES (
        v_intent.business_id, v_intent.branch_id, v_intent.staff_id,
        v_intent.expected_amount, v_intent.payment_type::payment_method_v2, p_external_reference,
        'verified', now(),
        v_intent.order_id, v_intent.id, v_intent.shift_id
    ) RETURNING id INTO v_tx_id;

    -- 2. Update Order
    UPDATE public.orders 
    SET status = 'paid', updated_at = now()
    WHERE id = v_intent.order_id;

    -- 3. Update Intent
    UPDATE public.payment_intents
    SET status = 'confirmed', 
        external_reference = COALESCE(p_external_reference, external_reference),
        updated_at = now()
    WHERE id = p_intent_id;
    
    -- D. Return Success Payload
    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_tx_id,
        'order_id', v_intent.order_id,
        'status', 'paid'
    );

EXCEPTION WHEN OTHERS THEN
    -- Rollback is automatic in PG exception, but we return explicit error structure if caught higher up
    RAISE; 
END;
$$;

-- 5. RLS Policies (Isolation)

-- Payment Intents
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view own intents" ON public.payment_intents
    FOR SELECT USING (auth.uid() = staff_id);

CREATE POLICY "Staff insert own intents" ON public.payment_intents
    FOR INSERT WITH CHECK (auth.uid() = staff_id);

CREATE POLICY "Management view all intents" ON public.payment_intents
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('manager', 'ceo', 'owner'))
    );

-- Shifts
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view own shifts" ON public.shifts
    FOR SELECT USING (auth.uid() = staff_id);

CREATE POLICY "Staff manage own shifts" ON public.shifts
    FOR ALL USING (auth.uid() = staff_id);

CREATE POLICY "Management view all shifts" ON public.shifts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('manager', 'ceo', 'owner'))
    );

-- Reconciliations
ALTER TABLE public.shift_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view own reconciliations" ON public.shift_reconciliations
    FOR SELECT USING (auth.uid() = staff_id);

CREATE POLICY "Staff insert own reconciliations" ON public.shift_reconciliations
    FOR INSERT WITH CHECK (auth.uid() = staff_id);

CREATE POLICY "Management view/approve reconciliations" ON public.shift_reconciliations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('manager', 'ceo', 'owner'))
    );

