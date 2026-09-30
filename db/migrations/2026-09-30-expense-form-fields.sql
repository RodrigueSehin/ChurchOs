-- =========================================================
-- Formulaire « Nouvelle dépense » enrichi (maquette "Formulaire nouvelle dépense")
-- =========================================================
-- Idempotent. À appliquer sur le projet Supabase AVANT de déployer le code qui lit ces colonnes
-- (SQL Editor, ou `psql $DATABASE_URL -f db/migrations/2026-09-30-expense-form-fields.sql`).
-- Le même bloc figure à la fin de db/schema.sql, pour qu'une base neuve l'ait d'emblée.

-- Libellé court (`title`), description longue (`description`, existante) et notes internes.
-- Fournisseur en texte libre ; sous-catégorie = catégorie enfant (`finance_categories.parent_id`) ;
-- centre de coût = campus ; statut de validation (les lignes existantes restent « validated »).
alter table public.financial_transactions
  add column if not exists title text,
  add column if not exists notes text,
  add column if not exists vendor_name text,
  add column if not exists invoice_date date,
  add column if not exists subcategory_id uuid references public.finance_categories(id) on delete set null,
  add column if not exists campus_id uuid references public.campuses(id) on delete set null,
  add column if not exists status text not null default 'validated',
  -- Donateur hors base « people » (formulaire « Nouveau don » : visiteur / autre personne).
  add column if not exists donor_name text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'financial_transactions_status_check'
  ) then
    alter table public.financial_transactions
      add constraint financial_transactions_status_check
      check (status in ('validated','pending','rejected'));
  end if;
end $$;

create index if not exists finance_transactions_status_idx
  on public.financial_transactions(organization_id, status);

-- Pièces jointes (factures, photos). Le fichier vit dans le bucket Storage `churchos-finance`,
-- sous `<organization_id>/<transaction_id>/<uuid>-<nom>` (les policies retrouvent l'organisation
-- depuis le chemin, comme pour `churchos-documents`).
create table if not exists public.financial_transaction_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  transaction_id uuid not null references public.financial_transactions(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists finance_attachments_transaction_idx
  on public.financial_transaction_attachments(transaction_id);

alter table public.financial_transaction_attachments enable row level security;

drop policy if exists financial_transaction_attachments_select_org on public.financial_transaction_attachments;
create policy financial_transaction_attachments_select_org on public.financial_transaction_attachments
for select using (public.is_org_member(organization_id));

drop policy if exists financial_transaction_attachments_insert_org on public.financial_transaction_attachments;
create policy financial_transaction_attachments_insert_org on public.financial_transaction_attachments
for insert with check (public.is_org_member(organization_id));

drop policy if exists financial_transaction_attachments_delete_org on public.financial_transaction_attachments;
create policy financial_transaction_attachments_delete_org on public.financial_transaction_attachments
for delete using (public.is_org_admin(organization_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'churchos-finance',
  'churchos-finance',
  false,
  10485760, -- 10 Mo
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists finance_storage_select_org on storage.objects;
create policy finance_storage_select_org on storage.objects
for select using (
  bucket_id = 'churchos-finance'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists finance_storage_insert_org on storage.objects;
create policy finance_storage_insert_org on storage.objects
for insert with check (
  bucket_id = 'churchos-finance'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists finance_storage_delete_org on storage.objects;
create policy finance_storage_delete_org on storage.objects
for delete using (
  bucket_id = 'churchos-finance'
  and public.is_org_admin((storage.foldername(name))[1]::uuid)
);
