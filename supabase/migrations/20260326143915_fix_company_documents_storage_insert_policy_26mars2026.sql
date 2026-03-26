/*
  # Fix company-documents storage bucket - add missing INSERT policy

  1. Problem
    - The `company-documents` storage bucket has SELECT, UPDATE, DELETE policies
    - But NO INSERT policy, preventing authenticated users from uploading documents

  2. Changes
    - Add INSERT policy for authenticated users on company-documents bucket

  3. Security
    - Only authenticated users can upload to the company-documents bucket
*/

CREATE POLICY "company-documents auth insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'company-documents');
