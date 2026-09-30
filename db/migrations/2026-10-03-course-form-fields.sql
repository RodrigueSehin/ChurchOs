-- =========================================================
-- Formulaire « Nouveau cours » — champs supplémentaires + bucket des couvertures
-- =========================================================
-- Idempotent ; inclus aussi à la fin de db/schema.sql.
alter table public.courses add column if not exists category text;
alter table public.courses add column if not exists level text;
alter table public.courses add column if not exists prerequisites text;
alter table public.courses add column if not exists published_at date;
alter table public.courses add column if not exists allow_enrollment boolean not null default true;
alter table public.courses add column if not exists show_in_library boolean not null default true;
alter table public.courses add column if not exists co_instructor_ids uuid[] not null default '{}';

-- Couvertures de cours : bucket PUBLIC en lecture (simple <img>), écriture réservée aux membres de
-- l'organisation (chemin `<organization_id>/<course_id>/...`). PNG/JPEG/WebP, 2 Mo maximum.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'churchos-course-covers',
  'churchos-course-covers',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists course_covers_storage_insert_org on storage.objects;
create policy course_covers_storage_insert_org on storage.objects
for insert with check (
  bucket_id = 'churchos-course-covers'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists course_covers_storage_delete_org on storage.objects;
create policy course_covers_storage_delete_org on storage.objects
for delete using (
  bucket_id = 'churchos-course-covers'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

notify pgrst, 'reload schema';
