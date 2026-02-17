-- FORENSIC HARDENING: Phase 1-9
-- Transform Fobbs CARSS into a leakage-resistant control system.

BEGIN;

--------------------------------------------------
-- 1. STRICT ROLE ENFORCEMENT & IMMUTABILITY
--------------------------------------------------

-- Prevent updates to critical fields on transactions
CREATE OR REPLACE FUNCTION public.prevent_transaction_updates()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.amount IS DISTINCT FROM NEW.amount THEN
        RAISE EXCEPTION 'Forensic Integrity: Transaction amount cannot be modified after creation.';
    END IF;
    IF OLD.department_id IS DISTINCT FROM NEW.department_id THEN
        RAISE EXCEPTION 'Forensic Integrity: Transaction department cannot be modified after creation.';
    END IF;
    IF OLD.business_id IS DISTINCT FROM NEW.business_id THEN
        RAISE EXCEPTION 'Forensic Integrity: Transaction business ownership cannot be changed.';
    END IF;
    IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
         RAISE EXCEPTION 'Forensic Integrity: Creation timestamp is immutable.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_transactions ON public.transactions;
CREATE TRIGGER trg_immutable_transactions
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE PROCEDURE public.prevent_transaction_updates();

-- Reinforce: No Deletes allowed for anyone, handled by RLS 'using (false)' usually, 
-- but let's add a database-level trigger to be absolutely sure even superusers (if bypassing RLS) get a warning (though triggers fire for superusers too usually).
CREATE OR REPLACE FUNCTION public.prevent_transaction_deletion()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Forensic Integrity: Transactions cannot be deleted. Use reversal instead.';
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_delete_transactions ON public.transactions;
CREATE TRIGGER trg_no_delete_transactions
BEFORE DELETE ON public.transactions
FOR EACH ROW EXECUTE PROCEDURE public.prevent_transaction_deletion();


--------------------------------------------------
-- 2. STATE MACHINE ENFORCEMENT
--------------------------------------------------

-- Enforce strict status transitions
-- We consolidate all possible statuses from the requirements
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS check_transaction_status;
ALTER TABLE public.transactions ADD CONSTRAINT check_transaction_status 
CHECK (status IN (
    'created', 
    'verified', 
    'reversed', 
    'disputed', 
    'pending_whatsapp', 
    'acknowledged', 
    'prepared', 
    'payment_pending', 
    'payment_verified', 
    'closed', 
    'cancelled'
));


--------------------------------------------------
-- 3. SHIFT ENFORCEMENT (ANTI-SKIMMING)
--------------------------------------------------

-- Add columns for shift reconciliation if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'physical_cash_total') THEN
        ALTER TABLE public.shifts ADD COLUMN physical_cash_total NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'pos_machine_total') THEN
        ALTER TABLE public.shifts ADD COLUMN pos_machine_total NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'transfer_total') THEN
        ALTER TABLE public.shifts ADD COLUMN transfer_total NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'variance') THEN
        ALTER TABLE public.shifts ADD COLUMN variance NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'manager_approval_id') THEN
        ALTER TABLE public.shifts ADD COLUMN manager_approval_id UUID REFERENCES auth.users(id);
    END IF;
END $$;


-- Ensure transaction is linked to an active shift
CREATE OR REPLACE FUNCTION public.enforce_active_shift()
RETURNS TRIGGER AS $$
DECLARE
    _role text;
BEGIN
    -- Get user role
    SELECT role INTO _role FROM public.profiles WHERE user_id = auth.uid();

    -- Strictly for staff/cashier roles
    IF _role IN ('staff', 'cashier') THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.shifts 
            WHERE staff_user_id = auth.uid() 
            AND ends_at IS NULL
        ) THEN
            RAISE EXCEPTION 'Forensic Control: No active shift found. You must clock in/open shift to create transactions.';
        END IF;

        -- Auto-link shift_id if null
        IF NEW.shift_id IS NULL THEN
             SELECT id INTO NEW.shift_id FROM public.shifts WHERE staff_user_id = auth.uid() AND ends_at IS NULL LIMIT 1;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_active_shift ON public.transactions;
CREATE TRIGGER trg_enforce_active_shift
BEFORE INSERT ON public.transactions
FOR EACH ROW EXECUTE PROCEDURE public.enforce_active_shift();


