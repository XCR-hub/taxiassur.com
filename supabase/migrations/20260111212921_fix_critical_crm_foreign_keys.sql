/*
  # Fix Critical CRM Foreign Keys

  1. Problème
    - Certaines tables CRM ont des FK vers crm_leads_enhanced au lieu de crm_leads
    - Cause des erreurs lors de l'upload de documents et autres opérations

  2. Tables à corriger (vérifiées)
    - crm_lead_documents (table principale pour documents)
    - crm_quote_history (historique devis)
    - crm_tasks (si existe avec lead_id)
    - crm_documents (si existe)
    - crm_review_requests (si existe)

  3. Approche
    - Vérifier existence de la table ET de la colonne lead_id
    - Supprimer anciennes contraintes
    - Ajouter nouvelles contraintes vers crm_leads
*/

-- ==============================
-- 1. crm_lead_documents (CRITIQUE)
-- ==============================
DO $$
BEGIN
  -- Vérifier que la table et la colonne existent
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_lead_documents' AND column_name = 'lead_id'
  ) THEN
    
    -- Supprimer l'ancienne contrainte si elle existe
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'crm_lead_documents_lead_id_fkey'
      AND table_name = 'crm_lead_documents'
    ) THEN
      ALTER TABLE crm_lead_documents DROP CONSTRAINT crm_lead_documents_lead_id_fkey;
    END IF;

    -- Ajouter la nouvelle contrainte
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'crm_lead_documents_lead_id_crm_leads_fkey'
      AND table_name = 'crm_lead_documents'
    ) THEN
      ALTER TABLE crm_lead_documents
      ADD CONSTRAINT crm_lead_documents_lead_id_crm_leads_fkey
      FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE;
    END IF;

    -- Index pour performance
    CREATE INDEX IF NOT EXISTS idx_crm_lead_documents_lead_id
    ON crm_lead_documents(lead_id);

    CREATE INDEX IF NOT EXISTS idx_crm_lead_documents_type_created
    ON crm_lead_documents(document_type, created_at DESC);
    
  END IF;
END $$;

-- ==============================
-- 2. crm_quote_history (CRITIQUE)
-- ==============================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_quote_history' AND column_name = 'lead_id'
  ) THEN
    
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'crm_quote_history_lead_id_fkey'
      AND table_name = 'crm_quote_history'
    ) THEN
      ALTER TABLE crm_quote_history DROP CONSTRAINT crm_quote_history_lead_id_fkey;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'crm_quote_history_lead_id_crm_leads_fkey'
      AND table_name = 'crm_quote_history'
    ) THEN
      ALTER TABLE crm_quote_history
      ADD CONSTRAINT crm_quote_history_lead_id_crm_leads_fkey
      FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_crm_quote_history_lead_id
    ON crm_quote_history(lead_id, sent_at DESC);
    
  END IF;
END $$;

-- ==============================
-- 3. crm_documents
-- ==============================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_documents' AND column_name = 'lead_id'
  ) THEN
    
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'crm_documents_lead_id_fkey'
      AND table_name = 'crm_documents'
    ) THEN
      ALTER TABLE crm_documents DROP CONSTRAINT crm_documents_lead_id_fkey;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'crm_documents_lead_id_crm_leads_fkey'
      AND table_name = 'crm_documents'
    ) THEN
      ALTER TABLE crm_documents
      ADD CONSTRAINT crm_documents_lead_id_crm_leads_fkey
      FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_crm_documents_lead_id
    ON crm_documents(lead_id);
    
  END IF;
END $$;

-- ==============================
-- 4. crm_tasks
-- ==============================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_tasks' AND column_name = 'lead_id'
  ) THEN
    
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'crm_tasks_lead_id_fkey'
      AND table_name = 'crm_tasks'
    ) THEN
      ALTER TABLE crm_tasks DROP CONSTRAINT crm_tasks_lead_id_fkey;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'crm_tasks_lead_id_crm_leads_fkey'
      AND table_name = 'crm_tasks'
    ) THEN
      ALTER TABLE crm_tasks
      ADD CONSTRAINT crm_tasks_lead_id_crm_leads_fkey
      FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_crm_tasks_lead_id
    ON crm_tasks(lead_id);
    
  END IF;
