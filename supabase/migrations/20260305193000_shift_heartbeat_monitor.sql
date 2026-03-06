-- CARSS SHIFT HEARTBEAT MONITOR
-- AIM: Real-time observability of the shift lifecycle and financial integrity.

BEGIN;

CREATE OR REPLACE VIEW public.shift_heartbeat_monitor AS
SELECT
    s.id AS shift_id,
    s.business_id,
    s.staff_id,
    s.status,
    s.created_at,

    COUNT(t.id) AS transaction_count,

    COALESCE(SUM(t.amount), 0) AS system_revenue,

    s.declared_total,

    -- Recalculated variance for the heartbeat
    (COALESCE(s.declared_total, 0) - COALESCE(SUM(t.amount), 0)) AS live_variance,

    -- Variance Alert Flag
    CASE
        WHEN (COALESCE(s.declared_total, 0) - COALESCE(SUM(t.amount), 0)) != 0
        THEN TRUE
        ELSE FALSE
    END AS variance_flag,

    -- Operational State Mapping
    CASE
        WHEN s.status = 'open' THEN 'ACTIVE'
        WHEN s.status IN ('requested', 'awaiting_approval') THEN 'PENDING_APPROVAL'
        WHEN s.status = 'pending_declaration' THEN 'DECLARATION_PENDING'
        ELSE 'CLOSED'
    END AS operational_state

FROM public.shifts s
LEFT JOIN public.transactions t
    ON t.shift_id = s.id

GROUP BY
    s.id,
    s.business_id,
    s.staff_id,
    s.status,
    s.created_at,
    s.declared_total;

-- Ensure RLS doesn't block access (adjust as per your policy)
-- GRANT SELECT ON public.shift_heartbeat_monitor TO authenticated;

COMMIT;
