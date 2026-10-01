-- ===== 2026-10-03-course-form-fields.sql =====
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

-- ===== 2026-10-04-course-categories.sql =====
-- =========================================================
-- Catégories de cours modifiables
-- =========================================================
-- Idempotent ; inclus aussi à la fin de db/schema.sql. `courses.category` reste un texte (le nom de
-- la catégorie) : supprimer une catégorie ne touche pas aux cours qui l'utilisent.
create table if not exists public.course_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

alter table public.course_categories enable row level security;

drop policy if exists course_categories_select_org on public.course_categories;
create policy course_categories_select_org on public.course_categories
for select using (public.is_org_member(organization_id));

drop policy if exists course_categories_insert_org on public.course_categories;
create policy course_categories_insert_org on public.course_categories
for insert with check (public.is_org_member(organization_id));

drop policy if exists course_categories_update_org on public.course_categories;
create policy course_categories_update_org on public.course_categories
for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

drop policy if exists course_categories_delete_org on public.course_categories;
create policy course_categories_delete_org on public.course_categories
for delete using (public.is_org_member(organization_id));

-- Catégories par défaut pour les organisations existantes (les nouvelles en reçoivent à la première
-- ouverture du formulaire, côté application).
insert into public.course_categories (organization_id, name)
select o.id, c.name
from public.organizations o
cross join (values
  ('Fondements de la foi'), ('Vie de prière'), ('Discipolat'), ('Étude biblique'),
  ('Leadership'), ('Croissance spirituelle'), ('Vie en communauté'), ('Autre')
) as c(name)
on conflict (organization_id, name) do nothing;

notify pgrst, 'reload schema';

-- ===== 2026-10-05-certification-form-fields.sql =====
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

-- ===== 2026-10-06-library.sql =====
-- =========================================================
-- Bibliothèque (/library) — ressources pédagogiques, catégories, favoris, notes, fichiers
-- =========================================================
-- Idempotent ; inclus aussi à la fin de db/schema.sql.
create table if not exists public.library_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.library_resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid references public.library_categories(id) on delete set null,
  title text not null,
  resource_type text not null check (resource_type in ('book', 'bible_study', 'teaching', 'document', 'video', 'audio')),
  author text,
  published_on date,
  publisher text,
  description text not null,
  file_path text not null,
  file_name text,
  file_mime text,
  file_size bigint,
  cover_url text,
  visibility text not null default 'members' check (visibility in ('members', 'managers')),
  status text not null default 'published' check (status in ('published', 'draft', 'archived')),
  tags text[] not null default '{}',
  view_count integer not null default 0,
  download_count integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.library_bookmarks (
  resource_id uuid not null references public.library_resources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (resource_id, user_id)
);

create table if not exists public.library_ratings (
  resource_id uuid not null references public.library_resources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (resource_id, user_id)
);

create index if not exists library_resources_org_idx on public.library_resources (organization_id, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['library_categories', 'library_resources'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select_org', t);
    execute format('create policy %I on public.%I for select using (public.is_org_member(organization_id))', t || '_select_org', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_org', t);
    execute format('create policy %I on public.%I for insert with check (public.is_org_member(organization_id))', t || '_insert_org', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_org', t);
    execute format('create policy %I on public.%I for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))', t || '_update_org', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_org', t);
    execute format('create policy %I on public.%I for delete using (public.is_org_member(organization_id))', t || '_delete_org', t);
  end loop;
  foreach t in array array['library_bookmarks', 'library_ratings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_own', t);
    execute format(
      'create policy %I on public.%I for all using (user_id = (select auth.uid()) and public.is_org_member(organization_id)) with check (user_id = (select auth.uid()) and public.is_org_member(organization_id))',
      t || '_own', t
    );
  end loop;
end $$;

-- Catégories par défaut pour les organisations existantes (les nouvelles en reçoivent à la première
-- ouverture de la page, côté application).
insert into public.library_categories (organization_id, name)
select o.id, c.name
from public.organizations o
cross join (values
  ('Vie chrétienne'), ('Études bibliques'), ('Leadership'), ('Ministère pastoral'), ('Famille'),
  ('Jeunesse'), ('Évangélisation'), ('Dévotion'), ('Formation'), ('Administration'),
  ('Témoignages'), ('Autres')
) as c(name)
on conflict (organization_id, name) do nothing;

-- Fichiers des ressources : bucket PRIVÉ (URL signée), chemin `<organization_id>/<uuid>-<nom>`, 100 Mo max.
-- (Supabase plafonne aussi la taille par fichier au niveau du projet : Storage > Settings.)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'churchos-library',
  'churchos-library',
  false,
  104857600,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Couvertures : bucket PUBLIC en lecture (<img>), 5 Mo max, JPG/PNG/WebP.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'churchos-library-covers',
  'churchos-library-covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
declare b text;
begin
  foreach b in array array['churchos-library', 'churchos-library-covers'] loop
    execute format('drop policy if exists %I on storage.objects', replace(b, '-', '_') || '_insert_org');
    execute format(
      'create policy %I on storage.objects for insert with check (bucket_id = %L and public.is_org_member((storage.foldername(name))[1]::uuid))',
      replace(b, '-', '_') || '_insert_org', b
    );
    execute format('drop policy if exists %I on storage.objects', replace(b, '-', '_') || '_delete_org');
    execute format(
      'create policy %I on storage.objects for delete using (bucket_id = %L and public.is_org_member((storage.foldername(name))[1]::uuid))',
      replace(b, '-', '_') || '_delete_org', b
    );
  end loop;
end $$;

drop policy if exists churchos_library_select_org on storage.objects;
create policy churchos_library_select_org on storage.objects
for select using (
  bucket_id = 'churchos-library'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

notify pgrst, 'reload schema';

