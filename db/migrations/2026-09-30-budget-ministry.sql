-- Rattache un budget à un ministère (champ « Ministère / Projet » de la maquette du formulaire
-- « Nouveau budget »). Idempotent ; inclus aussi à la fin de db/schema.sql.
alter table public.budgets
  add column if not exists ministry_id uuid references public.ministries(id) on delete set null;
