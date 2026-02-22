-- Phase 1 & 2: Database Hardening and Dashboard Intelligence View

-- 1. Drop the legacy RLS policy blocking Super Admin
DROP POLICY IF EXISTS "Users view own business" ON public.businesses;

-- 2. Ensure Super Admin global access over businesses
DROP POLICY IF EXISTS "Super Admin Business View" ON public.businesses;
CREATE POLICY "Super Admin Business View"
ON public.businesses FOR SELECT
TO authenticated
USING (
    public.current_user_role() = 'super_admin'
    OR id = (SELECT business_id FROM public.profiles WHERE user_id = auth.uid())
);

-- 3. Enhance Indexes for Realtime Performance
CREATE INDEX IF NOT EXISTS idx_transactions_business_id ON public.transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_intents_business_id ON public.payment_intents(business_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_order_id ON public.payment_intents(order_id);
CREATE INDEX IF NOT EXISTS idx_shifts_business_id ON public.shifts(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_business_id ON public.audit_logs(business_id);

-- 4. Create Dashboard Intelligence View
DROP VIEW IF EXISTS public.dashboard_financial_integrity;

CREATE OR REPLACE VIEW public.dashboard_financial_integrity AS
SELECT 
    COALESCE(t.order_id, pi.order_id) as order_id,
    COALESCE(t.business_id, pi.business_id) as business_id,
    pi.expected_amount,
    t.amount as transaction_amount,
    COALESCE(t.payment_type::text, pi.payment_type::text) as payment_method,
    pi.status as intent_status,
    t.status as transaction_status,
    COALESCE(t.staff_id, pi.staff_id) as staff_id,
    COALESCE(t.created_at, pi.created_at) as created_at,
    CASE 
        WHEN t.id IS NULL AND pi.status = 'pending' THEN 'missing_transaction'
        WHEN pi.id IS NULL THEN 'orphan_transaction'
        WHEN t.amount != pi.expected_amount THEN 'amount_mismatch'
        WHEN t.shift_id IS NULL THEN 'shift_violation'
        ELSE 'ok'
    END as status_flag
FROM public.payment_intents pi
FULL OUTER JOIN public.transactions t ON pi.id = t.payment_intent_id;

-- 5. Enable Realtime Replication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'payment_intents'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_intents;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'shifts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
    END IF;
END $$;
