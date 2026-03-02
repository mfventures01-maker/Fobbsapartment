-- PHASE A: SHIFT LIFECYCLE HARDENING
-- AIM: Implement a robust, traceable shift state machine.

BEGIN;

-- 1. ENUM TYPE
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_status') THEN
        CREATE TYPE shift_status AS ENUM (
            'open', 
            'pending_declaration', 
            'awaiting_manager_approval', 
            'closed', 
            'rejected'
        );
    END IF;
END $$;

-- 2. SCHEMA EVOLUTION
DO $$ 
BEGIN
    -- Re-add status column with the new enum type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'status') THEN
        ALTER TABLE public.shifts ADD COLUMN status shift_status DEFAULT 'open';
    ELSE
        -- If it exists as text, convert it
        ALTER TABLE public.shifts ALTER COLUMN status SET DATA TYPE shift_status USING status::shift_status;
    END IF;

    -- Handle renames for clarity/alignment with requirements
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'physical_cash_total') THEN
        ALTER TABLE public.shifts RENAME COLUMN physical_cash_total TO declared_cash;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'pos_machine_total') THEN
        ALTER TABLE public.shifts RENAME COLUMN pos_machine_total TO declared_pos;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'transfer_total') THEN
        ALTER TABLE public.shifts RENAME COLUMN transfer_total TO declared_transfer;
    END IF;

    -- Ensure all required columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'declared_cash') THEN
        ALTER TABLE public.shifts ADD COLUMN declared_cash NUMERIC(15, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'declared_pos') THEN
        ALTER TABLE public.shifts ADD COLUMN declared_pos NUMERIC(15, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'declared_transfer') THEN
        ALTER TABLE public.shifts ADD COLUMN declared_transfer NUMERIC(15, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'declared_total') THEN
        ALTER TABLE public.shifts ADD COLUMN declared_total NUMERIC(15, 2) GENERATED ALWAYS AS (declared_cash + declared_pos + declared_transfer) STORED;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'expected_revenue') THEN
        ALTER TABLE public.shifts ADD COLUMN expected_revenue NUMERIC(15, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'total_revenue') THEN
        ALTER TABLE public.shifts ADD COLUMN total_revenue NUMERIC(15, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'variance') THEN
        ALTER TABLE public.shifts ADD COLUMN variance NUMERIC(15, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'final_declaration_id') THEN
        ALTER TABLE public.shifts ADD COLUMN final_declaration_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'closed_at') THEN
        ALTER TABLE public.shifts ADD COLUMN closed_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'department_id') THEN
        ALTER TABLE public.shifts ADD COLUMN department_id TEXT;
    END IF;

    -- Add branch_id to business_memberships if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_memberships' AND column_name = 'branch_id') THEN
        ALTER TABLE public.business_memberships ADD COLUMN branch_id UUID REFERENCES public.branches(id);
    END IF;
END $$;

-- 3. UNIQUE CONSTRAINT (One open shift per staff per department)
DROP INDEX IF EXISTS idx_unique_open_shift_per_staff;
CREATE UNIQUE INDEX idx_unique_open_shift_per_staff 
ON public.shifts (staff_id, department_id, business_id) 
WHERE (status = 'open');

-- 4. RLS UPDATES
-- Ensure staff can only start shifts for themselves
DROP POLICY IF EXISTS "Staff insert own shifts" ON public.shifts;
CREATE POLICY "Staff insert own shifts" ON public.shifts 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = staff_id);

-- Ensure staff can only update their own open/pending shifts
DROP POLICY IF EXISTS "Staff update own shifts" ON public.shifts;
CREATE POLICY "Staff update own shifts" ON public.shifts 
FOR UPDATE TO authenticated 
USING (auth.uid() = staff_id AND status IN ('open', 'pending_declaration', 'rejected'))
WITH CHECK (auth.uid() = staff_id AND (status <> 'closed'));

COMMIT;
