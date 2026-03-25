/*
  # Fix crm_lead_documents bucket mismatch

  1. Changes
    - Updates the `bucket` column in `crm_lead_documents` to match the actual
      bucket where the file is stored in `storage.objects`
    - Only updates rows where there is a mismatch

  2. Why
    - Documents classified from the prospect space were stored with
      `bucket = 'crm-documents'` but the actual files live in
      `prospect-documents` or `email-attachments`
    - This caused 404 errors when trying to view documents
*/

UPDATE crm_lead_documents d
SET bucket = o.bucket_id
FROM storage.objects o
WHERE o.name = d.file_path
  AND d.bucket IS DISTINCT FROM o.bucket_id;
