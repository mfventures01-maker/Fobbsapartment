/*
-- GHOST USERS CLEANUP SCRIPT (SAFE MODE)
-- Run these steps manually and sequentially. 

-- STEP 1: Identify Ghost Users (Auth Users with NO Profile)
-- These users exist in Keycloak/Supabase Auth but have no record in your business logic.
-- Export these to CSV before deletion.

select id, email, created_at, last_sign_in_at 
from auth.users 
where id not in (select user_id from public.profiles);


-- STEP 2: Identify Orphan Profiles (Profiles with NO Auth User)
-- These are database rows pointing to a non-existent user (data integrity issue).

select user_id, email, full_name, role 
from public.profiles 
where user_id not in (select id from auth.users);


-- STEP 3: Check Reference Counts (Safety Check)
-- Ensure we don't delete users who have created important data even if they look like ghosts.

select count(*) as created_orders from public.orders where created_by in (
    select id from auth.users where id not in (select user_id from public.profiles)
);

select count(*) as created_bookings from public.bookings where created_by in (
    select id from auth.users where id not in (select user_id from public.profiles)
);


-- STEP 4: DELETE Orphan Profiles (Safe to delete if Step 2 returns rows)
-- UNCOMMENT TO RUN:
-- delete from public.profiles 
-- where user_id not in (select id from auth.users);


-- STEP 5: DELETE Ghost Auth Users (Review Step 3 first!)
-- UNCOMMENT TO RUN:
-- delete from auth.users 
-- where id not in (select user_id from public.profiles);

*/
