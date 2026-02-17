drop extension if exists "pg_net";

create type "public"."booking_status" as enum ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled');

create type "public"."lead_status" as enum ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost');

create type "public"."member_role" as enum ('owner', 'admin', 'manager', 'staff');

create type "public"."order_status" as enum ('open', 'paid', 'void', 'refunded');

create type "public"."payment_status" as enum ('pending', 'succeeded', 'failed', 'refunded');

create type "public"."request_status" as enum ('open', 'assigned', 'in_progress', 'done', 'cancelled');

create type "public"."task_status" as enum ('todo', 'doing', 'done', 'blocked', 'cancelled');


  create table "public"."audit_logs" (
    "id" bigint generated always as identity not null,
    "event_type" text not null,
    "actor_id" uuid,
    "user_email" text,
    "resource_type" text,
    "resource_id" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "business_id" text not null default '1'::text,
    "correlation_id" text,
    "ip_address" text,
    "user_agent" text,
    "status" text,
    "business_uuid" uuid not null,
    "success" boolean default true,
    "resolved" boolean default false,
    "resolved_at" timestamp with time zone,
    "resolved_by" uuid,
    "branch_id" uuid
      );


alter table "public"."audit_logs" enable row level security;


  create table "public"."bookings" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "property_id" uuid not null,
    "guest_name" text not null,
    "guest_phone" text,
    "guest_email" text,
    "check_in" date not null,
    "check_out" date not null,
    "status" public.booking_status not null default 'pending'::public.booking_status,
    "total_amount" numeric(12,2),
    "source" text,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."bookings" enable row level security;


  create table "public"."branches" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "name" text not null,
    "code" text not null,
    "city" text not null,
    "address" text,
    "phone" text,
    "email" text,
    "is_hq" boolean default false,
    "is_active" boolean default true,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."branches" enable row level security;


  create table "public"."business_settings" (
    "business_id" uuid not null,
    "ceo_whatsapp" text,
    "ceo_telegram" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );



  create table "public"."businesses" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "category" text not null,
    "phone" text,
    "city" text default 'Asaba'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."businesses" enable row level security;


  create table "public"."customers" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "name" text,
    "phone" text,
    "email" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."customers" enable row level security;


  create table "public"."lead_followups" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "lead_id" uuid not null,
    "due_at" timestamp with time zone,
    "channel" text,
    "message" text,
    "completed_at" timestamp with time zone,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."lead_followups" enable row level security;


  create table "public"."leads" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "pipeline_id" uuid,
    "stage_id" uuid,
    "full_name" text not null,
    "phone" text,
    "email" text,
    "status" public.lead_status not null default 'new'::public.lead_status,
    "source" text,
    "notes" text,
    "assigned_to" uuid,
    "last_contacted_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."leads" enable row level security;


  create table "public"."locations" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "name" text not null,
    "city" text,
    "address" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."locations" enable row level security;


  create table "public"."loyalty_accounts" (
    "id" uuid not null default gen_random_uuid(),
    "customer_id" uuid not null,
    "business_id" uuid not null,
    "points" integer not null default 0,
    "lifetime_spend" numeric(12,2) not null default 0,
    "total_visits" integer not null default 0,
    "tier" text not null default 'Bronze'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."loyalty_accounts" enable row level security;


  create table "public"."notification_outbox" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "channel" text not null,
    "to_address" text not null,
    "template_key" text not null,
    "payload" jsonb not null default '{}'::jsonb,
    "status" text not null default 'queued'::text,
    "attempts" integer not null default 0,
    "last_error" text,
    "scheduled_at" timestamp with time zone not null default now(),
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."notification_outbox" enable row level security;


  create table "public"."order_items" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "order_id" uuid not null,
    "name" text not null,
    "qty" integer not null default 1,
    "unit_price" numeric(12,2) not null default 0,
    "line_total" numeric(12,2) not null default 0,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."order_items" enable row level security;


  create table "public"."orders" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "location_id" uuid,
    "customer_name" text,
    "customer_phone" text,
    "status" public.order_status not null default 'open'::public.order_status,
    "subtotal" numeric(12,2) not null default 0,
    "discount" numeric(12,2) not null default 0,
    "total" numeric(12,2) not null default 0,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."orders" enable row level security;


  create table "public"."org_members" (
    "org_id" uuid not null,
    "user_id" uuid not null,
    "role" public.member_role not null default 'staff'::public.member_role,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."org_members" enable row level security;


  create table "public"."orgs" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."orgs" enable row level security;


  create table "public"."payment_audit" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "payment_id" uuid not null,
    "action" text not null,
    "actor_user_id" uuid,
    "note" text,
    "meta" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "branch_id" uuid
      );


alter table "public"."payment_audit" enable row level security;


  create table "public"."payment_disputes" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "payment_id" uuid not null,
    "dispute_reason" text not null,
    "status" text not null default 'open'::text,
    "opened_by" uuid,
    "resolved_by" uuid,
    "resolution_note" text,
    "created_at" timestamp with time zone not null default now(),
    "resolved_at" timestamp with time zone,
    "branch_id" uuid
      );


alter table "public"."payment_disputes" enable row level security;


  create table "public"."payments" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "customer_id" uuid,
    "amount_ngn" bigint not null,
    "method" text not null,
    "status" text not null default 'initiated'::text,
    "reference" text,
    "evidence_url" text,
    "note" text,
    "created_by" uuid,
    "verified_by" uuid,
    "verified_at" timestamp with time zone,
    "reversed_by" uuid,
    "reversed_at" timestamp with time zone,
    "reversal_reason" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "branch_id" uuid,
    "org_id" uuid,
    "order_id" uuid,
    "booking_id" uuid,
    "provider" text,
    "amount" numeric(12,2),
    "paid_at" timestamp with time zone
      );


alter table "public"."payments" enable row level security;


  create table "public"."pipeline_stages" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "pipeline_id" uuid not null,
    "name" text not null,
    "position" integer not null default 1,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."pipeline_stages" enable row level security;


  create table "public"."pipelines" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "name" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."pipelines" enable row level security;


  create table "public"."profiles" (
    "user_id" uuid not null,
    "business_id" uuid,
    "full_name" text,
    "role" text not null default 'owner'::text,
    "created_at" timestamp with time zone not null default now(),
    "department" text,
    "email" text,
    "phone" text,
    "is_active" boolean default true,
    "branch_id" uuid,
    "first_name" text,
    "last_name" text,
    "status" text default 'active'::text,
    "created_by" uuid,
    "invitation_sent_at" timestamp with time zone,
    "last_activity_at" timestamp with time zone,
    "id" uuid not null
      );


alter table "public"."profiles" enable row level security;


  create table "public"."properties" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "location_id" uuid,
    "name" text not null,
    "city" text,
    "zone" text,
    "address" text,
    "capacity" integer,
    "nightly_rate" numeric(12,2),
    "bedrooms" integer,
    "minimum_stay" integer,
    "commission_percent" numeric(5,2),
    "status" text default 'active'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."properties" enable row level security;


  create table "public"."role_definitions" (
    "role_key" text not null,
    "role_name" text not null,
    "permissions" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."service_requests" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "type" text,
    "department" text,
    "status" text default 'new'::text,
    "payload" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "branch_id" uuid,
    "org_id" uuid,
    "booking_id" uuid,
    "property_id" uuid,
    "request_type" text,
    "description" text,
    "assigned_to" uuid,
    "created_by" uuid,
    "updated_at" timestamp with time zone
      );


alter table "public"."service_requests" enable row level security;


  create table "public"."shifts" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "staff_user_id" uuid not null,
    "starts_at" timestamp with time zone not null,
    "ends_at" timestamp with time zone,
    "notes" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."shifts" enable row level security;


  create table "public"."staff_invitations" (
    "id" uuid not null default gen_random_uuid(),
    "phone_number" text not null,
    "whatsapp_available" boolean default true,
    "preferred_channel" text,
    "business_id" uuid not null,
    "branch_id" uuid not null,
    "department" text not null,
    "shift_pattern" text,
    "invitation_code" character(6) not null,
    "invitation_status" text not null default 'pending'::text,
    "requires_photo_id" boolean default true,
    "id_type" text,
    "id_verified_by" uuid,
    "id_verified_at" timestamp with time zone,
    "created_by" uuid not null,
    "created_at" timestamp with time zone default now(),
    "expires_at" timestamp with time zone default (now() + '24:00:00'::interval),
    "metadata" jsonb default '{}'::jsonb,
    "token" text,
    "user_id" uuid,
    "invited_by" uuid,
    "email" text,
    "phone" text,
    "name" text,
    "role" text,
    "status" text
      );



  create table "public"."staff_profiles" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "user_id" uuid not null,
    "full_name" text not null,
    "department" text,
    "phone" text,
    "photo_url" text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."staff_profiles" enable row level security;


  create table "public"."tasks" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "title" text not null,
    "description" text,
    "status" public.task_status not null default 'todo'::public.task_status,
    "assigned_to" uuid,
    "due_at" timestamp with time zone,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."tasks" enable row level security;


  create table "public"."user_notifications" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "user_id" uuid not null,
    "type" text not null,
    "title" text not null,
    "body" text not null,
    "severity" text not null default 'info'::text,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."user_notifications" enable row level security;

CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);

CREATE INDEX bookings_org_id_idx ON public.bookings USING btree (org_id);

CREATE UNIQUE INDEX bookings_pkey ON public.bookings USING btree (id);

CREATE INDEX bookings_property_id_idx ON public.bookings USING btree (property_id);

CREATE UNIQUE INDEX branches_pkey ON public.branches USING btree (id);

CREATE UNIQUE INDEX business_settings_pkey ON public.business_settings USING btree (business_id);

CREATE UNIQUE INDEX businesses_pkey ON public.businesses USING btree (id);

CREATE UNIQUE INDEX customers_business_email_unique ON public.customers USING btree (business_id, lower(email)) WHERE ((email IS NOT NULL) AND (email <> ''::text));

CREATE UNIQUE INDEX customers_pkey ON public.customers USING btree (id);

CREATE INDEX idx_audit_actor ON public.audit_logs USING btree (actor_id) WHERE (actor_id IS NOT NULL);

CREATE INDEX idx_audit_business_created ON public.audit_logs USING btree (business_uuid, created_at DESC);

CREATE INDEX idx_audit_business_id ON public.audit_logs USING btree (business_id);

CREATE INDEX idx_audit_created_at ON public.audit_logs USING btree (created_at DESC);

CREATE INDEX idx_audit_event_type ON public.audit_logs USING btree (event_type);

CREATE INDEX idx_audit_resource ON public.audit_logs USING btree (resource_type, resource_id);

CREATE INDEX idx_audit_user_id ON public.audit_logs USING btree (actor_id);

CREATE INDEX idx_branches_business_active ON public.branches USING btree (business_id, is_active);

CREATE UNIQUE INDEX idx_branches_business_code ON public.branches USING btree (business_id, code);

CREATE INDEX idx_outbox_business_status_time ON public.notification_outbox USING btree (business_id, status, scheduled_at);

CREATE INDEX idx_payment_audit_business_time ON public.payment_audit USING btree (business_id, created_at DESC);

CREATE INDEX idx_payment_audit_payment_time ON public.payment_audit USING btree (payment_id, created_at DESC);

CREATE INDEX idx_payment_disputes_business_status ON public.payment_disputes USING btree (business_id, status, created_at DESC);

CREATE INDEX idx_payments_business_created_at ON public.payments USING btree (business_id, created_at DESC);

CREATE INDEX idx_payments_business_status ON public.payments USING btree (business_id, status);

CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (user_id);

CREATE INDEX idx_staff_invitations_branch ON public.staff_invitations USING btree (branch_id);

CREATE INDEX idx_staff_invitations_business ON public.staff_invitations USING btree (business_id, created_at DESC);

CREATE INDEX idx_staff_invitations_code ON public.staff_invitations USING btree (invitation_code);

CREATE INDEX idx_staff_invitations_phone_status ON public.staff_invitations USING btree (phone_number, invitation_status);

CREATE INDEX idx_staff_invitations_status ON public.staff_invitations USING btree (status);

CREATE INDEX idx_staff_invitations_token ON public.staff_invitations USING btree (token);

CREATE INDEX idx_user_notifications_user_time ON public.user_notifications USING btree (user_id, created_at DESC);

CREATE INDEX lead_followups_lead_id_idx ON public.lead_followups USING btree (lead_id);

CREATE INDEX lead_followups_org_id_idx ON public.lead_followups USING btree (org_id);

CREATE UNIQUE INDEX lead_followups_pkey ON public.lead_followups USING btree (id);

CREATE INDEX leads_assigned_to_idx ON public.leads USING btree (assigned_to);

CREATE INDEX leads_org_id_idx ON public.leads USING btree (org_id);

CREATE UNIQUE INDEX leads_pkey ON public.leads USING btree (id);

CREATE INDEX leads_stage_id_idx ON public.leads USING btree (stage_id);

CREATE INDEX locations_org_id_idx ON public.locations USING btree (org_id);

CREATE UNIQUE INDEX locations_pkey ON public.locations USING btree (id);

