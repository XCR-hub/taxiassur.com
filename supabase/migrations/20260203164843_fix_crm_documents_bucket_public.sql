/*
  # Rendre le bucket crm-documents public

  1. Modifications
    - Rendre le bucket 'crm-documents' public pour permettre la consultation des documents
    - Ajouter policy de lecture publique
    - Conserver les policies d'écriture pour authenticated uniquement

  2. Sécurité
    - Lecture: Public (pour que les clients puissent voir leurs documents)
    - Écriture: Authenticated uniquement (seuls les admins peuvent uploader)
*/

-- Rendre le bucket public
UPDATE storage.buckets
SET public = true
WHERE id = 'crm-documents';

-- Supprimer l'ancienne policy de lecture (authenticated only)
DROP POLICY IF EXISTS "Admin can read crm documents" ON storage.objects;

-- Créer une policy de lecture publique
CREATE POLICY "Public read access to crm documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'crm-documents');

-- Les policies d'upload et delete restent pour authenticated uniquement
-- (elles existent déjà, on ne les touche pas)
