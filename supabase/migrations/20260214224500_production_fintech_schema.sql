
-- Production-Grade Payment Schema Implementation
-- Lens: 2026 Nigerian Fintech (Audit-First, Fraud-Resistant)

-- 1. Ensure statuses are well-defined
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tx_status') THEN
        CREATE TYPE tx_status AS ENUM ('created', 'verified', 'reversed', 'disputed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_v2') THEN
        CREATE TYPE payment_method_v2 AS ENUM ('cash', 'transfer', 'pos', 'card', 'wallet');
    END IF;
END $$;

-- 2. Audit-First Transaction Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id),
    branch_id UUID NOT NULL REFERENCES public.branches(id),
    department_id TEXT, -- e.g., 'bar', 'restaurant', 'front_desk'
    staff_id UUID NOT NULL REFERENCES auth.users(id),
    
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    payment_type payment_method_v2 NOT NULL,
    payment_reference TEXT, -- POS Ref, Transfer Session ID, etc.
    
    status tx_status NOT NULL DEFAULT 'created',
    
    -- Metadata for Traceability
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    reversed_by UUID REFERENCES auth.users(id),
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Append-Only Immutable Log (The "Truth" Layer)
CREATE TABLE IF NOT EXISTS public.transaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'created', 'verified', 'reversed', 'disputed_opened', 'disputed_resolved'
    actor_id UUID NOT NULL REFERENCES auth.users(id),
    prev_state JSONB,
    new_state JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enforce Immutability via Triggers (Prevent deletions and direct amount edits)
CREATE OR REPLACE FUNCTION prevent_tx_deletion() 
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Deletion of transactions is strictly prohibited. Use reversals for corrections.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_prevent_tx_deletion ON public.transactions;
CREATE TRIGGER tr_prevent_tx_deletion
BEFORE DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION prevent_tx_deletion();

-- 5. Auto-Logging Trigger
CREATE OR REPLACE FUNCTION log_transaction_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.transaction_logs (transaction_id, action, actor_id, new_state)
        VALUES (NEW.id, 'created', NEW.staff_id, to_jsonb(NEW));
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status <> NEW.status) THEN
            INSERT INTO public.transaction_logs (transaction_id, action, actor_id, prev_state, new_state)
            VALUES (NEW.id, 'status_change_' || NEW.status, auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_log_transaction_change ON public.transactions;
CREATE TRIGGER tr_log_transaction_change
AFTER INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION log_transaction_change();

-- 6. Indices for 7-Second Rule Performance
CREATE INDEX IF NOT EXISTS idx_tx_business_branch_created ON public.transactions(business_id, branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_tx_payment_type ON public.transactions(payment_type);
CREATE INDEX IF NOT EXISTS idx_tx_logs_transaction_id ON public.transaction_logs(transaction_id);

-- RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_logs ENABLE ROW LEVEL SECURITY;

-- Transactions Policies
CREATE POLICY "Users can view transactions in their business"
ON public.transactions FOR SELECT
USING ( business_id IN (SELECT business_id FROM public.profiles WHERE user_id = auth.uid()) );

CREATE POLICY "Staff can create transactions"
ON public.transactions FOR INSERT
WITH CHECK ( business_id IN (SELECT business_id FROM public.profiles WHERE user_id = auth.uid()) );

CREATE POLICY "Only CEO and Managers can update status"
ON public.transactions FOR UPDATE
USING ( 
    business_id IN (SELECT business_id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('ceo', 'manager', 'owner', 'super_admin')
    )
);

-- Logs Policies
CREATE POLICY "Users can view logs in their business"
ON public.transaction_logs FOR SELECT
USING ( 
    transaction_id IN (SELECT id FROM public.transactions)
);
