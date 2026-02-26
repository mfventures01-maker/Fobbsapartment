BEGIN;

-- Explicitly ensure current_user_role function handles the profiles alias strictly
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role text;
BEGIN
  SELECT p.role INTO _role 
  FROM public.business_memberships p
  WHERE p.user_id = auth.uid()
  LIMIT 1;
  RETURN _role;
END;
$$;

-- Drop ANY potentially problematic policies
DROP POLICY IF EXISTS "Super Admin Business View" ON public.businesses;
DROP POLICY IF EXISTS "Users view own business" ON public.businesses;
DROP POLICY IF EXISTS "Read businesses" ON public.businesses;

-- Create an alias-perfect, explicit policy for business selects
CREATE POLICY "Super Admin Business View"
ON public.businesses FOR SELECT
TO authenticated
USING (
   (SELECT p.role FROM public.business_memberships p WHERE p.user_id = auth.uid() LIMIT 1) = 'super_admin'
   OR 
   id = (SELECT p.business_id FROM public.business_memberships p WHERE p.user_id = auth.uid() LIMIT 1)
);

COMMIT;