CREATE UNIQUE INDEX loyalty_accounts_customer_id_business_id_key ON public.loyalty_accounts USING btree (customer_id, business_id);

CREATE UNIQUE INDEX loyalty_accounts_pkey ON public.loyalty_accounts USING btree (id);

CREATE UNIQUE INDEX notification_outbox_pkey ON public.notification_outbox USING btree (id);

CREATE INDEX order_items_order_id_idx ON public.order_items USING btree (order_id);

CREATE INDEX order_items_org_id_idx ON public.order_items USING btree (org_id);

CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id);

CREATE INDEX orders_location_id_idx ON public.orders USING btree (location_id);

CREATE INDEX orders_org_id_idx ON public.orders USING btree (org_id);

CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);

CREATE INDEX org_members_org_id_idx ON public.org_members USING btree (org_id);

CREATE UNIQUE INDEX org_members_pkey ON public.org_members USING btree (org_id, user_id);

CREATE INDEX org_members_user_id_idx ON public.org_members USING btree (user_id);

CREATE UNIQUE INDEX orgs_pkey ON public.orgs USING btree (id);

CREATE UNIQUE INDEX orgs_slug_key ON public.orgs USING btree (slug);

CREATE UNIQUE INDEX payment_audit_pkey ON public.payment_audit USING btree (id);

CREATE UNIQUE INDEX payment_disputes_pkey ON public.payment_disputes USING btree (id);

CREATE INDEX payments_booking_id_idx ON public.payments USING btree (booking_id);

CREATE INDEX payments_order_id_idx ON public.payments USING btree (order_id);

CREATE INDEX payments_org_id_idx ON public.payments USING btree (org_id);

CREATE UNIQUE INDEX payments_pkey ON public.payments USING btree (id);

CREATE INDEX pipeline_stages_org_id_idx ON public.pipeline_stages USING btree (org_id);

CREATE INDEX pipeline_stages_pipeline_id_idx ON public.pipeline_stages USING btree (pipeline_id);

CREATE UNIQUE INDEX pipeline_stages_pkey ON public.pipeline_stages USING btree (id);

CREATE INDEX pipelines_org_id_idx ON public.pipelines USING btree (org_id);

CREATE UNIQUE INDEX pipelines_pkey ON public.pipelines USING btree (id);

CREATE UNIQUE INDEX profiles_id_key ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (user_id);

CREATE INDEX properties_location_id_idx ON public.properties USING btree (location_id);

CREATE INDEX properties_org_id_idx ON public.properties USING btree (org_id);

CREATE UNIQUE INDEX properties_pkey ON public.properties USING btree (id);

CREATE UNIQUE INDEX role_definitions_pkey ON public.role_definitions USING btree (role_key);

CREATE INDEX service_requests_assigned_to_idx ON public.service_requests USING btree (assigned_to);

CREATE INDEX service_requests_booking_id_idx ON public.service_requests USING btree (booking_id);

CREATE INDEX service_requests_org_id_idx ON public.service_requests USING btree (org_id);

CREATE UNIQUE INDEX service_requests_pkey ON public.service_requests USING btree (id);

CREATE INDEX shifts_org_id_idx ON public.shifts USING btree (org_id);

CREATE UNIQUE INDEX shifts_pkey ON public.shifts USING btree (id);

CREATE INDEX shifts_staff_user_id_idx ON public.shifts USING btree (staff_user_id);

CREATE UNIQUE INDEX staff_invitations_pkey ON public.staff_invitations USING btree (id);

CREATE INDEX staff_profiles_org_id_idx ON public.staff_profiles USING btree (org_id);

CREATE UNIQUE INDEX staff_profiles_org_id_user_id_key ON public.staff_profiles USING btree (org_id, user_id);

CREATE UNIQUE INDEX staff_profiles_pkey ON public.staff_profiles USING btree (id);

CREATE INDEX staff_profiles_user_id_idx ON public.staff_profiles USING btree (user_id);

CREATE INDEX tasks_assigned_to_idx ON public.tasks USING btree (assigned_to);

CREATE INDEX tasks_org_id_idx ON public.tasks USING btree (org_id);

CREATE UNIQUE INDEX tasks_pkey ON public.tasks USING btree (id);

CREATE UNIQUE INDEX user_notifications_pkey ON public.user_notifications USING btree (id);

alter table "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY using index "audit_logs_pkey";

alter table "public"."bookings" add constraint "bookings_pkey" PRIMARY KEY using index "bookings_pkey";

alter table "public"."branches" add constraint "branches_pkey" PRIMARY KEY using index "branches_pkey";

alter table "public"."business_settings" add constraint "business_settings_pkey" PRIMARY KEY using index "business_settings_pkey";

alter table "public"."businesses" add constraint "businesses_pkey" PRIMARY KEY using index "businesses_pkey";

alter table "public"."customers" add constraint "customers_pkey" PRIMARY KEY using index "customers_pkey";

alter table "public"."lead_followups" add constraint "lead_followups_pkey" PRIMARY KEY using index "lead_followups_pkey";

alter table "public"."leads" add constraint "leads_pkey" PRIMARY KEY using index "leads_pkey";

alter table "public"."locations" add constraint "locations_pkey" PRIMARY KEY using index "locations_pkey";

alter table "public"."loyalty_accounts" add constraint "loyalty_accounts_pkey" PRIMARY KEY using index "loyalty_accounts_pkey";

alter table "public"."notification_outbox" add constraint "notification_outbox_pkey" PRIMARY KEY using index "notification_outbox_pkey";

alter table "public"."order_items" add constraint "order_items_pkey" PRIMARY KEY using index "order_items_pkey";

alter table "public"."orders" add constraint "orders_pkey" PRIMARY KEY using index "orders_pkey";

alter table "public"."org_members" add constraint "org_members_pkey" PRIMARY KEY using index "org_members_pkey";

alter table "public"."orgs" add constraint "orgs_pkey" PRIMARY KEY using index "orgs_pkey";

alter table "public"."payment_audit" add constraint "payment_audit_pkey" PRIMARY KEY using index "payment_audit_pkey";

alter table "public"."payment_disputes" add constraint "payment_disputes_pkey" PRIMARY KEY using index "payment_disputes_pkey";

alter table "public"."payments" add constraint "payments_pkey" PRIMARY KEY using index "payments_pkey";

alter table "public"."pipeline_stages" add constraint "pipeline_stages_pkey" PRIMARY KEY using index "pipeline_stages_pkey";

alter table "public"."pipelines" add constraint "pipelines_pkey" PRIMARY KEY using index "pipelines_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."properties" add constraint "properties_pkey" PRIMARY KEY using index "properties_pkey";

alter table "public"."role_definitions" add constraint "role_definitions_pkey" PRIMARY KEY using index "role_definitions_pkey";

alter table "public"."service_requests" add constraint "service_requests_pkey" PRIMARY KEY using index "service_requests_pkey";

alter table "public"."shifts" add constraint "shifts_pkey" PRIMARY KEY using index "shifts_pkey";

alter table "public"."staff_invitations" add constraint "staff_invitations_pkey" PRIMARY KEY using index "staff_invitations_pkey";

alter table "public"."staff_profiles" add constraint "staff_profiles_pkey" PRIMARY KEY using index "staff_profiles_pkey";

alter table "public"."tasks" add constraint "tasks_pkey" PRIMARY KEY using index "tasks_pkey";

alter table "public"."user_notifications" add constraint "user_notifications_pkey" PRIMARY KEY using index "user_notifications_pkey";

alter table "public"."audit_logs" add constraint "audit_logs_branch_id_fkey" FOREIGN KEY (branch_id) REFERENCES public.branches(id) not valid;

alter table "public"."audit_logs" validate constraint "audit_logs_branch_id_fkey";

alter table "public"."audit_logs" add constraint "audit_logs_user_id_fkey" FOREIGN KEY (actor_id) REFERENCES auth.users(id) not valid;

alter table "public"."audit_logs" validate constraint "audit_logs_user_id_fkey";

alter table "public"."bookings" add constraint "bookings_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE not valid;

alter table "public"."bookings" validate constraint "bookings_org_id_fkey";

alter table "public"."bookings" add constraint "bookings_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE RESTRICT not valid;

alter table "public"."bookings" validate constraint "bookings_property_id_fkey";

alter table "public"."branches" add constraint "branches_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE not valid;

alter table "public"."branches" validate constraint "branches_business_id_fkey";

alter table "public"."business_settings" add constraint "business_settings_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) not valid;

alter table "public"."business_settings" validate constraint "business_settings_business_id_fkey";

alter table "public"."businesses" add constraint "businesses_category_check" CHECK ((category = ANY (ARRAY['restaurant'::text, 'lounge'::text, 'hotel'::text, 'pharmacy'::text, 'other'::text]))) not valid;

alter table "public"."businesses" validate constraint "businesses_category_check";

alter table "public"."customers" add constraint "customers_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE not valid;

alter table "public"."customers" validate constraint "customers_business_id_fkey";

alter table "public"."lead_followups" add constraint "lead_followups_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE not valid;

alter table "public"."lead_followups" validate constraint "lead_followups_lead_id_fkey";

alter table "public"."lead_followups" add constraint "lead_followups_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE not valid;

alter table "public"."lead_followups" validate constraint "lead_followups_org_id_fkey";

alter table "public"."leads" add constraint "leads_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE not valid;

alter table "public"."leads" validate constraint "leads_org_id_fkey";

alter table "public"."leads" add constraint "leads_pipeline_id_fkey" FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id) ON DELETE SET NULL not valid;

alter table "public"."leads" validate constraint "leads_pipeline_id_fkey";

alter table "public"."leads" add constraint "leads_stage_id_fkey" FOREIGN KEY (stage_id) REFERENCES public.pipeline_stages(id) ON DELETE SET NULL not valid;

alter table "public"."leads" validate constraint "leads_stage_id_fkey";

alter table "public"."locations" add constraint "locations_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE not valid;

alter table "public"."locations" validate constraint "locations_org_id_fkey";

alter table "public"."loyalty_accounts" add constraint "loyalty_accounts_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE not valid;

alter table "public"."loyalty_accounts" validate constraint "loyalty_accounts_business_id_fkey";

alter table "public"."loyalty_accounts" add constraint "loyalty_accounts_customer_id_business_id_key" UNIQUE using index "loyalty_accounts_customer_id_business_id_key";

alter table "public"."loyalty_accounts" add constraint "loyalty_accounts_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE not valid;

alter table "public"."loyalty_accounts" validate constraint "loyalty_accounts_customer_id_fkey";

alter table "public"."loyalty_accounts" add constraint "loyalty_accounts_tier_check" CHECK ((tier = ANY (ARRAY['Bronze'::text, 'Silver'::text, 'Gold'::text, 'Platinum'::text]))) not valid;

alter table "public"."loyalty_accounts" validate constraint "loyalty_accounts_tier_check";

alter table "public"."notification_outbox" add constraint "notification_outbox_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) not valid;

alter table "public"."notification_outbox" validate constraint "notification_outbox_business_id_fkey";

alter table "public"."notification_outbox" add constraint "notification_outbox_channel_check" CHECK ((channel = ANY (ARRAY['whatsapp'::text, 'telegram'::text, 'email'::text]))) not valid;

alter table "public"."notification_outbox" validate constraint "notification_outbox_channel_check";

alter table "public"."notification_outbox" add constraint "notification_outbox_status_check" CHECK ((status = ANY (ARRAY['queued'::text, 'sending'::text, 'sent'::text, 'failed'::text]))) not valid;

alter table "public"."notification_outbox" validate constraint "notification_outbox_status_check";

alter table "public"."order_items" add constraint "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_items" validate constraint "order_items_order_id_fkey";

alter table "public"."order_items" add constraint "order_items_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE not valid;

alter table "public"."order_items" validate constraint "order_items_org_id_fkey";

alter table "public"."orders" add constraint "orders_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL not valid;

alter table "public"."orders" validate constraint "orders_location_id_fkey";

alter table "public"."orders" add constraint "orders_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE not valid;

alter table "public"."orders" validate constraint "orders_org_id_fkey";

alter table "public"."org_members" add constraint "org_members_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE not valid;

alter table "public"."org_members" validate constraint "org_members_org_id_fkey";

alter table "public"."orgs" add constraint "orgs_slug_key" UNIQUE using index "orgs_slug_key";

alter table "public"."payment_audit" add constraint "payment_audit_action_check" CHECK ((action = ANY (ARRAY['created'::text, 'updated'::text, 'submitted_evidence'::text, 'marked_pending'::text, 'verified'::text, 'failed'::text, 'reversed'::text, 'disputed'::text, 'note_added'::text]))) not valid;

alter table "public"."payment_audit" validate constraint "payment_audit_action_check";

alter table "public"."payment_audit" add constraint "payment_audit_branch_id_fkey" FOREIGN KEY (branch_id) REFERENCES public.branches(id) not valid;

alter table "public"."payment_audit" validate constraint "payment_audit_branch_id_fkey";

alter table "public"."payment_audit" add constraint "payment_audit_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) not valid;

alter table "public"."payment_audit" validate constraint "payment_audit_business_id_fkey";

