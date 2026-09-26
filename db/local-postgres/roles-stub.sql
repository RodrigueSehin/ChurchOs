-- ============================================================================
-- Stub LOCAL UNIQUEMENT des rôles Postgres que Supabase préconfigure sur chaque
-- projet (anon, authenticated, service_role). db/schema.sql fait des `grant ...
-- to authenticated` qui échoueraient sans ce rôle sur un Postgres local nu.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;
