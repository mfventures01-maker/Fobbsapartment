-- CARSS PHASE 3: LOCATION ISOLATION & RLS MODERNIZATION
-- TARGET: Enforce strict branch_id isolation for all operational telemetry.
-- TARGET: Eliminate legacy 'profiles' table dependency in RLS.
-- TARGET: Implement Tasks location scoping.

BEGIN;

--------------------------------------------------
-- 1. HELPER EVOLUTION
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_branch_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _branch_id uuid;
BEGIN
  SELECT branch_id INTO _branch_id 
  FROM public.business_memberships
  WHERE user_id = auth.uid()
  LIMIT 1;
  RETURN _branch_id;
END;
$$;

--------------------------------------------------
-- 2. SCHEMA EVOLUTION: TASKS
--------------------------------------------------

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'branch_id') THEN
        ALTER TABLE public.tasks ADD COLUMN branch_id UUID REFERENCES public.branches(id);
        
        -- Backfill branch_id if possible (best effort from business_memberships of creator/actor or first branch)
        UPDATE public.tasks t
        SET branch_id = (SELECT branch_id FROM public.branches b WHERE b.business_id = t.org_id LIMIT 1)
        WHERE branch_id IS NULL;
    END IF;
END $$;

--------------------------------------------------
-- 3. RLS MODERNIZATION (ISOLATION LOCK)
--------------------------------------------------

-- A. ORDERS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Orders: Branch Isolation" ON public.orders;
CREATE POLICY "Orders: Branch Isolation" ON public.orders
    FOR SELECT TO authenticated
    USING (
        location_id = public.current_branch_id() 
        OR public.current_user_role() IN ('ceo', 'owner', 'super_admin')
    );

-- B. TRANSACTIONS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Transactions: Branch Isolation" ON public.transactions;
CREATE POLICY "Transactions: Branch Isolation" ON public.transactions
    FOR SELECT TO authenticated
    USING (
        branch_id = public.current_branch_id() 
        OR public.current_user_role() IN ('ceo', 'owner', 'super_admin')
    );

-- C. SHIFTS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Shifts: Branch Isolation" ON public.shifts;
CREATE POLICY "Shifts: Branch Isolation" ON public.shifts
    FOR SELECT TO authenticated
    USING (
        branch_id = public.current_branch_id() 
        OR public.current_user_role() IN ('ceo', 'owner', 'super_admin')
    );

-- D. INVENTORY
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Inventory: Branch Isolation" ON public.inventory;
CREATE POLICY "Inventory: Branch Isolation" ON public.inventory
    FOR SELECT TO authenticated
    USING (
        branch_id = public.current_branch_id() 
        OR public.current_user_role() IN ('ceo', 'owner', 'super_admin')
    );

-- E. PAYMENT INTENTS
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Intents: Branch Isolation" ON public.payment_intents;
CREATE POLICY "Intents: Branch Isolation" ON public.payment_intents
    FOR SELECT TO authenticated
    USING (
        branch_id = public.current_branch_id() 
        OR public.current_user_role() IN ('ceo', 'owner', 'super_admin')
    );

-- F. TASKS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tasks: Branch Isolation" ON public.tasks;
CREATE POLICY "Tasks: Branch Isolation" ON public.tasks
    FOR SELECT TO authenticated
    USING (
        branch_id = public.current_branch_id() 
        OR public.current_user_role() IN ('ceo', 'owner', 'super_admin')
    );

-- G. RECONCILIATIONS
ALTER TABLE public.shift_reconciliations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reconciliations: Branch Isolation" ON public.shift_reconciliations;
CREATE POLICY "Reconciliations: Branch Isolation" ON public.shift_reconciliations
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.shifts s 
            WHERE s.id = shift_id 
            AND (s.branch_id = public.current_branch_id() OR public.current_user_role() IN ('ceo', 'owner', 'super_admin'))
        )
    );

-- H. INVENTORY LOGS
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Logs: Branch Isolation" ON public.inventory_logs;
CREATE POLICY "Logs: Branch Isolation" ON public.inventory_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.inventory i 
            WHERE i.id = inventory_id 
            AND (i.branch_id = public.current_branch_id() OR public.current_user_role() IN ('ceo', 'owner', 'super_admin'))
        )
    );

--------------------------------------------------
-- 4. SERVICE REQUESTS ALIGNMENT
--------------------------------------------------

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Requests: Branch Isolation" ON public.service_requests;
CREATE POLICY "Requests: Branch Isolation" ON public.service_requests
    FOR SELECT TO authenticated
    USING (
        branch_id = public.current_branch_id() 
        OR public.current_user_role() IN ('ceo', 'owner', 'super_admin')
    );

COMMIT;
