/*
  # Add custom_label column to crm_lead_documents

  ## Changes
  - Add `custom_label` column to store custom document names
  - Add 'custom' to document_type enum if not exists
  - Update indexes for performance

  ## Purpose
  - Allow commercials to add custom documents requested by insurance companies
  - These custom documents will appear in document request emails/SMS
  - Prospects can upload these custom documents via their space
*/

-- Add custom_label column
ALTER TABLE crm_lead_documents 
ADD COLUMN IF NOT EXISTS custom_label text;

-- Create index for custom documents queries
CREATE INDEX IF NOT EXISTS idx_crm_lead_documents_custom 
ON crm_lead_documents(lead_id, document_type) 
WHERE document_type = 'custom';

-- Add comment
COMMENT ON COLUMN crm_lead_documents.custom_label IS 
'Label personnalisé pour les documents complémentaires demandés par les compagnies';