alter table "public"."payment_audit" add constraint "payment_audit_payment_id_fkey" FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE not valid;

alter table "public"."payment_audit" validate constraint "payment_audit_payment_id_fkey";

alter table "public"."payment_disputes" add constraint "payment_disputes_branch_id_fkey" FOREIGN KEY (branch_id) REFERENCES public.branches(id) not valid;

alter table "public"."payment_disputes" validate constraint "payment_disputes_branch_id_fkey";

alter table "public"."payment_disputes" add constraint "payment_disputes_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) not valid;

alter table "public"."payment_disputes" validate constraint "payment_disputes_business_id_fkey";

alter table "public"."payment_disputes" add constraint "payment_disputes_payment_id_fkey" FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE not valid;

alter table "public"."payment_disputes" validate constraint "payment_disputes_payment_id_fkey";

alter table "public"."payment_disputes" add constraint "payment_disputes_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'investigating'::text, 'resolved'::text, 'rejected'::text]))) not valid;

alter table "public"."payment_disputes" validate constraint "payment_disputes_status_check";

alter table "public"."payments" add constraint "payments_amount_ngn_check" CHECK ((amount_ngn > 0)) not valid;

alter table "public"."payments" validate constraint "payments_amount_ngn_check";

alter table "public"."payments" add constraint "payments_branch_id_fkey" FOREIGN KEY (branch_id) REFERENCES public.branches(id) not valid;

alter table "public"."payments" validate constraint "payments_branch_id_fkey";

alter table "public"."payments" add constraint "payments_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) not valid;

alter table "public"."payments" validate constraint "payments_business_id_fkey";

alter table "public"."payments" add constraint "payments_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) not valid;

alter table "public"."payments" validate constraint "payments_customer_id_fkey";

alter table "public"."payments" add constraint "payments_method_check" CHECK ((method = ANY (ARRAY['transfer'::text, 'pos'::text, 'cash'::text, 'card'::text, 'other'::text]))) not valid;

alter table "public"."payments" validate constraint "payments_method_check";

alter table "public"."payments" add constraint "payments_status_check" CHECK ((status = ANY (ARRAY['initiated'::text, 'pending_verification'::text, 'verified'::text, 'failed'::text, 'reversed'::text, 'disputed'::text]))) not valid;

alter table "public"."payments" validate constraint "payments_status_check";

alter table "public"."pipeline_stages" add constraint "pipeline_stages_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE not valid;

alter table "public"."pipeline_stages" validate constraint "pipeline_stages_org_id_fkey";

alter table "public"."pipeline_stages" add constraint "pipeline_stages_pipeline_id_fkey" FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id) ON DELETE CASCADE not valid;

alter table "public"."pipeline_stages" validate constraint "pipeline_stages_pipeline_id_fkey";

alter table "public"."pipelines" add constraint "pipelines_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE not valid;

alter table "public"."pipelines" validate constraint "pipelines_org_id_fkey";

alter table "public"."profiles" add constraint "profiles_branch_id_fkey" FOREIGN KEY (branch_id) REFERENCES public.branches(id) not valid;

alter table "public"."profiles" validate constraint "profiles_branch_id_fkey";

alter table "public"."profiles" add constraint "profiles_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE SET NULL not valid;

alter table "public"."profiles" validate constraint "profiles_business_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_key" UNIQUE using index "profiles_id_key";

alter table "public"."profiles" add constraint "profiles_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'manager'::text, 'staff'::text, 'viewer'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_role_check";

alter table "public"."profiles" add constraint "profiles_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'suspended'::text, 'inactive'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_status_check";

alter table "public"."profiles" add constraint "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_user_id_fkey";

alter table "public"."properties" add constraint "properties_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL not valid;

alter table "public"."properties" validate constraint "properties_location_id_fkey";

alter table "public"."properties" add constraint "properties_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE not valid;

alter table "public"."properties" validate constraint "properties_org_id_fkey";

alter table "public"."service_requests" add constraint "service_requests_branch_id_fkey" FOREIGN KEY (branch_id) REFERENCES public.branches(id) not valid;

alter table "public"."service_requests" validate constraint "service_requests_branch_id_fkey";

alter table "public"."service_requests" add constraint "service_requests_status_check" CHECK ((status = ANY (ARRAY['new'::text, 'in_progress'::text, 'done'::text]))) not valid;

alter table "public"."service_requests" validate constraint "service_requests_status_check";

alter table "public"."service_requests" add constraint "service_requests_type_check" CHECK ((type = ANY (ARRAY['restaurant'::text, 'bar'::text, 'cleaning'::text, 'reservations'::text, 'housekeeping'::text, 'reception'::text]))) not valid;

alter table "public"."service_requests" validate constraint "service_requests_type_check";

alter table "public"."shifts" add constraint "shifts_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE not valid;

alter table "public"."shifts" validate constraint "shifts_org_id_fkey";

alter table "public"."staff_invitations" add constraint "staff_invitations_branch_id_fkey" FOREIGN KEY (branch_id) REFERENCES public.branches(id) not valid;

alter table "public"."staff_invitations" validate constraint "staff_invitations_branch_id_fkey";

alter table "public"."staff_invitations" add constraint "staff_invitations_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) not valid;

alter table "public"."staff_invitations" validate constraint "staff_invitations_business_id_fkey";

alter table "public"."staff_invitations" add constraint "staff_invitations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(user_id) not valid;

alter table "public"."staff_invitations" validate constraint "staff_invitations_created_by_fkey";

alter table "public"."staff_invitations" add constraint "staff_invitations_department_check" CHECK ((department = ANY (ARRAY['reception'::text, 'bar'::text, 'kitchen'::text, 'housekeeping'::text, 'security'::text]))) not valid;

alter table "public"."staff_invitations" validate constraint "staff_invitations_department_check";

alter table "public"."staff_invitations" add constraint "staff_invitations_id_type_check" CHECK ((id_type = ANY (ARRAY['nin'::text, 'voters'::text, 'drivers'::text, 'international_passport'::text]))) not valid;

alter table "public"."staff_invitations" validate constraint "staff_invitations_id_type_check";

alter table "public"."staff_invitations" add constraint "staff_invitations_id_verified_by_fkey" FOREIGN KEY (id_verified_by) REFERENCES public.profiles(user_id) not valid;

alter table "public"."staff_invitations" validate constraint "staff_invitations_id_verified_by_fkey";

alter table "public"."staff_invitations" add constraint "staff_invitations_invitation_status_check" CHECK ((invitation_status = ANY (ARRAY['pending'::text, 'sent'::text, 'delivered'::text, 'opened'::text, 'accepted'::text, 'expired'::text, 'revoked'::text]))) not valid;

alter table "public"."staff_invitations" validate constraint "staff_invitations_invitation_status_check";

alter table "public"."staff_invitations" add constraint "staff_invitations_phone_number_check" CHECK ((phone_number ~ '^\+234[0-9]{10}$'::text)) not valid;

alter table "public"."staff_invitations" validate constraint "staff_invitations_phone_number_check";

alter table "public"."staff_invitations" add constraint "staff_invitations_preferred_channel_check" CHECK ((preferred_channel = ANY (ARRAY['sms'::text, 'whatsapp'::text, 'in_person'::text]))) not valid;

alter table "public"."staff_invitations" validate constraint "staff_invitations_preferred_channel_check";

alter table "public"."staff_invitations" add constraint "staff_invitations_shift_pattern_check" CHECK ((shift_pattern = ANY (ARRAY['morning'::text, 'evening'::text, 'night'::text, 'flex'::text]))) not valid;

alter table "public"."staff_invitations" validate constraint "staff_invitations_shift_pattern_check";

alter table "public"."staff_profiles" add constraint "staff_profiles_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE not valid;

alter table "public"."staff_profiles" validate constraint "staff_profiles_org_id_fkey";

alter table "public"."staff_profiles" add constraint "staff_profiles_org_id_user_id_key" UNIQUE using index "staff_profiles_org_id_user_id_key";

alter table "public"."tasks" add constraint "tasks_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE not valid;

alter table "public"."tasks" validate constraint "tasks_org_id_fkey";

alter table "public"."user_notifications" add constraint "user_notifications_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) not valid;

alter table "public"."user_notifications" validate constraint "user_notifications_business_id_fkey";

alter table "public"."user_notifications" add constraint "user_notifications_severity_check" CHECK ((severity = ANY (ARRAY['info'::text, 'low'::text, 'medium'::text, 'high'::text, 'critical'::text]))) not valid;

alter table "public"."user_notifications" validate constraint "user_notifications_severity_check";

alter table "public"."user_notifications" add constraint "user_notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."user_notifications" validate constraint "user_notifications_user_id_fkey";

set check_function_bodies = off;

create or replace view "public"."ceo_branch_performance" as  SELECT branch_id,
    count(*) AS total_staff,
    count(*) FILTER (WHERE (status = ANY (ARRAY['active'::text, 'accepted'::text]))) AS active_staff,
    count(*) FILTER (WHERE (status = 'pending'::text)) AS pending_invitations,
    max(created_at) AS last_staff_added
   FROM public.staff_invitations si
  GROUP BY branch_id
  ORDER BY (max(created_at)) DESC;


create or replace view "public"."ceo_department_summary" as  SELECT COALESCE(department, 'Unassigned'::text) AS department_name,
    count(*) AS total_staff,
    count(
        CASE
            WHEN (invitation_status = 'active'::text) THEN 1
            ELSE NULL::integer
        END) AS active_staff,
    count(
        CASE
            WHEN (whatsapp_available = true) THEN 1
            ELSE NULL::integer
        END) AS whatsapp_users,
    string_agg(DISTINCT COALESCE(shift_pattern, 'Not specified'::text), ', '::text) AS shift_patterns,
    round(avg((EXTRACT(epoch FROM (COALESCE(id_verified_at, now()) - created_at)) / (3600)::numeric)), 2) AS avg_verification_hours
   FROM public.staff_invitations
  GROUP BY department
  ORDER BY (count(*)) DESC;


create or replace view "public"."ceo_staff_overview" as  SELECT si.id,
    si.phone_number,
    si.whatsapp_available,
    si.preferred_channel,
    si.business_id,
    si.branch_id,
    si.department,
    si.shift_pattern,
    si.invitation_code,
    si.invitation_status,
    si.requires_photo_id,
    si.id_type,
    si.id_verified_by,
    si.id_verified_at,
    si.created_by,
    si.created_at,
    si.expires_at,
    si.metadata,
    si.created_by AS creator_user_id,
    b.name AS branch_name
   FROM (public.staff_invitations si
     LEFT JOIN public.branches b ON ((si.branch_id = b.id)))
  WHERE (si.invitation_status = ANY (ARRAY['active'::text, 'pending'::text]));


