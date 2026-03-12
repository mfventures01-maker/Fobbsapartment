-- CARSS PHASE 3 SURGICAL REPAIRS
-- Targets:
-- 4. Inventory Location Scoping (Dynamic Branch Resolution)
-- 6. Public Order Shift Attribution (Revenue Lock)

BEGIN;

--------------------------------------------------
-- 1. REPAIR DEDUCT_INVENTORY_AFTER_TRANSACTION
-- Ensures that even if a recipe uses a "source" inventory ID, 
-- we deduct from the record matching that NAME in the CURRENT transaction's branch.
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.deduct_inventory_after_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_item RECORD;
    v_recipe RECORD;
    v_target_inventory_id UUID;
BEGIN
    -- Only for verified transactions
    IF NEW.status <> 'verified' THEN
        RETURN NEW;
    END IF;

    -- Find all items in the linked order
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = NEW.order_id LOOP
        
        -- Find recipes for this menu item
        FOR v_recipe IN 
            SELECT r.*, i.name as inv_name, i.business_id as inv_biz
            FROM public.menu_inventory_recipes r
            JOIN public.inventory i ON r.inventory_id = i.id
            WHERE r.menu_item_id = v_item.name 
        LOOP
            
            -- Resolve the target inventory record for the CURRENT branch
            SELECT id INTO v_target_inventory_id
            FROM public.inventory
            WHERE business_id = v_recipe.inv_biz
            AND branch_id = NEW.branch_id
            AND name = v_recipe.inv_name
            LIMIT 1;

            -- If no target found for this branch, we skip (or handle as error, but skip is safer for production flow)
            IF v_target_inventory_id IS NOT NULL THEN
                -- Atomic Deduction
                UPDATE public.inventory SET
                    current_stock = current_stock - (v_recipe.quantity_required * v_item.qty),
                    updated_at = NOW()
                WHERE id = v_target_inventory_id;
                
                -- Log the change
                INSERT INTO public.inventory_logs (
                    inventory_id, actor_id, change_amount, reason, transaction_id, order_id, metadata
                ) VALUES (
                    v_target_inventory_id, 
                    COALESCE(NEW.staff_id, auth.uid()), 
                    -(v_recipe.quantity_required * v_item.qty),
                    'sale', 
                    NEW.id, 
                    NEW.order_id,
                    jsonb_build_object('source_recipe_inv_id', v_recipe.inventory_id, 'branch_resolved', true)
                );
            END IF;
            
        END LOOP;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


--------------------------------------------------
-- 2. REPAIR CONFIRM_PAYMENT_INTENT (TARGET 6)
-- Attribution: If order/intent has no shift_id (Public ORDER), 
-- find ANY active shift for the branch to anchor the revenue.
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.confirm_payment_intent(
    p_intent_id UUID,
    p_external_reference TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_intent RECORD;
    v_order RECORD;
    v_tx_id UUID;
    v_confirming_staff_id UUID;
    v_shift_id UUID;
BEGIN
    -- 1. Identify Confirming Authority
    v_confirming_staff_id := auth.uid();
    IF v_confirming_staff_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- 2. Resolve Intent (Lock for update)
    SELECT * INTO v_intent 
    FROM public.payment_intents 
    WHERE id = p_intent_id 
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment Intent not found';
    END IF;
    
    IF v_intent.status::text <> 'pending' THEN
        RAISE EXCEPTION 'Payment Intent is status: % (Must be pending)', v_intent.status;
    END IF;

    -- 3. Resolve Shift for Attribution (Surgical Target 6)
    -- a. Try staff's own shift first
    SELECT id INTO v_shift_id 
    FROM public.shifts 
    WHERE staff_id = v_confirming_staff_id 
    AND status = 'open' 
    LIMIT 1;

    -- b. If staff has no shift, but it's a public order, try to find ANY open shift for this branch
    IF v_shift_id IS NULL THEN
        SELECT id INTO v_shift_id 
        FROM public.shifts 
        WHERE branch_id = v_intent.branch_id 
        AND status = 'open' 
        LIMIT 1;
    END IF;

    -- 4. ATOMIC EXECUTION
    -- a. Create Transaction
    INSERT INTO public.transactions (
        business_id, 
        branch_id, 
        staff_id, 
        amount, 
        payment_type, 
        payment_reference,
        status, 
        created_at,
        order_id, 
        payment_intent_id, 
        shift_id
    ) VALUES (
        v_intent.business_id, 
        v_intent.branch_id, 
        v_confirming_staff_id,
        v_intent.expected_amount, 
        v_intent.payment_type::payment_method_v2, 
        p_external_reference,
        'verified', 
        now(),
        v_intent.order_id, 
        v_intent.id, 
        COALESCE(v_intent.shift_id, v_shift_id) -- Prefers intent, falls back to resolved
    ) RETURNING id INTO v_tx_id;

    -- b. Close Order
    UPDATE public.orders 
    SET status = 'paid', updated_at = now(), shift_id = COALESCE(shift_id, v_shift_id) -- Update order shift link too
    WHERE id = v_intent.order_id;

    -- c. Finalize Intent
    UPDATE public.payment_intents
    SET status = 'confirmed',
        staff_id = COALESCE(staff_id, v_confirming_staff_id),
        shift_id = COALESCE(shift_id, v_shift_id),
        approved_by = v_confirming_staff_id,
        approved_at = now(),
        external_reference = COALESCE(p_external_reference, external_reference),
        updated_at = now()
    WHERE id = p_intent_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_tx_id,
        'status', 'approved',
        'shift_attributed', v_shift_id
    );
END;
$$;

COMMIT;
