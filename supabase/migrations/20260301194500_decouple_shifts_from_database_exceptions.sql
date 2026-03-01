-- SHIFT DECOUPLING MIGRATION
-- AIM: Remove "Punishing Triggers" that throw 400 errors for missing shifts.
-- ACTION: Shift enforcement is now at the Application Layer (SharedProtectedRoute).
-- DB logic remains for auto-linking if a shift exists, but fails silently to avoid breaking UI.

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_active_shift() 
RETURNS TRIGGER AS $$
DECLARE
    _role text;
    _active_shift_id uuid;
BEGIN
    -- Use security definer function to avoid RLS loop
    _role := public.current_user_role();

    -- Only process for operations roles
    IF _role IN ('staff', 'cashier', 'storekeeper') THEN
        
        -- Locate active shift if exists (Silent discovery)
        SELECT id INTO _active_shift_id 
        FROM public.shifts 
        WHERE staff_id = auth.uid() 
        AND ends_at IS NULL
        ORDER BY start_time DESC 
        LIMIT 1;

        -- Auto-link shift_id if missing but discovered
        IF NEW.shift_id IS NULL AND _active_shift_id IS NOT NULL THEN
             NEW.shift_id := _active_shift_id;
        END IF;

        -- CRITICAL CHANGE: WE NO LONGER RAISE EXCEPTION HERE.
        -- If NEW.shift_id is still NULL, the transaction might be rejected by a NOT NULL constraint
        -- if that exists, but the logic will not "Scream" at the frontend.
        -- This allows "Ready Only" or "Emergency Bypass" if the DB column is nullable.
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Log to audit that hardening has moved to App Layer
INSERT INTO public.audit_logs (event_type, actor_id, resource_type, resource_id, new_value)
VALUES ('SYSTEM_UPDATE', '00000000-0000-0000-0000-000000000000', 'DATABASE_SCHEMA', '00000000-0000-0000-0000-000000000001', '{"change": "Shift enforcement moved to application layer via ShiftProtectedRoute", "exceptions": "removed"}');

COMMIT;