CREATE OR REPLACE FUNCTION public.create_nigerian_staff_invitation(p_phone_number text, p_department text, p_shift_pattern text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_creator_business_id UUID;
  v_creator_business_uuid UUID; -- ADDED: For your audit_logs table
  v_creator_branch_id UUID;
  v_creator_role TEXT;
  v_invitation_code TEXT;
  v_invitation_id UUID;
  v_branch_name TEXT;
  v_creator_name TEXT;
BEGIN
  -- 1. GET CREATOR CONTEXT WITH BOTH BUSINESS IDENTIFIERS
  SELECT business_id, branch_id, role 
  INTO v_creator_business_id, v_creator_branch_id, v_creator_role
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- CRITICAL: Get business_uuid from businesses table
  -- Your audit_logs expects business_uuid, not business_id
  SELECT id INTO v_creator_business_uuid
  FROM public.businesses 
  WHERE id = v_creator_business_id; -- Assuming businesses.id is the UUID we need
  
  -- Nigerian reality check: Must be manager/owner
  IF v_creator_role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'Only owners/managers can invite staff in Nigerian hospitality';
  END IF;
  
  -- 2. NIGERIAN PHONE VALIDATION
  IF NOT (p_phone_number LIKE '+234%' OR p_phone_number LIKE '234%' OR p_phone_number LIKE '0%') THEN
    RAISE EXCEPTION 'Nigerian phone must start with +234, 234, or 0';
  END IF;
  
  -- Normalize phone number
  DECLARE
    v_normalized_phone TEXT;
  BEGIN
    IF p_phone_number LIKE '0%' THEN
      v_normalized_phone := '+234' || SUBSTRING(p_phone_number FROM 2);
    ELSIF p_phone_number LIKE '234%' THEN
      v_normalized_phone := '+' || p_phone_number;
    ELSE
      v_normalized_phone := p_phone_number;
    END IF;
    
    -- Check if phone already has active profile in this business
    IF EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE phone = v_normalized_phone 
      AND business_id = v_creator_business_id
      AND COALESCE(status, 'active') = 'active'
    ) THEN
      RAISE EXCEPTION 'Phone number already registered at Fobbs Apartments';
    END IF;
  END;
  
  -- 3. GET BRANCH AND CREATOR INFO FOR METADATA
  SELECT name INTO v_branch_name 
  FROM public.branches 
  WHERE id = v_creator_branch_id;
  
  SELECT COALESCE(full_name, 'Manager') INTO v_creator_name
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- 4. GENERATE NIGERIAN-FRIENDLY INVITATION CODE
  WITH chars AS (
    SELECT SUBSTRING('ABCDEFGHJKLMNPQRSTUVWXYZ' FROM (random() * 24 + 1)::INTEGER FOR 1) AS char_part
  ),
  nums AS (
    SELECT SUBSTRING('23456789' FROM (random() * 8 + 1)::INTEGER FOR 1) AS num_part
  )
  SELECT 
    (SELECT char_part FROM chars LIMIT 1) ||
    (SELECT num_part FROM nums LIMIT 1) ||
    (SELECT char_part FROM chars LIMIT 1) ||
    (SELECT num_part FROM nums LIMIT 1) ||
    (SELECT char_part FROM chars LIMIT 1) ||
    (SELECT num_part FROM nums LIMIT 1)
  INTO v_invitation_code;
  
  -- 5. CREATE INVITATION
  INSERT INTO public.staff_invitations (
    phone_number,
    business_id,
    branch_id,
    department,
    shift_pattern,
    invitation_code,
    created_by,
    metadata
  ) VALUES (
    p_phone_number,
    v_creator_business_id,
    v_creator_branch_id,
    p_department,
    p_shift_pattern,
    v_invitation_code,
    auth.uid(),
    jsonb_build_object(
      'nigerian_context', TRUE,
      'business_name', 'Fobbs Apartments Asaba',
      'branch_name', v_branch_name,
      'creator_name', v_creator_name,
      'notes', p_notes,
      'cash_handling_limit', CASE 
        WHEN p_department IN ('reception', 'bar') THEN 50000
        WHEN p_department = 'kitchen' THEN 10000
        ELSE 0
      END,
      'requires_training', CASE 
        WHEN p_department IN ('reception', 'bar') THEN 'cash_handling'
        WHEN p_department = 'security' THEN 'access_control'
        ELSE 'basic_orientation'
      END
    )
  ) RETURNING id INTO v_invitation_id;
  
  -- 6. AUDIT TRAIL - USE business_uuid NOT business_id
  INSERT INTO public.audit_logs (
    business_uuid,  -- CHANGED: Use business_uuid for your table
    branch_id,
    event_type,
    resource_type,
    resource_id,
    actor_id,
    metadata,
    success
  ) VALUES (
    v_creator_business_uuid,  -- CHANGED: Use the UUID from businesses table
    v_creator_branch_id,
    'staff.invitation_sent',
    'invitation',
    v_invitation_id,
    auth.uid(),
    jsonb_build_object(
      'phone', p_phone_number,
      'department', p_department,
      'invitation_code', v_invitation_code,
      'channel', 'whatsapp'
    ),
    true
  );
  
  -- 7. RETURN NIGERIAN-FRIENDLY RESPONSE
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Staff invitation created for Nigerian hospitality workflow',
    'data', jsonb_build_object(
      'invitation_id', v_invitation_id,
      'phone_number', p_phone_number,
      'invitation_code', v_invitation_code,
      'expires_at', (NOW() + INTERVAL '24 hours')::TEXT,
      'next_steps', ARRAY[
        '1. Share this code via WhatsApp: ' || v_invitation_code,
        '2. Staff uses code at staff.fobbs-apartments.com/accept',
        '3. Complete ID verification in-person at reception',
        '4. Set up 4-digit PIN for POS transactions'
      ],
      'nigerian_best_practices', ARRAY[
        'Send code via WhatsApp (not SMS)',
        'Verify staff ID card in-person before access',
        'Set daily cash handling limits by department',
        'Schedule mandatory cashier training'
      ]
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Nigerian error handling - USE business_uuid
  INSERT INTO public.audit_logs (
    business_uuid,  -- CHANGED
    branch_id,
    event_type,
    resource_type,
    actor_id,
    success,
    metadata
  ) VALUES (
    COALESCE(v_creator_business_uuid, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(v_creator_branch_id, '00000000-0000-0000-0000-000000000000'::UUID),
    'staff.invitation_failed',
    'system',
    auth.uid(),
    false,
    jsonb_build_object(
      'phone_attempted', p_phone_number,
      'error', SQLERRM
    )
  );
  
  RAISE EXCEPTION 'Staff invitation failed: %', SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_staff_invitation(p_email text, p_phone text, p_name text, p_branch_id uuid, p_role text, p_department text, p_invited_by uuid, p_business_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_invitation_token uuid;
  v_invitation_code text;
  v_user_id uuid;
begin
  -- secure token
  v_invitation_token := gen_random_uuid();

  -- 6-char human code (fits character(6))
  v_invitation_code := upper(
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)
  );

  -- existing auth user (optional)
  select id into v_user_id
  from auth.users
  where email = p_email
     or phone = p_phone;

  insert into public.staff_invitations (
    token,
    invitation_code,
    user_id,
    email,
    phone_number,
    name,
    branch_id,
    role,
    department,
    business_id,
    invited_by,
    created_by,        -- ✅ FIX
    expires_at,
    status
  ) values (
    v_invitation_token,
    v_invitation_code,
    v_user_id,
    p_email,
    p_phone,
    p_name,
    p_branch_id,
    p_role,
    p_department,
    p_business_id,
    p_invited_by,
    p_invited_by,      -- ✅ FIX
    now() + interval '7 days',
    'pending'
  );

  return jsonb_build_object(
    'success', true,
    'token', v_invitation_token,
    'invitation_code', v_invitation_code,
    'user_id', v_user_id,
    'message', 'Invitation created successfully'
  );

exception when others then
  return jsonb_build_object(
    'success', false,
    'error', sqlerrm
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_staff_member(p_email text, p_role text, p_branch_id uuid, p_department text DEFAULT NULL::text, p_first_name text DEFAULT NULL::text, p_last_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_creator_business_id UUID;
  v_creator_branch_id UUID;
  v_creator_role TEXT;
  v_branch_business_id UUID;
  v_new_user_id UUID;
  v_profile_id UUID;
  v_temp_password TEXT;
  v_result JSONB;
BEGIN
  -- Get creator's business and role
  SELECT business_id, branch_id, role 
  INTO v_creator_business_id, v_creator_branch_id, v_creator_role
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF v_creator_business_id IS NULL THEN
    RAISE EXCEPTION 'You are not registered in the system';
  END IF;
  
  -- Validate permissions: Only owners and managers can create staff
  IF v_creator_role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'Only owners and managers can create staff members';
  END IF;
  
  -- Validate the branch belongs to creator's business
  SELECT business_id INTO v_branch_business_id
  FROM public.branches 
  WHERE id = p_branch_id AND is_active = TRUE;
  
  IF v_branch_business_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive branch';
  END IF;
  
  IF v_branch_business_id != v_creator_business_id THEN
    RAISE EXCEPTION 'Branch does not belong to your business';
  END IF;
  
  -- Validate role hierarchy
  IF v_creator_role = 'manager' THEN
    IF p_role != 'staff' THEN
      RAISE EXCEPTION 'Managers can only create staff members';
    END IF;
    
    IF p_branch_id != v_creator_branch_id THEN
      RAISE EXCEPTION 'Managers can only create staff in their own branch';
    END IF;
  END IF;
  
  -- Validate role is allowed
  IF p_role NOT IN ('manager', 'staff') THEN
    RAISE EXCEPTION 'Role must be either "manager" or "staff"';
  END IF;
  
  -- Generate a temporary user ID (in production: create auth user via Edge Function)
  v_new_user_id := gen_random_uuid();
  v_temp_password := substr(md5(random()::text), 1, 12);
  
  -- Create the staff profile WITHOUT metadata column
  INSERT INTO public.profiles (
    user_id,
    business_id,
    branch_id,
    role,
    department,
    first_name,
    last_name,
    phone,
    created_by,
    status,
    invitation_sent_at,
    last_activity_at
  ) VALUES (
    v_new_user_id,
    v_creator_business_id,
    p_branch_id,
    p_role,
    p_department,
    p_first_name,
    p_last_name,
    p_phone,
    auth.uid(),
    'pending',
    NOW(),
    NOW()
  ) RETURNING id INTO v_profile_id;
  
  -- Log the creation in audit logs
  INSERT INTO public.audit_logs (
    business_id,
    branch_id,
    event_type,
    resource_type,
    resource_id,
    actor_id,
    metadata,
    success
  ) VALUES (
    v_creator_business_id,
    p_branch_id,
    'staff.created',
    'staff',
    v_new_user_id,
    auth.uid(),
    jsonb_build_object(
      'email', p_email,
      'role', p_role,
      'department', p_department,
      'profile_id', v_profile_id,
      'branch_id', p_branch_id,
      'temp_password', v_temp_password -- For demo only!
    ),
    true
  );
  
  -- Create invitation in notification outbox
  INSERT INTO public.notification_outbox (
    business_id,
    branch_id,
    notification_type,
    recipient_email,
    recipient_user_id,
    subject,
    body,
    metadata,
    status
  ) VALUES (
    v_creator_business_id,
    p_branch_id,
    'staff_invitation',
    p_email,
    v_new_user_id,
    'Invitation to Join Fobbs Apartments',
    CONCAT(
      'You have been invited to join Fobbs Apartments Asaba as ', 
      p_role, 
      CASE WHEN p_department IS NOT NULL THEN CONCAT(' (', p_department, ')') ELSE '' END,
      '.\n\n',
      'Please use the following credentials to login:\n',
      'Email: ', p_email, '\n',
      'Temporary Password: ', v_temp_password, '\n\n',
      'You will be required to change your password on first login.'
    ),
    jsonb_build_object(
      'profile_id', v_profile_id,
      'role', p_role,
      'branch_id', p_branch_id,
      'invited_by', auth.uid()
    ),
    'pending'
  );
  
  -- Return success result
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Staff member created successfully. Invitation sent.',
    'data', jsonb_build_object(
      'user_id', v_new_user_id,
      'profile_id', v_profile_id,
      'email', p_email,
      'role', p_role,
      'branch_id', p_branch_id,
      'department', p_department,
      'status', 'pending'
    )
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  -- Log error
  INSERT INTO public.audit_logs (
    business_id,
    branch_id,
    event_type,
    resource_type,
    actor_id,
    success,
    metadata
  ) VALUES (
    COALESCE(v_creator_business_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(v_creator_branch_id, '00000000-0000-0000-0000-000000000000'::UUID),
    'staff.creation_failed',
    'system',
    auth.uid(),
    false,
    jsonb_build_object(
      'error', SQLERRM,
      'email', p_email,
      'role', p_role,
      'stack', SQLSTATE
    )
  );
  
  RAISE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_branch_staff(p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, email text, full_name text, role text, department text, phone text, branch_name text, branch_code text, status text, created_at timestamp with time zone, last_activity timestamp with time zone, created_by_name text, action_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Since profiles doesn't have metadata or email, we'll get email from auth.users
  -- and use first_name/last_name if they exist, otherwise use user_id as fallback
  RETURN QUERY
  SELECT 
    p.user_id,
    COALESCE(u.email, p.user_id::TEXT) AS email, -- Fallback to user_id if no email
    CONCAT(
      COALESCE(p.first_name, 'User'),
      CASE WHEN p.first_name IS NOT NULL AND p.last_name IS NOT NULL THEN ' ' ELSE '' END,
      COALESCE(p.last_name, '')
    ) AS full_name,
    p.role,
    COALESCE(p.department, 'Not assigned') AS department,
    COALESCE(p.phone, 'Not provided') AS phone,
    b.name AS branch_name,
    b.code AS branch_code,
    COALESCE(p.status, 'active') AS status,
    p.created_at,
    COALESCE(p.last_activity_at, p.created_at) AS last_activity,
    COALESCE(
      CONCAT(
        COALESCE(cp.first_name, 'System'),
        CASE WHEN cp.first_name IS NOT NULL AND cp.last_name IS NOT NULL THEN ' ' ELSE '' END,
        COALESCE(cp.last_name, '')
      ),
      'System'
    ) AS created_by_name,
    COUNT(DISTINCT al.id) AS action_count
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN public.branches b ON b.id = p.branch_id
  LEFT JOIN public.profiles cp ON cp.user_id = p.created_by
  LEFT JOIN public.audit_logs al ON al.actor_id = p.user_id
  WHERE p.business_id = (
    SELECT business_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
  )
  AND p.role IN ('manager', 'staff')
  AND (p_branch_id IS NULL OR p.branch_id = p_branch_id)
  GROUP BY p.user_id, p.first_name, p.last_name, p.role, p.department, 
           p.phone, b.name, b.code, p.status, p.created_at, 
           p.last_activity_at, u.email, cp.first_name, cp.last_name
  ORDER BY 
    CASE p.role 
      WHEN 'manager' THEN 1
      WHEN 'staff' THEN 2
      ELSE 3
    END,
    p.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_invitation_stats()
 RETURNS TABLE(total_invitations bigint, active_invitations bigint, pending_invitations bigint, verification_rate numeric, most_active_department text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_invitations,
        COUNT(CASE WHEN invitation_status = 'active' THEN 1 END) as active_invitations,
        COUNT(CASE WHEN invitation_status = 'pending' THEN 1 END) as pending_invitations,
        ROUND(COUNT(CASE WHEN id_verified_at IS NOT NULL THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as verification_rate,
        (SELECT department FROM staff_invitations WHERE department IS NOT NULL GROUP BY department ORDER BY COUNT(*) DESC LIMIT 1) as most_active_department
    FROM staff_invitations;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Check if profile already exists (shouldn't, but safe)
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = NEW.id) THEN
    -- Try to get invitation data if exists
    INSERT INTO public.profiles (
      id,
      user_id,
      email,
      phone,
      name,
      business_id,
      branch_id,
      role,
      department,
      status,
      is_active,
      created_by
    )
    SELECT 
      gen_random_uuid(),
      NEW.id,
      NEW.email,
      si.phone,
      si.name,
      COALESCE(si.business_id, (SELECT id FROM businesses LIMIT 1)),
      si.branch_id,
      COALESCE(si.role, 'staff'),
      COALESCE(si.department, 'general'),
      'active',
      true,
      si.invited_by
    FROM staff_invitations si
    WHERE si.user_id = NEW.id
    AND si.status = 'pending'
    LIMIT 1;
    
    -- If no invitation found, create minimal profile
    IF NOT FOUND THEN
      INSERT INTO public.profiles (
        id,
        user_id,
        email,
        business_id,
        role,
        status,
        is_active
      ) VALUES (
        gen_random_uuid(),
        NEW.id,
        NEW.email,
        (SELECT id FROM businesses LIMIT 1),
        'staff',
        'active',
        true
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin_for_business(p_business_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.business_id = p_business_id
      and p.role in ('ceo','manager')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select exists (
    select 1
    from public.org_members m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin','manager')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select exists (
    select 1
    from public.org_members m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
  );
$function$
;

CREATE OR REPLACE FUNCTION public.log_audit_event(p_business_uuid uuid, p_event_type text, p_actor_id uuid DEFAULT NULL::uuid, p_resource_type text DEFAULT NULL::text, p_resource_id text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_correlation_id text DEFAULT NULL::text, p_success boolean DEFAULT true, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_audit_id BIGINT;
BEGIN
  INSERT INTO audit_logs (
    business_uuid,
    event_type,
    actor_id,
    resource_type,
    resource_id,
    metadata,
    correlation_id,
    success,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    p_business_uuid,
    p_event_type,
    p_actor_id,
    p_resource_type,
    p_resource_id,
    p_metadata,
    COALESCE(p_correlation_id, 'sys_' || EXTRACT(EPOCH FROM NOW())::bigint::text || '_' || FLOOR(RANDOM() * 10000)::text),
    p_success,
    p_ip_address,
    p_user_agent,
    NOW()
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_audit_event(p_correlation_id text, p_business_id uuid, p_actor_id uuid, p_action text, p_resource_type text DEFAULT NULL::text, p_resource_id text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_audit_id BIGINT;
BEGIN
  INSERT INTO audit_logs (
    correlation_id,
    business_id,
    actor_id,
    action,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    p_correlation_id,
    p_business_id,
    p_actor_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_metadata
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_audit_event_simple(p_business_uuid uuid, p_event_type text, p_actor_id uuid DEFAULT NULL::uuid, p_resource_type text DEFAULT NULL::text, p_resource_id text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_audit_id BIGINT;
BEGIN
  INSERT INTO audit_logs (
    business_uuid,
    event_type,
    actor_id,
    resource_type,
    resource_id,
    created_at
  ) VALUES (
    p_business_uuid,
    p_event_type,
    p_actor_id,
    p_resource_type,
    p_resource_id,
    NOW()
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_staff_creation(p_business_uuid uuid, p_actor_uuid uuid, p_staff_email text, p_correlation_id text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_audit_id BIGINT;
BEGIN
  -- Insert using event_type (NOT NULL column)
  INSERT INTO audit_logs (
    business_uuid,
    actor_id,
    event_type,           -- ← NOT NULL column
    resource_type,
    resource_id,
    metadata,
    correlation_id,
    success,
    created_at
  ) VALUES (
    p_business_uuid,
    p_actor_uuid,
    'staff.created',      -- ← Goes into event_type
    'staff',
    p_staff_email,
    jsonb_build_object('email', p_staff_email, 'action', 'create'),
    COALESCE(p_correlation_id, 'sys_' || EXTRACT(EPOCH FROM NOW())::bigint::text),
    TRUE,
    NOW()
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update public.user_notifications
  set read_at = now()
  where id = p_id and user_id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.outbox_mark_failed(p_outbox_id uuid, p_error text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_attempts int;
  v_next timestamptz;
begin
  select attempts into v_attempts
  from public.notification_outbox
  where id = p_outbox_id;

  if v_attempts is null then
    return;
  end if;

  -- simple backoff schedule: 1m, 5m, 15m, 1h, 6h, 24h, then stop
  v_next :=
    case v_attempts
      when 0 then now() + interval '1 minute'
      when 1 then now() + interval '5 minutes'
      when 2 then now() + interval '15 minutes'
      when 3 then now() + interval '1 hour'
      when 4 then now() + interval '6 hours'
      when 5 then now() + interval '24 hours'
      else now() + interval '365 days'
    end;

  update public.notification_outbox
  set status = case when v_attempts >= 6 then 'failed' else 'queued' end,
      attempts = attempts + 1,
      last_error = left(p_error, 500),
      scheduled_at = v_next,
      updated_at = now()
  where id = p_outbox_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.outbox_mark_sent(p_outbox_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.notification_outbox
  set status = 'sent',
      sent_at = now(),
      updated_at = now()
  where id = p_outbox_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.outbox_pull(p_batch_size integer DEFAULT 10)
 RETURNS TABLE(id uuid, business_id uuid, channel text, to_address text, template_key text, payload jsonb, attempts integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Mark a small batch as 'sending' to avoid double-sends
  return query
  with picked as (
    select o.id
    from public.notification_outbox o
    where o.status = 'queued'
      and o.scheduled_at <= now()
      and o.attempts < 7
    order by o.scheduled_at asc
    limit p_batch_size
    for update skip locked
  )
  update public.notification_outbox o
  set status = 'sending',
      updated_at = now()
  from picked
  where o.id = picked.id
  returning o.id, o.business_id, o.channel, o.to_address, o.template_key, o.payload, o.attempts;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.queue_ceo_alert(p_business_id uuid, p_severity text, p_title text, p_message text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_whatsapp text;
  v_telegram text;
begin
  select ceo_whatsapp, ceo_telegram
    into v_whatsapp, v_telegram
  from public.business_settings
  where business_id = p_business_id;

  if v_whatsapp is null and v_telegram is null then
    raise exception 'CEO contact not set in business_settings for business_id %', p_business_id;
  end if;

  if v_whatsapp is not null then
    insert into public.notification_outbox (
      business_id, channel, to_address, template_key, payload, status
    )
    values (
      p_business_id, 'whatsapp', v_whatsapp, 'ceo_anomaly_alert',
      jsonb_build_object(
        'severity', p_severity,
        'title', p_title,
        'message', p_message
      ),
      'queued'
    );
  end if;

  if v_telegram is not null then
    insert into public.notification_outbox (
      business_id, channel, to_address, template_key, payload, status
    )
    values (
      p_business_id, 'telegram', v_telegram, 'ceo_anomaly_alert',
      jsonb_build_object(
        'severity', p_severity,
        'title', p_title,
        'message', p_message
      ),
      'queued'
    );
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.reverse_payment(p_payment_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_business_id uuid;
  v_amount bigint;
begin
  select business_id, amount_ngn
    into v_business_id, v_amount
  from public.payments
  where id = p_payment_id;

  if v_business_id is null then
    raise exception 'Payment not found';
  end if;

  if public.is_admin_for_business(v_business_id) = false then
    raise exception 'Not authorized';
  end if;

  update public.payments
  set status = 'reversed',
      reversed_by = auth.uid(),
      reversed_at = now(),
      reversal_reason = p_reason,
      updated_at = now()
  where id = p_payment_id;

  insert into public.payment_audit (business_id, payment_id, action, actor_user_id, note, meta)
  values (v_business_id, p_payment_id, 'reversed', auth.uid(), 'Payment reversed', jsonb_build_object('amount_ngn', v_amount, 'reason', p_reason));
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.update_staff_status(p_user_id uuid, p_status text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_creator_business_id UUID;
  v_creator_role TEXT;
  v_staff_business_id UUID;
  v_staff_branch_id UUID;
  v_old_status TEXT;
  v_staff_role TEXT;
BEGIN
  -- Get creator's context
  SELECT business_id, role 
  INTO v_creator_business_id, v_creator_role
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- Get staff member's context
  SELECT business_id, branch_id, status, role
  INTO v_staff_business_id, v_staff_branch_id, v_old_status, v_staff_role
  FROM public.profiles 
  WHERE user_id = p_user_id;
  
  -- Validate permissions
  IF v_creator_role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'Only owners and managers can update staff status';
  END IF;
  
  -- Validate business match
  IF v_staff_business_id != v_creator_business_id THEN
    RAISE EXCEPTION 'Cannot modify staff from another business';
  END IF;
  
  -- Managers can only manage staff in their branch and cannot suspend managers
  IF v_creator_role = 'manager' THEN
    DECLARE
      v_manager_branch_id UUID;
    BEGIN
      SELECT branch_id INTO v_manager_branch_id
      FROM public.profiles 
      WHERE user_id = auth.uid();
      
      IF v_staff_branch_id != v_manager_branch_id THEN
        RAISE EXCEPTION 'Managers can only manage staff in their own branch';
      END IF;
      
      IF v_staff_role = 'manager' THEN
        RAISE EXCEPTION 'Managers cannot modify other managers';
      END IF;
    END;
  END IF;
  
  -- Validate status
  IF p_status NOT IN ('active', 'suspended', 'inactive') THEN
    RAISE EXCEPTION 'Invalid status. Must be active, suspended, or inactive';
  END IF;
  
  -- Update the staff member's status
  UPDATE public.profiles 
  SET 
    status = p_status,
    last_activity_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Log the status change
  INSERT INTO public.audit_logs (
    business_id,
    branch_id,
    event_type,
    resource_type,
    resource_id,
    actor_id,
    metadata,
    success
  ) VALUES (
    v_creator_business_id,
    v_staff_branch_id,
    'staff.status_updated',
    'staff',
    p_user_id,
    auth.uid(),
    jsonb_build_object(
      'old_status', v_old_status,
      'new_status', p_status,
      'reason', p_reason,
      'user_id', p_user_id,
      'staff_role', v_staff_role
    ),
    true
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', CONCAT('Staff status updated to ', p_status),
    'data', jsonb_build_object(
      'user_id', p_user_id,
      'old_status', v_old_status,
      'new_status', p_status,
      'updated_at', NOW()
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.verify_payment(p_payment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_business_id uuid;
  v_amount bigint;
begin
  select business_id, amount_ngn
    into v_business_id, v_amount
  from public.payments
  where id = p_payment_id;

  if v_business_id is null then
    raise exception 'Payment not found';
  end if;

  if public.is_admin_for_business(v_business_id) = false then
    raise exception 'Not authorized';
  end if;

  update public.payments
  set status = 'verified',
      verified_by = auth.uid(),
      verified_at = now(),
      updated_at = now()
  where id = p_payment_id;

  insert into public.payment_audit (business_id, payment_id, action, actor_user_id, note, meta)
  values (v_business_id, p_payment_id, 'verified', auth.uid(), 'Payment verified', jsonb_build_object('amount_ngn', v_amount));
end;
$function$
;

grant delete on table "public"."audit_logs" to "anon";

grant insert on table "public"."audit_logs" to "anon";

grant references on table "public"."audit_logs" to "anon";

grant select on table "public"."audit_logs" to "anon";

grant trigger on table "public"."audit_logs" to "anon";

grant truncate on table "public"."audit_logs" to "anon";

grant update on table "public"."audit_logs" to "anon";

grant delete on table "public"."audit_logs" to "authenticated";

grant insert on table "public"."audit_logs" to "authenticated";

grant references on table "public"."audit_logs" to "authenticated";

grant select on table "public"."audit_logs" to "authenticated";

grant trigger on table "public"."audit_logs" to "authenticated";

grant truncate on table "public"."audit_logs" to "authenticated";

grant update on table "public"."audit_logs" to "authenticated";

grant delete on table "public"."audit_logs" to "service_role";

grant insert on table "public"."audit_logs" to "service_role";

grant references on table "public"."audit_logs" to "service_role";

grant select on table "public"."audit_logs" to "service_role";

grant trigger on table "public"."audit_logs" to "service_role";

grant truncate on table "public"."audit_logs" to "service_role";

grant update on table "public"."audit_logs" to "service_role";

grant delete on table "public"."bookings" to "anon";

grant insert on table "public"."bookings" to "anon";

grant references on table "public"."bookings" to "anon";

grant select on table "public"."bookings" to "anon";

grant trigger on table "public"."bookings" to "anon";

grant truncate on table "public"."bookings" to "anon";

grant update on table "public"."bookings" to "anon";

grant delete on table "public"."bookings" to "authenticated";

grant insert on table "public"."bookings" to "authenticated";

grant references on table "public"."bookings" to "authenticated";

grant select on table "public"."bookings" to "authenticated";

grant trigger on table "public"."bookings" to "authenticated";

grant truncate on table "public"."bookings" to "authenticated";

grant update on table "public"."bookings" to "authenticated";

grant delete on table "public"."bookings" to "service_role";

grant insert on table "public"."bookings" to "service_role";

grant references on table "public"."bookings" to "service_role";

grant select on table "public"."bookings" to "service_role";

grant trigger on table "public"."bookings" to "service_role";

grant truncate on table "public"."bookings" to "service_role";

grant update on table "public"."bookings" to "service_role";

grant delete on table "public"."branches" to "anon";

grant insert on table "public"."branches" to "anon";

grant references on table "public"."branches" to "anon";

grant select on table "public"."branches" to "anon";

grant trigger on table "public"."branches" to "anon";

grant truncate on table "public"."branches" to "anon";

grant update on table "public"."branches" to "anon";

grant delete on table "public"."branches" to "authenticated";

grant insert on table "public"."branches" to "authenticated";

grant references on table "public"."branches" to "authenticated";

grant select on table "public"."branches" to "authenticated";

grant trigger on table "public"."branches" to "authenticated";

grant truncate on table "public"."branches" to "authenticated";

grant update on table "public"."branches" to "authenticated";

grant delete on table "public"."branches" to "service_role";

grant insert on table "public"."branches" to "service_role";

grant references on table "public"."branches" to "service_role";

grant select on table "public"."branches" to "service_role";

grant trigger on table "public"."branches" to "service_role";

grant truncate on table "public"."branches" to "service_role";

grant update on table "public"."branches" to "service_role";

grant delete on table "public"."business_settings" to "anon";

grant insert on table "public"."business_settings" to "anon";

grant references on table "public"."business_settings" to "anon";

grant select on table "public"."business_settings" to "anon";

grant trigger on table "public"."business_settings" to "anon";

grant truncate on table "public"."business_settings" to "anon";

grant update on table "public"."business_settings" to "anon";

grant delete on table "public"."business_settings" to "authenticated";

grant insert on table "public"."business_settings" to "authenticated";

grant references on table "public"."business_settings" to "authenticated";

grant select on table "public"."business_settings" to "authenticated";

grant trigger on table "public"."business_settings" to "authenticated";

grant truncate on table "public"."business_settings" to "authenticated";

grant update on table "public"."business_settings" to "authenticated";

grant delete on table "public"."business_settings" to "service_role";

grant insert on table "public"."business_settings" to "service_role";

grant references on table "public"."business_settings" to "service_role";

grant select on table "public"."business_settings" to "service_role";

grant trigger on table "public"."business_settings" to "service_role";

grant truncate on table "public"."business_settings" to "service_role";

grant update on table "public"."business_settings" to "service_role";

grant delete on table "public"."businesses" to "anon";

grant insert on table "public"."businesses" to "anon";

grant references on table "public"."businesses" to "anon";

grant select on table "public"."businesses" to "anon";

grant trigger on table "public"."businesses" to "anon";

grant truncate on table "public"."businesses" to "anon";

grant update on table "public"."businesses" to "anon";

grant delete on table "public"."businesses" to "authenticated";

grant insert on table "public"."businesses" to "authenticated";

grant references on table "public"."businesses" to "authenticated";

grant select on table "public"."businesses" to "authenticated";

grant trigger on table "public"."businesses" to "authenticated";

grant truncate on table "public"."businesses" to "authenticated";

grant update on table "public"."businesses" to "authenticated";

grant delete on table "public"."businesses" to "service_role";

grant insert on table "public"."businesses" to "service_role";

grant references on table "public"."businesses" to "service_role";

grant select on table "public"."businesses" to "service_role";

grant trigger on table "public"."businesses" to "service_role";

grant truncate on table "public"."businesses" to "service_role";

grant update on table "public"."businesses" to "service_role";

grant delete on table "public"."customers" to "anon";

grant insert on table "public"."customers" to "anon";

grant references on table "public"."customers" to "anon";

grant select on table "public"."customers" to "anon";

grant trigger on table "public"."customers" to "anon";

grant truncate on table "public"."customers" to "anon";

grant update on table "public"."customers" to "anon";

grant delete on table "public"."customers" to "authenticated";

grant insert on table "public"."customers" to "authenticated";

grant references on table "public"."customers" to "authenticated";

grant select on table "public"."customers" to "authenticated";

grant trigger on table "public"."customers" to "authenticated";

grant truncate on table "public"."customers" to "authenticated";

grant update on table "public"."customers" to "authenticated";

grant delete on table "public"."customers" to "service_role";

grant insert on table "public"."customers" to "service_role";

grant references on table "public"."customers" to "service_role";

grant select on table "public"."customers" to "service_role";

grant trigger on table "public"."customers" to "service_role";

grant truncate on table "public"."customers" to "service_role";

grant update on table "public"."customers" to "service_role";

grant delete on table "public"."lead_followups" to "anon";

grant insert on table "public"."lead_followups" to "anon";

grant references on table "public"."lead_followups" to "anon";

grant select on table "public"."lead_followups" to "anon";

grant trigger on table "public"."lead_followups" to "anon";

grant truncate on table "public"."lead_followups" to "anon";

grant update on table "public"."lead_followups" to "anon";

grant delete on table "public"."lead_followups" to "authenticated";

grant insert on table "public"."lead_followups" to "authenticated";

grant references on table "public"."lead_followups" to "authenticated";

grant select on table "public"."lead_followups" to "authenticated";

grant trigger on table "public"."lead_followups" to "authenticated";

grant truncate on table "public"."lead_followups" to "authenticated";

grant update on table "public"."lead_followups" to "authenticated";

grant delete on table "public"."lead_followups" to "service_role";

grant insert on table "public"."lead_followups" to "service_role";

grant references on table "public"."lead_followups" to "service_role";

grant select on table "public"."lead_followups" to "service_role";

grant trigger on table "public"."lead_followups" to "service_role";

grant truncate on table "public"."lead_followups" to "service_role";

grant update on table "public"."lead_followups" to "service_role";

grant delete on table "public"."leads" to "anon";

grant insert on table "public"."leads" to "anon";

grant references on table "public"."leads" to "anon";

grant select on table "public"."leads" to "anon";

grant trigger on table "public"."leads" to "anon";

grant truncate on table "public"."leads" to "anon";

grant update on table "public"."leads" to "anon";

grant delete on table "public"."leads" to "authenticated";

grant insert on table "public"."leads" to "authenticated";

grant references on table "public"."leads" to "authenticated";

grant select on table "public"."leads" to "authenticated";

grant trigger on table "public"."leads" to "authenticated";

grant truncate on table "public"."leads" to "authenticated";

grant update on table "public"."leads" to "authenticated";

grant delete on table "public"."leads" to "service_role";

grant insert on table "public"."leads" to "service_role";

grant references on table "public"."leads" to "service_role";

grant select on table "public"."leads" to "service_role";

grant trigger on table "public"."leads" to "service_role";

grant truncate on table "public"."leads" to "service_role";

grant update on table "public"."leads" to "service_role";

grant delete on table "public"."locations" to "anon";

grant insert on table "public"."locations" to "anon";

grant references on table "public"."locations" to "anon";

grant select on table "public"."locations" to "anon";

grant trigger on table "public"."locations" to "anon";

grant truncate on table "public"."locations" to "anon";

grant update on table "public"."locations" to "anon";

grant delete on table "public"."locations" to "authenticated";

grant insert on table "public"."locations" to "authenticated";

grant references on table "public"."locations" to "authenticated";

grant select on table "public"."locations" to "authenticated";

grant trigger on table "public"."locations" to "authenticated";

grant truncate on table "public"."locations" to "authenticated";

grant update on table "public"."locations" to "authenticated";

grant delete on table "public"."locations" to "service_role";

grant insert on table "public"."locations" to "service_role";

grant references on table "public"."locations" to "service_role";

grant select on table "public"."locations" to "service_role";

grant trigger on table "public"."locations" to "service_role";

grant truncate on table "public"."locations" to "service_role";

grant update on table "public"."locations" to "service_role";

grant delete on table "public"."loyalty_accounts" to "anon";

grant insert on table "public"."loyalty_accounts" to "anon";

grant references on table "public"."loyalty_accounts" to "anon";

grant select on table "public"."loyalty_accounts" to "anon";

grant trigger on table "public"."loyalty_accounts" to "anon";

grant truncate on table "public"."loyalty_accounts" to "anon";

grant update on table "public"."loyalty_accounts" to "anon";

grant delete on table "public"."loyalty_accounts" to "authenticated";

grant insert on table "public"."loyalty_accounts" to "authenticated";

grant references on table "public"."loyalty_accounts" to "authenticated";

grant select on table "public"."loyalty_accounts" to "authenticated";

grant trigger on table "public"."loyalty_accounts" to "authenticated";

grant truncate on table "public"."loyalty_accounts" to "authenticated";

grant update on table "public"."loyalty_accounts" to "authenticated";

grant delete on table "public"."loyalty_accounts" to "service_role";

grant insert on table "public"."loyalty_accounts" to "service_role";

grant references on table "public"."loyalty_accounts" to "service_role";

grant select on table "public"."loyalty_accounts" to "service_role";

grant trigger on table "public"."loyalty_accounts" to "service_role";

grant truncate on table "public"."loyalty_accounts" to "service_role";

grant update on table "public"."loyalty_accounts" to "service_role";

grant delete on table "public"."notification_outbox" to "anon";

grant insert on table "public"."notification_outbox" to "anon";

grant references on table "public"."notification_outbox" to "anon";

grant select on table "public"."notification_outbox" to "anon";

grant trigger on table "public"."notification_outbox" to "anon";

grant truncate on table "public"."notification_outbox" to "anon";

grant update on table "public"."notification_outbox" to "anon";

grant delete on table "public"."notification_outbox" to "authenticated";

grant insert on table "public"."notification_outbox" to "authenticated";

grant references on table "public"."notification_outbox" to "authenticated";

grant select on table "public"."notification_outbox" to "authenticated";

grant trigger on table "public"."notification_outbox" to "authenticated";

grant truncate on table "public"."notification_outbox" to "authenticated";

grant update on table "public"."notification_outbox" to "authenticated";

grant delete on table "public"."notification_outbox" to "service_role";

grant insert on table "public"."notification_outbox" to "service_role";

grant references on table "public"."notification_outbox" to "service_role";

grant select on table "public"."notification_outbox" to "service_role";

grant trigger on table "public"."notification_outbox" to "service_role";

grant truncate on table "public"."notification_outbox" to "service_role";

grant update on table "public"."notification_outbox" to "service_role";

grant delete on table "public"."order_items" to "anon";

grant insert on table "public"."order_items" to "anon";

grant references on table "public"."order_items" to "anon";

grant select on table "public"."order_items" to "anon";

grant trigger on table "public"."order_items" to "anon";

grant truncate on table "public"."order_items" to "anon";

grant update on table "public"."order_items" to "anon";

grant delete on table "public"."order_items" to "authenticated";

grant insert on table "public"."order_items" to "authenticated";

grant references on table "public"."order_items" to "authenticated";

grant select on table "public"."order_items" to "authenticated";

grant trigger on table "public"."order_items" to "authenticated";

grant truncate on table "public"."order_items" to "authenticated";

grant update on table "public"."order_items" to "authenticated";

grant delete on table "public"."order_items" to "service_role";

grant insert on table "public"."order_items" to "service_role";

grant references on table "public"."order_items" to "service_role";

grant select on table "public"."order_items" to "service_role";

grant trigger on table "public"."order_items" to "service_role";

grant truncate on table "public"."order_items" to "service_role";

grant update on table "public"."order_items" to "service_role";

grant delete on table "public"."orders" to "anon";

grant insert on table "public"."orders" to "anon";

grant references on table "public"."orders" to "anon";

grant select on table "public"."orders" to "anon";

grant trigger on table "public"."orders" to "anon";

grant truncate on table "public"."orders" to "anon";

grant update on table "public"."orders" to "anon";

grant delete on table "public"."orders" to "authenticated";

grant insert on table "public"."orders" to "authenticated";

grant references on table "public"."orders" to "authenticated";

grant select on table "public"."orders" to "authenticated";

grant trigger on table "public"."orders" to "authenticated";

grant truncate on table "public"."orders" to "authenticated";

grant update on table "public"."orders" to "authenticated";

grant delete on table "public"."orders" to "service_role";

grant insert on table "public"."orders" to "service_role";

grant references on table "public"."orders" to "service_role";

grant select on table "public"."orders" to "service_role";

grant trigger on table "public"."orders" to "service_role";

grant truncate on table "public"."orders" to "service_role";

grant update on table "public"."orders" to "service_role";

grant delete on table "public"."org_members" to "anon";

grant insert on table "public"."org_members" to "anon";

grant references on table "public"."org_members" to "anon";

grant select on table "public"."org_members" to "anon";

grant trigger on table "public"."org_members" to "anon";

grant truncate on table "public"."org_members" to "anon";

grant update on table "public"."org_members" to "anon";

grant delete on table "public"."org_members" to "authenticated";

grant insert on table "public"."org_members" to "authenticated";

grant references on table "public"."org_members" to "authenticated";

grant select on table "public"."org_members" to "authenticated";

grant trigger on table "public"."org_members" to "authenticated";

grant truncate on table "public"."org_members" to "authenticated";

grant update on table "public"."org_members" to "authenticated";

grant delete on table "public"."org_members" to "service_role";

grant insert on table "public"."org_members" to "service_role";

grant references on table "public"."org_members" to "service_role";

grant select on table "public"."org_members" to "service_role";

grant trigger on table "public"."org_members" to "service_role";

grant truncate on table "public"."org_members" to "service_role";

grant update on table "public"."org_members" to "service_role";

grant delete on table "public"."orgs" to "anon";

grant insert on table "public"."orgs" to "anon";

grant references on table "public"."orgs" to "anon";

grant select on table "public"."orgs" to "anon";

grant trigger on table "public"."orgs" to "anon";

grant truncate on table "public"."orgs" to "anon";

grant update on table "public"."orgs" to "anon";

grant delete on table "public"."orgs" to "authenticated";

grant insert on table "public"."orgs" to "authenticated";

grant references on table "public"."orgs" to "authenticated";

grant select on table "public"."orgs" to "authenticated";

grant trigger on table "public"."orgs" to "authenticated";

grant truncate on table "public"."orgs" to "authenticated";

grant update on table "public"."orgs" to "authenticated";

grant delete on table "public"."orgs" to "service_role";

grant insert on table "public"."orgs" to "service_role";

grant references on table "public"."orgs" to "service_role";

grant select on table "public"."orgs" to "service_role";

grant trigger on table "public"."orgs" to "service_role";

grant truncate on table "public"."orgs" to "service_role";

grant update on table "public"."orgs" to "service_role";

grant delete on table "public"."payment_audit" to "anon";

grant insert on table "public"."payment_audit" to "anon";

grant references on table "public"."payment_audit" to "anon";

grant select on table "public"."payment_audit" to "anon";

grant trigger on table "public"."payment_audit" to "anon";

grant truncate on table "public"."payment_audit" to "anon";

grant update on table "public"."payment_audit" to "anon";

grant delete on table "public"."payment_audit" to "authenticated";

grant insert on table "public"."payment_audit" to "authenticated";

grant references on table "public"."payment_audit" to "authenticated";

grant select on table "public"."payment_audit" to "authenticated";

grant trigger on table "public"."payment_audit" to "authenticated";

grant truncate on table "public"."payment_audit" to "authenticated";

grant update on table "public"."payment_audit" to "authenticated";

grant delete on table "public"."payment_audit" to "service_role";

grant insert on table "public"."payment_audit" to "service_role";

grant references on table "public"."payment_audit" to "service_role";

grant select on table "public"."payment_audit" to "service_role";

grant trigger on table "public"."payment_audit" to "service_role";

grant truncate on table "public"."payment_audit" to "service_role";

grant update on table "public"."payment_audit" to "service_role";

grant delete on table "public"."payment_disputes" to "anon";

grant insert on table "public"."payment_disputes" to "anon";

grant references on table "public"."payment_disputes" to "anon";

grant select on table "public"."payment_disputes" to "anon";

grant trigger on table "public"."payment_disputes" to "anon";

grant truncate on table "public"."payment_disputes" to "anon";

grant update on table "public"."payment_disputes" to "anon";

grant delete on table "public"."payment_disputes" to "authenticated";

grant insert on table "public"."payment_disputes" to "authenticated";

grant references on table "public"."payment_disputes" to "authenticated";

grant select on table "public"."payment_disputes" to "authenticated";

grant trigger on table "public"."payment_disputes" to "authenticated";

grant truncate on table "public"."payment_disputes" to "authenticated";

grant update on table "public"."payment_disputes" to "authenticated";

grant delete on table "public"."payment_disputes" to "service_role";

grant insert on table "public"."payment_disputes" to "service_role";

grant references on table "public"."payment_disputes" to "service_role";

grant select on table "public"."payment_disputes" to "service_role";

grant trigger on table "public"."payment_disputes" to "service_role";

grant truncate on table "public"."payment_disputes" to "service_role";

grant update on table "public"."payment_disputes" to "service_role";

grant delete on table "public"."payments" to "anon";

grant insert on table "public"."payments" to "anon";

grant references on table "public"."payments" to "anon";

grant select on table "public"."payments" to "anon";

grant trigger on table "public"."payments" to "anon";

grant truncate on table "public"."payments" to "anon";

grant update on table "public"."payments" to "anon";

grant delete on table "public"."payments" to "authenticated";

grant insert on table "public"."payments" to "authenticated";

grant references on table "public"."payments" to "authenticated";

grant select on table "public"."payments" to "authenticated";

grant trigger on table "public"."payments" to "authenticated";

grant truncate on table "public"."payments" to "authenticated";

grant update on table "public"."payments" to "authenticated";

grant delete on table "public"."payments" to "service_role";

grant insert on table "public"."payments" to "service_role";

grant references on table "public"."payments" to "service_role";

grant select on table "public"."payments" to "service_role";

grant trigger on table "public"."payments" to "service_role";

grant truncate on table "public"."payments" to "service_role";

grant update on table "public"."payments" to "service_role";

grant delete on table "public"."pipeline_stages" to "anon";

grant insert on table "public"."pipeline_stages" to "anon";

grant references on table "public"."pipeline_stages" to "anon";

grant select on table "public"."pipeline_stages" to "anon";

grant trigger on table "public"."pipeline_stages" to "anon";

grant truncate on table "public"."pipeline_stages" to "anon";

grant update on table "public"."pipeline_stages" to "anon";

grant delete on table "public"."pipeline_stages" to "authenticated";

grant insert on table "public"."pipeline_stages" to "authenticated";

grant references on table "public"."pipeline_stages" to "authenticated";

grant select on table "public"."pipeline_stages" to "authenticated";

grant trigger on table "public"."pipeline_stages" to "authenticated";

grant truncate on table "public"."pipeline_stages" to "authenticated";

grant update on table "public"."pipeline_stages" to "authenticated";

grant delete on table "public"."pipeline_stages" to "service_role";

grant insert on table "public"."pipeline_stages" to "service_role";

grant references on table "public"."pipeline_stages" to "service_role";

grant select on table "public"."pipeline_stages" to "service_role";

grant trigger on table "public"."pipeline_stages" to "service_role";

grant truncate on table "public"."pipeline_stages" to "service_role";

grant update on table "public"."pipeline_stages" to "service_role";

grant delete on table "public"."pipelines" to "anon";

grant insert on table "public"."pipelines" to "anon";

grant references on table "public"."pipelines" to "anon";

grant select on table "public"."pipelines" to "anon";

grant trigger on table "public"."pipelines" to "anon";

grant truncate on table "public"."pipelines" to "anon";

grant update on table "public"."pipelines" to "anon";

grant delete on table "public"."pipelines" to "authenticated";

grant insert on table "public"."pipelines" to "authenticated";

grant references on table "public"."pipelines" to "authenticated";

grant select on table "public"."pipelines" to "authenticated";

grant trigger on table "public"."pipelines" to "authenticated";

grant truncate on table "public"."pipelines" to "authenticated";

grant update on table "public"."pipelines" to "authenticated";

grant delete on table "public"."pipelines" to "service_role";

grant insert on table "public"."pipelines" to "service_role";

grant references on table "public"."pipelines" to "service_role";

grant select on table "public"."pipelines" to "service_role";

grant trigger on table "public"."pipelines" to "service_role";

grant truncate on table "public"."pipelines" to "service_role";

grant update on table "public"."pipelines" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."properties" to "anon";

grant insert on table "public"."properties" to "anon";

grant references on table "public"."properties" to "anon";

grant select on table "public"."properties" to "anon";

grant trigger on table "public"."properties" to "anon";

grant truncate on table "public"."properties" to "anon";

grant update on table "public"."properties" to "anon";

grant delete on table "public"."properties" to "authenticated";

grant insert on table "public"."properties" to "authenticated";

grant references on table "public"."properties" to "authenticated";

grant select on table "public"."properties" to "authenticated";

grant trigger on table "public"."properties" to "authenticated";

grant truncate on table "public"."properties" to "authenticated";

grant update on table "public"."properties" to "authenticated";

grant delete on table "public"."properties" to "service_role";

grant insert on table "public"."properties" to "service_role";

grant references on table "public"."properties" to "service_role";

grant select on table "public"."properties" to "service_role";

grant trigger on table "public"."properties" to "service_role";

grant truncate on table "public"."properties" to "service_role";

grant update on table "public"."properties" to "service_role";

grant delete on table "public"."role_definitions" to "anon";

grant insert on table "public"."role_definitions" to "anon";

grant references on table "public"."role_definitions" to "anon";

grant select on table "public"."role_definitions" to "anon";

grant trigger on table "public"."role_definitions" to "anon";

grant truncate on table "public"."role_definitions" to "anon";

grant update on table "public"."role_definitions" to "anon";

grant delete on table "public"."role_definitions" to "authenticated";

grant insert on table "public"."role_definitions" to "authenticated";

grant references on table "public"."role_definitions" to "authenticated";

grant select on table "public"."role_definitions" to "authenticated";

grant trigger on table "public"."role_definitions" to "authenticated";

grant truncate on table "public"."role_definitions" to "authenticated";

grant update on table "public"."role_definitions" to "authenticated";

grant delete on table "public"."role_definitions" to "service_role";

grant insert on table "public"."role_definitions" to "service_role";

grant references on table "public"."role_definitions" to "service_role";

grant select on table "public"."role_definitions" to "service_role";

grant trigger on table "public"."role_definitions" to "service_role";

grant truncate on table "public"."role_definitions" to "service_role";

grant update on table "public"."role_definitions" to "service_role";

grant delete on table "public"."service_requests" to "anon";

grant insert on table "public"."service_requests" to "anon";

grant references on table "public"."service_requests" to "anon";

grant select on table "public"."service_requests" to "anon";

grant trigger on table "public"."service_requests" to "anon";

grant truncate on table "public"."service_requests" to "anon";

grant update on table "public"."service_requests" to "anon";

grant delete on table "public"."service_requests" to "authenticated";

grant insert on table "public"."service_requests" to "authenticated";

grant references on table "public"."service_requests" to "authenticated";

grant select on table "public"."service_requests" to "authenticated";

grant trigger on table "public"."service_requests" to "authenticated";

grant truncate on table "public"."service_requests" to "authenticated";

grant update on table "public"."service_requests" to "authenticated";

grant delete on table "public"."service_requests" to "service_role";

grant insert on table "public"."service_requests" to "service_role";

grant references on table "public"."service_requests" to "service_role";

grant select on table "public"."service_requests" to "service_role";

grant trigger on table "public"."service_requests" to "service_role";

grant truncate on table "public"."service_requests" to "service_role";

grant update on table "public"."service_requests" to "service_role";

grant delete on table "public"."shifts" to "anon";

grant insert on table "public"."shifts" to "anon";

grant references on table "public"."shifts" to "anon";

grant select on table "public"."shifts" to "anon";

grant trigger on table "public"."shifts" to "anon";

grant truncate on table "public"."shifts" to "anon";

grant update on table "public"."shifts" to "anon";

grant delete on table "public"."shifts" to "authenticated";

grant insert on table "public"."shifts" to "authenticated";

grant references on table "public"."shifts" to "authenticated";

grant select on table "public"."shifts" to "authenticated";

grant trigger on table "public"."shifts" to "authenticated";

grant truncate on table "public"."shifts" to "authenticated";

grant update on table "public"."shifts" to "authenticated";

grant delete on table "public"."shifts" to "service_role";

grant insert on table "public"."shifts" to "service_role";

grant references on table "public"."shifts" to "service_role";

grant select on table "public"."shifts" to "service_role";

grant trigger on table "public"."shifts" to "service_role";

grant truncate on table "public"."shifts" to "service_role";

grant update on table "public"."shifts" to "service_role";

grant delete on table "public"."staff_invitations" to "anon";

grant insert on table "public"."staff_invitations" to "anon";

grant references on table "public"."staff_invitations" to "anon";

grant select on table "public"."staff_invitations" to "anon";

grant trigger on table "public"."staff_invitations" to "anon";

grant truncate on table "public"."staff_invitations" to "anon";

grant update on table "public"."staff_invitations" to "anon";

grant delete on table "public"."staff_invitations" to "authenticated";

grant insert on table "public"."staff_invitations" to "authenticated";

grant references on table "public"."staff_invitations" to "authenticated";

grant select on table "public"."staff_invitations" to "authenticated";

grant trigger on table "public"."staff_invitations" to "authenticated";

grant truncate on table "public"."staff_invitations" to "authenticated";

grant update on table "public"."staff_invitations" to "authenticated";

grant delete on table "public"."staff_invitations" to "service_role";

grant insert on table "public"."staff_invitations" to "service_role";

grant references on table "public"."staff_invitations" to "service_role";

grant select on table "public"."staff_invitations" to "service_role";

grant trigger on table "public"."staff_invitations" to "service_role";

grant truncate on table "public"."staff_invitations" to "service_role";

grant update on table "public"."staff_invitations" to "service_role";

grant delete on table "public"."staff_profiles" to "anon";

grant insert on table "public"."staff_profiles" to "anon";

grant references on table "public"."staff_profiles" to "anon";

grant select on table "public"."staff_profiles" to "anon";

grant trigger on table "public"."staff_profiles" to "anon";

grant truncate on table "public"."staff_profiles" to "anon";

grant update on table "public"."staff_profiles" to "anon";

grant delete on table "public"."staff_profiles" to "authenticated";

grant insert on table "public"."staff_profiles" to "authenticated";

grant references on table "public"."staff_profiles" to "authenticated";

grant select on table "public"."staff_profiles" to "authenticated";

grant trigger on table "public"."staff_profiles" to "authenticated";

grant truncate on table "public"."staff_profiles" to "authenticated";

grant update on table "public"."staff_profiles" to "authenticated";

grant delete on table "public"."staff_profiles" to "service_role";

grant insert on table "public"."staff_profiles" to "service_role";

grant references on table "public"."staff_profiles" to "service_role";

grant select on table "public"."staff_profiles" to "service_role";

grant trigger on table "public"."staff_profiles" to "service_role";

grant truncate on table "public"."staff_profiles" to "service_role";

grant update on table "public"."staff_profiles" to "service_role";

grant delete on table "public"."tasks" to "anon";

grant insert on table "public"."tasks" to "anon";

grant references on table "public"."tasks" to "anon";

grant select on table "public"."tasks" to "anon";

grant trigger on table "public"."tasks" to "anon";

grant truncate on table "public"."tasks" to "anon";

grant update on table "public"."tasks" to "anon";

grant delete on table "public"."tasks" to "authenticated";

grant insert on table "public"."tasks" to "authenticated";

grant references on table "public"."tasks" to "authenticated";

grant select on table "public"."tasks" to "authenticated";

grant trigger on table "public"."tasks" to "authenticated";

grant truncate on table "public"."tasks" to "authenticated";

grant update on table "public"."tasks" to "authenticated";

grant delete on table "public"."tasks" to "service_role";

grant insert on table "public"."tasks" to "service_role";

grant references on table "public"."tasks" to "service_role";

grant select on table "public"."tasks" to "service_role";

grant trigger on table "public"."tasks" to "service_role";

grant truncate on table "public"."tasks" to "service_role";

grant update on table "public"."tasks" to "service_role";

grant delete on table "public"."user_notifications" to "anon";

grant insert on table "public"."user_notifications" to "anon";

grant references on table "public"."user_notifications" to "anon";

grant select on table "public"."user_notifications" to "anon";

grant trigger on table "public"."user_notifications" to "anon";

grant truncate on table "public"."user_notifications" to "anon";

grant update on table "public"."user_notifications" to "anon";

grant delete on table "public"."user_notifications" to "authenticated";

grant insert on table "public"."user_notifications" to "authenticated";

grant references on table "public"."user_notifications" to "authenticated";

grant select on table "public"."user_notifications" to "authenticated";

grant trigger on table "public"."user_notifications" to "authenticated";

grant truncate on table "public"."user_notifications" to "authenticated";

grant update on table "public"."user_notifications" to "authenticated";

grant delete on table "public"."user_notifications" to "service_role";

grant insert on table "public"."user_notifications" to "service_role";

grant references on table "public"."user_notifications" to "service_role";

grant select on table "public"."user_notifications" to "service_role";

grant trigger on table "public"."user_notifications" to "service_role";

grant truncate on table "public"."user_notifications" to "service_role";

grant update on table "public"."user_notifications" to "service_role";


  create policy "allow_all_view_for_now"
  on "public"."audit_logs"
  as permissive
  for select
  to public
using (true);



  create policy "service_role_insert_audit_logs"
  on "public"."audit_logs"
  as permissive
  for insert
  to public
with check (true);



  create policy "bookings_select_member"
  on "public"."bookings"
  as permissive
  for select
  to public
using (public.is_org_member(org_id));



  create policy "bookings_write_admin"
  on "public"."bookings"
  as permissive
  for all
  to public
using (public.is_org_admin(org_id))
with check (public.is_org_admin(org_id));



  create policy "enable_read_access_for_all"
  on "public"."branches"
  as permissive
  for select
  to public
using ((is_active = true));



  create policy "business_read_own"
  on "public"."businesses"
  as permissive
  for select
  to public
using ((id = ( SELECT profiles.business_id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));



  create policy "customers_read_business"
  on "public"."customers"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.business_id = customers.business_id)))));



  create policy "customers_write_admin"
  on "public"."customers"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.business_id = customers.business_id) AND (p.role = ANY (ARRAY['ceo'::text, 'manager'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.business_id = customers.business_id) AND (p.role = ANY (ARRAY['ceo'::text, 'manager'::text]))))));



  create policy "lead_followups_select_member"
  on "public"."lead_followups"
  as permissive
  for select
  to public
using (public.is_org_member(org_id));



  create policy "lead_followups_write_admin"
  on "public"."lead_followups"
  as permissive
  for all
  to public
using (public.is_org_admin(org_id))
with check (public.is_org_admin(org_id));



  create policy "leads_select_member"
  on "public"."leads"
  as permissive
  for select
  to public
using (public.is_org_member(org_id));



  create policy "leads_write_admin"
  on "public"."leads"
  as permissive
  for all
  to public
using (public.is_org_admin(org_id))
with check (public.is_org_admin(org_id));



  create policy "locations_select_member"
  on "public"."locations"
  as permissive
  for select
  to public
using (public.is_org_member(org_id));



  create policy "locations_write_admin"
  on "public"."locations"
  as permissive
  for all
  to public
using (public.is_org_admin(org_id))
with check (public.is_org_admin(org_id));



  create policy "loyalty_read_business"
  on "public"."loyalty_accounts"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.business_id = loyalty_accounts.business_id)))));



  create policy "loyalty_write_admin"
  on "public"."loyalty_accounts"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.business_id = loyalty_accounts.business_id) AND (p.role = ANY (ARRAY['ceo'::text, 'manager'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.business_id = loyalty_accounts.business_id) AND (p.role = ANY (ARRAY['ceo'::text, 'manager'::text]))))));



  create policy "outbox_admin_insert"
  on "public"."notification_outbox"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.business_id = notification_outbox.business_id) AND (p.role = ANY (ARRAY['ceo'::text, 'manager'::text]))))));



  create policy "order_items_select_member"
  on "public"."order_items"
  as permissive
  for select
  to public
using (public.is_org_member(org_id));



  create policy "order_items_write_admin"
  on "public"."order_items"
  as permissive
  for all
  to public
using (public.is_org_admin(org_id))
with check (public.is_org_admin(org_id));



  create policy "orders_select_member"
  on "public"."orders"
  as permissive
  for select
  to public
using (public.is_org_member(org_id));



  create policy "orders_write_admin"
  on "public"."orders"
  as permissive
  for all
  to public
using (public.is_org_admin(org_id))
with check (public.is_org_admin(org_id));



  create policy "org_members_delete_admin"
  on "public"."org_members"
  as permissive
  for delete
  to public
using (public.is_org_admin(org_id));



  create policy "org_members_modify_admin"
  on "public"."org_members"
  as permissive
  for insert
  to public
with check (public.is_org_admin(org_id));



  create policy "org_members_select_member"
  on "public"."org_members"
  as permissive
  for select
  to public
using (public.is_org_member(org_id));



  create policy "org_members_update_admin"
  on "public"."org_members"
  as permissive
  for update
  to public
using (public.is_org_admin(org_id))
with check (public.is_org_admin(org_id));



  create policy "orgs_select_member"
  on "public"."orgs"
  as permissive
  for select
  to public
using (public.is_org_member(id));



  create policy "orgs_update_admin"
  on "public"."orgs"
  as permissive
  for update
  to public
using (public.is_org_admin(id))
with check (public.is_org_admin(id));



  create policy "payment_audit_insert_admin"
  on "public"."payment_audit"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.business_id = payment_audit.business_id) AND (p.role = ANY (ARRAY['ceo'::text, 'manager'::text]))))));



  create policy "payment_audit_read_business"
  on "public"."payment_audit"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.business_id = payment_audit.business_id)))));



  create policy "read disputes by business"
  on "public"."payment_disputes"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.business_id = payment_disputes.business_id)))));



  create policy "payments_insert_business"
  on "public"."payments"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.business_id = payments.business_id)))));



  create policy "payments_read_business"
  on "public"."payments"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.business_id = payments.business_id)))));



  create policy "payments_select_member"
  on "public"."payments"
  as permissive
  for select
  to public
