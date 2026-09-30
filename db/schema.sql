
-- ChurchOS — Supabase / PostgreSQL master schema
-- Version: 1.0
-- Target: Supabase PostgreSQL 15+
-- NOTE: This migration assumes the Supabase `auth` schema is available.

create extension if not exists "pgcrypto";
create extension if not exists "citext";
create extension if not exists "vector";

create schema if not exists private;

-- =========================================================
-- 1. ENUMS
-- =========================================================

do $$ begin
  create type public.org_status as enum ('trial','active','suspended','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.member_status as enum ('active','inactive','transferred','deceased','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.gender as enum ('male','female','other','undisclosed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.relationship_type as enum (
    'spouse','parent','child','sibling','grandparent','grandchild','guardian','dependent','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.visitor_status as enum ('new','contacted','follow_up','connected','converted','lost','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.group_type as enum (
    'cell','home_group','youth','women','men','children','prayer','study','team','custom'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pastoral_status as enum ('new','in_progress','waiting','completed','cancelled','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.priority_level as enum ('low','normal','high','urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.prayer_status as enum ('open','in_progress','answered','closed','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.visit_type as enum ('pastoral','member','family','hospital','home','new_visitor','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ministry_status as enum ('active','inactive','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.worker_status as enum ('active','inactive','on_leave','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.assignment_status as enum ('assigned','confirmed','declined','completed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_status as enum ('draft','published','cancelled','completed','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_visibility as enum ('private','members','public');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.registration_status as enum ('pending','confirmed','waitlisted','cancelled','attended','no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attendance_status as enum ('present','absent','excused','late');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.finance_entry_type as enum ('income','expense','transfer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending','succeeded','failed','refunded','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cash','bank_transfer','card','mobile_money','check','online','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_visibility as enum ('private','organization','campus','public');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_channel as enum ('in_app','email','sms','whatsapp','push');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_status as enum ('queued','sent','delivered','failed','read');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_status as enum ('trialing','active','past_due','cancelled','paused','expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.billing_interval as enum ('monthly','yearly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.course_status as enum ('draft','published','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.enrollment_status as enum ('enrolled','completed','dropped','pending');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.resource_type as enum ('room','equipment','vehicle','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reservation_status as enum ('pending','confirmed','cancelled','completed');
exception when duplicate_object then null; end $$;

-- =========================================================
-- 3. IDENTITY / ORGANIZATION
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  display_name text,
  phone text,
  avatar_url text,
  locale text not null default 'fr',
  timezone text not null default 'Africa/Abidjan',
  currency text not null default 'XOF',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  slug citext not null unique,
  description text,
  logo_url text,
  cover_url text,
  email text,
  phone text,
  website text,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  country_code char(2) not null default 'CI',
  postal_code text,
  timezone text not null default 'Africa/Abidjan',
  currency char(3) not null default 'XOF',
  locale text not null default 'fr',
  status public.org_status not null default 'trial',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  date_format text not null default 'dd/MM/yyyy',
  week_starts_on smallint not null default 1 check (week_starts_on between 0 and 6),
  default_campus_id uuid,
  default_member_status public.member_status not null default 'active',
  allow_public_registrations boolean not null default true,
  require_registration_confirmation boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campuses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text,
  description text,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  country_code char(2) not null default 'CI',
  timezone text,
  is_main boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (organization_id, code)
);

alter table public.organization_settings
  add constraint organization_settings_default_campus_fk
  foreign key (default_campus_id) references public.campuses(id) on delete set null;

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  title text,
  status text not null default 'active' check (status in ('invited','active','suspended','left')),
  joined_at timestamptz,
  invited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- =========================================================
-- 4. RBAC
-- =========================================================

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  module text not null,
  description text
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists public.membership_roles (
  membership_id uuid not null references public.organization_memberships(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  primary key (membership_id, role_id)
);

-- =========================================================
-- 2. COMMON FUNCTIONS
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid();
$$;

create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = p_org_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  );
$$;

create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships om
    join public.membership_roles mr on mr.membership_id = om.id
    join public.roles r on r.id = mr.role_id
    where om.organization_id = p_org_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and r.code in ('SUPER_ADMIN','CHURCH_OWNER')
  );
$$;

create or replace function public.has_permission(p_org_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships om
    join public.membership_roles mr on mr.membership_id = om.id
    join public.role_permissions rp on rp.role_id = mr.role_id
    join public.permissions p on p.id = rp.permission_id
    where om.organization_id = p_org_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and p.code = p_permission
  );
$$;



-- =========================================================
-- 4B. ORGANIZATION BOOTSTRAP
-- =========================================================

create or replace function public.bootstrap_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_role_id uuid;
  role_codes text[] := array[
    'SUPER_ADMIN','CHURCH_OWNER','PASTOR','PASTORAL_LEADER',
    'MINISTRY_LEADER','FINANCE_MANAGER','SECRETARY','WORKER','MEMBER'
  ];
  role_names text[] := array[
    'Super Admin','Propriétaire de l’église','Pasteur','Responsable pastoral',
    'Responsable de ministère','Responsable financier','Secrétaire','Ouvrier','Membre'
  ];
  i integer;
begin
  insert into public.organization_settings (organization_id)
  values (new.id)
  on conflict (organization_id) do nothing;

  for i in 1..array_length(role_codes,1) loop
    insert into public.roles (organization_id, code, name, is_system)
    values (new.id, role_codes[i], role_names[i], true)
    on conflict (organization_id, code) do nothing;
  end loop;

  return new;
end;
$$;

drop trigger if exists after_organization_created on public.organizations;
create trigger after_organization_created
after insert on public.organizations
for each row execute procedure public.bootstrap_organization();

create or replace function public.create_organization_for_current_user(
  p_name text,
  p_slug text,
  p_city text default null,
  p_country_code char(2) default 'CI'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_membership_id uuid;
  v_owner_role_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.organizations (
    name, slug, city, country_code, created_by, status
  )
  values (
    p_name, p_slug, p_city, p_country_code, auth.uid(), 'trial'
  )
  returning id into v_org_id;

  insert into public.organization_memberships (
    organization_id, user_id, status, joined_at, title
  )
  values (
    v_org_id, auth.uid(), 'active', now(), 'Administrateur'
  )
  returning id into v_membership_id;

  select id into v_owner_role_id
  from public.roles
  where organization_id = v_org_id
    and code = 'CHURCH_OWNER'
  limit 1;

  insert into public.membership_roles (membership_id, role_id)
  values (v_membership_id, v_owner_role_id);

  return v_org_id;
end;
$$;

grant execute on function public.create_organization_for_current_user(text,text,text,char) to authenticated;

-- =========================================================
-- 5. FEATURE FLAGS / BILLING
-- =========================================================

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_features (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  feature_id uuid not null references public.feature_flags(id) on delete cascade,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  primary key (organization_id, feature_id)
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  price_monthly numeric(14,2) not null default 0 check (price_monthly >= 0),
  price_yearly numeric(14,2) not null default 0 check (price_yearly >= 0),
  currency char(3) not null default 'XOF',
  max_members integer,
  max_campuses integer,
  max_storage_mb integer,
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status public.subscription_status not null default 'trialing',
  billing_interval public.billing_interval not null default 'monthly',
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriptions_active_org_idx
  on public.subscriptions(organization_id)
  where status in ('trialing','active','past_due','paused');

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  invoice_number text not null,
  amount numeric(14,2) not null check (amount >= 0),
  currency char(3) not null default 'XOF',
  status text not null default 'open' check (status in ('draft','open','paid','void','uncollectible')),
  due_at timestamptz,
  paid_at timestamptz,
  provider_invoice_id text,
  created_at timestamptz not null default now(),
  unique (organization_id, invoice_number)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  amount numeric(14,2) not null check (amount >= 0),
  currency char(3) not null default 'XOF',
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  provider text,
  provider_payment_id text,
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 6. PEOPLE / MEMBERS / FAMILIES / VISITORS
-- =========================================================

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  first_name text not null,
  middle_name text,
  last_name text not null,
  preferred_name text,
  email citext,
  phone text,
  secondary_phone text,
  gender public.gender not null default 'undisclosed',
  birth_date date,
  marital_status text,
  occupation text,
  photo_url text,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  country_code char(2) default 'CI',
  postal_code text,
  emergency_contact_name text,
  emergency_contact_phone text,
  notes text,
  is_deceased boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null unique references public.people(id) on delete cascade,
  member_number text,
  status public.member_status not null default 'active',
  membership_date date,
  baptism_date date,
  salvation_date date,
  previous_church text,
  department text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, member_number)
);

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  name text not null,
  family_code text,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  country_code char(2) default 'CI',
  postal_code text,
  primary_contact_person_id uuid references public.people(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, family_code)
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  relationship_to_head text,
  is_head boolean not null default false,
  is_primary_contact boolean not null default false,
  created_at timestamptz not null default now(),
  unique (family_id, person_id)
);

create table if not exists public.person_relationships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  related_person_id uuid not null references public.people(id) on delete cascade,
  relationship public.relationship_type not null,
  notes text,
  created_at timestamptz not null default now(),
  check (person_id <> related_person_id),
  unique (person_id, related_person_id, relationship)
);

create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  first_visit_date date not null default current_date,
  source text,
  invited_by_person_id uuid references public.people(id) on delete set null,
  assigned_to_user_id uuid references auth.users(id) on delete set null,
  status public.visitor_status not null default 'new',
  converted_to_member_id uuid references public.members(id) on delete set null,
  follow_up_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 7. GROUPS
-- =========================================================

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  name text not null,
  code text,
  type public.group_type not null default 'custom',
  description text,
  leader_person_id uuid references public.people(id) on delete set null,
  meeting_day smallint check (meeting_day between 0 and 6),
  meeting_time time,
  meeting_location text,
  capacity integer check (capacity is null or capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  role text not null default 'member',
  joined_at date,
  left_at date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (group_id, person_id)
);

-- =========================================================
-- 8. PASTORAL
-- =========================================================

create table if not exists public.pastoral_followups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  person_id uuid not null references public.people(id) on delete cascade,
  assigned_to_user_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  status public.pastoral_status not null default 'new',
  priority public.priority_level not null default 'normal',
  due_date date,
  completed_at timestamptz,
  next_action text,
  confidentiality text not null default 'pastoral' check (confidentiality in ('normal','pastoral','restricted')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pastoral_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  followup_id uuid not null references public.pastoral_followups(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  note text not null,
  is_private boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  person_id uuid references public.people(id) on delete set null,
  title text not null,
  description text,
  category text,
  status public.prayer_status not null default 'open',
  priority public.priority_level not null default 'normal',
  is_confidential boolean not null default true,
  assigned_to_user_id uuid references auth.users(id) on delete set null,
  answered_at timestamptz,
  answer_testimony text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prayer_updates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  prayer_request_id uuid not null references public.prayer_requests(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  person_id uuid not null references public.people(id) on delete cascade,
  visitor_id uuid references public.visitors(id) on delete set null,
  visit_type public.visit_type not null,
  scheduled_at timestamptz,
  completed_at timestamptz,
  location text,
  assigned_to_user_id uuid references auth.users(id) on delete set null,
  status public.pastoral_status not null default 'new',
  purpose text,
  summary text,
  next_action text,
  next_action_date date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pastoral_councils (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  title text not null,
  meeting_at timestamptz not null,
  location text,
  agenda text,
  minutes text,
  status text not null default 'planned' check (status in ('planned','held','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pastoral_council_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  council_id uuid not null references public.pastoral_councils(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  attendance_status public.attendance_status,
  created_at timestamptz not null default now(),
  check (person_id is not null or user_id is not null)
);

create table if not exists public.pastoral_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  council_id uuid references public.pastoral_councils(id) on delete cascade,
  title text not null,
  description text,
  assigned_to_user_id uuid references auth.users(id) on delete set null,
  due_date date,
  status public.pastoral_status not null default 'new',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 9. MINISTRIES / TEAMS / WORKERS / SERVICES / PLANNING
-- =========================================================

create table if not exists public.ministries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  name text not null,
  code text,
  category text,
  description text,
  leader_person_id uuid references public.people(id) on delete set null,
  status public.ministry_status not null default 'active',
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

-- Colonne ajoutée après la création initiale (design-reproduction, 2026-09-28) : sans effet sur une
-- installation neuve (déjà dans le create table ci-dessus), nécessaire pour une base existante.
alter table public.ministries add column if not exists category text;

create table if not exists public.ministry_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ministry_id uuid not null references public.ministries(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  role text not null default 'member',
  joined_at date,
  left_at date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (ministry_id, person_id)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ministry_id uuid references public.ministries(id) on delete set null,
  campus_id uuid references public.campuses(id) on delete set null,
  name text not null,
  description text,
  leader_person_id uuid references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  role text not null default 'member',
  status public.worker_status not null default 'active',
  joined_at date,
  left_at date,
  created_at timestamptz not null default now(),
  unique (team_id, person_id)
);

create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  worker_number text,
  status public.worker_status not null default 'active',
  availability jsonb not null default '{}'::jsonb,
  skills jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, person_id),
  unique (organization_id, worker_number)
);

create table if not exists public.service_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  default_duration_minutes integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  service_type_id uuid references public.service_types(id) on delete set null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  notes text,
  status text not null default 'planned' check (status in ('planned','confirmed','completed','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  role text not null,
  status public.assignment_status not null default 'assigned',
  notes text,
  created_at timestamptz not null default now(),
  unique (service_id, worker_id, role)
);

create table if not exists public.planning_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  category text,
  location text,
  assigned_to_worker_id uuid references public.workers(id) on delete set null,
  assigned_to_user_id uuid references auth.users(id) on delete set null,
  status public.assignment_status not null default 'assigned',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 10. EVENTS / REGISTRATIONS / ATTENDANCE / CALENDAR
-- =========================================================

create table if not exists public.event_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  color text,
  icon text,
  description text,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  category_id uuid references public.event_categories(id) on delete set null,
  title text not null,
  slug text,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  capacity integer check (capacity is null or capacity > 0),
  visibility public.event_visibility not null default 'members',
  status public.event_status not null default 'draft',
  registration_enabled boolean not null default false,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  price numeric(14,2) not null default 0 check (price >= 0),
  currency char(3) not null default 'XOF',
  organizer_user_id uuid references auth.users(id) on delete set null,
  image_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  guest_name text,
  guest_email citext,
  guest_phone text,
  status public.registration_status not null default 'pending',
  registered_at timestamptz not null default now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  payment_status public.payment_status,
  qr_token text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (person_id is not null or guest_name is not null)
);

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  event_id uuid references public.events(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (event_id is not null or service_id is not null)
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  status public.attendance_status not null default 'present',
  checked_in_at timestamptz,
  checked_in_by uuid references auth.users(id) on delete set null,
  method text not null default 'manual',
  notes text,
  created_at timestamptz not null default now(),
  unique (session_id, person_id)
);

create table if not exists public.calendar_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  category text,
  color text,
  entity_type text,
  entity_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 11. FINANCE
-- =========================================================

create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type public.finance_entry_type not null,
  parent_id uuid references public.finance_categories(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name, type)
);

create table if not exists public.funds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text,
  description text,
  is_restricted boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  account_type text not null check (account_type in ('cash','bank','mobile_money','other')),
  provider_name text,
  account_reference text,
  currency char(3) not null default 'XOF',
  opening_balance numeric(14,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid references public.financial_accounts(id) on delete set null,
  category_id uuid references public.finance_categories(id) on delete set null,
  fund_id uuid references public.funds(id) on delete set null,
  type public.finance_entry_type not null,
  amount numeric(14,2) not null check (amount > 0),
  currency char(3) not null default 'XOF',
  transaction_date date not null default current_date,
  description text,
  reference text,
  payment_method public.payment_method,
  donor_person_id uuid references public.people(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  fiscal_year integer not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'draft' check (status in ('draft','active','closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  unique (organization_id, name, fiscal_year)
);

create table if not exists public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  budget_id uuid not null references public.budgets(id) on delete cascade,
  category_id uuid references public.finance_categories(id) on delete set null,
  fund_id uuid references public.funds(id) on delete set null,
  planned_amount numeric(14,2) not null default 0 check (planned_amount >= 0),
  actual_amount numeric(14,2) not null default 0 check (actual_amount >= 0),
  notes text,
  created_at timestamptz not null default now(),
  unique (budget_id, category_id, fund_id)
);

-- =========================================================
-- 12. TRAINING
-- =========================================================

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  status public.course_status not null default 'draft',
  instructor_person_id uuid references public.people(id) on delete set null,
  image_url text,
  duration_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0,
  content jsonb not null default '{}'::jsonb,
  duration_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  status public.enrollment_status not null default 'enrolled',
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (course_id, person_id)
);

create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  person_id uuid not null references public.people(id) on delete cascade,
  name text not null,
  certificate_number text,
  issued_at date,
  expires_at date,
  credential_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, certificate_number)
);

-- =========================================================
-- 13. COMMUNICATION
-- =========================================================

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  title text not null,
  content text not null,
  status text not null default 'draft' check (status in ('draft','scheduled','published','archived')),
  publish_at timestamptz,
  expires_at timestamptz,
  audience_filter jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  channel public.notification_channel not null,
  subject text,
  body text not null,
  variables jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name, channel)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid references public.message_templates(id) on delete set null,
  channel public.notification_channel not null,
  subject text,
  body text not null,
  recipient_filter jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  person_id uuid references public.people(id) on delete cascade,
  channel public.notification_channel not null default 'in_app',
  title text not null,
  body text not null,
  status public.notification_status not null default 'queued',
  data jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (user_id is not null or person_id is not null)
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  person_id uuid references public.people(id) on delete cascade,
  channel public.notification_channel not null,
  event_key text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  check (user_id is not null or person_id is not null)
);

-- =========================================================
-- 14. DOCUMENTS / RESOURCES
-- =========================================================

create table if not exists public.document_folders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  parent_id uuid references public.document_folders(id) on delete cascade,
  name text not null,
  visibility public.document_visibility not null default 'organization',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, parent_id, name)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  folder_id uuid references public.document_folders(id) on delete set null,
  name text not null,
  storage_bucket text not null default 'churchos-documents',
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  visibility public.document_visibility not null default 'organization',
  uploaded_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  name text not null,
  type public.resource_type not null,
  description text,
  quantity integer not null default 1 check (quantity > 0),
  location text,
  status text not null default 'available' check (status in ('available','maintenance','retired')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resource_reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  reserved_by_user_id uuid references auth.users(id) on delete set null,
  reserved_by_person_id uuid references public.people(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  purpose text,
  status public.reservation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (reserved_by_user_id is not null or reserved_by_person_id is not null)
);

-- =========================================================
-- 15. AI
-- =========================================================

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('system','user','assistant','tool')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  chunk_index integer not null default 0,
  content text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_documents_embedding_idx
  on public.ai_documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- =========================================================
-- 16. AUDIT
-- =========================================================

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 17. INDEXES
-- =========================================================

create index if not exists campuses_org_idx on public.campuses(organization_id);
create index if not exists memberships_org_idx on public.organization_memberships(organization_id);
create index if not exists memberships_user_idx on public.organization_memberships(user_id);

create index if not exists people_org_idx on public.people(organization_id);
create index if not exists people_name_idx on public.people(organization_id, last_name, first_name);
create index if not exists people_email_idx on public.people(organization_id, email);
create index if not exists members_org_status_idx on public.members(organization_id, status);
create index if not exists family_members_person_idx on public.family_members(person_id);
create index if not exists visitors_org_status_idx on public.visitors(organization_id, status);

create index if not exists groups_org_idx on public.groups(organization_id);
create index if not exists pastoral_org_status_idx on public.pastoral_followups(organization_id, status);
create index if not exists pastoral_assignee_idx on public.pastoral_followups(assigned_to_user_id, status);
create index if not exists prayer_org_status_idx on public.prayer_requests(organization_id, status);
create index if not exists visits_org_date_idx on public.visits(organization_id, scheduled_at);

create index if not exists ministries_org_idx on public.ministries(organization_id);
create index if not exists teams_org_idx on public.teams(organization_id);
create index if not exists services_org_date_idx on public.services(organization_id, starts_at);
create index if not exists planning_org_date_idx on public.planning_slots(organization_id, starts_at);

create index if not exists events_org_date_idx on public.events(organization_id, starts_at);
create index if not exists registrations_event_idx on public.event_registrations(event_id, status);
create index if not exists attendance_session_idx on public.attendance_records(session_id);
create index if not exists attendance_person_idx on public.attendance_records(person_id);

create index if not exists finance_transactions_org_date_idx
  on public.financial_transactions(organization_id, transaction_date);
create index if not exists finance_transactions_type_idx
  on public.financial_transactions(organization_id, type);

create index if not exists notifications_user_idx on public.notifications(user_id, status, created_at desc);
create index if not exists documents_org_idx on public.documents(organization_id);
create index if not exists audit_org_date_idx on public.audit_logs(organization_id, created_at desc);

-- =========================================================
-- 18. UPDATED_AT TRIGGERS
-- =========================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','organizations','organization_settings','campuses',
    'organization_memberships','plans','subscriptions','payments',
    'people','members','families','visitors','groups',
    'pastoral_followups','prayer_requests','visits','pastoral_councils',
    'pastoral_actions','ministries','teams','workers','services',
    'planning_slots','events','event_registrations','calendar_items',
    'financial_accounts','financial_transactions','budgets',
    'courses','course_modules','announcements','message_templates',
    'document_folders','documents','resources','resource_reservations',
    'ai_conversations'
  ]
  loop
    execute format(
      'drop trigger if exists %I on public.%I',
      'set_updated_at_' || t, t
    );
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      'set_updated_at_' || t, t
    );
  end loop;
end $$;

-- =========================================================
-- 19. AUTH PROFILE TRIGGER
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, display_name, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email),
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- =========================================================
-- 20. RLS
-- =========================================================

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_settings enable row level security;
alter table public.campuses enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.membership_roles enable row level security;

-- Organization-scoped tables:
do $$
declare
  t text;
begin
  foreach t in array array[
    'organization_features','subscriptions','invoices','payments',
    'people','members','families','family_members','person_relationships',
    'visitors','groups','group_members','pastoral_followups','pastoral_notes',
    'prayer_requests','prayer_updates','visits','pastoral_councils',
    'pastoral_council_members','pastoral_actions','ministries','ministry_members',
    'teams','team_members','workers','service_types','services',
    'service_assignments','planning_slots','event_categories','events',
    'event_registrations','attendance_sessions','attendance_records',
    'calendar_items','finance_categories','funds','financial_accounts',
    'financial_transactions','budgets','budget_lines','courses','course_modules',
    'course_enrollments','certifications','announcements','message_templates',
    'messages','notifications','notification_preferences','document_folders',
    'documents','resources','resource_reservations','ai_conversations',
    'ai_messages','ai_documents','audit_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'drop policy if exists %I on public.%I',
      t || '_select_org', t
    );
    execute format(
      'create policy %I on public.%I for select using (public.is_org_member(organization_id))',
      t || '_select_org', t
    );
    execute format(
      'drop policy if exists %I on public.%I',
      t || '_insert_org', t
    );
    execute format(
      'create policy %I on public.%I for insert with check (public.is_org_member(organization_id))',
      t || '_insert_org', t
    );
    execute format(
      'drop policy if exists %I on public.%I',
      t || '_update_org', t
    );
    execute format(
      'create policy %I on public.%I for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))',
      t || '_update_org', t
    );
    execute format(
      'drop policy if exists %I on public.%I',
      t || '_delete_org', t
    );
    execute format(
      'create policy %I on public.%I for delete using (public.is_org_admin(organization_id))',
      t || '_delete_org', t
    );
  end loop;
end $$;

-- Confidentialité pastorale (Phase 6) — remplace la policy select générique ci-dessus pour ces
-- trois tables seulement ; insert/update/delete restent sur la policy générique. Voir
-- docs/architecture/03-multi-tenancy-and-rls.md#confidentialité-pastorale-durcie-en-phase-6.
drop policy if exists prayer_requests_select_org on public.prayer_requests;
create policy prayer_requests_select_org on public.prayer_requests
for select using (
  public.is_org_member(organization_id) and (
    not is_confidential
    or created_by = auth.uid()
    or assigned_to_user_id = auth.uid()
    or public.is_org_admin(organization_id)
    or public.has_permission(organization_id, 'pastoral.view_confidential')
  )
);

drop policy if exists pastoral_followups_select_org on public.pastoral_followups;
create policy pastoral_followups_select_org on public.pastoral_followups
for select using (
  public.is_org_member(organization_id) and (
    confidentiality = 'normal'
    or created_by = auth.uid()
    or assigned_to_user_id = auth.uid()
    or public.is_org_admin(organization_id)
    or (confidentiality = 'pastoral' and public.has_permission(organization_id, 'pastoral.view_confidential'))
  )
);

drop policy if exists pastoral_notes_select_org on public.pastoral_notes;
create policy pastoral_notes_select_org on public.pastoral_notes
for select using (
  public.is_org_member(organization_id) and (
    not is_private
    or author_user_id = auth.uid()
    or public.is_org_admin(organization_id)
    or public.has_permission(organization_id, 'pastoral.view_confidential')
  )
);

-- Profile policies
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
for select using (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

-- Organizations
drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member on public.organizations
for select using (public.is_org_member(id));

drop policy if exists organizations_update_admin on public.organizations;
create policy organizations_update_admin on public.organizations
for update using (public.is_org_admin(id)) with check (public.is_org_admin(id));

-- Campuses / Organization settings
-- `alter table ... enable row level security` était déjà présent pour ces deux tables (§20
-- ci-dessus) mais sans aucune policy associée : en Postgres, RLS activé + zéro policy = accès
-- refusé à tout rôle non-superutilisateur, y compris `authenticated`. Repéré en vérifiant
-- l'onboarding en conditions réelles (création de campus bloquée par RLS dès la première
-- organisation créée hors seed). Même posture que `organizations` (select ouvert aux membres,
-- écriture réservée aux admins) plutôt que le pattern générique `is_org_member` en écriture des
-- tables métier : campus et paramètres sont structurels, pas des données métier courantes.
drop policy if exists campuses_select_org on public.campuses;
create policy campuses_select_org on public.campuses
for select using (public.is_org_member(organization_id));

drop policy if exists campuses_insert_admin on public.campuses;
create policy campuses_insert_admin on public.campuses
for insert with check (public.is_org_admin(organization_id));

drop policy if exists campuses_update_admin on public.campuses;
create policy campuses_update_admin on public.campuses
for update using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

drop policy if exists campuses_delete_admin on public.campuses;
create policy campuses_delete_admin on public.campuses
for delete using (public.is_org_admin(organization_id));

drop policy if exists organization_settings_select_org on public.organization_settings;
create policy organization_settings_select_org on public.organization_settings
for select using (public.is_org_member(organization_id));

drop policy if exists organization_settings_update_admin on public.organization_settings;
create policy organization_settings_update_admin on public.organization_settings
for update using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
-- Pas de policy insert/delete : la ligne est créée par `bootstrap_organization()`
-- (`security definer`, contourne RLS) et supprimée en cascade avec l'organisation, jamais par
-- une action utilisateur directe.

-- Memberships
drop policy if exists memberships_select_self_or_org on public.organization_memberships;
create policy memberships_select_self_or_org on public.organization_memberships
for select using (
  user_id = auth.uid() or public.is_org_member(organization_id)
);

drop policy if exists memberships_insert_admin on public.organization_memberships;
create policy memberships_insert_admin on public.organization_memberships
for insert with check (public.is_org_admin(organization_id));

drop policy if exists memberships_update_admin on public.organization_memberships;
create policy memberships_update_admin on public.organization_memberships
for update using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));


