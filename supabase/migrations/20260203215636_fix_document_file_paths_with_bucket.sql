/*
  # Fix Document File Paths - Add Bucket Prefix

  1. Changes
    - Normalise tous les file_path pour inclure le nom du bucket
    - prospect_documents : ajoute 'prospect-documents/' si manquant
    - email_attachments : utilise storage_path et ajoute 'email-attachments/' si manquant
    - crm_lead_documents : ajoute 'crm-documents/' si manquant

  2. Notes
    - Les URLs publiques fonctionneront correctement
    - Compatible avec la nouvelle logique de getDocumentUrl()
*/

-- Fix prospect_documents file_path
UPDATE prospect_documents
SET file_path = CASE
  WHEN file_path LIKE 'email-attachments/%' THEN file_path
  WHEN file_path LIKE 'prospect-documents/%' THEN file_path
  WHEN file_path LIKE 'crm-documents/%' THEN file_path
  ELSE 'prospect-documents/' || file_path
END
WHERE file_path IS NOT NULL
  AND file_path NOT LIKE 'email-attachments/%'
  AND file_path NOT LIKE 'prospect-documents/%'
  AND file_path NOT LIKE 'crm-documents/%';

-- Fix email_attachments storage_path
UPDATE email_attachments
SET storage_path = CASE
  WHEN storage_path LIKE 'email-attachments/%' THEN storage_path
  WHEN storage_path LIKE 'prospect-documents/%' THEN storage_path
  WHEN storage_path LIKE 'crm-documents/%' THEN storage_path
  ELSE 'email-attachments/' || storage_path
END
WHERE storage_path IS NOT NULL
  AND storage_path NOT LIKE 'email-attachments/%'
  AND storage_path NOT LIKE 'prospect-documents/%'
  AND storage_path NOT LIKE 'crm-documents/%';

-- Fix crm_lead_documents file_path
UPDATE crm_lead_documents
SET file_path = CASE
  WHEN file_path LIKE 'email-attachments/%' THEN file_path
  WHEN file_path LIKE 'prospect-documents/%' THEN file_path
  WHEN file_path LIKE 'crm-documents/%' THEN file_path
  ELSE 'crm-documents/' || file_path
END
WHERE file_path IS NOT NULL
  AND file_path NOT LIKE 'email-attachments/%'
  AND file_path NOT LIKE 'prospect-documents/%'
  AND file_path NOT LIKE 'crm-documents/%';