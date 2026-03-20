-- CARSS QR MENU & SSOT SNAPSHOT EXTENSION
-- Aim: Replace static/stale menu loading with deterministic RPC.
-- Enforces Step 3 (QR Menu Loading) of the Controlled Synchronization Protocol.

BEGIN;

-- 1. Deterministic QR Menu Fetch
-- Usage: callRPC('public', 'get_qr_menu', { p_location_id: '...' })
CREATE OR REPLACE FUNCTION public.get_qr_menu(
    p_location_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_business_id UUID;
    v_menu JSONB;
BEGIN
    -- Resolve business from location
    SELECT business_id INTO v_business_id FROM public.branches WHERE id = p_location_id;
    
    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'Branch isolation violation: Branch ID % not found.', p_location_id;
    END IF;

    -- Fetch categories and items
    -- In Phase 3, we treat 'inventory' as the source for active menu items.
    -- (This avoids drift between what we say we have and what is actually in stock)
    SELECT COALESCE(jsonb_agg(item), '[]'::jsonb) INTO v_menu
    FROM (
        SELECT id, name, price, category, current_stock
        FROM public.inventory
        WHERE branch_id = p_location_id
        AND is_active = true
        ORDER BY category, name
    ) item;

    RETURN jsonb_build_object(
        'location_id', p_location_id,
        'business_id', v_business_id,
        'menu', v_menu,
        'timestamp', NOW()
    );
END;
$$;

-- 2. Organization-Wide Deterministic Snapshot (CEO/Manager Tool)
-- Usage: callRPC('ceo', 'get_system_snapshot', { p_business_id: '...' })
CREATE OR REPLACE FUNCTION public.get_system_snapshot(
    p_business_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_snapshot JSONB;
BEGIN
    -- Verify CEO/Owner Authority
    IF NOT EXISTS (
        SELECT 1 FROM public.business_memberships 
        WHERE user_id = auth.uid() 
        AND business_id = p_business_id 
        AND role IN ('ceo', 'owner', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Security Perimeter Breach: Authority levels insufficient for get_system_snapshot.';
    END IF;

    -- Compile Snapshot
    RETURN jsonb_build_object(
        'orders', (
            SELECT COALESCE(jsonb_agg(o), '[]'::jsonb) FROM (
               SELECT id, customer_name, total, status, location_id, created_at
               FROM public.orders WHERE org_id = p_business_id AND status = 'open'
               ORDER BY created_at DESC LIMIT 20
            ) o
        ),
        'kitchen', (
            SELECT COALESCE(jsonb_agg(k), '[]'::jsonb) FROM (
               SELECT id, customer_name, status, location_id, created_at
               FROM public.orders WHERE org_id = p_business_id AND status = 'confirmed' -- 'confirmed' is kitchen view
               ORDER BY created_at DESC LIMIT 20
            ) k
        ),
        'inventory', (
            SELECT COALESCE(jsonb_agg(i), '[]'::jsonb) FROM (
               SELECT id, name, current_stock, min_stock, branch_id
               FROM public.inventory WHERE business_id = p_business_id AND current_stock < min_stock
               LIMIT 10
            ) i
        ),
        'shifts', (
            SELECT COALESCE(jsonb_agg(s), '[]'::jsonb) FROM (
               SELECT id, staff_id, status, branch_id, start_time
               FROM public.shifts WHERE business_id = p_business_id AND status <> 'closed'
            ) s
        ),
        'alerts', (
            SELECT COALESCE(jsonb_agg(a), '[]'::jsonb) FROM (
               SELECT id, event_type, metadata, created_at
               FROM public.system_events WHERE (metadata->>'business_id')::UUID = p_business_id
               ORDER BY created_at DESC LIMIT 10
            ) a
        ),
        'timestamp', NOW()
    );
END;
$$;

COMMIT;
