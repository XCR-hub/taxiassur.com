/*
  # Create documents bucket for quotes

  1. Storage
    - Create 'documents' bucket for storing insurance quotes
    - Make bucket public for easy access
    - Add RLS policies for authenticated users

  2. Security
    - Authenticated users can upload files
    - Everyone can read files (public bucket)
*/

-- Create the documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to documents" ON storage.objects;

-- Allow authenticated users to upload to documents bucket
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to update their documents
CREATE POLICY "Authenticated users can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to delete documents
CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- Allow public read access to documents
CREATE POLICY "Public read access to documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');
