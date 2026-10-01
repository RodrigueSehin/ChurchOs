-- =========================================================
-- Refonte /communication — image d'annonce, lectures (vues), bucket des images
-- =========================================================
-- Idempotent ; inclus aussi à la fin de db/schema.sql.
-- Le ciblage (« destinataires ») réutilise la colonne existante `announcements.audience_filter` (jsonb).
alter table public.announcements add column if not exists image_url text;

-- Une ligne par (annonce, utilisateur) : ouvrir une annonce l'enregistre comme lue une seule fois.
create table if not exists public.announcement_reads (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

alter table public.announcement_reads enable row level security;

drop policy if exists announcement_reads_select_org on public.announcement_reads;
create policy announcement_reads_select_org on public.announcement_reads
for select using (public.is_org_member(organization_id));

drop policy if exists announcement_reads_insert_own on public.announcement_reads;
create policy announcement_reads_insert_own on public.announcement_reads
for insert with check (user_id = (select auth.uid()) and public.is_org_member(organization_id));

drop policy if exists announcement_reads_delete_org on public.announcement_reads;
create policy announcement_reads_delete_org on public.announcement_reads
for delete using (public.is_org_admin(organization_id));

-- Images d'annonce : bucket PUBLIC en lecture (<img>), 4 Mo max (reste sous la limite de requête de
-- Vercel, l'image passe par la Server Action), JPG/PNG/WebP, chemin `<organization_id>/<uuid>.<ext>`.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'churchos-announcements',
  'churchos-announcements',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists announcements_storage_insert_org on storage.objects;
create policy announcements_storage_insert_org on storage.objects
for insert with check (
  bucket_id = 'churchos-announcements'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists announcements_storage_delete_org on storage.objects;
create policy announcements_storage_delete_org on storage.objects
for delete using (
  bucket_id = 'churchos-announcements'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

notify pgrst, 'reload schema';
