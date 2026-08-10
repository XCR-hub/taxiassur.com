BEGIN;

ALTER TABLE public.crm_documents
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;

UPDATE public.crm_documents
SET file_path = COALESCE(
  NULLIF(file_path, ''),
  NULLIF(storage_path, ''),
  NULLIF(regexp_replace(COALESCE(file_url, ''), '^.*/crm-documents/', ''), '')
)
WHERE file_path IS NULL;

UPDATE storage.buckets SET public = false WHERE id = 'crm-documents';

DROP POLICY IF EXISTS "Public can read crm documents" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to crm documents" ON storage.objects;
DROP POLICY IF EXISTS "Public read crm-documents for viewing" ON storage.objects;

UPDATE public.crm_documents SET file_url = NULL WHERE file_url IS NOT NULL;

COMMIT;