-- CARSS SHIFT ENGINE AUDIT & ENFORCEMENT
-- Permanent Guard Against Legacy "end_time" Column

BEGIN;

-- 1. Eliminate any ghost columns if they exist
ALTER TABLE public.shifts DROP COLUMN IF EXISTS end_time;

-- 2. Ensure canonical schema
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS expected_revenue NUMERIC DEFAULT 0;
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS total_revenue NUMERIC DEFAULT 0;
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS variance NUMERIC DEFAULT 0;

-- 3. Dynamic row-level constraint to prevent end_time in json payloads/metadata if it attempts to leak
CREATE OR REPLACE FUNCTION prevent_end_time_metadata()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.metadata ? 'end_time' THEN
        NEW.metadata := NEW.metadata - 'end_time';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_end_time_metadata ON public.shifts;
CREATE TRIGGER trg_prevent_end_time_metadata
BEFORE INSERT OR UPDATE ON public.shifts
FOR EACH ROW
EXECUTE FUNCTION prevent_end_time_metadata();

COMMIT;
