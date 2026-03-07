
-- REPAIR CEO CONTEXT
BEGIN;

UPDATE public.business_memberships 
SET 
    branch_id = '629000ff-8a27-46e3-9eba-b603207565af',
    department_id = 'bar'
WHERE user_id = '4731e41e-952b-4c20-b5b1-3ca39170d7b6';

COMMIT;
