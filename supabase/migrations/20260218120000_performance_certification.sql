-- CARSS Backend Performance Certification & Unified Shield
-- Applies optimizations from AG PROMPT: CARSS Backend Performance Audit
-- Resolves column drift and adds missing indexes.

BEGIN;

--------------------------------------------------
-- 1. COLUMN DRIFT RESOLUTION (SHIFTS)
--------------------------------------------------

-- Ensure shifts table uses the expected column names and types
-- We consolidate on: staff_id, business_id, start_time, end_time, status
DO $$ 
BEGIN
    -- Rename staff_user_id to staff_id if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'staff_user_id') THEN
        ALTER TABLE public.shifts RENAME COLUMN staff_user_id TO staff_id;
    END IF;

    -- Rename started_at/starts_at to start_time if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'started_at') THEN
        ALTER TABLE public.shifts RENAME COLUMN started_at TO start_time;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'starts_at') THEN
        ALTER TABLE public.shifts RENAME COLUMN starts_at TO start_time;
    END IF;

    -- Rename ends_at to end_time if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'ends_at') THEN
        ALTER TABLE public.shifts RENAME COLUMN ends_at TO end_time;
    END IF;
END $$;


--------------------------------------------------
-- 2. INDEX OPTIMIZATION (PHASE 2 & 5)
--------------------------------------------------

-- Transactions: Business Scope + Recency (Scale optimized)
CREATE INDEX IF NOT EXISTS idx_transactions_business_created_desc 
ON public.transactions(business_id, created_at DESC);

-- Shifts: Membership lookup + Status tracking
CREATE INDEX IF NOT EXISTS idx_shifts_business_id ON public.shifts(business_id);
CREATE INDEX IF NOT EXISTS idx_shifts_staff_status ON public.shifts(staff_id, status);

-- Audit Logs: Traceability
-- Note: Using business_id to match the table's actual column
CREATE INDEX IF NOT EXISTS idx_audit_logs_business_id ON public.audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON public.audit_logs(resource_id);

-- Orders & Payment Intents: Business Scope (Note: uses org_id in our schema)
CREATE INDEX IF NOT EXISTS idx_orders_org_id ON public.orders(org_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_org_id ON public.payment_intents(org_id);

-- Profiles (Memberships): Auth lookup
CREATE INDEX IF NOT EXISTS idx_profiles_user_business ON public.profiles(user_id, business_id);


--------------------------------------------------
-- 3. FUNCTION COST OPTIMIZATION (PHASE 3)
--------------------------------------------------

-- Ensure the helper functions for RLS are highly efficient
-- We use SECURITY DEFINER and specifically target the indexed user_id column

CREATE OR REPLACE FUNCTION public.current_business_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _business_id uuid;
BEGIN
  -- Targeted index scan on profiles(user_id)
  SELECT business_id INTO _business_id 
  FROM public.profiles
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
  -- Targeted index scan on profiles(user_id)
  SELECT role INTO _role 
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
  RETURN _role;
END;
$$;


--------------------------------------------------
-- 4. TRIGGER PERFORMANCE HARDENING (PHASE 6)
--------------------------------------------------

-- Ensure shift enforcement uses the new index and correct columns
CREATE OR REPLACE FUNCTION public.enforce_active_shift()
RETURNS TRIGGER AS $$
DECLARE
    _role text;
BEGIN
    -- Check cached role to avoid extra queries if possible (simplified for now)
    _role := public.current_user_role();

    -- Strictly for staff/cashier roles
    IF _role IN ('staff', 'cashier', 'storekeeper') THEN
        -- Uses idx_shifts_staff_status (Index Scan)
        IF NOT EXISTS (
            SELECT 1 FROM public.shifts 
            WHERE staff_id = auth.uid() 
            AND status = 'open'
        ) THEN
            RAISE EXCEPTION 'Forensic Control: No active shift found. You must clock in/open shift to create transactions.';
        END IF;

        -- Auto-link shift_id if null
        IF NEW.shift_id IS NULL THEN
             SELECT id INTO NEW.shift_id 
             FROM public.shifts 
             WHERE staff_id = auth.uid() 
             AND status = 'open' 
             ORDER BY start_time DESC 
             LIMIT 1;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


--------------------------------------------------
-- 5. RLS RECURSION PROBING (PHASE 4 SAFETY)
--------------------------------------------------

-- The following ensures RLS filters on critical tables use the optimized functions
-- which break circular dependencies.

DROP POLICY IF EXISTS "Business: CEO View" ON public.transactions;
CREATE POLICY "Business: CEO View"
ON public.transactions FOR SELECT
TO authenticated
USING ( 
    public.current_user_role() IN ('ceo', 'owner', 'super_admin') 
    AND business_id = public.current_business_id() 
);

-- Apply similar logic to other critical tables if missing
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Management view all intents" ON public.payment_intents;
CREATE POLICY "Management view all intents" 
ON public.payment_intents FOR SELECT 
TO authenticated 
USING (
    public.current_user_role() IN ('manager', 'ceo', 'owner', 'super_admin')
    AND business_id = public.current_business_id()
);

COMMIT;
