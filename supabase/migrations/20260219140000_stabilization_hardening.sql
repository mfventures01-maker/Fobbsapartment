-- CARSS Stabilization & Production Hardening
-- Unifies Shift Schema (ends_at) and simplifies Profiles RLS for auth stability.

BEGIN;

--------------------------------------------------
-- 1. SHIFT SCHEMA UNIFICATION
--------------------------------------------------

-- Ensure ends_at exists and stop using status
DO $$ 
BEGIN
    -- Rename end_time to ends_at if it exists (from previous turn drift)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'end_time') THEN
        ALTER TABLE public.shifts RENAME COLUMN end_time TO ends_at;
    END IF;

    -- Ensure ends_at exists if neither end_time nor ends_at existed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'ends_at') THEN
        ALTER TABLE public.shifts ADD COLUMN ends_at TIMESTAMPTZ;
    END IF;

    -- DROP status column to align with "Open shift = ends_at IS NULL" logic
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'status') THEN
        ALTER TABLE public.shifts DROP COLUMN status;
    END IF;
END $$;


--------------------------------------------------
-- 2. PROFILE RLS SIMPLIFICATION (Hydration Fix)
--------------------------------------------------

-- Remove ALL complex policies and role references from profiles table
-- This prevents infinite recursion and hydration timeouts.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles: Self Select" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Manager/CEO View" ON public.profiles;
DROP POLICY IF EXISTS "CEO/Manager can view profiles in same business" ON public.profiles;
DROP POLICY IF EXISTS "CEO can create/update profiles in same business" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can do everything on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Manager/CEO View" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: CEO View Business Staff" ON public.profiles;

-- Canonical Atomic Policy
CREATE POLICY "Profiles: Atomic Owner Access" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Profiles: Atomic Owner Update" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


--------------------------------------------------
-- 3. TRIGGER UPDATE (ends_at logic)
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_active_shift() 
RETURNS TRIGGER AS $$
DECLARE
    _role text;
    _active_shift_id uuid;
BEGIN
    -- Use security definer function to avoid RLS loop
    _role := public.current_user_role();

    -- Only process for operations roles
    IF _role IN ('staff', 'cashier', 'storekeeper') THEN
        
        -- Locate active shift if exists (Silent discovery)
        -- Must be both 'open' and 'ends_at' null
        SELECT id INTO _active_shift_id 
        FROM public.shifts 
        WHERE staff_id = auth.uid() 
        AND status = 'open'
        AND ends_at IS NULL
        ORDER BY start_time DESC 
        LIMIT 1;

        -- Auto-link shift_id if missing but discovered
        IF NEW.shift_id IS NULL AND _active_shift_id IS NOT NULL THEN
             NEW.shift_id := _active_shift_id;
        END IF;

        -- Application layer (ShiftProtectedRoute) is the primary guard, 
        -- but if a request sneaks through without a shift_id (and it's not null in schema) it should fail.
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


--------------------------------------------------
-- 4. BUSINESS CONFIGURATION (Optional but recommended)
--------------------------------------------------
-- Ensuring the canonical business exists if missing
INSERT INTO public.businesses (id, name, slug)
VALUES ('601576d8-9a10-476d-bad1-a1b46f5e830d', 'Fobbs Apartments Asaba', 'fobbs-asaba')
ON CONFLICT (id) DO NOTHING;

COMMIT;