-- RBAC visibility
drop policy if exists roles_select_org on public.roles;
create policy roles_select_org on public.roles
for select using (organization_id is null or public.is_org_member(organization_id));

drop policy if exists roles_manage_admin on public.roles;
create policy roles_manage_admin on public.roles
for all using (organization_id is not null and public.is_org_admin(organization_id))
with check (organization_id is not null and public.is_org_admin(organization_id));

drop policy if exists permissions_select_authenticated on public.permissions;
create policy permissions_select_authenticated on public.permissions
for select using (auth.uid() is not null);

drop policy if exists role_permissions_select_org on public.role_permissions;
create policy role_permissions_select_org on public.role_permissions
for select using (
  exists (
    select 1 from public.roles r
    where r.id = role_permissions.role_id
      and (r.organization_id is null or public.is_org_member(r.organization_id))
  )
);

drop policy if exists role_permissions_manage_admin on public.role_permissions;
create policy role_permissions_manage_admin on public.role_permissions
for all using (
  exists (
    select 1 from public.roles r
    where r.id = role_permissions.role_id
      and r.organization_id is not null
      and public.is_org_admin(r.organization_id)
  )
)
with check (
  exists (
    select 1 from public.roles r
    where r.id = role_permissions.role_id
      and r.organization_id is not null
      and public.is_org_admin(r.organization_id)
  )
);

