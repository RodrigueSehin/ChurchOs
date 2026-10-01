-- La bibliothèque n'accepte plus que des PDF et des DOCX (à appliquer si 2026-10-06-library.sql a déjà
-- été exécutée ; le fichier 2026-10-06 et db/schema.sql contiennent déjà la liste restreinte).
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
where id = 'churchos-library';
