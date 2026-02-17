
-- AIR-TIGHT FINTECH RLS & INTEGRITY HARDENING
-- LENS: 2026 Nigerian Fintech (Zero Trust, Fraud-Proof)

-- 1. CLEANUP OLD POLICIES (To avoid conflicts)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "Only CEO and Managers can update status" ON public.transactions;

-- 2. HARDENED PROFILES RLS (Phase 1 Protection)
-- Prevents self-promotion and unauthorized role management

-- Policy for SELF-UPDATE: Can update anything EXCEPT role
CREATE POLICY "Profiles: Users can update own profile except role"
ON public.profiles FOR UPDATE
TO authenticated
USING ( auth.uid() = user_id )
WITH CHECK ( 
    auth.uid() = user_id 
    AND (
        (role = (SELECT role FROM public.profiles WHERE user_id = auth.uid())) 
        OR public.is_super_admin()
    )
);

-- Policy for CEO: Can manage staff and managers in their business
CREATE POLICY "Profiles: CEO can manage business roles"
ON public.profiles FOR ALL
TO authenticated
USING (
    business_id = public.current_business_id()
    AND (public.current_user_role() IN ('ceo', 'owner') OR public.is_super_admin())
)
WITH CHECK (
    business_id = public.current_business_id()
    AND (public.current_user_role() IN ('ceo', 'owner') OR public.is_super_admin())
);

-- 3. HARDENED TRANSACTION STATUS CONTROL (Phase 5 Protection)
-- Reversal is a CEO-level power. Managers can only verify.

CREATE POLICY "Transactions: Verification and Reversal Control"
ON public.transactions FOR UPDATE
TO authenticated
USING ( 
    business_id = public.current_business_id() 
    AND (
        (public.current_user_role() IN ('ceo', 'owner', 'manager') AND NEW.status = 'verified')
        OR (public.current_user_role() IN ('ceo', 'owner') AND NEW.status = 'reversed')
        OR public.current_user_role() IN ('ceo', 'owner', 'manager') AND NEW.status = 'disputed'
        OR public.is_super_admin()
    )
);

-- 4. SHIFT INTEGRITY ENFORCEMENT (Phase 8)
-- Prevents duplicate active shifts and unauthorized edits

CREATE OR REPLACE FUNCTION public.check_active_shift()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF EXISTS (
            SELECT 1 FROM public.shifts 
            WHERE staff_user_id = NEW.staff_user_id 
            AND ends_at IS NULL
        ) THEN
            RAISE EXCEPTION 'A shift is already active for this staff member.';
        END IF;
    END IF;
    
    IF (TG_OP = 'UPDATE') THEN
        -- Prevent staff from manual edits of past shifts
        IF (public.current_user_role() = 'staff' AND OLD.ends_at IS NOT NULL) THEN
            RAISE EXCEPTION 'Completed shifts cannot be modified by staff.';
        END IF;
        -- Prevent staff from changing start time
        IF (public.current_user_role() = 'staff' AND OLD.starts_at <> NEW.starts_at) THEN
            RAISE EXCEPTION 'Shift start time is immutable for staff.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_shift_integrity ON public.shifts;
CREATE TRIGGER tr_shift_integrity
BEFORE INSERT OR UPDATE ON public.shifts
FOR EACH ROW EXECUTE FUNCTION public.check_active_shift();

-- 5. ZERO-DELETE ENFORCEMENT (Phase 4 Extension)
-- Just in case someone tries to bypass the trigger manually (unlikely but belt-and-suspenders)
CREATE POLICY "Transactions: Zero Deletes"
ON public.transactions FOR DELETE
TO public
USING ( false );

-- 6. SUPER ADMIN CROSS-BUSINESS ACCESS (Phase 9)
-- Ensuring Super Admin can see EVERYTHING across business boundaries

CREATE POLICY "SuperAdmin: Global View"
ON public.transactions FOR SELECT
TO authenticated
USING ( public.is_super_admin() OR business_id = public.current_business_id() );

-- 7. DATA TAMPERING PROTECTION (Phase 11)
-- Ensure amount is strictly positive and metadata is valid JSON
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS chk_valid_amount;
ALTER TABLE public.transactions ADD CONSTRAINT chk_valid_amount CHECK (amount > 0);

-- Ensure transaction_id in logs matches transaction
CREATE OR REPLACE FUNCTION public.validate_log_integrity()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.transactions WHERE id = NEW.transaction_id) THEN
        RAISE EXCEPTION 'Orphan log detection: Transaction ID does not exist.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_log_integrity ON public.transaction_logs;
CREATE TRIGGER tr_log_integrity
BEFORE INSERT ON public.transaction_logs
FOR EACH ROW EXECUTE FUNCTION public.validate_log_integrity();

-- 8. SHIFT RLS HARDENING
DROP POLICY IF EXISTS "shifts_select_member" ON public.shifts;
DROP POLICY IF EXISTS "shifts_write_admin" ON public.shifts;

CREATE POLICY "Shifts: Staff can manage own active shift"
ON public.shifts FOR ALL
TO authenticated
USING ( 
    staff_user_id = auth.uid() 
    OR public.current_user_role() IN ('manager', 'ceo', 'owner')
    OR public.is_super_admin()
)
WITH CHECK (
    staff_user_id = auth.uid()
    OR public.current_user_role() IN ('manager', 'ceo', 'owner')
    OR public.is_super_admin()
);