drop policy if exists membership_roles_select_org on public.membership_roles;
create policy membership_roles_select_org on public.membership_roles
for select using (
  exists (
    select 1 from public.organization_memberships om
    where om.id = membership_roles.membership_id
      and public.is_org_member(om.organization_id)
  )
);

drop policy if exists membership_roles_manage_admin on public.membership_roles;
create policy membership_roles_manage_admin on public.membership_roles
for all using (
  exists (
    select 1 from public.organization_memberships om
    where om.id = membership_roles.membership_id
      and public.is_org_admin(om.organization_id)
  )
)
with check (
  exists (
    select 1 from public.organization_memberships om
    where om.id = membership_roles.membership_id
      and public.is_org_admin(om.organization_id)
  )
);

-- =========================================================
-- 21. SEED RBAC
-- =========================================================

insert into public.permissions (code, name, module, description) values
('members.view','Voir les membres','members','Consulter les membres'),
('members.create','Créer des membres','members','Créer un membre'),
('members.update','Modifier les membres','members','Modifier un membre'),
('members.delete','Supprimer les membres','members','Supprimer un membre'),
('pastoral.view','Voir le pastoral','pastoral','Consulter le suivi pastoral'),
('pastoral.create','Créer un suivi pastoral','pastoral','Créer un suivi'),
('pastoral.update','Modifier le pastoral','pastoral','Modifier un suivi'),
('pastoral.delete','Supprimer le pastoral','pastoral','Supprimer un suivi'),
('pastoral.view_confidential','Voir le pastoral confidentiel','pastoral','Voir les suivis pastoraux et sujets de prière marqués confidentiels'),
('prayer.view','Voir les prières','prayer','Consulter les sujets de prière'),
('prayer.create','Créer une prière','prayer','Créer un sujet'),
('prayer.update','Modifier les prières','prayer','Modifier un sujet'),
('visits.view','Voir les visites','visits','Consulter les visites pastorales'),
('visits.create','Créer des visites','visits','Planifier ou enregistrer une visite'),
('visits.update','Modifier les visites','visits','Modifier une visite'),
('pastoral_council.view','Voir le conseil pastoral','pastoral_council','Consulter les réunions du conseil pastoral'),
('pastoral_council.manage','Gérer le conseil pastoral','pastoral_council','Créer/modifier les réunions, membres et actions du conseil pastoral'),
('ministries.view','Voir les ministères','ministries','Consulter les ministères'),
('ministries.create','Créer des ministères','ministries','Créer un ministère'),
('ministries.update','Modifier les ministères','ministries','Modifier un ministère'),
('teams.view','Voir les équipes','teams','Consulter les équipes'),
('teams.create','Créer des équipes','teams','Créer une équipe'),
('teams.update','Modifier les équipes','teams','Modifier une équipe'),
('workers.view','Voir les ouvriers','workers','Consulter les ouvriers'),
('workers.create','Créer des ouvriers','workers','Enregistrer un ouvrier'),
('workers.update','Modifier les ouvriers','workers','Modifier un ouvrier'),
('services.view','Voir les services','services','Consulter les services (cultes)'),
('services.create','Créer des services','services','Créer un service et ses affectations'),
('services.update','Modifier les services','services','Modifier un service ou ses affectations'),
('planning.view','Voir les plannings','planning','Consulter les créneaux de planning'),
('planning.create','Créer des créneaux de planning','planning','Créer un créneau de planning'),
('planning.update','Modifier les plannings','planning','Modifier un créneau de planning'),
('events.view','Voir les événements','events','Consulter les événements'),
('events.create','Créer des événements','events','Créer un événement'),
('events.update','Modifier les événements','events','Modifier un événement'),
('events.delete','Supprimer les événements','events','Supprimer un événement'),
('attendance.view','Voir les présences','attendance','Consulter les présences'),
('attendance.create','Saisir les présences','attendance','Enregistrer une présence'),
('registrations.view','Voir les inscriptions','registrations','Consulter les inscriptions aux événements'),
('registrations.create','Créer des inscriptions','registrations','Inscrire une personne ou un invité à un événement'),
('registrations.update','Modifier les inscriptions','registrations','Modifier le statut d''une inscription'),
('calendar.view','Voir le calendrier','calendar','Consulter le calendrier agrégé'),
('calendar.manage','Gérer le calendrier','calendar','Créer/modifier des entrées de calendrier manuelles'),
('finance.view','Voir les finances','finance','Consulter les finances'),
('finance.create','Créer une opération financière','finance','Créer une opération'),
('finance.approve','Approuver une opération','finance','Approuver une opération'),
('reports.view','Voir les rapports','reports','Consulter les rapports'),
('reports.export','Exporter les rapports','reports','Exporter les rapports'),
('training.view','Voir les formations','training','Consulter les cours, modules, inscriptions et certifications'),
('training.manage','Gérer les formations','training','Créer/modifier les cours et leurs modules'),
('training.enroll','Gérer les inscriptions aux cours','training','Inscrire une personne à un cours, modifier statut/progression'),
('training.certify','Délivrer des certifications','training','Émettre une certification pour une personne'),
('communication.view','Voir les communications','communication','Consulter les annonces, modèles et l''historique d''envoi'),
('communication.manage','Gérer les communications','communication','Créer/modifier les annonces et les modèles de message'),
('communication.send','Envoyer des messages','communication','Composer et envoyer une campagne de messages'),
('documents.view','Voir les documents','documents','Consulter les dossiers et documents'),
('documents.manage','Gérer les documents','documents','Créer des dossiers, téléverser et supprimer des documents'),
('resources.view','Voir les salles et équipements','resources','Consulter les salles, équipements et véhicules'),
('resources.manage','Gérer les salles et équipements','resources','Créer/modifier les salles, équipements et véhicules'),
('resources.reserve','Réserver une ressource','resources','Créer et gérer une réservation de salle ou d''équipement'),
('settings.manage','Gérer les paramètres','settings','Administrer ChurchOS')
on conflict (code) do nothing;

