
-- REPAIR USER CONTEXT FOR STRESS TEST
UPDATE public.business_memberships 
SET 
  branch_id = '629000ff-8a27-46e3-9eba-b603207565af',
  department_id = 'bar'
WHERE user_id = '4731e41e-952b-4c20-b5b1-3ca39170d7b6'; -- CEO

UPDATE public.profiles 
SET 
  branch_id = '629000ff-8a27-46e3-9eba-b603207565af',
  department = 'bar',
  business_id = '601576d8-9a10-476d-bad1-a1b46f5e830d'
WHERE user_id = '0ff6df72-2349-4fcf-8c81-3731d84676f4'; -- SUPER_ADMIN
