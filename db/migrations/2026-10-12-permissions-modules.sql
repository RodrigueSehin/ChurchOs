-- =========================================================
-- Permissions par module : certifications, bibliothèque, messages SMS/Email, médias, salles, équipements
-- =========================================================
-- Idempotent ; inclus aussi à la fin de db/schema.sql.
-- Avant : certifications et bibliothèque dépendaient de `training.*`, messages et médias de `communication.*`, salles et équipements de
-- `resources.*`. Chaque module a maintenant ses propres permissions, accordées séparément à chaque rôle.
insert into public.permissions (code, name, module, description) values
('certifications.view','Voir les certifications','certifications','Consulter la page des certifications et les certifications visibles'),
('library.view','Voir la bibliothèque','library','Consulter, lire et télécharger les ressources de la bibliothèque'),
('library.manage','Gérer la bibliothèque','library','Ajouter, modifier et supprimer les ressources et leurs catégories'),
('messages.view','Voir les messages SMS/Email','messages','Consulter les messages envoyés, planifiés et brouillons'),
('messages.send','Envoyer des messages SMS/Email','messages','Composer, planifier et envoyer des SMS et des emails'),
('media.view','Voir les médias','media','Consulter les photos, vidéos, audios et documents'),
('media.manage','Gérer les médias','media','Ajouter, modifier et supprimer des médias, relier la chaîne YouTube'),
('rooms.view','Voir les salles','rooms','Consulter les salles et leur disponibilité'),
('rooms.manage','Gérer les salles','rooms','Créer, modifier et supprimer des salles'),
('rooms.reserve','Réserver une salle','rooms','Créer et gérer une réservation de salle'),
('equipment.view','Voir les équipements','equipment','Consulter les équipements et leur affectation'),
('equipment.manage','Gérer les équipements','equipment','Créer, modifier et supprimer des équipements'),
('equipment.reserve','Réserver un équipement','equipment','Créer et gérer une réservation d''équipement')
on conflict (code) do nothing;

-- Reprise des droits déjà accordés : chaque rôle garde l'accès qu'il avait (ancienne permission → nouvelle(s)).
insert into public.role_permissions (role_id, permission_id)
select rp.role_id, np.id
from public.role_permissions rp
join public.permissions op on op.id = rp.permission_id
join (values
  ('training.view', 'certifications.view'), ('training.view', 'library.view'),
  ('training.manage', 'library.manage'),
  ('communication.view', 'messages.view'), ('communication.view', 'media.view'),
  ('communication.manage', 'media.manage'),
  ('communication.send', 'messages.send'),
  ('resources.view', 'rooms.view'), ('resources.view', 'equipment.view'),
  ('resources.manage', 'rooms.manage'), ('resources.manage', 'equipment.manage'),
  ('resources.reserve', 'rooms.reserve'), ('resources.reserve', 'equipment.reserve')
) as m(old_code, new_code) on m.old_code = op.code
join public.permissions np on np.code = m.new_code
on conflict do nothing;

-- Permissions remplacées (leurs lignes `role_permissions` partent en cascade, après la reprise ci-dessus).
delete from public.permissions where code in ('communication.send', 'resources.view', 'resources.manage', 'resources.reserve');

notify pgrst, 'reload schema';
