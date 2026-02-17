
# Minimal Database Migrations

Run these SQL commands in your Supabase SQL Editor.

## 1. Add Missing Columns to Profiles
Ensures `user_id` and `department` exist.

```sql
alter table public.profiles add column if not exists user_id uuid references auth.users(id);
alter table public.profiles add column if not exists department text;
-- Index for faster joins
create index if not exists idx_profiles_user_id on public.profiles(user_id);
```

## 2. Link Existing Users (Helper)
If you have users who can't login because their profile lacks `user_id`, run this ONCE to backfill if `id` matches `auth.users.id`.

```sql
update public.profiles
set user_id = id
where user_id is null;
```

## 3. Create Service Requests Table & Realtime
For the department dashboards.

```sql
create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  type text check (type in ('restaurant','bar','cleaning','reservations','housekeeping','reception')),
  department text, -- (restaurant|bar|reception|housekeeping)
  status text default 'new' check (status in ('new','in_progress','done')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Enable RLS (optional but recommended, allowing all for now based on MVP)
alter table public.service_requests enable row level security;
create policy "Allow all access to service_requests for authenticated" on public.service_requests for all using (auth.role() = 'authenticated');

-- Enable Realtime
alter publication supabase_realtime add table public.service_requests;
alter table public.service_requests replica identity full;
```
