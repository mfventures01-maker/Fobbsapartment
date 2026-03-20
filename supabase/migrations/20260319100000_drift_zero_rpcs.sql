
-- Final Drift Zero RPCs Alignment
-- Authority: Anti-Gravity Protocol

-- 1. Log Guest Event (Replacing direct table insert in logging.ts)
CREATE OR REPLACE FUNCTION public.log_guest_event(
  p_payload jsonb
)
RETURNS boolean AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- We allow anon for public guest logging if needed, or authenticated
  -- Payload mapping to orders_or_leads (ensuring table exist check or create if missing for this phase)
  
  -- For safety, we check if table exists (dynamic SQL or just assume as per current codebase)
  -- The current codebase assumes public.orders_or_leads exists.
  
  INSERT INTO public.orders_or_leads (
    business_id, business_name, business_type, 
    customer_name, customer_phone, order_details, 
    total, status, created_at
  )
  SELECT 
    (p_payload->>'business_id')::uuid,
    p_payload->>'business_name',
    p_payload->>'business_type',
    p_payload->>'customer_name',
    p_payload->>'customer_phone',
    (p_payload->'order_details')::jsonb,
    COALESCE((p_payload->>'total')::numeric, 0),
    p_payload->>'status',
    COALESCE((p_payload->>'created_at')::timestamptz, now());
    
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. CEO Audit Trail RPC
CREATE OR REPLACE FUNCTION public.get_audit_logs(
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  action text,
  actor_id uuid,
  actor_name text,
  prev_state jsonb,
  new_state jsonb,
  timestamp timestamptz
) AS $$
BEGIN
  -- Enforcement: Only management roles can view the trail
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('ceo', 'manager', 'owner', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_TRAIL_ACCESS: Security Definier breach prevented.';
  END IF;

  RETURN QUERY
  SELECT 
    l.id,
    l.action,
    l.actor_id,
    COALESCE(p.full_name, 'SYSTEM'),
    l.prev_state,
    l.new_state,
    l.timestamp
  FROM public.transaction_logs l
  LEFT JOIN public.profiles p ON p.user_id = l.actor_id
  ORDER BY l.timestamp DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION public.log_guest_event TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_audit_logs TO authenticated;