--------------------------------------------------
-- 4. PAYMENT FRAUD RESISTANCE
--------------------------------------------------

-- Enforce unique external reference for Transfers/POS externally verified
-- This prevents reusing the same bank receipt or POS ref
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transaction_external_ref_unique;
-- Only enforce uniqueness if external_reference is NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_external_ref 
ON public.transactions(business_id, external_reference) 
WHERE external_reference IS NOT NULL;


--------------------------------------------------
-- 5. AUDIT LOGGING (FORENSIC TRAIL)
--------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    actor_id UUID REFERENCES auth.users(id),
    role TEXT,
    resource_type TEXT NOT NULL,
    resource_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    branch_id UUID, 
    business_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS logic for Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- CEO can view audit logs for their business
DROP POLICY IF EXISTS "Audit: CEO View" ON public.audit_logs;
CREATE POLICY "Audit: CEO View" ON public.audit_logs FOR SELECT TO authenticated USING (
    (
        (SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('ceo', 'owner', 'super_admin')
        AND business_id = (SELECT business_id FROM public.profiles WHERE user_id = auth.uid())
    )
    OR
    (public.is_super_admin())
);

-- Global trigger for audit
CREATE OR REPLACE FUNCTION public.audit_log_changes()
RETURNS TRIGGER AS $$
DECLARE
    _actor_id UUID;
    _role TEXT;
    _business_id UUID;
BEGIN
    _actor_id := auth.uid();
    
    -- If triggered by system (no auth.uid), use null or internal system user
    IF _actor_id IS NULL THEN
        _role := 'system';
    ELSE
        SELECT role, business_id INTO _role, _business_id FROM public.profiles WHERE user_id = _actor_id;
    END IF;

    INSERT INTO public.audit_logs (
        event_type, actor_id, role, resource_type, resource_id, old_value, new_value, business_id
    ) VALUES (
        TG_OP, 
        _actor_id, 
        _role, 
        TG_TABLE_NAME, 
        COALESCE(NEW.id, OLD.id), 
        row_to_json(OLD), 
        row_to_json(NEW), 
        _business_id
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply Audit Trigger to critical tables
DROP TRIGGER IF EXISTS trg_audit_transactions ON public.transactions;
CREATE TRIGGER trg_audit_transactions AFTER INSERT OR UPDATE OR DELETE ON public.transactions FOR EACH ROW EXECUTE PROCEDURE public.audit_log_changes();

DROP TRIGGER IF EXISTS trg_audit_shifts ON public.shifts;
CREATE TRIGGER trg_audit_shifts AFTER INSERT OR UPDATE OR DELETE ON public.shifts FOR EACH ROW EXECUTE PROCEDURE public.audit_log_changes();

DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
-- Only audit updates on profiles (role changes etc)
CREATE TRIGGER trg_audit_profiles AFTER UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.audit_log_changes();


--------------------------------------------------
-- 6. DATA INTEGRITY HARDENING (INDEXES)
--------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_transactions_business_created ON public.transactions(business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_department ON public.transactions(department_id);
CREATE INDEX IF NOT EXISTS idx_shifts_staff ON public.shifts(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_id);


--------------------------------------------------
-- 7. ANALYTICS VIEWS (LEAKAGE DETECTION)
--------------------------------------------------

-- 1. High Variance Shifts (> 1000 NGN or configurable)
CREATE OR REPLACE VIEW public.view_high_variance_shifts AS
SELECT 
    s.id,
    s.staff_user_id,
    p.full_name as staff_name,
    s.started_at,
    s.ends_at,
    s.variance,
    s.manager_approval_id
FROM public.shifts s
JOIN public.profiles p ON s.staff_user_id = p.user_id
WHERE ABS(s.variance) > 1000;

-- 2. Frequent Reversals (Last 7 Days)
CREATE OR REPLACE VIEW public.view_frequent_reversals AS
SELECT 
    t.staff_id,
    p.full_name,
    COUNT(*) as reversal_count,
    SUM(t.amount) as total_reversed_value
FROM public.transactions t
JOIN public.profiles p ON t.staff_id = p.user_id
WHERE t.status = 'reversed'
AND t.created_at > NOW() - INTERVAL '7 days'
GROUP BY t.staff_id, p.full_name
ORDER BY reversal_count DESC;

COMMIT;
