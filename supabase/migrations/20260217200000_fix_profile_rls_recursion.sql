-- FIX INFINITE RECURSION IN PROFILES RLS
-- The policy "Profiles: CEO View Business Staff" introduced in 20260216083500_rls_fix_blank_dashboard.sql
-- causes infinite recursion because it queries public.profiles within its own USING clause.
-- We drop it and rely on the safer "CEO/Manager can view profiles in same business" 
-- or a corrected version using security definer functions.

BEGIN;

-- 1. Drop the recursive policy
DROP POLICY IF EXISTS "Profiles: CEO View Business Staff" ON public.profiles;

-- 2. Re-assert the safe policy (using security definer functions to break recursion)
-- These functions (current_user_role, current_business_id) bypass RLS checks.
DROP POLICY IF EXISTS "CEO/Manager can view profiles in same business" ON public.profiles;
CREATE POLICY "Profiles: Manager/CEO View"
ON public.profiles FOR SELECT
TO authenticated
USING (
    (public.current_user_role() IN ('ceo', 'owner', 'manager', 'super_admin'))
    AND 
    (profiles.business_id = public.current_business_id())
);

-- 3. Fix audit_logs policy recursion
DROP POLICY IF EXISTS "Audit: CEO View" ON public.audit_logs;
CREATE POLICY "Audit: CEO View" ON public.audit_logs FOR SELECT TO authenticated USING (
    (
        public.current_user_role() IN ('ceo', 'owner', 'super_admin')
        AND business_id = public.current_business_id()
    )
    OR
    (public.is_super_admin())
);

-- 4. Fix enforce_active_shift function recursion and column drift
CREATE OR REPLACE FUNCTION public.enforce_active_shift()
RETURNS TRIGGER AS $$
DECLARE
    _role text;
BEGIN
    -- Use security definer function to avoid RLS loop
    _role := public.current_user_role();

    -- Strictly for staff/cashier roles
    IF _role IN ('staff', 'cashier', 'storekeeper') THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.shifts 
            WHERE staff_id = auth.uid() 
            AND status = 'open'
        ) THEN
            RAISE EXCEPTION 'Forensic Control: No active shift found. You must clock in/open shift to create transactions.';
        END IF;

        -- Auto-link shift_id if null
        IF NEW.shift_id IS NULL THEN
             SELECT id INTO NEW.shift_id FROM public.shifts 
             WHERE staff_id = auth.uid() AND status = 'open' 
             ORDER BY start_time DESC LIMIT 1;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fix Management policies on other tables to avoid EXISTS recursion
DROP POLICY IF EXISTS "Management view all intents" ON public.payment_intents;
CREATE POLICY "Management view all intents" ON public.payment_intents FOR SELECT TO authenticated USING (
    public.current_user_role() IN ('manager', 'ceo', 'owner', 'super_admin')
    AND business_id = public.current_business_id()
);

DROP POLICY IF EXISTS "Management view all shifts" ON public.shifts;
CREATE POLICY "Management view all shifts" ON public.shifts FOR SELECT TO authenticated USING (
    public.current_user_role() IN ('manager', 'ceo', 'owner', 'super_admin')
    AND business_id = public.current_business_id()
);

COMMIT;
