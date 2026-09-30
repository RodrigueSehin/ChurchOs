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
