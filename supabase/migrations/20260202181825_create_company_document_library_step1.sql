/*
  # Bibliothèque Documentaire par Compagnie - Étape 1

  ## Tables
  1. company_document_library - Documents généraux par compagnie
  2. contract_document_associations - Associations documents ↔ leads
*/

-- =====================================================
-- 1. TABLE: company_document_library
-- =====================================================
CREATE TABLE IF NOT EXISTS company_document_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES insurance_companies(id) ON DELETE CASCADE,
  
  document_type text NOT NULL,
  document_category text NOT NULL,
  document_name text NOT NULL,
  description text,
  
  file_url text NOT NULL,
  file_path text,
  file_size_bytes integer,
  mime_type text DEFAULT 'application/pdf',
  
  version text NOT NULL,
  valid_from_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until_date date,
  is_active boolean DEFAULT true,
  
  is_mandatory boolean DEFAULT true,
  auto_attach_on text[] DEFAULT ARRAY[]::text[],
  display_order integer DEFAULT 0,
  
  show_in_prospect_space boolean DEFAULT true,
  show_in_client_space boolean DEFAULT true,
  
  upload_count integer DEFAULT 0,
  download_count integer DEFAULT 0,
  last_used_at timestamptz,
  
  uploaded_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_docs_company ON company_document_library(company_id);
CREATE INDEX IF NOT EXISTS idx_company_docs_active ON company_document_library(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_company_docs_type ON company_document_library(document_type);

-- =====================================================
-- 2. TABLE: contract_document_associations
-- =====================================================
CREATE TABLE IF NOT EXISTS contract_document_associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES insurance_companies(id),
  company_document_id uuid NOT NULL REFERENCES company_document_library(id) ON DELETE CASCADE,
  
  association_type text NOT NULL,
  attached_at timestamptz DEFAULT now(),
  attached_by uuid,
  attachment_trigger text,
  
  is_sent_to_prospect boolean DEFAULT false,
  sent_at timestamptz,
  
  is_viewed boolean DEFAULT false,
  viewed_at timestamptz,
  view_count integer DEFAULT 0,
  last_viewed_at timestamptz,
  
  is_downloaded boolean DEFAULT false,
  downloaded_at timestamptz,
  download_count integer DEFAULT 0,
  last_downloaded_at timestamptz,
  
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_assoc_lead ON contract_document_associations(lead_id);
CREATE INDEX IF NOT EXISTS idx_doc_assoc_company ON contract_document_associations(company_id);
CREATE INDEX IF NOT EXISTS idx_doc_assoc_company_doc ON contract_document_associations(company_document_id);
CREATE INDEX IF NOT EXISTS idx_doc_assoc_type ON contract_document_associations(association_type);
