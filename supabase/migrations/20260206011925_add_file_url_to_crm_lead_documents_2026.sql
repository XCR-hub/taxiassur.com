/*
  # Add file_url column to crm_lead_documents

  Ajoute la colonne file_url pour stocker l'URL publique des documents.
  Cette colonne est utilisée par le frontend pour afficher les documents.
*/

-- Ajouter la colonne file_url si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'crm_lead_documents' 
      AND column_name = 'file_url'
  ) THEN
    ALTER TABLE crm_lead_documents 
    ADD COLUMN file_url text;
    
    RAISE NOTICE 'Colonne file_url ajoutée à crm_lead_documents';
  END IF;
END $$;

-- Générer les URLs pour les documents existants qui n'en ont pas
UPDATE crm_lead_documents
SET file_url = 
  CASE 
    WHEN file_path IS NOT NULL THEN
      'https://kgsivvblaxrvxvpupbjw.supabase.co/storage/v1/object/public/' || 
      COALESCE(bucket, 'crm-documents') || '/' || file_path
    ELSE NULL
  END
WHERE file_url IS NULL AND file_path IS NOT NULL;

COMMENT ON COLUMN crm_lead_documents.file_url IS 'URL publique du document stocké dans Supabase Storage';
