-- =========================================================
-- Formulaire « Nouvelle certification » — champs supplémentaires + bucket des fichiers
-- =========================================================
-- Idempotent ; inclus aussi à la fin de db/schema.sql.
alter table public.certifications add column if not exists issuer text;
alter table public.certifications add column if not exists description text;
alter table public.certifications add column if not exists instructor_person_id uuid references public.people(id) on delete set null;
alter table public.certifications add column if not exists status text not null default 'obtained';
alter table public.certifications add column if not exists visibility text not null default 'managers';
alter table public.certifications add column if not exists file_path text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'certifications_status_check') then
    alter table public.certifications add constraint certifications_status_check check (status in ('obtained', 'pending', 'expired'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'certifications_visibility_check') then
    alter table public.certifications add constraint certifications_visibility_check check (visibility in ('managers', 'member', 'organization'));
  end if;
end $$;

-- Les certifications sans date d'obtention étaient « en cours » avant l'introduction de la colonne.
update public.certifications set status = 'pending' where issued_at is null and status = 'obtained';

-- Fichiers de certificat : bucket PRIVÉ (lecture par URL signée), chemin `<organization_id>/<uuid>-<nom>`.
-- PDF/PNG/JPEG, 5 Mo maximum.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'churchos-certificates',
  'churchos-certificates',
  false,
  5242880,
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists certificates_storage_select_org on storage.objects;
create policy certificates_storage_select_org on storage.objects
for select using (
  bucket_id = 'churchos-certificates'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists certificates_storage_insert_org on storage.objects;
create policy certificates_storage_insert_org on storage.objects
for insert with check (
  bucket_id = 'churchos-certificates'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists certificates_storage_delete_org on storage.objects;
create policy certificates_storage_delete_org on storage.objects
for delete using (
  bucket_id = 'churchos-certificates'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

notify pgrst, 'reload schema';
