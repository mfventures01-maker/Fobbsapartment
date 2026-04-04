-- 🛡️ CARSS STANDARDIZED HYDRATION GATEway (BACKEND LAYER 0)
-- Objective: Enforce deterministic return envelopes (data, version, error)
-- Purpose: Resolve .map() crashes and ensure math-level certainty in Layer 1.

BEGIN;

-- 1. Standardized QR Menu Fetch
-- Usage: supabase.rpc('get_qr_menu', { p_branch_id: '...' })
CREATE OR REPLACE FUNCTION public.get_qr_menu(
    p_branch_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(item), '[]'::jsonb) INTO v_data
    FROM (
        SELECT 
            id, 
            name, 
            price, 
            category, 
            current_stock,
            is_active as is_available -- Renamed for compatibility
        FROM public.inventory
        WHERE branch_id = p_branch_id
        AND is_active = true
        ORDER BY category, name
    ) item;

    RETURN jsonb_build_object(
        'data', v_data,
        'version', EXTRACT(EPOCH FROM NOW())::BIGINT,
        'error', NULL
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'data', '[]'::jsonb,
        'version', 0,
        'error', SQLERRM
    );
END;
$$;

-- 2. Standardized Room Bookings Fetch
-- Usage: supabase.rpc('get_room_bookings', { p_branch_id: '...' })
CREATE OR REPLACE FUNCTION public.get_room_bookings(
    p_branch_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(b), '[]'::jsonb) INTO v_data
    FROM (
        SELECT id, room_type, check_in, check_out, status, total_amount
        FROM public.room_bookings
        WHERE branch_id = p_branch_id
        AND status IN ('pending', 'confirmed')
        AND (check_out >= CURRENT_DATE OR check_in >= CURRENT_DATE)
        ORDER BY check_in ASC
    ) b;

    RETURN jsonb_build_object(
        'data', v_data,
        'version', EXTRACT(EPOCH FROM NOW())::BIGINT,
        'error', NULL
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'data', '[]'::jsonb,
        'version', 0,
        'error', SQLERRM
    );
END;
$$;

-- 3. Standardized Bar Cart Fetch (Stub)
-- Usage: supabase.rpc('get_bar_cart', { p_branch_id: '...' })
CREATE OR REPLACE FUNCTION public.get_bar_cart(
    p_branch_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Bar cart is currently local-first, but we provide this for deterministic hydration
    RETURN jsonb_build_object(
        'data', '[]'::jsonb, -- Currently empty in DB (session-managed on front)
        'version', EXTRACT(EPOCH FROM NOW())::BIGINT,
        'error', NULL
    );
END;
$$;

-- 4. Standardized Pos State Fetch
-- Usage: supabase.rpc('get_pos_state', { p_branch_id: '...', p_staff_id: '...' })
CREATE OR REPLACE FUNCTION public.get_pos_state(
    p_branch_id UUID,
    p_staff_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    -- This resolves via the existing get_system_state logic but ensures the envelope
    SELECT public.get_system_state(jsonb_build_object(
        'branch_id', p_branch_id, 
        'staff_id', p_staff_id,
        'terminal_type', 'staff'
    )) INTO v_data;

    RETURN jsonb_build_object(
        'data', v_data,
        'version', EXTRACT(EPOCH FROM NOW())::BIGINT,
        'error', NULL
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'data', NULL,
        'version', 0,
        'error', SQLERRM
    );
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.get_qr_menu(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_qr_menu(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_room_bookings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bar_cart(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pos_state(UUID, UUID) TO authenticated;

COMMIT;
