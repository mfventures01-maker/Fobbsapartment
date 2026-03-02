-- PHASE D: TRANSACTION -> SHIFT LINKING AUDIT
-- AIM: Precise transaction traceability and department isolation.

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_shift_integrity_v2()
RETURNS TRIGGER AS $$
DECLARE
    v_shift RECORD;
    v_role TEXT;
BEGIN
    -- 1. Identify Actor Role
    v_role := public.current_user_role();

    -- 2. Skip enforcement for Super Admins / System processes if needed, 
    -- but for operational fraud control, we enforce for Staff and Managers.
    IF v_role NOT IN ('staff', 'cashier', 'manager') THEN
        RETURN NEW;
    END IF;

    -- 3. Discover or Validate Shift
    IF NEW.shift_id IS NULL THEN
        -- Auto-discovery for convenience (only for open shifts)
        SELECT * INTO v_shift 
        FROM public.shifts 
        WHERE staff_id = auth.uid() 
        AND status = 'open' 
        AND ends_at IS NULL
        ORDER BY start_time DESC 
        LIMIT 1;

        IF v_shift.id IS NOT NULL THEN
            NEW.shift_id := v_shift.id;
        ELSE
            RAISE EXCEPTION 'Phase D Integrity: No active shift found for this staff member. Clock in first.';
        END IF;
    ELSE
        -- Validate provided shift_id
        SELECT * INTO v_shift FROM public.shifts WHERE id = NEW.shift_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Phase D Integrity: Provided shift_id % does not exist.', NEW.shift_id;
        END IF;
    END IF;

    -- 4. High-Integrity Cross-Check (Same Staff, Business, Department)
    IF v_shift.staff_id <> auth.uid() THEN
        RAISE EXCEPTION 'Phase D Integrity: Shift ownership mismatch (Actor: %, Shift: %).', auth.uid(), v_shift.staff_id;
    END IF;

    IF v_shift.business_id <> NEW.business_id THEN
        RAISE EXCEPTION 'Phase D Integrity: Business mismatch (TX: %, Shift: %).', NEW.business_id, v_shift.business_id;
    END IF;

    -- Note: department_id in shifts is text, in transactions it might be UUID or text. 
    -- We assume they should match.
    IF v_shift.department_id <> NEW.department_id::text THEN
        RAISE EXCEPTION 'Phase D Integrity: Department mismatch (TX: %, Shift: %).', NEW.department_id, v_shift.department_id;
    END IF;

    IF v_shift.status <> 'open' THEN
        RAISE EXCEPTION 'Phase D Integrity: Shift % is no longer open (Status: %).', v_shift.id, v_shift.status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply the hardened trigger
DROP TRIGGER IF EXISTS trg_enforce_shift_integrity ON public.transactions;
CREATE TRIGGER trg_enforce_shift_integrity
BEFORE INSERT ON public.transactions
FOR EACH ROW EXECUTE PROCEDURE public.enforce_shift_integrity_v2();

COMMIT;
