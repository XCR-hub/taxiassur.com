/*
  # Créer le bucket prospect-documents public

  1. Nouveau Bucket
    - `prospect-documents` pour les documents uploadés directement par les prospects
    - Public: true (lecture publique)
    - Taille max: 50MB par fichier
  
  2. Sécurité
    - RLS activé sur le bucket
    - Policy de lecture publique
    - Policy d'écriture pour authenticated et anon (avec token)
*/

-- Créer le bucket s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prospect-documents',
  'prospect-documents',
  true,
  52428800,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Public read access for prospect documents" ON storage.objects;
DROP POLICY IF EXISTS "Public upload access for prospect documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update access for prospect documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete access for prospect documents" ON storage.objects;

-- Policy de lecture publique
CREATE POLICY "Public read access for prospect documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'prospect-documents');

-- Policy d'upload pour tout le monde (prospects anonymes avec token)
CREATE POLICY "Public upload access for prospect documents"
ON storage.objects FOR INSERT
TO public, authenticated, anon
WITH CHECK (bucket_id = 'prospect-documents');

-- Policy de mise à jour pour authenticated
CREATE POLICY "Authenticated update access for prospect documents"
ON storage.objects FOR UPDATE
TO authenticated, service_role
USING (bucket_id = 'prospect-documents')
WITH CHECK (bucket_id = 'prospect-documents');

-- Policy de suppression pour authenticated
CREATE POLICY "Authenticated delete access for prospect documents"
ON storage.objects FOR DELETE
TO authenticated, service_role
USING (bucket_id = 'prospect-documents');
