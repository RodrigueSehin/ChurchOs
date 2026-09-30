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
