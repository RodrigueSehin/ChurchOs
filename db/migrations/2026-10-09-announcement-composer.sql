-- =========================================================
-- Formulaire « Nouvelle annonce » + publication sur les réseaux sociaux
-- =========================================================
-- Idempotent ; inclus aussi à la fin de db/schema.sql.
alter table public.announcements add column if not exists announcement_type text not null default 'announcement';
alter table public.announcements add column if not exists category text;
alter table public.announcements add column if not exists importance text not null default 'normal';
alter table public.announcements add column if not exists attachment_url text;
alter table public.announcements add column if not exists attachment_name text;
alter table public.announcements add column if not exists attachment_type text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'announcements_type_check') then
    alter table public.announcements add constraint announcements_type_check check (announcement_type in ('announcement', 'event', 'reminder', 'urgent'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'announcements_importance_check') then
    alter table public.announcements add constraint announcements_importance_check check (importance in ('normal', 'high', 'urgent'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'announcements_attachment_type_check') then
    alter table public.announcements add constraint announcements_attachment_type_check check (attachment_type is null or attachment_type in ('video', 'document'));
  end if;
end $$;

-- Comptes de réseaux sociaux de l'église (Facebook / Instagram). Le jeton d'accès est CHIFFRÉ par
-- l'application (AES-256-GCM, clé SOCIAL_TOKEN_KEY) avant d'être stocké ; RLS : réservé aux admins
-- côté PostgREST (l'application lit et publie via sa connexion serveur, jamais depuis le navigateur).
create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('facebook', 'instagram')),
  label text not null,
  external_id text not null,
  token_encrypted text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, provider, external_id)
);

-- Une ligne par (annonce, compte) : résultat de la publication, succès comme échec.
create table if not exists public.announcement_social_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  connection_id uuid references public.social_connections(id) on delete set null,
  provider text not null,
  status text not null check (status in ('published', 'scheduled', 'failed')),
  external_post_id text,
  error text,
  created_at timestamptz not null default now()
);

alter table public.social_connections enable row level security;
drop policy if exists social_connections_admin on public.social_connections;
create policy social_connections_admin on public.social_connections
for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

alter table public.announcement_social_posts enable row level security;
drop policy if exists announcement_social_posts_select_org on public.announcement_social_posts;
create policy announcement_social_posts_select_org on public.announcement_social_posts
for select using (public.is_org_member(organization_id));
drop policy if exists announcement_social_posts_insert_org on public.announcement_social_posts;
create policy announcement_social_posts_insert_org on public.announcement_social_posts
for insert with check (public.is_org_member(organization_id));

-- Médias d'annonce (image, vidéo, document) : le bucket public existant passe à 50 Mo et accepte vidéos
-- MP4 et documents PDF/DOCX ; envoi direct navigateur → Storage.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
where id = 'churchos-announcements';

notify pgrst, 'reload schema';