END $$;

-- ==============================
-- 5. crm_review_requests
-- ==============================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_review_requests' AND column_name = 'lead_id'
  ) THEN
    
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'crm_review_requests_lead_id_fkey'
      AND table_name = 'crm_review_requests'
    ) THEN
      ALTER TABLE crm_review_requests DROP CONSTRAINT crm_review_requests_lead_id_fkey;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'crm_review_requests_lead_id_crm_leads_fkey'
      AND table_name = 'crm_review_requests'
    ) THEN
      ALTER TABLE crm_review_requests
      ADD CONSTRAINT crm_review_requests_lead_id_crm_leads_fkey
      FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_crm_review_requests_lead_id
    ON crm_review_requests(lead_id);
    
  END IF;
END $$;

-- ==============================
-- 6. crm_quotes_sent
-- ==============================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_quotes_sent' AND column_name = 'lead_id'
  ) THEN
    
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'crm_quotes_sent_lead_id_fkey'
      AND table_name = 'crm_quotes_sent'
    ) THEN
      ALTER TABLE crm_quotes_sent DROP CONSTRAINT crm_quotes_sent_lead_id_fkey;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'crm_quotes_sent_lead_id_crm_leads_fkey'
      AND table_name = 'crm_quotes_sent'
    ) THEN
      ALTER TABLE crm_quotes_sent
      ADD CONSTRAINT crm_quotes_sent_lead_id_crm_leads_fkey
      FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_crm_quotes_sent_lead_id
    ON crm_quotes_sent(lead_id);
    
  END IF;
END $$;

-- ==============================
-- 7. crm_contracts_signed
-- ==============================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_contracts_signed' AND column_name = 'lead_id'
  ) THEN
    
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'crm_contracts_signed_lead_id_fkey'
      AND table_name = 'crm_contracts_signed'
    ) THEN
      ALTER TABLE crm_contracts_signed DROP CONSTRAINT crm_contracts_signed_lead_id_fkey;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'crm_contracts_signed_lead_id_crm_leads_fkey'
      AND table_name = 'crm_contracts_signed'
    ) THEN
      ALTER TABLE crm_contracts_signed
      ADD CONSTRAINT crm_contracts_signed_lead_id_crm_leads_fkey
      FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_crm_contracts_signed_lead_id
    ON crm_contracts_signed(lead_id);
    
  END IF;
END $$;

-- ==============================
-- 8. crm_ai_suggestions
-- ==============================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_ai_suggestions' AND column_name = 'lead_id'
  ) THEN
    
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'crm_ai_suggestions_lead_id_fkey'
      AND table_name = 'crm_ai_suggestions'
    ) THEN
      ALTER TABLE crm_ai_suggestions DROP CONSTRAINT crm_ai_suggestions_lead_id_fkey;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'crm_ai_suggestions_lead_id_crm_leads_fkey'
      AND table_name = 'crm_ai_suggestions'
    ) THEN
      ALTER TABLE crm_ai_suggestions
      ADD CONSTRAINT crm_ai_suggestions_lead_id_crm_leads_fkey
      FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_crm_ai_suggestions_lead_id
    ON crm_ai_suggestions(lead_id, created_at DESC);
    
  END IF;
END $$;

-- ==============================
-- 9. crm_notifications
-- ==============================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_notifications' AND column_name = 'lead_id'
  ) THEN
    
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'crm_notifications_lead_id_fkey'
      AND table_name = 'crm_notifications'
    ) THEN
      ALTER TABLE crm_notifications DROP CONSTRAINT crm_notifications_lead_id_fkey;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'crm_notifications_lead_id_crm_leads_fkey'
      AND table_name = 'crm_notifications'
    ) THEN
      ALTER TABLE crm_notifications
      ADD CONSTRAINT crm_notifications_lead_id_crm_leads_fkey
      FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_crm_notifications_lead_id
    ON crm_notifications(lead_id);
    
  END IF;
END $$;
