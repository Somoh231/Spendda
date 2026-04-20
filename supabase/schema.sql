-- Spendda multi-tenant SaaS schema (Supabase Postgres)
-- Apply in Supabase SQL editor (or migrations) before enabling production mode.

-- Tenants
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Memberships (user ↔ tenant)
create table if not exists public.tenant_memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','finance_lead','analyst','viewer','admin','member')) default 'analyst',
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

-- Invites
create table if not exists public.tenant_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner','finance_lead','analyst','viewer','admin','member')) default 'analyst',
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tenant_memberships_user_id_idx on public.tenant_memberships(user_id);
create index if not exists tenant_invites_tenant_id_idx on public.tenant_invites(tenant_id);
create index if not exists tenant_invites_token_idx on public.tenant_invites(token);

-- Tenant documents (metadata; file bytes live in storage in a later phase)
create table if not exists public.tenant_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  file_name text not null,
  file_type text not null check (file_type in ('PDF','CSV','XLSX','DOCX','OTHER')) default 'OTHER',
  uploaded_at timestamptz not null default now(),
  reporting_period text,
  status text not null check (status in ('Uploaded','Processing','Ready','Archived')) default 'Ready',
  owner text,
  size_bytes bigint,
  mime_type text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists tenant_documents_tenant_id_idx on public.tenant_documents(tenant_id);
create index if not exists tenant_documents_uploaded_at_idx on public.tenant_documents(uploaded_at);

-- Enable RLS
alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.tenant_invites enable row level security;
alter table public.tenant_documents enable row level security;

-- Policies
-- Tenants are visible only via membership.
drop policy if exists "tenants_select_members" on public.tenants;
create policy "tenants_select_members"
on public.tenants
for select
using (
  exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = tenants.id
      and m.user_id = auth.uid()
  )
);

-- A logged-in user can create tenants (self-serve).
drop policy if exists "tenants_insert_authed" on public.tenants;
create policy "tenants_insert_authed"
on public.tenants
for insert
with check (auth.uid() is not null);

-- Memberships: users can read their own memberships.
drop policy if exists "memberships_select_own" on public.tenant_memberships;
create policy "memberships_select_own"
on public.tenant_memberships
for select
using (user_id = auth.uid());

-- Memberships: allow inserting membership only for yourself (used when accepting invites).
drop policy if exists "memberships_insert_self" on public.tenant_memberships;
create policy "memberships_insert_self"
on public.tenant_memberships
for insert
with check (user_id = auth.uid());

-- Invites: only tenant admins/owners can manage invites.
drop policy if exists "invites_select_admin" on public.tenant_invites;
create policy "invites_select_admin"
on public.tenant_invites
for select
using (
  exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = tenant_invites.tenant_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin','finance_lead')
  )
);

drop policy if exists "invites_insert_admin" on public.tenant_invites;
create policy "invites_insert_admin"
on public.tenant_invites
for insert
with check (
  exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = tenant_invites.tenant_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin','finance_lead')
  )
);

drop policy if exists "invites_update_admin" on public.tenant_invites;
create policy "invites_update_admin"
on public.tenant_invites
for update
using (
  exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = tenant_invites.tenant_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin','finance_lead')
  )
);

-- Documents: members can read/write within their tenant.
drop policy if exists "documents_select_members" on public.tenant_documents;
create policy "documents_select_members"
on public.tenant_documents
for select
using (
  exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = tenant_documents.tenant_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "documents_insert_members" on public.tenant_documents;
create policy "documents_insert_members"
on public.tenant_documents
for insert
with check (
  exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = tenant_documents.tenant_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin','member','finance_lead','analyst')
  )
);

drop policy if exists "documents_delete_admin_or_creator" on public.tenant_documents;
create policy "documents_delete_admin_or_creator"
on public.tenant_documents
for delete
using (
  exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = tenant_documents.tenant_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin','finance_lead')
  )
);

-- ---------------------------------------------------------------------------
-- Multi-tenant production extensions (plan tier, branding, audit, usage)
-- ---------------------------------------------------------------------------

alter table public.tenants add column if not exists plan_tier text not null default 'pilot'
  check (plan_tier in ('pilot','growth','enterprise'));
alter table public.tenants add column if not exists settings jsonb not null default '{}'::jsonb;

drop policy if exists "tenants_update_admin" on public.tenants;
create policy "tenants_update_admin"
on public.tenants
for update
using (
  exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = tenants.id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin','finance_lead')
  )
)
with check (
  exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = tenants.id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin','finance_lead')
  )
);

create table if not exists public.tenant_audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists tenant_audit_events_tenant_id_idx on public.tenant_audit_events(tenant_id);

alter table public.tenant_audit_events enable row level security;
drop policy if exists "tenant_audit_select_members" on public.tenant_audit_events;
create policy "tenant_audit_select_members"
on public.tenant_audit_events
for select
using (
  exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = tenant_audit_events.tenant_id
      and m.user_id = auth.uid()
  )
);
drop policy if exists "tenant_audit_insert_members" on public.tenant_audit_events;
create policy "tenant_audit_insert_members"
on public.tenant_audit_events
for insert
with check (
  exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = tenant_audit_events.tenant_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin','member','finance_lead','analyst')
  )
);

create table if not exists public.tenant_usage_monthly (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  period text not null,
  exports_count int not null default 0,
  uploads_bytes bigint not null default 0,
  primary key (tenant_id, period)
);

alter table public.tenant_usage_monthly enable row level security;
drop policy if exists "tenant_usage_select_admin" on public.tenant_usage_monthly;
create policy "tenant_usage_select_admin"
on public.tenant_usage_monthly
for select
using (
  exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = tenant_usage_monthly.tenant_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin','finance_lead')
  )
);
-- Upserts from the app should run via service role or RPC in production; placeholder policies for app-side counters:
drop policy if exists "tenant_usage_upsert_members" on public.tenant_usage_monthly;
create policy "tenant_usage_upsert_members"
on public.tenant_usage_monthly
for insert
with check (
  exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = tenant_usage_monthly.tenant_id
      and m.user_id = auth.uid()
  )
);
drop policy if exists "tenant_usage_update_members" on public.tenant_usage_monthly;
create policy "tenant_usage_update_members"
on public.tenant_usage_monthly
for update
using (
  exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = tenant_usage_monthly.tenant_id
      and m.user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- Role model migration (existing Supabase projects): widen CHECK constraints.
-- ---------------------------------------------------------------------------
alter table public.tenant_memberships drop constraint if exists tenant_memberships_role_check;
alter table public.tenant_memberships add constraint tenant_memberships_role_check
  check (role in ('owner','finance_lead','analyst','viewer','admin','member'));

alter table public.tenant_invites drop constraint if exists tenant_invites_role_check;
alter table public.tenant_invites add constraint tenant_invites_role_check
  check (role in ('owner','finance_lead','analyst','viewer','admin','member'));

