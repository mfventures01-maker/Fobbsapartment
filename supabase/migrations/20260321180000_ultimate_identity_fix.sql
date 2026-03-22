-- 🎯 ANTI-GRAVITY ULTIMATE FIX: CANONICAL IDENTITY & PERSISTENCE
-- Objective: Resolve "not unique" ambiguity and reconcile dependencies.
-- Law: "There is only one identity, and it is deterministic."

BEGIN;

-- 🛠️ 1. TEAR DOWN AMBIGUITY
-- We drop both possible variants to ensure a clean slate.
-- We use CASCADE to handle functions that depend on these signatures.
DROP FUNCTION IF EXISTS public.get_my_identity() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_identity(TEXT) CASCADE;

-- 🧬 2. DEFINE MASTER IDENTITY (V4)
-- This function handles BOTH zero-argument calls and parameterized calls.
CREATE OR REPLACE FUNCTION public.get_my_identity(p_terminal_type TEXT DEFAULT 'staff')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_membership RECORD;
    v_staff RECORD;
BEGIN
    v_user_id := auth.uid();
    
    -- Resolve Membership (Business + Role + Branch)
    SELECT 
        m.role,
        m.business_id,
        m.branch_id,
        m.department_id,
        d.name as department_name
    INTO v_membership
    FROM public.business_memberships m
    LEFT JOIN public.departments d ON d.id = m.department_id
    WHERE m.user_id = v_user_id
    LIMIT 1;

    -- Resolve Staff Proxy (Operational Identity)
    SELECT id INTO v_staff FROM public.staff_profiles WHERE user_id = v_user_id LIMIT 1;

    RETURN jsonb_build_object(
        'user_id', v_user_id,
        'role', COALESCE(v_membership.role, 'customer'),
        'business_id', v_membership.business_id,
        'branch_id', v_membership.branch_id,
        'department_id', v_membership.department_id,
        'department_name', v_membership.department_name,
        'staff_id', v_staff.id,
        'terminal_type', p_terminal_type,
        'authenticated', (v_user_id IS NOT NULL),
        'timestamp', NOW(),
        'status', CASE WHEN v_user_id IS NOT NULL THEN 'authorized' ELSE 'unauthorized' END
    );
END;
$$;

-- 🛡️ 3. RECONCILE DEPENDENTS (CREATE_ORDER_GATEWAY)
-- Recreating the idempotent version of the gateway.
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
    v_identity JSONB;
BEGIN
    -- 🛸 IDEMPOTENCY CHECK (I2)
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_existing_id FROM public.orders WHERE idempotency_key = p_idempotency_key;
        IF FOUND THEN
            RETURN jsonb_build_object('success', true, 'order_id', v_existing_id, 'status', 'idempotent_cached');
        END IF;
    END IF;

    -- Resolve Identity (Deterministic call)
    v_identity := public.get_my_identity(p_terminal_type);
    v_business_id := (v_identity->>'business_id')::UUID;
    v_staff_id := (v_identity->>'staff_id')::UUID;

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
        COALESCE(p_customer_name, 'Guest'),
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

-- 📝 4. ENSURE LOGGING UTILITY EXISTS
CREATE OR REPLACE FUNCTION public.log_frontend_error(
    rpc TEXT DEFAULT NULL,
    payload JSONB DEFAULT NULL,
    error TEXT DEFAULT NULL,
    terminal_type TEXT DEFAULT 'unknown'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.deterministic_event_log (
        terminal_type,
        event_type,
        rpc_name,
        payload,
        error,
        identity
    ) VALUES (
        terminal_type,
        'FRONTEND_ERROR',
        COALESCE(rpc, 'UI_FATAL'),
        COALESCE(payload, '{}'::jsonb),
        jsonb_build_object('message', error),
        COALESCE(public.get_my_identity(terminal_type), '{}'::jsonb)
    );
END;
$$;

-- 🔑 5. GRANTS
GRANT EXECUTE ON FUNCTION public.get_my_identity(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_identity(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.create_order_gateway(UUID, TEXT, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_gateway(UUID, TEXT, UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.log_frontend_error(TEXT, JSONB, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_frontend_error(TEXT, JSONB, TEXT, TEXT) TO anon;

-- 🔄 6. SCHEMA RELOAD NOTIFY
NOTIFY pgrst, 'reload schema';

COMMIT;
