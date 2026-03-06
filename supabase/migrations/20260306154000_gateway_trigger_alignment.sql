-- CARSS SECURITY GATE ALIGNMENT: UNIVERSAL GATEWAY
-- AIM: Allow Guest/QR orders to bypass the open shift guard, while keeping it strict for Staff/Waiter orders.

BEGIN;

-- 1. Update check_active_shift_guard to recognize Gateway Source
CREATE OR REPLACE FUNCTION public.check_active_shift_guard()
RETURNS TRIGGER AS $$
DECLARE
    v_shift RECORD;
    v_source TEXT;
BEGIN
    -- Extract gateway source from metadata
    v_source := NEW.metadata->>'gateway_source';

    -- GATEWAY BYPASS: If order is from QR Menu or Web, it does NOT require an active shift yet.
    -- The shift link happens later during Staff Verification / Settlement.
    IF TG_TABLE_NAME = 'orders' AND v_source IN ('qr_menu', 'web', 'whatsapp', 'room_service') THEN
        RETURN NEW;
    END IF;

    -- For all other cases (Waiter Terminal, Manual POS), an active shift is MANDATORY.
    SELECT * INTO v_shift 
    FROM public.shifts 
    WHERE staff_id = auth.uid() 
    AND status = 'open' 
    AND ends_at IS NULL
    LIMIT 1;

    IF NOT FOUND THEN
        -- If this is an order from a non-gateway source (or waiter) and no shift found, block it.
        RAISE EXCEPTION 'CARSS SECURITY GATE: No active shift found. You must clock in as Staff or Manager before performing this action.';
    END IF;

    -- Auto-link shift_id if missing (for Transactions)
    IF TG_TABLE_NAME = 'transactions' AND NEW.shift_id IS NULL THEN
        NEW.shift_id := v_shift.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