insert into public.plans
(code,name,description,price_monthly,price_yearly,currency,max_members,max_campuses)
values
('FREE','Free','Pour démarrer',0,0,'XOF',100,1),
('STARTER','Starter','Pour les églises en croissance',15000,144000,'XOF',1000,2),
('PRO','Pro','Gestion complète de l’église',30000,288000,'XOF',5000,10),
('ENTERPRISE','Enterprise','Réseaux et grandes organisations',0,0,'XOF',null,null)
on conflict (code) do nothing;

insert into public.feature_flags (key,name,description) values
('members','Gestion des membres','Gestion des membres'),
('pastoral','Suivi pastoral','Suivi pastoral'),
('prayer','Sujets de prière','Gestion des prières'),
('events','Événements','Gestion des événements'),
('attendance','Présences','Gestion des présences'),
('finance','Finances','Gestion financière'),
('training','Formations','Gestion des formations'),
('communication','Communication','Communication'),
('documents','Documents','Gestion documentaire'),
('analytics','Analytics','Rapports et statistiques'),
('ai','ChurchOS AI','Fonctionnalités IA'),
('multi_campus','Multi-campus','Gestion multi-campus')
on conflict (key) do nothing;

-- =========================================================
-- 22. GRANTS
-- =========================================================

grant usage on schema public to anon, authenticated;
grant select on public.plans, public.feature_flags, public.permissions to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- =========================================================
-- 23. STORAGE (Phase 12 — Documents)
-- =========================================================

