-- CARSS ANTI-GRAVITY SHIFT AUTHORITY SYSTEM: FINAL HARDENING
-- AIM: Granular financial integrity and reconciliation logic.

BEGIN;

-- 1. Add Granular Expected Columns to Shifts
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'expected_cash') THEN
        ALTER TABLE public.shifts ADD COLUMN expected_cash NUMERIC(15, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'expected_pos') THEN
        ALTER TABLE public.shifts ADD COLUMN expected_pos NUMERIC(15, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'expected_transfer') THEN
        ALTER TABLE public.shifts ADD COLUMN expected_transfer NUMERIC(15, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'expected_total') THEN
        ALTER TABLE public.shifts ADD COLUMN expected_total NUMERIC(15, 2) GENERATED ALWAYS AS (expected_cash + expected_pos + expected_transfer) STORED;
    END IF;
END $$;

-- 2. Correct Lifecycle: Ensure 'rejected' can go back to 'pending_declaration'
-- (Already handled by RLS but good to keep in mind for app logic)

-- 3. Corrected RPC: submit_shift_declaration (Granular Calculation)
CREATE OR REPLACE FUNCTION public.submit_shift_declaration(
    p_shift_id UUID,
    p_cash NUMERIC,
    p_pos NUMERIC,
    p_transfer NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_exp_cash NUMERIC;
    v_exp_pos NUMERIC;
    v_exp_transfer NUMERIC;
    v_shift RECORD;
BEGIN
    -- Lock shift
    SELECT * INTO v_shift FROM public.shifts WHERE id = p_shift_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Shift not found');
    END IF;
    
    -- Calculate Granular Expected Revenue
    SELECT 
        COALESCE(SUM(CASE WHEN payment_type = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_type = 'pos' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_type = 'transfer' THEN amount ELSE 0 END), 0)
    INTO v_exp_cash, v_exp_pos, v_exp_transfer
    FROM public.transactions
    WHERE shift_id = p_shift_id
    AND status IN ('verified', 'completed');

    -- Perform Atomic Update
    UPDATE public.shifts SET
        declared_cash = p_cash,
        declared_pos = p_pos,
        declared_transfer = p_transfer,
        expected_cash = v_exp_cash,
        expected_pos = v_exp_pos,
        expected_transfer = v_exp_transfer,
        expected_revenue = (v_exp_cash + v_exp_pos + v_exp_transfer), -- Backward compatibility
        total_revenue = (v_exp_cash + v_exp_pos + v_exp_transfer),
        variance = (p_cash + p_pos + p_transfer) - (v_exp_cash + v_exp_pos + v_exp_transfer),
        status = 'awaiting_manager_approval',
        updated_at = NOW()
    WHERE id = p_shift_id;

    RETURN jsonb_build_object(
        'success', true, 
        'expected_total', (v_exp_cash + v_exp_pos + v_exp_transfer),
        'declared_total', (p_cash + p_pos + p_transfer),
        'variance', (p_cash + p_pos + p_transfer) - (v_exp_cash + v_exp_pos + v_exp_transfer)
    );
END;
$$;

-- 4. Alias for approve_shift (as requested: approve_shift_close)
CREATE OR REPLACE FUNCTION public.approve_shift_close(p_shift_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN public.approve_shift(p_shift_id);
END;
$$;

-- 5. CEO Financial Intelligence - Variance Analytics Engine
CREATE OR REPLACE VIEW public.ceo_variance_analytics AS
SELECT 
    staff_id,
    p.full_name as staff_name,
    COUNT(*) as total_shifts,
    AVG(variance) as avg_variance,
    SUM(CASE WHEN variance < 0 THEN 1 ELSE 0 END) as shortages_count,
    SUM(CASE WHEN variance > 0 THEN 1 ELSE 0 END) as overages_count,
    MAX(variance) as max_overage,
    MIN(variance) as max_shortage,
    CASE 
        WHEN AVG(ABS(variance)) < 100 THEN 'green'
        WHEN AVG(ABS(variance)) < 1000 THEN 'yellow'
        ELSE 'red'
    END as risk_profile
FROM public.shifts s
JOIN public.profiles p ON s.staff_id = p.id
WHERE s.status = 'closed'
GROUP BY staff_id, p.full_name;

COMMIT;
