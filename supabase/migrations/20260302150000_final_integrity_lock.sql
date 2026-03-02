-- FINAL INTEGRITY LOCK & SCHEMA COMPLETION
-- AIM: Finalize all missing columns and establish high-integrity constraints.

BEGIN;

-- 1. Ensure Manager Approval Column exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'manager_approval_id') THEN
        ALTER TABLE public.shifts ADD COLUMN manager_approval_id UUID REFERENCES public.profiles(id);
    END IF;
END $$;

-- 2. Performance Indexes for CEO View
CREATE INDEX IF NOT EXISTS idx_shifts_business_status ON public.shifts (business_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_shift_id ON public.transactions (shift_id);

-- 3. Audit for Shift Lifecycle Events
CREATE OR REPLACE FUNCTION audit_shift_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO public.audit_logs (
            event_type, 
            actor_id, 
            resource_type, 
            resource_id, 
            old_value, 
            new_value
        )
        VALUES (
            'SHIFT_STATUS_CHANGE', 
            auth.uid(), 
            'shifts', 
            NEW.id, 
            jsonb_build_object('status', OLD.status), 
            jsonb_build_object('status', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_shift_status_change ON public.shifts;
CREATE TRIGGER trg_audit_shift_status_change
AFTER UPDATE ON public.shifts
FOR EACH ROW EXECUTE PROCEDURE audit_shift_status_change();

COMMIT;
