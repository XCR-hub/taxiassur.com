/*
  # Configuration du Bucket prospect-documents en mode public

  1. Mise à jour du bucket
    - Rendre le bucket public pour accès direct via URL
    - Limite de 10 MB par fichier

  2. Policies RLS
    - Upload public (anon + authenticated)
    - Lecture publique pour tous
    - Modification/Suppression pour authenticated uniquement
*/

-- Mettre à jour le bucket pour le rendre public
UPDATE storage.buckets 
SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
WHERE id = 'prospect-documents';

-- Si le bucket n'existe pas, le créer
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
SELECT
  'prospect-documents',
  'prospect-documents',
  true,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'prospect-documents'
);

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Allow public upload to prospect-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from prospect-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update prospect-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from prospect-documents" ON storage.objects;

-- Policy pour upload (anon et authenticated)
CREATE POLICY "Allow public upload to prospect-documents"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'prospect-documents');

-- Policy pour lecture publique (tout le monde peut lire)
CREATE POLICY "Allow public read from prospect-documents"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'prospect-documents');

-- Policy pour update (authenticated uniquement)
CREATE POLICY "Allow authenticated update prospect-documents"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'prospect-documents')
  WITH CHECK (bucket_id = 'prospect-documents');

-- Policy pour delete (authenticated uniquement)
CREATE POLICY "Allow authenticated delete from prospect-documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'prospect-documents');
