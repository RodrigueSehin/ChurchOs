-- ============================================================================
-- Stub LOCAL UNIQUEMENT de `auth.users` / `auth.uid()` (Supabase Auth).
--
-- Sur un vrai projet Supabase, ce schéma et cette fonction existent déjà et sont
-- gérés par Supabase — ce fichier n'est jamais exécuté contre Supabase, il ne sert
-- qu'à pouvoir migrer/tester db/rls-policies.sql sur un Postgres local (Docker
-- absent sur cette machine, voir db/local-postgres/README.md).
-- ============================================================================

create schema if not exists auth;

-- Colonnes limitées à celles réellement lues par nos triggers/fonctions
-- (handle_new_user() lit new.raw_user_meta_data, new.phone, new.email).
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  raw_app_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Émule auth.uid() : lit le claim JWT "sub" posé par la session courante via
-- `select set_config('request.jwt.claim.sub', '<uuid>', true)`, comme le fait le
-- PostgREST/GoTrue de Supabase en production.
create or replace function auth.uid() returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
