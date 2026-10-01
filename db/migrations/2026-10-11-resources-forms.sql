-- =========================================================
-- Salles & équipements — formulaires « Nouvelle salle » / « Nouvel équipement »
-- =========================================================
-- Idempotent ; inclus aussi à la fin de db/schema.sql.
-- Champs de salle
alter table public.resources add column if not exists capacity integer check (capacity is null or capacity > 0);
alter table public.resources add column if not exists room_type text;
alter table public.resources add column if not exists amenities text[] not null default '{}';
alter table public.resources add column if not exists reservable_by text not null default 'members' check (reservable_by in ('members', 'leaders', 'admins'));
alter table public.resources add column if not exists allow_reservations boolean not null default true;
-- Défaut true : les ressources existantes gardent leur comportement (réservations « en attente » à valider).
alter table public.resources add column if not exists requires_approval boolean not null default true;
alter table public.resources add column if not exists public_calendar boolean not null default false;
alter table public.resources add column if not exists internal_notes text;
-- Champs d'équipement
alter table public.resources add column if not exists category text;
alter table public.resources add column if not exists brand text;
alter table public.resources add column if not exists model text;
alter table public.resources add column if not exists serial_number text;
alter table public.resources add column if not exists condition text check (condition is null or condition in ('new', 'good', 'worn', 'to_repair', 'out_of_service'));
alter table public.resources add column if not exists purchase_date date;
alter table public.resources add column if not exists purchase_value numeric(14, 0);
alter table public.resources add column if not exists room_id uuid references public.resources(id) on delete set null;
alter table public.resources add column if not exists responsible_person_id uuid references public.people(id) on delete set null;
alter table public.resources add column if not exists warranty_end date;
alter table public.resources add column if not exists supplier text;
alter table public.resources add column if not exists invoice_reference text;
-- Communs : photos (URLs publiques) et documents ([{path, name, mime, size}], bucket privé)
alter table public.resources add column if not exists photos text[] not null default '{}';
alter table public.resources add column if not exists documents jsonb not null default '[]'::jsonb;

-- Reprise des valeurs rangées jusqu'ici dans `metadata` (capacity, roomType, category, roomId, photos).
update public.resources set capacity = (metadata ->> 'capacity')::int
  where capacity is null and (metadata ->> 'capacity') ~ '^\d+$' and (metadata ->> 'capacity')::int > 0;
update public.resources set room_type = metadata ->> 'roomType' where room_type is null and metadata ->> 'roomType' is not null;
update public.resources set category = metadata ->> 'category' where category is null and metadata ->> 'category' is not null;
update public.resources e set room_id = r.id
  from public.resources r
  where e.room_id is null and r.type = 'room' and r.id::text = e.metadata ->> 'roomId';

-- Statut « brouillon » (bouton « Enregistrer en brouillon »)
alter table public.resources drop constraint if exists resources_status_check;
alter table public.resources add constraint resources_status_check check (status in ('available', 'maintenance', 'retired', 'draft'));

create index if not exists resources_room_idx on public.resources (room_id);

-- Photos : bucket PUBLIC en lecture (<img>), 5 Mo max.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('churchos-resources', 'churchos-resources', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Documents d'équipement (factures, notices) : bucket PRIVÉ (URL signée), 5 Mo max.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('churchos-resource-docs', 'churchos-resource-docs', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

do $$
declare b text;
begin
  foreach b in array array['churchos-resources', 'churchos-resource-docs'] loop
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

drop policy if exists churchos_resource_docs_select_org on storage.objects;
create policy churchos_resource_docs_select_org on storage.objects
for select using (bucket_id = 'churchos-resource-docs' and public.is_org_member((storage.foldername(name))[1]::uuid));

notify pgrst, 'reload schema';
