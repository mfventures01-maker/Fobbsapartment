-- CARSS Phase 1: Role System Hard Lock & Schema Compliance
-- Enforcing strict hierarchy, visibility rules, and traceability requirements.

-- 0. SCHEMA COMPLIANCE (Traceability Fields)
-- Requirement: Transactions MUST contain shift_id, payment_intent_id, external_reference.
DO $$
BEGIN
    -- Add shift_id linked to shifts table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'shift_id') THEN
        ALTER TABLE public.transactions ADD COLUMN shift_id UUID REFERENCES public.shifts(id);
    END IF;

    -- Add payment_intent_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'payment_intent_id') THEN
        ALTER TABLE public.transactions ADD COLUMN payment_intent_id TEXT;
    END IF;

    -- Add external_reference
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'external_reference') THEN
        ALTER TABLE public.transactions ADD COLUMN external_reference TEXT;
    END IF;
END $$;


-- 1. Helper Function: Get Current User Department
-- Required for Manager-level scoping (only transactions in their department)
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

-- 2. Drop Existing Loose Policies on Transactions to Prevent Leaks
DROP POLICY IF EXISTS "Users can view transactions in their business" ON public.transactions;
DROP POLICY IF EXISTS "Staff can create transactions" ON public.transactions;
DROP POLICY IF EXISTS "Only CEO and Managers can update status" ON public.transactions;
DROP POLICY IF EXISTS "Transactions: Verification and Reversal Control" ON public.transactions;
DROP POLICY IF EXISTS "SuperAdmin: Global View" ON public.transactions;
DROP POLICY IF EXISTS "Global: Super Admin View" ON public.transactions;
DROP POLICY IF EXISTS "Business: CEO View" ON public.transactions;
DROP POLICY IF EXISTS "Department: Manager View" ON public.transactions;
DROP POLICY IF EXISTS "Personal: Staff View" ON public.transactions;
DROP POLICY IF EXISTS "Personal: Staff Insert" ON public.transactions;
DROP POLICY IF EXISTS "Management: Insert" ON public.transactions;
DROP POLICY IF EXISTS "Control: Update Transactions" ON public.transactions;

-- 3. Implement Strict Role-Based Access Control (RBAC) Policies

-- A. VIEW Policies (SELECT)

-- Super Admin: Global View (All Businesses)
CREATE POLICY "Global: Super Admin View"
ON public.transactions FOR SELECT
TO authenticated
USING ( public.is_super_admin() );

-- CEO/Owner: View All Transactions in Business
CREATE POLICY "Business: CEO View"
ON public.transactions FOR SELECT
TO authenticated
USING ( 
    public.current_user_role() IN ('ceo', 'owner') 
    AND business_id = public.current_business_id() 
);

-- Manager: View Only Department Transactions in Business
CREATE POLICY "Department: Manager View"
ON public.transactions FOR SELECT
TO authenticated
USING ( 
    public.current_user_role() = 'manager' 
    AND business_id = public.current_business_id()
    AND department_id = public.current_user_department() 
);

-- Staff: View Only Own Transactions (created_by self)
CREATE POLICY "Personal: Staff View"
ON public.transactions FOR SELECT
TO authenticated
USING ( 
    public.current_user_role() = 'staff' 
    AND staff_id = auth.uid() 
);


-- B. INSERT Policies

-- Staff: Can insert own transactions linked to self and business
CREATE POLICY "Personal: Staff Insert"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (
    public.current_user_role() = 'staff'
    AND staff_id = auth.uid()
    AND business_id = public.current_business_id()
    -- Shift enforcement will be handled by Trigger in Phase 2, but column is now present.
);

-- Manager/CEO: Can insert transactions for their scope
CREATE POLICY "Management: Insert"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (
    business_id = public.current_business_id()
    AND (
        public.current_user_role() IN ('ceo', 'owner')
        OR (public.current_user_role() = 'manager' AND department_id = public.current_user_department())
    )
);


-- C. UPDATE Policies (Status Changes / Verification)

-- Strict Control on Updates
-- Managers confined to Department. CEO confined to Business.
CREATE POLICY "Control: Update Transactions"
ON public.transactions FOR UPDATE
TO authenticated
USING (
    public.is_super_admin()
    OR (
        business_id = public.current_business_id()
        AND (
            public.current_user_role() IN ('ceo', 'owner')
            OR (public.current_user_role() = 'manager' AND department_id = public.current_user_department())
        )
    )
)
WITH CHECK (
    public.is_super_admin()
    OR (
        business_id = public.current_business_id()
        AND (
            -- CEO can Verify, Reverse, Dispute
            (public.current_user_role() IN ('ceo', 'owner') AND status IN ('verified', 'reversed', 'disputed'))
            OR 
            -- Manager can Verify, Dispute (within department)
            (public.current_user_role() = 'manager' 
             AND department_id = public.current_user_department() 
             AND status IN ('verified', 'disputed'))
        )
    )
);

-- 4. Enforce NO DELETES (Double Check)
DROP POLICY IF EXISTS "Transactions: Zero Deletes" ON public.transactions;
CREATE POLICY "Transactions: Zero Deletes"
ON public.transactions FOR DELETE
TO public
USING ( false );
