/*
  # Backfill Orphan Document Paths

  Resolves file_path for crm_lead_documents and prospect_documents rows
  whose current value is NULL, empty, or an email_ref placeholder, using
  the real storage_path from email_attachments when a match exists.
  No rows are deleted. Only empty/placeholder file_path values are updated.
*/

UPDATE crm_lead_documents cld
SET file_path = ea.storage_path
FROM email_attachments ea
WHERE (cld.file_path IS NULL OR cld.file_path = '' OR cld.file_path LIKE 'email_ref/%%')
  AND ea.storage_path IS NOT NULL
  AND ea.storage_path <> ''
  AND ea.filename = cld.file_name
  AND (
    (cld.metadata ->> 'email_id')::uuid = ea.email_message_id
    OR (cld.metadata ->> 'email_attachment_id')::uuid = ea.id
  );

UPDATE prospect_documents pd
SET file_path = ea.storage_path
FROM email_attachments ea
WHERE (pd.file_path IS NULL OR pd.file_path = '' OR pd.file_path LIKE 'email_ref/%%')
  AND ea.storage_path IS NOT NULL
  AND ea.storage_path <> ''
  AND ea.filename = pd.file_name
  AND (
    (pd.metadata ->> 'email_id')::uuid = ea.email_message_id
    OR (pd.metadata ->> 'email_attachment_id')::uuid = ea.id
  );
