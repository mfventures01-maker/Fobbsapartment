-- Enforce duplicate CEO prevention and Super Admin insert capabilities

BEGIN;

-- 1. Ensure RLS allows Super Admin to insert profiles
-- (Though Edge Functions use Service Role, this grants explicit client permission if ever needed)
DROP POLICY IF EXISTS "Super Admin can insert profiles" ON public.profiles;
CREATE POLICY "Super Admin can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
    public.current_user_role() = 'super_admin'
);

-- 2. Add backend validation: Prevent duplicate active CEO for the same business
-- Create a partial unique index allowing only ONE active CEO per business.
DROP INDEX IF EXISTS unique_active_ceo_per_business;
CREATE UNIQUE INDEX unique_active_ceo_per_business 
ON public.profiles (business_id) 
WHERE role = 'ceo' AND status = 'active';

COMMIT;
