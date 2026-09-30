-- =========================================================
-- Formulaire « Nouveau budget » enrichi (maquette "Formulaire nouveau budget")
-- =========================================================
-- Idempotent. À appliquer sur Supabase avant d'utiliser le nouveau formulaire (le code n'envoie
-- ces colonnes que lorsqu'elles sont renseignées). Le même bloc figure à la fin de db/schema.sql.
alter table public.budgets
  add column if not exists description text,
  add column if not exists notes text,
  add column if not exists manager_person_id uuid references public.people(id) on delete set null,
  add column if not exists campus_id uuid references public.campuses(id) on delete set null;

-- Demande à l'API Supabase (PostgREST) de recharger son cache de schéma : sans cela, les nouvelles
-- colonnes restent introuvables ("Could not find the '...' column ... in the schema cache").
notify pgrst, 'reload schema';
