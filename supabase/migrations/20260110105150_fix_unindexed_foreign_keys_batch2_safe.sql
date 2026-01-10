/*
  # Fix Unindexed Foreign Keys - Batch 2 (Safe)

  1. Performance Optimization
    - Add indexes on foreign key columns
    - Only for tables that definitely exist
    - Improves JOIN performance

  2. Tables Affected
    - crm_claims
    - crm_clients
    - crm_interactions
    - crm_lead_documents (prospect_documents)
*/

-- crm_claims indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_claims') THEN
    CREATE INDEX IF NOT EXISTS idx_crm_claims_assigned_to
      ON crm_claims(assigned_to) WHERE assigned_to IS NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_crm_claims_police_report_id
      ON crm_claims(police_report_id) WHERE police_report_id IS NOT NULL;
  END IF;
END $$;

-- crm_clients indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_clients') THEN
    CREATE INDEX IF NOT EXISTS idx_crm_clients_lead_id
      ON crm_clients(lead_id);
  END IF;
END $$;

-- crm_interactions indexes
CREATE INDEX IF NOT EXISTS idx_crm_interactions_lead_id
  ON crm_interactions(lead_id);

CREATE INDEX IF NOT EXISTS idx_crm_interactions_created_by
  ON crm_interactions(created_by) WHERE created_by IS NOT NULL;

-- prospect_documents indexes (likely name for crm_lead_documents)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prospect_documents') THEN
    CREATE INDEX IF NOT EXISTS idx_prospect_documents_lead_id
      ON prospect_documents(lead_id);
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'prospect_documents' AND column_name = 'uploaded_by') THEN
      CREATE INDEX IF NOT EXISTS idx_prospect_documents_uploaded_by
        ON prospect_documents(uploaded_by);
    END IF;
  END IF;
END $$;

-- crm_document_notifications indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_document_notifications') THEN
    CREATE INDEX IF NOT EXISTS idx_crm_document_notifications_document_id
      ON crm_document_notifications(document_id);
  END IF;
END $$;

-- crm_gdpr_requests indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_gdpr_requests') THEN
    CREATE INDEX IF NOT EXISTS idx_crm_gdpr_requests_assigned_to
      ON crm_gdpr_requests(assigned_to) WHERE assigned_to IS NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_crm_gdpr_requests_client_id
      ON crm_gdpr_requests(client_id);
  END IF;
END $$;
