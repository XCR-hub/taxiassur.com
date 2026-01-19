/*
  # Créer le bucket email-attachments public

  1. Nouveau Bucket
    - `email-attachments` pour stocker les pièces jointes des emails
    - Public: true (lecture publique)
    - Taille max: 50MB par fichier
  
  2. Sécurité
    - RLS activé sur le bucket
    - Policy de lecture publique
    - Policy d'écriture pour service_role uniquement
*/

-- Créer le bucket s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-attachments',
  'email-attachments',
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
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
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
  ];

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Public read access for email attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload access for email attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update access for email attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete access for email attachments" ON storage.objects;

-- Policy de lecture publique pour tous les fichiers
CREATE POLICY "Public read access for email attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'email-attachments');

-- Policy d'upload pour les authenticated et service_role
CREATE POLICY "Authenticated upload access for email attachments"
ON storage.objects FOR INSERT
TO authenticated, service_role
WITH CHECK (bucket_id = 'email-attachments');

-- Policy de mise à jour pour authenticated et service_role
CREATE POLICY "Authenticated update access for email attachments"
ON storage.objects FOR UPDATE
TO authenticated, service_role
USING (bucket_id = 'email-attachments')
WITH CHECK (bucket_id = 'email-attachments');

-- Policy de suppression pour authenticated et service_role
CREATE POLICY "Authenticated delete access for email attachments"
ON storage.objects FOR DELETE
TO authenticated, service_role
USING (bucket_id = 'email-attachments');
