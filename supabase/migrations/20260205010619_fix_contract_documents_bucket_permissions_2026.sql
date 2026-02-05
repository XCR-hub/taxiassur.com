/*
  # Fix Contract Documents Bucket Permissions

  ## Changes
  - Add RLS policies for the `contract-documents` bucket
  - Allow authenticated users (commerciaux) to upload quotes
  - Allow service role for automated operations
  - Allow public read access since bucket is already public

  ## Security
  - Authenticated users can INSERT (upload)
  - Anyone can SELECT (read) for public documents
  - Service role has full access for automation
*/

-- Drop existing policies if any
DROP POLICY IF EXISTS "Commerciaux peuvent upload devis" ON storage.objects;
DROP POLICY IF EXISTS "Accès public lecture contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access contract documents" ON storage.objects;

-- Allow authenticated users to upload to contract-documents bucket
CREATE POLICY "Commerciaux peuvent upload devis"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contract-documents');

-- Allow public read access (bucket is public)
CREATE POLICY "Accès public lecture contract documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'contract-documents');

-- Allow service role full access
CREATE POLICY "Service role full access contract documents"
ON storage.objects
TO service_role
USING (bucket_id = 'contract-documents')
WITH CHECK (bucket_id = 'contract-documents');
