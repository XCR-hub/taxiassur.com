/*
  Prevent anonymous enumeration of prospect document metadata.

  Prospect access must go through get_prospect_documents_by_token().
  Uploads continue through upload_prospect_document_by_token().
*/
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'prospect_documents'
      AND policyname = 'Public can read own prospect documents with valid token'
  ) THEN
    ALTER POLICY "Public can read own prospect documents with valid token"
      ON public.prospect_documents
      USING (false);
  END IF;
END
$$;

COMMENT ON TABLE public.prospect_documents IS
  'Prospect document metadata. Anonymous reads must use token-scoped RPCs.';
