-- 🛡️ ANTI-GRAVITY PHASE 6: MATHEMATICAL IDEMPOTENCY ENFORCEMENT
-- Purpose: Global unique constraint on action keys to prevent double-execution.

BEGIN;

-- 1. Add Idempotency Column to Orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency ON public.orders (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 2. Update Order Gateway to use Idempotency Key
CREATE OR REPLACE FUNCTION public.create_order_gateway(
    p_branch_id UUID,
    p_customer_name TEXT DEFAULT NULL,
    p_shift_id UUID DEFAULT NULL,
    p_terminal_type TEXT DEFAULT 'staff',
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_id UUID;
    v_business_id UUID;
    v_staff_id UUID;
    v_existing_id UUID;
BEGIN
    -- 🛸 IDEMPOTENCY CHECK (I2)
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_existing_id FROM public.orders WHERE idempotency_key = p_idempotency_key;
        IF FOUND THEN
            RETURN jsonb_build_object('success', true, 'order_id', v_existing_id, 'status', 'idempotent_cached');
        END IF;
    END IF;

    -- Resolve Identity
    SELECT business_id, staff_id INTO v_business_id, v_staff_id 
    FROM (SELECT (get_my_identity()).*) i;

    -- Shift Verification
    IF p_terminal_type = 'staff' AND p_shift_id IS NULL THEN
        RAISE EXCEPTION 'Shift Violation: Transaction blocked. Shift context missing.';
    END IF;

    INSERT INTO public.orders (
        org_id,
        location_id,
        customer_name,
        status,
        subtotal,
        total,
        created_by,
        shift_id,
        idempotency_key,
        metadata
    ) VALUES (
        v_business_id,
        p_branch_id,
        COALESCE(p_customer_name, 'Staff Guest'),
        'open',
        0, 0,
        v_staff_id,
        p_shift_id,
        p_idempotency_key,
        jsonb_build_object('terminal', p_terminal_type)
    ) RETURNING id INTO v_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'timestamp', NOW()
    );
END;
$$;

COMMIT;
