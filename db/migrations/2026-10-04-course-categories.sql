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
