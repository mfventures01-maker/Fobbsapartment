-- 🛸 ANTI-GRAVITY: OPERATIONAL EVENT LEDGER (LAYER 0)
-- Purpose: Provide a deterministic, idempotent stream of system changes for all terminals.
-- Law: Events are the single source of truth. State is a derivative of the event log.

BEGIN;

CREATE TABLE IF NOT EXISTS public.operational_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id BIGSERIAL NOT NULL, -- Logical clock for strict ordering
    aggregate_id TEXT NOT NULL,  -- e.g. 'order_123'
    event_type TEXT NOT NULL,    -- e.g. 'ORDER_SUBMITTED'
    payload JSONB NOT NULL,      -- { old_state, new_state, branch_id, staff_id, ... }
    branch_id UUID REFERENCES public.branches(id),
    business_id UUID REFERENCES public.businesses(id),
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast range queries during reconnection catch-up
CREATE INDEX IF NOT EXISTS idx_events_branch_id_clock ON public.operational_events (branch_id, event_id);
CREATE INDEX IF NOT EXISTS idx_events_business_id_clock ON public.operational_events (business_id, event_id);

-- 🛰️ REALTIME LOGIC
-- Enable realtime for this table
ALTER TABLE public.operational_events REPLICA IDENTITY FULL;

-- Helper to fetch missing events since last logical clock
CREATE OR REPLACE FUNCTION public.get_missing_events(
    p_branch_id UUID,
    p_last_event_id BIGINT
)
RETURNS SETOF public.operational_events
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT * 
    FROM public.operational_events 
    WHERE branch_id = p_branch_id 
      AND event_id > p_last_event_id 
    ORDER BY event_id ASC;
$$;

-- Trigger to automatically create a system event on order change
CREATE OR REPLACE FUNCTION public.notify_order_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.operational_events (
        aggregate_id,
        event_type,
        payload,
        branch_id,
        business_id
    ) VALUES (
        NEW.id::text,
        'ORDER_' || UPPER(NEW.status),
        jsonb_build_object(
            'old_state', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
            'new_state', row_to_json(NEW)::jsonb,
            'total', NEW.total,
            'customer', NEW.customer_name
        ),
        NEW.location_id,
        NEW.org_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_order_event ON public.orders;
CREATE TRIGGER tr_order_event
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_event();

COMMIT;
