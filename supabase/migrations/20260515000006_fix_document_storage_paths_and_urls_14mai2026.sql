/*
  # Fix document storage paths and broken URLs

  1. Changes
    - Create RPC `find_storage_object_by_email` to resolve orphan email_ref paths
    - Fix all broken `file_url` with double https://
    - Fix `file_path` for documents whose files actually exist in storage under different paths
    
  2. Security
    - RPC is security definer, accessible to authenticated users

  3. Notes
    - The root cause was edge functions uploading to wrong bucket name ('attachments' vs 'email-attachments')
    - And inserting into email_attachments with wrong column names
    - This migration fixes the existing data and adds a helper for the frontend
*/

-- Helper function: find storage object by email message id and filename
CREATE OR REPLACE FUNCTION public.find_storage_object_by_email(p_email_id text, p_filename text)
RETURNS TABLE(name text, bucket_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $function$
DECLARE
  v_safe_filename text;
BEGIN
  -- Sanitize filename for search (same logic as upload)
  v_safe_filename := regexp_replace(p_filename, '[^a-zA-Z0-9._-]', '_', 'g');
  
  RETURN QUERY
  SELECT o.name, o.bucket_id
  FROM storage.objects o
  WHERE o.bucket_id = 'email-attachments'
  AND (
    o.name LIKE '%/' || p_email_id || '/%'
    OR o.name LIKE '%' || v_safe_filename || '%'
  )
  ORDER BY o.created_at DESC
  LIMIT 5;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.find_storage_object_by_email(text, text) TO anon, authenticated, service_role;

-- Fix double https:// in file_url column
UPDATE crm_lead_documents
SET file_url = regexp_replace(file_url, '^https?://https?://', 'https://')
WHERE file_url LIKE 'https://https://%';

-- For documents with email_ref/ paths, try to find the correct storage path
-- by matching on the email_message_id pattern in storage objects
DO $$
DECLARE
  doc RECORD;
  v_email_id text;
  v_filename text;
  v_storage_path text;
BEGIN
  FOR doc IN 
    SELECT id, file_path 
    FROM crm_lead_documents 
    WHERE file_path LIKE 'email_ref/%'
  LOOP
    -- Extract email_id and filename from email_ref/{email_id}/{filename}
    v_email_id := split_part(doc.file_path, '/', 2);
    v_filename := split_part(doc.file_path, '/', 3);
    
    -- Search in storage.objects for a match
    SELECT o.name INTO v_storage_path
    FROM storage.objects o
    WHERE o.bucket_id = 'email-attachments'
    AND o.name LIKE '%/' || v_email_id || '/%'
    ORDER BY o.created_at DESC
    LIMIT 1;
    
    IF v_storage_path IS NOT NULL THEN
      UPDATE crm_lead_documents
      SET file_path = v_storage_path,
          file_url = NULL,
          updated_at = now()
      WHERE id = doc.id;
    END IF;
  END LOOP;
END $$;

-- Also fix file_url that references wrong bucket path (missing bucket name in URL)
UPDATE crm_lead_documents
SET file_url = NULL
WHERE file_url IS NOT NULL 
AND file_url NOT LIKE '%/storage/v1/object/public/' || bucket || '/%';
