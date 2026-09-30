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
