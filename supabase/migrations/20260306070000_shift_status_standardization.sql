-- CARSS SHIFT STATUS STANDARDIZATION
-- AIM: Unifying status strings across frontend and backend for deterministic visibility.

BEGIN;

-- 1. Standardize the enum to match SHIFT_STATUS constants
-- We use 'awaiting_approval' for all manager-gate authorizations.
ALTER TYPE public.shift_status ADD VALUE IF NOT EXISTS 'awaiting_approval' BEFORE 'closed';

-- 2. Migrate existing data
UPDATE public.shifts SET status = 'awaiting_approval' WHERE status IN ('awaiting_manager_approval', 'awaiting_close_approval');
UPDATE public.shifts SET status = 'requested' WHERE status = 'awaiting_manager_open';

-- 3. Update the constraint
ALTER TABLE public.shifts DROP CONSTRAINT IF EXISTS shifts_status_check;
ALTER TABLE public.shifts ADD CONSTRAINT shifts_status_check
CHECK (status IN ('requested', 'open', 'pending_declaration', 'awaiting_approval', 'closed', 'rejected'));

COMMIT;
