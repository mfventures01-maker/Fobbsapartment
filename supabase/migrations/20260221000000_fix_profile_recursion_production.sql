-- FIX INFINITE RECURSION IN PROFILES RLS (Production Hotfix)
-- The "CEO: Business View" policy in 20260219190000_master_restructure_hardening.sql
-- re-introduced infinite recursion on public.profiles.

BEGIN;

-- Drop the recursive policy from 20260219190000
DROP POLICY IF EXISTS "CEO: Business View" ON public.profiles;

-- Re-assert the safer non-recursive policy using security definer functions OR non-recursive JWT claims
CREATE POLICY "CEO: Business View"
ON public.profiles FOR SELECT
TO authenticated
USING (
    -- If using current_user_role() and current_business_id() functions which bypass RLS
    (
        public.current_user_role() IN ('ceo', 'manager') 
        AND business_id = public.current_business_id()
    )
    OR 
    (public.current_user_role() = 'super_admin')
    OR
    (public.is_super_admin())
);

COMMIT;
