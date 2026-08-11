-- Email attachments can contain identity, banking and insurance documents.
UPDATE storage.buckets
SET public = false
WHERE id = 'email-attachments';

DROP POLICY IF EXISTS "Public read access to email attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for email attachments" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated read access for email attachments" ON storage.objects;
CREATE POLICY "Authenticated read access for email attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'email-attachments');

DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'email_attachments' AND column_name = 'download_url') THEN
    EXECUTE 'UPDATE public.email_attachments SET download_url = NULL WHERE download_url IS NOT NULL';
  END IF;
END
$migration$;