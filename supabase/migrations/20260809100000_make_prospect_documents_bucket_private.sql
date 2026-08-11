-- Prospect documents contain identity, vehicle and banking records.
-- Uploads are now issued by upload-client-document and reads by sign-document-url.
UPDATE storage.buckets
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
WHERE id = 'prospect-documents';

DROP POLICY IF EXISTS "Public read access for prospect documents" ON storage.objects;
DROP POLICY IF EXISTS "Public upload access for prospect documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from prospect-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload to prospect-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon upload to prospect documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view prospect documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload prospect documents" ON storage.objects;

DROP POLICY IF EXISTS "Public read prospect-documents for viewing" ON storage.objects;
DROP POLICY IF EXISTS "prospect_docs_public_read" ON storage.objects;
DROP POLICY IF EXISTS "prospect_docs_public_insert" ON storage.objects;
DROP POLICY IF EXISTS "Staff read prospect documents" ON storage.objects;
CREATE POLICY "Staff read prospect documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'prospect-documents');

-- Updates and deletes remain governed by the existing authenticated policies.
-- service_role bypasses RLS for signed upload issuance, verification and cleanup.

-- Metadata creation is now performed only by upload-client-document with service_role.
DROP POLICY IF EXISTS "Anon can view prospect documents" ON public.prospect_documents;
DROP POLICY IF EXISTS "Anon can insert prospect documents" ON public.prospect_documents;
DROP POLICY IF EXISTS "Anon can update prospect documents" ON public.prospect_documents;
DROP POLICY IF EXISTS "Prospects can upload documents" ON public.prospect_documents;
DROP POLICY IF EXISTS "Prospects can view own documents" ON public.prospect_documents;
DROP POLICY IF EXISTS "Public can read own prospect documents with valid token" ON public.prospect_documents;
DROP POLICY IF EXISTS "Public can update own prospect documents with valid token" ON public.prospect_documents;
DROP POLICY IF EXISTS "prospect_docs_insert_simple" ON public.prospect_documents;
DROP POLICY IF EXISTS "Allow anon to insert prospect documents" ON public.prospect_documents;
DROP POLICY IF EXISTS "Public can insert prospect documents with valid token" ON public.prospect_documents;

REVOKE ALL ON FUNCTION public.upload_prospect_document_by_token(text, text, text, text, bigint)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upload_prospect_document_by_token(text, text, text, text, bigint)
TO service_role;