-- CARSS LOCATION SSOT REPAIR
-- Stabilizes the order pipeline by ensuring deterministic location existence.
-- This migration resolves the orders_location_id_fkey violation.

BEGIN;

-- 1. Ensure the Organization exists (mapped to current business)
-- business_id '601576d8-9a10-476d-bad1-a1b46f5e830d' is canonical for Fobbs Apartments
INSERT INTO public.orgs (id, name, slug)
VALUES ('601576d8-9a10-476d-bad1-a1b46f5e830d', 'Fobbs Apartments', 'fobbs-apartments')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Ensure deterministic location exists for QR menu ordering
-- Deterministic location_id: '7b18c9c0-324a-4c7c-a582-8ca06c83d1d8'
INSERT INTO public.locations (id, org_id, name, city, address)
VALUES (
    '7b18c9c0-324a-4c7c-a582-8ca06c83d1d8', 
    '601576d8-9a10-476d-bad1-a1b46f5e830d', 
    'Fobbs Bar Service', 
    'Asaba', 
    'Asaba Central District'
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 3. Ensure existing Branch ID exists in locations (For Staff Terminal stabilization)
-- Branch ID: '629000ff-8a27-46e3-9eba-b603207565af'
INSERT INTO public.locations (id, org_id, name, city, address)
VALUES (
    '629000ff-8a27-46e3-9eba-b603207565af', 
    '601576d8-9a10-476d-bad1-a1b46f5e830d', 
    'Headquarters', 
    'Lagos', 
    'Headquarters'
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 4. Sync Branches (Optional but recommended for branch_performance views)
INSERT INTO public.branches (id, business_id, name, code, is_hq, is_active)
VALUES (
    '7b18c9c0-324a-4c7c-a582-8ca06c83d1d8', -- Mirroring location for unified reporting if needed
    '601576d8-9a10-476d-bad1-a1b46f5e830d', 
    'Bar & Restaurant', 
    'BAR', 
    false, 
    true
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
