-- 🛸 ANTI-GRAVITY PHASE 0: FOUNDATION LAYER (SYMMETRY & HARDENING)
-- Purpose: Establish immutable foundations, rename legacy columns, and enable telemetry.

BEGIN;

-- 🛠️ 1. SCHEMA ALIGNMENT: location_id -> branch_id
-- We must be surgical. We check if columns exist and rename them to branch_id.
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN 
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND column_name = 'location_id'
        AND table_name NOT IN ('branches') -- Don't rename branch ID itself
    LOOP
        EXECUTE format('ALTER TABLE public.%I RENAME COLUMN location_id TO branch_id', r.table_name);
        RAISE NOTICE 'Renamed location_id to branch_id in table %', r.table_name;
    END LOOP;
END $$;

-- 🛡️ 2. ORDER STATUS ENUM HARDENING
-- order_status must be strictly FINANCIAL (open, paid, void)
-- Kitchen states (preparing, ready, served) must move to kitchen_status.

-- Ensure kitchen_status exists on orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS kitchen_status TEXT DEFAULT 'pending' CHECK (kitchen_status IN ('pending', 'preparing', 'ready', 'served'));

-- Update order_status constraints if it's a domain/enum
-- (Assuming it's a text column with a check constraint in this version)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN ('open', 'paid', 'void'));

-- 📋 3. IMMUTABLE EVENT LOG
CREATE TABLE IF NOT EXISTS public.deterministic_event_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id),
    branch_id UUID,
    terminal_type TEXT NOT NULL CHECK (terminal_type IN ('qr', 'pos', 'mobile', 'manager')),
    event_type TEXT NOT NULL,
    rpc_name TEXT NOT NULL,
    payload JSONB NOT NULL,
    response JSONB,
    identity JSONB NOT NULL,
    error JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_events ON public.deterministic_event_log(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_branch_timeline ON public.deterministic_event_log(branch_id, created_at);

-- 🆔 4. ENHANCED IDENTITY RESOLUTION
CREATE OR REPLACE FUNCTION public.get_my_identity(p_terminal_type TEXT DEFAULT NULL)
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
    
    -- Resolve Membership
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

    -- Resolve Staff Proxy
    SELECT id INTO v_staff FROM public.staff_profiles WHERE user_id = v_user_id LIMIT 1;

    RETURN jsonb_build_object(
        'user_id', v_user_id,
        'business_id', v_membership.business_id,
        'branch_id', v_membership.branch_id,
        'role', COALESCE(v_membership.role, 'customer'),
        'staff_id', v_staff.id,
        'terminal_type', p_terminal_type,
        'authenticated', (v_user_id IS NOT NULL),
        'timestamp', NOW()
    );
END;
$$;

-- 📦 5. INVENTORY FOUNDATION
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL, -- Link to your items/products table
    branch_id UUID NOT NULL REFERENCES public.branches(id),
    available_quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(item_id, branch_id)
);

CREATE OR REPLACE FUNCTION public.update_inventory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventory_timestamp_trigger ON public.inventory;
CREATE TRIGGER inventory_timestamp_trigger
    BEFORE UPDATE ON public.inventory
    FOR EACH ROW
    EXECUTE FUNCTION public.update_inventory_timestamp();

-- 📝 6. TELEMETRY RPC
CREATE OR REPLACE FUNCTION public.log_deterministic_event(
    p_order_id UUID,
    p_branch_id UUID,
    p_terminal_type TEXT,
    p_event_type TEXT,
    p_rpc_name TEXT,
    p_payload JSONB,
    p_response JSONB DEFAULT NULL,
    p_identity JSONB DEFAULT NULL,
    p_error JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.deterministic_event_log (
        order_id, branch_id, terminal_type, event_type, rpc_name, payload, response, identity, error
    ) VALUES (
        p_order_id, p_branch_id, p_terminal_type, p_event_type, p_rpc_name, p_payload, p_response, p_identity, p_error
    );
END;
$$;

COMMIT;
