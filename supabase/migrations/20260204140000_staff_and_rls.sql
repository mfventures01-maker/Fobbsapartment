-- Helper Functions
create or replace function public.is_super_admin()
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 from public.profiles
    where user_id = auth.uid()
    and role = 'super_admin'
  );
end;
$$;

create or replace function public.current_user_role()
returns text
language plpgsql
security definer
as $$
declare
  _role text;
begin
  select role into _role from public.profiles
  where user_id = auth.uid();
  return _role;
end;
$$;

create or replace function public.current_business_id()
returns uuid
language plpgsql
security definer
as $$
declare
  _business_id uuid;
begin
  select business_id into _business_id from public.profiles
  where user_id = auth.uid();
  return _business_id;
end;
$$;

create or replace function public.current_branch_id()
returns uuid
language plpgsql
security definer
as $$
declare
  _branch_id uuid;
begin
  select branch_id into _branch_id from public.profiles
  where user_id = auth.uid();
  return _branch_id;
end;
$$;

-- RLS Policies

-- 1. Profiles
alter table public.profiles enable row level security;

create policy "Super admin can do everything on profiles"
on public.profiles
for all
to authenticated
using ( public.is_super_admin() )
with check ( public.is_super_admin() );

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using ( auth.uid() = user_id );

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ( auth.uid() = user_id )
with check ( auth.uid() = user_id );

create policy "CEO/Manager can view profiles in same business"
on public.profiles
for select
to authenticated
using (
  business_id = public.current_business_id()
  and public.current_user_role() in ('ceo', 'manager', 'owner')
);

create policy "CEO can create/update profiles in same business"
on public.profiles
for all
to authenticated
using (
  business_id = public.current_business_id()
  and public.current_user_role() in ('ceo', 'owner')
)
with check (
  business_id = public.current_business_id()
  and public.current_user_role() in ('ceo', 'owner')
);

-- 2. Orders (using org_id -> business_id logic)
-- Assuming org_id in orders corresponds to business_id in profiles
alter table public.orders enable row level security;

create policy "Super admin all orders"
on public.orders
for all
using ( public.is_super_admin() );

create policy "Tenant access orders"
on public.orders
for all
to authenticated
using (
  org_id = public.current_business_id()
  OR org_id in (select org_id from public.org_members where user_id = auth.uid())
);

-- 3. Bookings
alter table public.bookings enable row level security;

create policy "Super admin all bookings"
on public.bookings
for all
using ( public.is_super_admin() );

create policy "Tenant access bookings"
on public.bookings
for all
to authenticated
using (
  org_id = public.current_business_id()
);

-- 4. Payments
alter table public.payments enable row level security;

create policy "Super admin all payments"
on public.payments
for all
using ( public.is_super_admin() );

create policy "Tenant access payments"
on public.payments
for all
to authenticated
using (
  business_id = public.current_business_id()
);

-- 5. Org Members
alter table public.org_members enable row level security;

create policy "Super admin all org members"
on public.org_members
for all
using ( public.is_super_admin() );

create policy "Tenant access org members"
on public.org_members
for all
to authenticated
using (
  org_id = public.current_business_id() 
  OR user_id = auth.uid()
);

-- 6. Generic Business/Org Table Policy Generator approach manual for key tables
-- Businesses
alter table public.businesses enable row level security;
create policy "Read businesses" on public.businesses for select using (true); 
-- Maybe restrict?
-- "Users can see their own business"
create policy "Users view own business" on public.businesses for select using (
  id = public.current_business_id() OR public.is_super_admin()
);

-- Branches
alter table public.branches enable row level security;
create policy "Tenant access branches" on public.branches for all using (
  business_id = public.current_business_id() OR public.is_super_admin()
);

-- Customers
alter table public.customers enable row level security;
create policy "Tenant access customers" on public.customers for all using (
  business_id = public.current_business_id() OR public.is_super_admin()
);

