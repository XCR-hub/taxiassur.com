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

UPDATE public.email_attachments
SET download_url = NULL
WHERE download_url IS NOT NULL
  AND (
    storage_bucket = 'email-attachments'
    OR download_url LIKE '%/storage/v1/object/public/email-attachments/%'
  );