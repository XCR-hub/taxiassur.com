/*
  # Créer le bucket storage pour les pièces jointes des emails
  
  1. Modifications
    - Crée le bucket 'email-attachments' pour stocker les pièces jointes
    - Configure les permissions publiques pour l'accès
  
  2. Sécurité
    - Bucket public pour téléchargement
    - RLS sur les uploads
*/

-- Créer le bucket pour les pièces jointes des emails
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-attachments',
  'email-attachments',
  true,
  10485760, -- 10MB max
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Politique de lecture publique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public read access to email attachments'
  ) THEN
    CREATE POLICY "Public read access to email attachments"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'email-attachments');
  END IF;
END $$;

-- Politique d'upload pour les services
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Service role can upload email attachments'
  ) THEN
    CREATE POLICY "Service role can upload email attachments"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'email-attachments');
  END IF;
END $$;

-- Politique de suppression pour les admins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can delete email attachments'
  ) THEN
    CREATE POLICY "Authenticated users can delete email attachments"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'email-attachments');
  END IF;
END $$;
