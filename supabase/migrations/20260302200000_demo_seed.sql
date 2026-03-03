
-- SEED DATA for CARSS DEMO
-- This ensures a stable environment for the demo.

BEGIN;

-- 1. Create Business if not exists
INSERT INTO public.businesses (id, name, category, city)
VALUES ('00000000-0000-0000-0000-000000000001', 'Fobbs Apartments', 'hotel', 'Asaba')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Create Branch
INSERT INTO public.branches (id, business_id, name, code, city, is_hq)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Asaba Main', 'FOBBS', 'Asaba', true)
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code;

-- 3. Create Department
-- Check if departments table exists (based on previous logs it might)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN
        INSERT INTO public.departments (id, org_id, name, type)
        VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Restaurant', 'restaurant')
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

COMMIT;
