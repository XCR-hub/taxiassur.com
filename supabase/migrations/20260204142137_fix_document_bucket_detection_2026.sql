/*
  # Fix Document Bucket Detection

  1. Changes
    - Add bucket column to crm_lead_documents
    - Update existing documents to set correct bucket
    - Create function to auto-detect and set bucket
  
  2. Security
    - No RLS changes needed
*/

-- Add bucket column
ALTER TABLE crm_lead_documents
ADD COLUMN IF NOT EXISTS bucket TEXT DEFAULT 'crm-documents';

-- Detect and update bucket for existing documents based on storage.objects
UPDATE crm_lead_documents d
SET bucket = o.bucket_id
FROM storage.objects o
WHERE o.name = d.file_path
  AND d.bucket IS NULL;

-- For documents where we find the file in prospect-documents
UPDATE crm_lead_documents d
SET bucket = 'prospect-documents'
WHERE EXISTS (
  SELECT 1 FROM storage.objects o
  WHERE o.bucket_id = 'prospect-documents'
    AND o.name = d.file_path
);

-- Create function to auto-set bucket when inserting documents
CREATE OR REPLACE FUNCTION auto_detect_document_bucket()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le bucket n'est pas défini, essayer de le détecter depuis storage
  IF NEW.bucket IS NULL THEN
    -- Chercher dans storage.objects pour trouver le bon bucket
    SELECT bucket_id INTO NEW.bucket
    FROM storage.objects
    WHERE name = NEW.file_path
    LIMIT 1;
    
    -- Si toujours NULL, utiliser par défaut crm-documents
    IF NEW.bucket IS NULL THEN
      NEW.bucket := 'crm-documents';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trg_auto_detect_document_bucket ON crm_lead_documents;
CREATE TRIGGER trg_auto_detect_document_bucket
  BEFORE INSERT OR UPDATE ON crm_lead_documents
  FOR EACH ROW
  EXECUTE FUNCTION auto_detect_document_bucket();
