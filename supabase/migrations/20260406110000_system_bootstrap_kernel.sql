-- 🛸 ANTI-GRAVITY: SYSTEM BOOTSTRAP KERNEL (LAYER 0) — ULTIMATE OMNISCIENCE
-- Purpose: Resolve the ENTIRE terminal reality (Context, Metrics, Bar, Bookings) in a single slice.
-- Law: One Awakening. Zero secondary RPCs. Minimal Latency. Absolute Determinism.

BEGIN;

CREATE OR REPLACE FUNCTION public.system_bootstrap(
    p_staff_id UUID DEFAULT NULL,
    p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_staff_data RECORD;
    v_branch_data RECORD;
    v_shift_data RECORD;
    v_pos_metrics RECORD;
    v_qr_menu JSONB;
    v_bar_items JSONB;
    v_room_bookings JSONB;
    v_version_clock BIGINT;
    v_result JSONB;
BEGIN
    -- 1. 🧬 RESOLVE IDENTITY & CONTEXT
    IF p_staff_id IS NULL THEN
        SELECT id, branch_id, org_id INTO v_staff_data FROM public.staff WHERE user_id = auth.uid() LIMIT 1;
    ELSE
        SELECT id, branch_id, org_id INTO v_staff_data FROM public.staff WHERE id = p_staff_id;
    END IF;

    IF v_staff_data IS NULL THEN
        RAISE EXCEPTION 'Identity Resolution Failed — Staff context not found.';
    END IF;

    -- 2. 📍 RESOLVE BRANCH & BUSINESS
    SELECT b.id, b.name, b.business_id, biz.name as business_name 
    INTO v_branch_data 
    FROM public.branches b
    JOIN public.businesses biz ON b.business_id = biz.id
    WHERE b.id = COALESCE(p_branch_id, v_staff_data.branch_id);

    -- 3. ⚖️ RESOLVE ACTIVE SHIFT (Execution Context)
    SELECT id, status, version 
    INTO v_shift_data 
    FROM public.shifts 
    WHERE staff_id = v_staff_data.id 
      AND branch_id = v_branch_data.id 
      AND status = 'open' 
    LIMIT 1;

    -- 4. 📦 RESOLVE DOMAIN SLICES (QR, BAR, ROOMS)
    -- QR Menu
    SELECT jsonb_agg(m.*) INTO v_qr_menu 
    FROM public.menu_items m 
    WHERE m.location_id = v_branch_data.id AND m.is_available = true;

    -- Bar Items
    SELECT jsonb_agg(b.*) INTO v_bar_items
    FROM public.bar_inventory b
    WHERE b.branch_id = v_branch_data.id;

    -- Room Bookings (Active tomorrow/today)
    SELECT jsonb_agg(r.*) INTO v_room_bookings
    FROM public.room_bookings r
    WHERE r.branch_id = v_branch_data.id AND r.status IN ('confirmed', 'checked_in');

    -- 5. 💰 RESOLVE POS METRICS
    SELECT 
        COALESCE(SUM(total), 0) as today_revenue,
        COUNT(*) filter (where status = 'pending' OR status = 'confirmed') as open_orders
    INTO v_pos_metrics
    FROM public.orders
    WHERE location_id = v_branch_data.id 
      AND created_at >= CURRENT_DATE;

    -- 6. 🕒 🧩 DETERMINISTIC VERSION CLOCK
    SELECT COALESCE(MAX(event_id), 0) INTO v_version_clock
    FROM public.operational_events
    WHERE branch_id = v_branch_data.id;
    
    IF v_version_clock = 0 AND v_shift_data.version IS NOT NULL THEN
        v_version_clock := v_shift_data.version;
    END IF;

    -- 7. 🛰️ ASSEMBLE ULTIMATE SNAPSHOT
    v_result := jsonb_build_object(
        'status', 'alive',
        'identity', jsonb_build_object(
            'staff_id', v_staff_data.id,
            'user_id', auth.uid(),
            'branch_id', v_branch_data.id,
            'business_id', v_branch_data.business_id
        ),
        'context', jsonb_build_object(
            'branch_name', v_branch_data.name,
            'business_name', v_branch_data.business_name
        ),
        'execution_context', CASE 
            WHEN v_shift_data.id IS NOT NULL THEN jsonb_build_object(
                'shift_id', v_shift_data.id,
                'status', v_shift_data.status,
                'version', v_shift_data.version
            )
            ELSE NULL 
        END,
        'pos', jsonb_build_object(
            'today_revenue', v_pos_metrics.today_revenue,
            'open_orders', v_pos_metrics.open_orders
        ),
        'slices', jsonb_build_object(
            'qr_menu', COALESCE(v_qr_menu, '[]'::jsonb),
            'bar_items', COALESCE(v_bar_items, '[]'::jsonb),
            'room_bookings', COALESCE(v_room_bookings, '[]'::jsonb)
        ),
        'version', v_version_clock
    );

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.system_bootstrap(UUID, UUID) TO authenticated;

COMMIT;
