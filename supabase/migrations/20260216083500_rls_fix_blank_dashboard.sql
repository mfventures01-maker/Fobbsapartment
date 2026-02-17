-- CARSS RLS Fix: Blank Dashboard Resolution
-- Correcting Access Control for Profiles, Branches, and Transactions.

-- 1. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- 2. Profiles: Self Select
-- Critical for AuthContext hydration
DROP POLICY IF EXISTS "Profiles: Self Select" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Profiles: Self Select"
ON public.profiles FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);

-- 3. Profiles: CEO View Business Staff
-- Allows Management to start up and view team
DROP POLICY IF EXISTS "Profiles: CEO View Business Staff" ON public.profiles;
CREATE POLICY "Profiles: CEO View Business Staff"
ON public.profiles FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles viewer
        WHERE viewer.user_id = auth.uid()
        AND viewer.business_id = profiles.business_id
        AND viewer.role IN ('ceo', 'owner', 'manager', 'super_admin')
        AND viewer.is_active = true
    )
);

-- 4. Branches: Tenant View
-- Required for Dashboard Performance Calculations
DROP POLICY IF EXISTS "Branches: Tenant View" ON public.branches;
DROP POLICY IF EXISTS "Tenant access branches" ON public.branches;
CREATE POLICY "Branches: Tenant View"
ON public.branches FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles viewer
        WHERE viewer.user_id = auth.uid()
        AND viewer.business_id = branches.business_id
        AND viewer.is_active = true
    )
    OR 
    EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin'
    )
);

-- 5. Helper Functions (Security Definer)
-- Bypasses RLS loop
CREATE OR REPLACE FUNCTION public.current_business_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _business_id uuid;
BEGIN
  SELECT business_id INTO _business_id FROM public.profiles
  WHERE user_id = auth.uid();
  RETURN _business_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_department()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _department text;
BEGIN
  SELECT department INTO _department FROM public.profiles
  WHERE user_id = auth.uid();
  RETURN _department;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _role text;
BEGIN
  SELECT role INTO _role FROM public.profiles
  WHERE user_id = auth.uid();
  RETURN _role;
END;
$$;

-- 6. Re-Assert Transaction Policies (Phase 1 Hardening)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business: CEO View" ON public.transactions;
CREATE POLICY "Business: CEO View"
ON public.transactions FOR SELECT
TO authenticated
USING ( 
    public.current_user_role() IN ('ceo', 'owner') 
    AND business_id = public.current_business_id() 
);

DROP POLICY IF EXISTS "Department: Manager View" ON public.transactions;
CREATE POLICY "Department: Manager View"
ON public.transactions FOR SELECT
TO authenticated
USING ( 
    public.current_user_role() = 'manager' 
    AND business_id = public.current_business_id()
    AND department_id = public.current_user_department() 
);

DROP POLICY IF EXISTS "Personal: Staff View" ON public.transactions;
CREATE POLICY "Personal: Staff View"
ON public.transactions FOR SELECT
TO authenticated
USING ( 
    public.current_user_role() = 'staff' 
    AND staff_id = auth.uid() 
);

DROP POLICY IF EXISTS "Global: Super Admin View" ON public.transactions;
CREATE POLICY "Global: Super Admin View"
ON public.transactions FOR SELECT
TO authenticated
USING ( public.is_super_admin() );