using (public.is_org_member(org_id));



  create policy "payments_update_admin"
  on "public"."payments"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.business_id = payments.business_id) AND (p.role = ANY (ARRAY['ceo'::text, 'manager'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.business_id = payments.business_id) AND (p.role = ANY (ARRAY['ceo'::text, 'manager'::text]))))));



  create policy "payments_write_admin"
  on "public"."payments"
  as permissive
  for all
  to public
using (public.is_org_admin(org_id))
with check (public.is_org_admin(org_id));



  create policy "pipeline_stages_select_member"
  on "public"."pipeline_stages"
  as permissive
  for select
  to public
using (public.is_org_member(org_id));



  create policy "pipeline_stages_write_admin"
  on "public"."pipeline_stages"
  as permissive
  for all
  to public
using (public.is_org_admin(org_id))
with check (public.is_org_admin(org_id));



  create policy "pipelines_select_member"
  on "public"."pipelines"
  as permissive
  for select
  to public
using (public.is_org_member(org_id));



  create policy "pipelines_write_admin"
  on "public"."pipelines"
  as permissive
  for all
  to public
using (public.is_org_admin(org_id))
with check (public.is_org_admin(org_id));



  create policy "profiles_select_admin"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((role = ANY (ARRAY['owner'::text, 'ceo'::text, 'manager'::text])));



  create policy "profiles_select_own"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "profiles_update_admin"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((role = ANY (ARRAY['owner'::text, 'ceo'::text, 'manager'::text])));



  create policy "properties_select_member"
  on "public"."properties"
  as permissive
  for select
  to public
