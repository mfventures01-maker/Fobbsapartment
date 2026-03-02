-- PHASE C: MANAGER APPROVAL ENFORCEMENT
-- AIM: Secure closure and rejection of shifts with department-level lockdown.

BEGIN;

CREATE OR REPLACE FUNCTION public.approve_shift(p_shift_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_shift RECORD;
    v_manager_role TEXT;
    v_manager_dept UUID;
BEGIN
    -- 1. Verify role and department access
    SELECT role, department_id INTO v_manager_role, v_manager_dept
    FROM public.business_memberships 
    WHERE user_id = auth.uid();

    IF v_manager_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Membership context not found');
    END IF;

    IF v_manager_role NOT IN ('manager', 'ceo', 'owner', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;

    -- 2. Lock and Verify status
    SELECT * INTO v_shift FROM public.shifts WHERE id = p_shift_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Shift not found');
    END IF;

    -- 3. Department lockdown for managers
    IF v_manager_role = 'manager' AND v_manager_dept IS NOT NULL AND v_manager_dept::text <> v_shift.department_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Manager department mismatch');
    END IF;

    IF v_shift.status <> 'awaiting_manager_approval' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Shift is not awaiting approval');
    END IF;

    -- 4. Close Shift
    UPDATE public.shifts SET
        status = 'closed',
        closed_at = NOW(),
        manager_approval_id = auth.uid(),
        updated_at = NOW()
    WHERE id = p_shift_id;

    -- 5. Audit
    INSERT INTO public.audit_logs (event_type, actor_id, resource_type, resource_id, new_value)
    VALUES ('SHIFT_APPROVED', auth.uid(), 'shifts', p_shift_id, to_jsonb((SELECT s FROM public.shifts s WHERE id = p_shift_id)));

    RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_shift(p_shift_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_shift RECORD;
    v_manager_role TEXT;
    v_manager_dept UUID;
BEGIN
    -- 1. Verify role and department access
    SELECT role, department_id INTO v_manager_role, v_manager_dept
    FROM public.business_memberships 
    WHERE user_id = auth.uid();

    IF v_manager_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Membership context not found');
    END IF;

    IF v_manager_role NOT IN ('manager', 'ceo', 'owner', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;

    -- 2. Lock and Verify status
    SELECT * INTO v_shift FROM public.shifts WHERE id = p_shift_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Shift not found');
    END IF;

    -- 3. Department lockdown for managers
    IF v_manager_role = 'manager' AND v_manager_dept IS NOT NULL AND v_manager_dept::text <> v_shift.department_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Manager department mismatch');
    END IF;

    IF v_shift.status <> 'awaiting_manager_approval' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Shift is not awaiting approval');
    END IF;

    -- 4. Re-open for staff correction
    UPDATE public.shifts SET
        status = 'rejected',
        updated_at = NOW()
    WHERE id = p_shift_id;

    -- 5. Audit
    INSERT INTO public.audit_logs (event_type, actor_id, resource_type, resource_id, new_value)
    VALUES ('SHIFT_REJECTED', auth.uid(), 'shifts', p_shift_id, jsonb_build_object('reason', p_reason));

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. RLS Hardening (No modification after closure)
DROP POLICY IF EXISTS "No edits after closure" ON public.shifts;
CREATE POLICY "No edits after closure" ON public.shifts 
FOR UPDATE TO authenticated 
USING (status <> 'closed')
WITH CHECK (status <> 'closed');

COMMIT;
