BEGIN;

UPDATE storage.buckets SET public = false WHERE id = 'contract-documents';

DROP POLICY IF EXISTS "Public can view contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Accès public lecture contract documents" ON storage.objects;
DROP POLICY IF EXISTS "AccÃ¨s public lecture contract documents" ON storage.objects;

COMMIT;