using (public.is_org_member(org_id));



  create policy "properties_write_admin"
  on "public"."properties"
  as permissive
  for all
  to public
using (public.is_org_admin(org_id))
with check (public.is_org_admin(org_id));



  create policy "service_requests_insert_by_business"
  on "public"."service_requests"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.business_id = service_requests.business_id)))));



  create policy "service_requests_select_by_business"
  on "public"."service_requests"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.business_id = service_requests.business_id)))));



  create policy "service_requests_select_department_or_leader"
  on "public"."service_requests"
  as permissive
  for select
  to public
using (((business_id = ( SELECT profiles.business_id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))) AND ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid())) = ANY (ARRAY['owner'::text, 'ceo'::text, 'manager'::text])) OR (department = ( SELECT profiles.department
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))))));



  create policy "service_requests_select_member"
  on "public"."service_requests"
  as permissive
  for select
  to public
using (public.is_org_member(org_id));



  create policy "service_requests_update_by_business"
  on "public"."service_requests"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.business_id = service_requests.business_id)))));



  create policy "service_requests_write_admin"
  on "public"."service_requests"
  as permissive
  for all
  to public
using (public.is_org_admin(org_id))
with check (public.is_org_admin(org_id));



  create policy "shifts_select_member"
  on "public"."shifts"
  as permissive
  for select
  to public
