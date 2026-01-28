/*
  # Créer le bucket crm-documents

  1. Bucket Storage
    - Créer le bucket `crm-documents` public
    - Pour stocker les documents CRM (carte grise, permis, etc.)

  2. Sécurité
    - RLS activé sur le bucket
    - Accès authentifié pour upload/lecture
    - Accès public en lecture pour les URLs publiques
*/

-- Créer le bucket crm-documents s'il n'existe pas
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'crm-documents',
    'crm-documents',
    true,
    10485760,
    ARRAY[
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  )
  ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760;
END $$;

-- RLS Policies pour crm-documents
DROP POLICY IF EXISTS "Authenticated can upload crm documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read crm documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update crm documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete crm documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can read crm documents" ON storage.objects;

CREATE POLICY "Authenticated can upload crm documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'crm-documents');

CREATE POLICY "Authenticated can read crm documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'crm-documents');

CREATE POLICY "Public can read crm documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'crm-documents');

CREATE POLICY "Authenticated can update crm documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'crm-documents')
WITH CHECK (bucket_id = 'crm-documents');

CREATE POLICY "Authenticated can delete crm documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'crm-documents');
