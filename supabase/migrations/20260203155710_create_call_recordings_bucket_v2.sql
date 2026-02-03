/*
  # Création du bucket pour les enregistrements d'appels

  1. Nouveau Bucket
    - `call-recordings` : Stockage des enregistrements audio des appels téléphoniques

  2. Security
    - Enable RLS sur le bucket
    - Seuls les utilisateurs authentifiés peuvent uploader
    - Seuls les utilisateurs authentifiés peuvent lire leurs propres enregistrements
*/

-- Insert bucket for call recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'call-recordings',
  'call-recordings',
  false,
  10485760, -- 10MB limit
  ARRAY['audio/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload call recordings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Authenticated users can upload call recordings'
  ) THEN
    CREATE POLICY "Authenticated users can upload call recordings"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'call-recordings');
  END IF;
END $$;

-- Policy: Authenticated users can read call recordings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Authenticated users can read call recordings'
  ) THEN
    CREATE POLICY "Authenticated users can read call recordings"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'call-recordings');
  END IF;
END $$;

-- Policy: Authenticated users can delete call recordings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Authenticated users can delete call recordings'
  ) THEN
    CREATE POLICY "Authenticated users can delete call recordings"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'call-recordings');
  END IF;
END $$;