using (public.is_org_member(org_id));



  create policy "shifts_write_admin"
  on "public"."shifts"
  as permissive
  for all
  to public
using (public.is_org_admin(org_id))
with check (public.is_org_admin(org_id));



  create policy "create_invitations"
  on "public"."staff_invitations"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.business_id = staff_invitations.business_id) AND (profiles.role = ANY (ARRAY['owner'::text, 'manager'::text]))))));



  create policy "view_invitations_in_business"
  on "public"."staff_invitations"
  as permissive
  for select
  to public
using ((business_id IN ( SELECT profiles.business_id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));



  create policy "staff_profiles_select_member"
  on "public"."staff_profiles"
  as permissive
  for select
  to public
using (public.is_org_member(org_id));



  create policy "staff_profiles_write_admin"
  on "public"."staff_profiles"
  as permissive
  for all
  to public
using (public.is_org_admin(org_id))
with check (public.is_org_admin(org_id));



  create policy "tasks_select_member"
  on "public"."tasks"
  as permissive
  for select
  to public
using (public.is_org_member(org_id));



  create policy "tasks_write_admin"
  on "public"."tasks"
  as permissive
  for all
  to public
using (public.is_org_admin(org_id))
with check (public.is_org_admin(org_id));



  create policy "notif_admin_insert"
  on "public"."user_notifications"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.business_id = user_notifications.business_id) AND (p.role = ANY (ARRAY['ceo'::text, 'manager'::text]))))));



  create policy "notif_select_own"
  on "public"."user_notifications"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "notif_update_own"
  on "public"."user_notifications"
  as permissive
  for update
  to authenticated
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));


CREATE TRIGGER branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_service_requests_updated_at BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


