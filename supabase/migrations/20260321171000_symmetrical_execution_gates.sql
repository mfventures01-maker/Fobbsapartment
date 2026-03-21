-- 🛸 ANTI-GRAVITY PHASE 1.1: SYMMETRICAL EXECUTION LOGIC
-- Purpose: Implement the RPC gates called by the DeterministicShell.

BEGIN;

-- 1. Void Order Gate
CREATE OR REPLACE FUNCTION public.void_order(
    p_order_id UUID,
    p_reason TEXT,
    p_staff_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.orders 
    SET status = 'void',
        metadata = metadata || jsonb_build_object('void_reason', p_reason, 'voided_by', p_staff_id, 'voided_at', NOW())
    WHERE id = p_order_id;
    
    RETURN jsonb_build_object('success', true, 'status', 'void');
END;
$$;

-- 2. Kitchen Status Gate
CREATE OR REPLACE FUNCTION public.update_kitchen_status(
    p_order_id UUID,
    p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.orders 
    SET kitchen_status = p_status 
    WHERE id = p_order_id;
    
    RETURN jsonb_build_object('success', true, 'kitchen_status', p_status);
END;
$$;

-- 3. Deterministic Discount Gate
CREATE OR REPLACE FUNCTION public.apply_discount(
    p_order_id UUID,
    p_amount NUMERIC,
    p_staff_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    
    -- Immutable Subtotal, recalculate Total
    UPDATE public.orders 
    SET total = subtotal - p_amount,
        metadata = metadata || jsonb_build_object('discount_amount', p_amount, 'discount_by', p_staff_id)
    WHERE id = p_order_id;
    
    RETURN jsonb_build_object('success', true, 'discount', p_amount, 'new_total', v_order.subtotal - p_amount);
END;
$$;

COMMIT;
