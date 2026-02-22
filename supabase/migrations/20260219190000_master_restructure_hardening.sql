
-- Master Restructure: Auth & Role Hardening (Production Mode)
-- Targets: Profiles, Transactions, Shifts, and RLS Governance.

BEGIN;

--------------------------------------------------
-- 1. PROFILES INTEGRITY & SCHEMA LOCK
--------------------------------------------------

-- Ensure unique user_id mapping
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_unique') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
    END IF;
END $$;

-- Enforce full_name required for audit logs
ALTER TABLE public.profiles ALTER COLUMN full_name SET NOT NULL;

-- Standardize Role Enum (Production Set)
-- Roles: super_admin, ceo, manager, staff
DO $$ 
BEGIN
    -- Drop old loose constraint if it exists
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    
    -- Enforce canonical role hierarchy
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('super_admin', 'ceo', 'manager', 'staff'));
END $$;


--------------------------------------------------
-- 2. SHIFT ENFORCEMENT ON TRANSACTIONS
--------------------------------------------------

-- Requirement: Transactions MUST contain shift_id for financial closure.
-- Backfill: If any transactions are missing shift_id, they should be reconciled.
-- For production hardening, we enforce this constraint.
DO $$ 
BEGIN
    ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_shift_required;
    
    -- First, ensure shift_id is not null for existing data (backfill logic if needed)
    -- UPDATE public.transactions SET shift_id = ... WHERE shift_id IS NULL; -- Business logic dependent
    
    ALTER TABLE public.transactions ADD CONSTRAINT transactions_shift_required
    CHECK (shift_id IS NOT NULL);
END $$;


--------------------------------------------------
-- 3. RLS GOVERNANCE (HARDENED)
--------------------------------------------------

-- A. PROFILES TABLE
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles: Atomic Owner Access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Atomic Owner Update" ON public.profiles;
DROP POLICY IF EXISTS "Self access" ON public.profiles;
DROP POLICY IF EXISTS "CEO: Business View" ON public.profiles;

-- Canonical: Users see themselves
CREATE POLICY "Self access"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Canonical: CEO sees people in their business
CREATE POLICY "CEO: Business View"
ON public.profiles FOR SELECT
TO authenticated
USING (
    (business_id = (SELECT business_id FROM public.profiles WHERE user_id = auth.uid()) 
     AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('ceo', 'manager')))
    OR (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'super_admin'
);


-- B. TRANSACTIONS TABLE
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Global: Super Admin View" ON public.transactions;
DROP POLICY IF EXISTS "Business: CEO View" ON public.transactions;
DROP POLICY IF EXISTS "Department: Manager View" ON public.transactions;
DROP POLICY IF EXISTS "Personal: Staff View" ON public.transactions;
DROP POLICY IF EXISTS "Personal: Staff Insert" ON public.transactions;
DROP POLICY IF EXISTS "Management: Insert" ON public.transactions;
DROP POLICY IF EXISTS "Control: Update Transactions" ON public.transactions;
DROP POLICY IF EXISTS "Transactions: Zero Deletes" ON public.transactions;

-- Super Admin: Platform View (Cross-Business)
CREATE POLICY "Super Admin Full Access"
ON public.transactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- CEO: One Business Scope
CREATE POLICY "CEO Business Scope"
ON public.transactions FOR SELECT
TO authenticated
USING (
  business_id = (
    SELECT business_id FROM public.profiles
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'ceo'
  )
);

-- Manager: Departmental Scope
CREATE POLICY "Manager Department Scope"
ON public.transactions FOR SELECT
TO authenticated
USING (
  business_id = (SELECT business_id FROM public.profiles WHERE user_id = auth.uid())
  AND department_id = (SELECT department FROM public.profiles WHERE user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'manager'
  )
);

-- Staff: Own Activity + Active Shift
CREATE POLICY "Staff Activity Scope"
ON public.transactions FOR SELECT
TO authenticated
USING (
  staff_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'staff'
  )
);

-- DML Policies
CREATE POLICY "Staff Create"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (
    staff_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.shifts
        WHERE staff_id = auth.uid()
        AND ends_at IS NULL
    )
);

CREATE POLICY "Management Update"
ON public.transactions FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid()
        AND role IN ('ceo', 'manager', 'super_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid()
        AND role IN ('ceo', 'manager', 'super_admin')
    )
);

-- Zero Deletes Enforcement
CREATE POLICY "No Deletes"
ON public.transactions FOR DELETE
TO public
USING ( false );


--------------------------------------------------
-- 4. BUSINESS AGGREGATION FOR SUPER ADMIN
--------------------------------------------------

-- Ensure businesses table is RLS-enabled and viewable globally by super_admin
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own business" ON public.businesses;
DROP POLICY IF EXISTS "Read businesses" ON public.businesses;

CREATE POLICY "Super Admin Business View"
ON public.businesses FOR SELECT
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'super_admin')
    OR id = (SELECT business_id FROM public.profiles WHERE user_id = auth.uid())
);

COMMIT;
