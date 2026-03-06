-- CARSS INVENTORY CONSTRAINTS FOR STRESS TESTING
-- Ensure that we can upsert inventory and recipes safely.

BEGIN;

-- 1. Inventory Unique Constraint
-- Prevents duplicate items for the same business/branch/department
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_business_branch_dept_name 
ON public.inventory (business_id, branch_id, department_id, name);

-- 2. Menu Inventory Recipe Unique Constraint (if not already there)
-- Note: It's ALREADY in 20260304160000_anti_gravity_financial_integrity_final.sql
-- UNIQUE(menu_item_id, inventory_id)

COMMIT;
