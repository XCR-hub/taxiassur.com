/*
  # Add UPDATE and DELETE policies for Contract Documents

  ## Changes
  - Allow authenticated users to UPDATE their uploaded documents
  - Allow authenticated users to DELETE their uploaded documents

  ## Security
  - Only authenticated users can modify/delete
  - Service role retains full access
*/

-- Allow authenticated users to update
CREATE POLICY "Commerciaux peuvent modifier devis"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'contract-documents')
WITH CHECK (bucket_id = 'contract-documents');

-- Allow authenticated users to delete
CREATE POLICY "Commerciaux peuvent supprimer devis"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contract-documents');
