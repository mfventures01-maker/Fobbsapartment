-- CARSS CORE STABLE V1.0 - Full Stack Synchronization
-- Objective: Deterministic State & Performance Optimization
-- Strategy: Externalized Authorization (business_memberships) to break RLS recursion.

BEGIN;

--------------------------------------------------
-- 1. AUTHORIZATION LAYER (business_memberships)
--------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, business_id)
);

-- Index for Phase 1.5
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.business_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_business_id ON public.business_memberships(business_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user_business ON public.business_memberships(user_id, business_id);

-- Backfill from profiles if they exist
DO $$
BEGIN
    INSERT INTO public.business_memberships (user_id, business_id, role)
    SELECT user_id, business_id, role 
    FROM public.profiles 
    WHERE user_id IS NOT NULL AND business_id IS NOT NULL
    ON CONFLICT (user_id, business_id) DO UPDATE SET role = EXCLUDED.role;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Backfill partially failed or already exists';
END $$;


--------------------------------------------------
-- 2. DETERMINISTIC RESOLVER FUNCTIONS
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_business_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _business_id uuid;
BEGIN
  SELECT business_id INTO _business_id 
  FROM public.business_memberships
  WHERE user_id = auth.uid()
  LIMIT 1;
  RETURN _business_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role text;
BEGIN
  SELECT role INTO _role 
  FROM public.business_memberships
  WHERE user_id = auth.uid()
  LIMIT 1;
  RETURN _role;
END;
$$;


--------------------------------------------------
-- 3. RECURSION-FREE RLS POLICIES (PHASE 1.2-1.3)
--------------------------------------------------

-- A. PROFILES (Now references memberships, no self-recursion)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles: Self Select" ON public.profiles;
CREATE POLICY "Profiles: Self Select" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Profiles: Manager/CEO View" ON public.profiles;
CREATE POLICY "Profiles: Manager/CEO View" ON public.profiles FOR SELECT TO authenticated USING (
    public.current_user_role() IN ('ceo', 'owner', 'manager', 'super_admin')
    AND business_id = public.current_business_id()
);

-- B. TRANSACTIONS (Phase 1.4)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Business: CEO View" ON public.transactions;
CREATE POLICY "Business: CEO View" ON public.transactions FOR SELECT TO authenticated USING (
    public.current_user_role() IN ('ceo', 'owner', 'super_admin') 
    AND business_id = public.current_business_id()
);

DROP POLICY IF EXISTS "Personal: Staff View" ON public.transactions;
CREATE POLICY "Personal: Staff View" ON public.transactions FOR SELECT TO authenticated USING (
    staff_id = auth.uid()
);

-- C. SHIFTS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Management view all shifts" ON public.shifts;
CREATE POLICY "Management view all shifts" ON public.shifts FOR SELECT TO authenticated USING (
    public.current_user_role() IN ('manager', 'ceo', 'owner', 'super_admin')
    AND business_id = public.current_business_id()
);

-- D. AUDIT LOGS (PHASE 5 LOCK)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit: CEO View" ON public.audit_logs;
CREATE POLICY "Audit: CEO View" ON public.audit_logs FOR SELECT TO authenticated USING (
    public.current_user_role() IN ('ceo', 'owner', 'super_admin')
    AND business_id = public.current_business_id()
);

-- Explicitly prevent any update/delete on audit_logs
DROP POLICY IF EXISTS "Audit: No Updates" ON public.audit_logs;
CREATE POLICY "Audit: No Updates" ON public.audit_logs FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "Audit: No Deletes" ON public.audit_logs;
CREATE POLICY "Audit: No Deletes" ON public.audit_logs FOR DELETE TO authenticated USING (false);


--------------------------------------------------
-- 4. PERFORMANCE INDEXES (PHASE 1.5)
--------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_transactions_business_created_desc ON public.transactions(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shifts_staff_status ON public.shifts(staff_id, status);

COMMIT;
