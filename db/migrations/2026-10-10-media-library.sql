-- =========================================================
-- Médias (/communication/media) — photos, audios, documents téléversés + chaîne YouTube de l'église
-- =========================================================
-- Idempotent ; inclus aussi à la fin de db/schema.sql.
create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('photo', 'audio', 'document')),
  title text not null,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  width integer,
  height integer,
  tags text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists media_items_org_idx on public.media_items (organization_id, created_at desc);

-- Chaîne YouTube de l'église (une par organisation) : les vidéos de la page Médias en viennent.
create table if not exists public.media_youtube_channels (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  channel_id text not null,
  channel_title text not null,
  channel_handle text,
  uploads_playlist_id text not null,
  updated_at timestamptz not null default now()
);

alter table public.media_items enable row level security;
drop policy if exists media_items_select_org on public.media_items;
create policy media_items_select_org on public.media_items for select using (public.is_org_member(organization_id));
drop policy if exists media_items_insert_org on public.media_items;
create policy media_items_insert_org on public.media_items for insert with check (public.is_org_member(organization_id));
drop policy if exists media_items_update_org on public.media_items;
create policy media_items_update_org on public.media_items for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists media_items_delete_org on public.media_items;
create policy media_items_delete_org on public.media_items for delete using (public.is_org_member(organization_id));

alter table public.media_youtube_channels enable row level security;
drop policy if exists media_youtube_channels_select_org on public.media_youtube_channels;
create policy media_youtube_channels_select_org on public.media_youtube_channels for select using (public.is_org_member(organization_id));
drop policy if exists media_youtube_channels_admin on public.media_youtube_channels;
create policy media_youtube_channels_admin on public.media_youtube_channels
for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

-- Fichiers : bucket PUBLIC en lecture (<img>, <audio>), chemin `<organization_id>/<uuid>-<nom>`, 100 Mo max.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'churchos-media',
  'churchos-media',
  true,
  104857600,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/ogg',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists churchos_media_insert_org on storage.objects;
create policy churchos_media_insert_org on storage.objects
for insert with check (bucket_id = 'churchos-media' and public.is_org_member((storage.foldername(name))[1]::uuid));
drop policy if exists churchos_media_delete_org on storage.objects;
create policy churchos_media_delete_org on storage.objects
for delete using (bucket_id = 'churchos-media' and public.is_org_member((storage.foldername(name))[1]::uuid));

notify pgrst, 'reload schema';
