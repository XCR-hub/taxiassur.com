
/*
  # Amélioration gestion documents compagnies

  1. Modifications table company_documents
     - Ajout colonne `send_with_claim` (boolean) : indique si le document est envoyé avec les emails sinistre
     - Ajout colonne `send_with_claim` DEFAULT false

  2. Bucket de stockage
     - Création du bucket `company-documents` public pour stocker les documents obligatoires des compagnies

  3. RLS Policies
     - Lecture publique des documents de compagnie
     - Écriture/suppression réservée aux utilisateurs authentifiés (admins)
*/

-- Ajouter la colonne send_with_claim si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_documents' AND column_name = 'send_with_claim'
  ) THEN
    ALTER TABLE company_documents ADD COLUMN send_with_claim boolean DEFAULT false;
  END IF;
END $$;

-- Créer le bucket company-documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-documents',
  'company-documents',
  true,
  52428800,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Politique de lecture publique pour company-documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'company-documents public read'
  ) THEN
    EXECUTE 'CREATE POLICY "company-documents public read"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = ''company-documents'')';
  END IF;
END $$;

-- Politique d''upload pour les authentifiés
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'company-documents auth upload'
  ) THEN
    EXECUTE 'CREATE POLICY "company-documents auth upload"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = ''company-documents'')';
  END IF;
END $$;

-- Politique de mise à jour pour les authentifiés
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'company-documents auth update'
  ) THEN
    EXECUTE 'CREATE POLICY "company-documents auth update"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = ''company-documents'')';
  END IF;
END $$;

-- Politique de suppression pour les authentifiés
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'company-documents auth delete'
  ) THEN
    EXECUTE 'CREATE POLICY "company-documents auth delete"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = ''company-documents'')';
  END IF;
END $$;
