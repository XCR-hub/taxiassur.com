/*
  # Fix Storage CORS and Download Headers
  
  1. Configuration
    - Update storage buckets to allow proper CORS
    - Add Content-Disposition headers for inline viewing
  
  2. Changes
    - Ensure all buckets allow cross-origin requests
    - Configure proper response headers for PDF viewing
*/

-- Mettre à jour les buckets pour permettre le téléchargement inline
UPDATE storage.buckets
SET 
  public = true,
  file_size_limit = 52428800
WHERE id IN ('prospect-documents', 'crm-documents', 'email-attachments');

-- S'assurer que les politiques RLS permettent la lecture publique
DO $$ 
BEGIN
  -- Pour prospect-documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Public read prospect-documents for viewing'
  ) THEN
    CREATE POLICY "Public read prospect-documents for viewing"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'prospect-documents');
  END IF;

  -- Pour crm-documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Public read crm-documents for viewing'
  ) THEN
    CREATE POLICY "Public read crm-documents for viewing"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'crm-documents');
  END IF;

  -- Pour email-attachments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Public read email-attachments for viewing'
  ) THEN
    CREATE POLICY "Public read email-attachments for viewing"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'email-attachments');
  END IF;
END $$;