-- Bucket privé (jamais public) — chaque objet est stocké sous
-- `<organization_id>/<uuid>-<nom_fichier>`, ce qui permet aux policies ci-dessous de retrouver
-- l'organisation directement depuis le chemin, sans table de correspondance supplémentaire.
-- `allowed_mime_types` est le contrôle "types de fichiers contrôlés" du critère de sortie de
-- cette phase, appliqué par Supabase Storage lui-même (en plus de la validation Zod côté
-- application) — un type hors de cette liste est rejeté par l'API Storage avant même d'atteindre
-- le bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'churchos-documents',
  'churchos-documents',
  false,
  26214400, -- 25 Mo
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Même posture que les tables `public.*` (`is_org_member` en lecture/écriture, `is_org_admin` en
-- suppression) — voir la boucle générique §20 — appliquée ici à `storage.objects` puisque RLS sur
-- ce bucket ne peut pas référencer une colonne `organization_id` classique.
drop policy if exists documents_storage_select_org on storage.objects;
create policy documents_storage_select_org on storage.objects
for select using (
  bucket_id = 'churchos-documents'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists documents_storage_insert_org on storage.objects;
create policy documents_storage_insert_org on storage.objects
for insert with check (
  bucket_id = 'churchos-documents'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists documents_storage_delete_org on storage.objects;
create policy documents_storage_delete_org on storage.objects
for delete using (
  bucket_id = 'churchos-documents'
  and public.is_org_admin((storage.foldername(name))[1]::uuid)
);

-- =========================================================
-- Administration globale ChurchOS (vue /platform)
-- =========================================================
-- Marqueur de plateforme, distinct du rôle `SUPER_ADMIN` (qui est porté par un membership, donc
-- limité à UNE organisation — voir is_org_admin()). RLS activée SANS politique : ni le rôle
-- `anon` ni `authenticated` (PostgREST) ne peuvent lire/écrire cette table ; seul l'accès serveur
-- (Drizzle via DATABASE_URL, qui contourne RLS) la consulte, derrière `requirePlatformAdmin()`.
-- Ajout : `npm run db:grant-platform-admin -- email@exemple.com`.
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
alter table public.platform_admins enable row level security;

-- =========================================================
-- Formulaire « Nouvelle dépense » enrichi (maquette "Formulaire nouvelle dépense")
-- =========================================================
-- Idempotent. À appliquer sur le projet Supabase AVANT de déployer le code qui lit ces colonnes
-- (SQL Editor, ou `psql $DATABASE_URL -f db/migrations/2026-09-30-expense-form-fields.sql`).
-- Le même bloc figure à la fin de db/schema.sql, pour qu'une base neuve l'ait d'emblée.

-- Libellé court (`title`), description longue (`description`, existante) et notes internes.
-- Fournisseur en texte libre ; sous-catégorie = catégorie enfant (`finance_categories.parent_id`) ;
-- centre de coût = campus ; statut de validation (les lignes existantes restent « validated »).
alter table public.financial_transactions
  add column if not exists title text,
  add column if not exists notes text,
  add column if not exists vendor_name text,
  add column if not exists invoice_date date,
  add column if not exists subcategory_id uuid references public.finance_categories(id) on delete set null,
  add column if not exists campus_id uuid references public.campuses(id) on delete set null,
  add column if not exists status text not null default 'validated',
  -- Donateur hors base « people » (formulaire « Nouveau don » : visiteur / autre personne).
  add column if not exists donor_name text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'financial_transactions_status_check'
  ) then
    alter table public.financial_transactions
      add constraint financial_transactions_status_check
      check (status in ('validated','pending','rejected'));
  end if;
end $$;

create index if not exists finance_transactions_status_idx
  on public.financial_transactions(organization_id, status);

-- Pièces jointes (factures, photos). Le fichier vit dans le bucket Storage `churchos-finance`,
-- sous `<organization_id>/<transaction_id>/<uuid>-<nom>` (les policies retrouvent l'organisation
-- depuis le chemin, comme pour `churchos-documents`).
create table if not exists public.financial_transaction_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  transaction_id uuid not null references public.financial_transactions(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists finance_attachments_transaction_idx
  on public.financial_transaction_attachments(transaction_id);

alter table public.financial_transaction_attachments enable row level security;

drop policy if exists financial_transaction_attachments_select_org on public.financial_transaction_attachments;
create policy financial_transaction_attachments_select_org on public.financial_transaction_attachments
for select using (public.is_org_member(organization_id));

drop policy if exists financial_transaction_attachments_insert_org on public.financial_transaction_attachments;
create policy financial_transaction_attachments_insert_org on public.financial_transaction_attachments
for insert with check (public.is_org_member(organization_id));

drop policy if exists financial_transaction_attachments_delete_org on public.financial_transaction_attachments;
create policy financial_transaction_attachments_delete_org on public.financial_transaction_attachments
for delete using (public.is_org_admin(organization_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'churchos-finance',
  'churchos-finance',
  false,
  10485760, -- 10 Mo
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists finance_storage_select_org on storage.objects;
create policy finance_storage_select_org on storage.objects
for select using (
  bucket_id = 'churchos-finance'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists finance_storage_insert_org on storage.objects;
create policy finance_storage_insert_org on storage.objects
for insert with check (
  bucket_id = 'churchos-finance'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists finance_storage_delete_org on storage.objects;
create policy finance_storage_delete_org on storage.objects
for delete using (
  bucket_id = 'churchos-finance'
  and (
    public.is_org_admin((storage.foldername(name))[1]::uuid)
    -- Le téléverseur peut retirer SES fichiers : indispensable au nettoyage quand l'enregistrement
    -- de la dépense échoue après l'envoi des justificatifs.
    or owner_id = (select auth.uid())::text
  )
);

-- =========================================================
-- Formulaire « Nouveau budget » enrichi (maquette "Formulaire nouveau budget")
-- =========================================================
-- Idempotent. À appliquer sur Supabase avant d'utiliser le nouveau formulaire (le code n'envoie
-- ces colonnes que lorsqu'elles sont renseignées). Le même bloc figure à la fin de db/schema.sql.
alter table public.budgets
  add column if not exists description text,
  add column if not exists notes text,
  add column if not exists manager_person_id uuid references public.people(id) on delete set null,
  add column if not exists campus_id uuid references public.campuses(id) on delete set null;

-- Rattache un budget à un ministère (champ « Ministère / Projet » de la maquette du formulaire
-- « Nouveau budget »). Idempotent ; inclus aussi à la fin de db/schema.sql.
alter table public.budgets
  add column if not exists ministry_id uuid references public.ministries(id) on delete set null;

-- Demande à l'API Supabase (PostgREST) de recharger son cache de schéma : sans cela, les nouvelles
-- colonnes restent introuvables ("Could not find the '...' column ... in the schema cache").
notify pgrst, 'reload schema';

-- =========================================================
-- Logo d'église (Paramètres > Église) — bucket Storage `churchos-logos`
-- =========================================================
-- Idempotent ; inclus aussi à la fin de db/schema.sql. L'URL publique du logo est stockée dans
-- `organizations.logo_url` (colonne existante). Bucket PUBLIC en lecture : un logo n'a rien de
-- confidentiel et s'affiche via un simple <img>. Écriture limitée à l'organisation propriétaire
-- (chemin `<organization_id>/...`, comme `churchos-documents`). Formats : PNG, JPEG, WebP — pas de
-- SVG (un SVG servi directement peut embarquer du script). 2 Mo maximum.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'churchos-logos',
  'churchos-logos',
  true,
  2097152, -- 2 Mo
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists logos_storage_insert_org on storage.objects;
create policy logos_storage_insert_org on storage.objects
for insert with check (
  bucket_id = 'churchos-logos'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists logos_storage_delete_org on storage.objects;
create policy logos_storage_delete_org on storage.objects
for delete using (
  bucket_id = 'churchos-logos'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

notify pgrst, 'reload schema';

-- =========================================================
-- Photo de profil — bucket Storage `churchos-avatars`
-- =========================================================
-- Idempotent ; inclus aussi à la fin de db/schema.sql. `profiles.avatar_url` (colonne existante)
-- porte soit un avatar prédéfini (`/avatars/avatar-NN.svg`, fichier statique de l'application),
-- soit l'URL publique d'une photo envoyée dans ce bucket. Bucket PUBLIC en lecture (la photo
-- s'affiche via un simple <img>) ; écriture limitée au dossier de l'utilisateur
-- (`<user_id>/...`). PNG/JPEG/WebP, 2 Mo maximum — pas de SVG envoyé par l'utilisateur.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'churchos-avatars',
  'churchos-avatars',
  true,
  2097152, -- 2 Mo
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_storage_insert_self on storage.objects;
create policy avatars_storage_insert_self on storage.objects
for insert with check (
  bucket_id = 'churchos-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists avatars_storage_delete_self on storage.objects;
create policy avatars_storage_delete_self on storage.objects
for delete using (
  bucket_id = 'churchos-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

notify pgrst, 'reload schema';

-- =========================================================
-- Photo des membres — bucket Storage `churchos-member-photos`
-- =========================================================
-- Idempotent ; inclus aussi à la fin de db/schema.sql. `people.photo_url` (colonne existante)
-- porte l'URL publique de la photo. Bucket PUBLIC en lecture (affichage via un simple <img>) ;
-- écriture réservée aux membres de l'organisation (chemin `<organization_id>/<person_id>/...`).
-- PNG/JPEG/WebP, 2 Mo maximum.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'churchos-member-photos',
  'churchos-member-photos',
  true,
  2097152, -- 2 Mo
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists member_photos_storage_insert_org on storage.objects;
create policy member_photos_storage_insert_org on storage.objects
for insert with check (
  bucket_id = 'churchos-member-photos'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists member_photos_storage_delete_org on storage.objects;
create policy member_photos_storage_delete_org on storage.objects
for delete using (
  bucket_id = 'churchos-member-photos'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

notify pgrst, 'reload schema';

-- =========================================================
-- END
-- =========================================================
