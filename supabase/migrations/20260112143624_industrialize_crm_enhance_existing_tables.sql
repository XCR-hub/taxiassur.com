/*
  # Industrialisation CRM TaxiAssur - Enhancement des tables existantes
  
  ## Modifications
    - Ajout colonnes à lead_quotes (company_id, premium, guarantees...)
    - Ajout colonnes à lead_contracts
    - Ajout colonnes à crm_leads
    - Création tables manquantes
*/

-- ================================================================
-- 1. ENRICHIR LEAD_QUOTES
-- ================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_quotes' AND column_name = 'company_id') THEN
    ALTER TABLE lead_quotes ADD COLUMN company_id uuid;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_quotes' AND column_name = 'monthly_premium') THEN
    ALTER TABLE lead_quotes ADD COLUMN monthly_premium numeric(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_quotes' AND column_name = 'annual_premium') THEN
    ALTER TABLE lead_quotes ADD COLUMN annual_premium numeric(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_quotes' AND column_name = 'commission_rate') THEN
    ALTER TABLE lead_quotes ADD COLUMN commission_rate numeric(5,2) DEFAULT 10.00;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_quotes' AND column_name = 'coverage_type') THEN
    ALTER TABLE lead_quotes ADD COLUMN coverage_type text DEFAULT 'tous_risques';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_quotes' AND column_name = 'franchise_amount') THEN
    ALTER TABLE lead_quotes ADD COLUMN franchise_amount numeric(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_quotes' AND column_name = 'guarantees') THEN
    ALTER TABLE lead_quotes ADD COLUMN guarantees jsonb DEFAULT '[]';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_quotes' AND column_name = 'file_url') THEN
    ALTER TABLE lead_quotes ADD COLUMN file_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_quotes' AND column_name = 'file_name') THEN
    ALTER TABLE lead_quotes ADD COLUMN file_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_quotes' AND column_name = 'is_selected') THEN
    ALTER TABLE lead_quotes ADD COLUMN is_selected boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_quotes' AND column_name = 'metadata') THEN
    ALTER TABLE lead_quotes ADD COLUMN metadata jsonb DEFAULT '{}';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lead_quotes_company_id ON lead_quotes(company_id);

-- ================================================================
-- 2. ENRICHIR LEAD_CONTRACTS
-- ================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'company_id') THEN
    ALTER TABLE lead_contracts ADD COLUMN company_id uuid;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'quote_id') THEN
    ALTER TABLE lead_contracts ADD COLUMN quote_id uuid;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'monthly_premium') THEN
    ALTER TABLE lead_contracts ADD COLUMN monthly_premium numeric(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'annual_premium') THEN
    ALTER TABLE lead_contracts ADD COLUMN annual_premium numeric(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'dispositions_particulieres_url') THEN
    ALTER TABLE lead_contracts ADD COLUMN dispositions_particulieres_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'dispositions_generales_url') THEN
    ALTER TABLE lead_contracts ADD COLUMN dispositions_generales_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'attestation_url') THEN
    ALTER TABLE lead_contracts ADD COLUMN attestation_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'memo_url') THEN
    ALTER TABLE lead_contracts ADD COLUMN memo_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'signature_status') THEN
    ALTER TABLE lead_contracts ADD COLUMN signature_status text DEFAULT 'pending';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'signature_provider') THEN
    ALTER TABLE lead_contracts ADD COLUMN signature_provider text DEFAULT 'internal';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'signature_request_id') THEN
    ALTER TABLE lead_contracts ADD COLUMN signature_request_id text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'signature_url') THEN
    ALTER TABLE lead_contracts ADD COLUMN signature_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'signature_sent_at') THEN
    ALTER TABLE lead_contracts ADD COLUMN signature_sent_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'signature_opened_at') THEN
    ALTER TABLE lead_contracts ADD COLUMN signature_opened_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'signature_completed_at') THEN
    ALTER TABLE lead_contracts ADD COLUMN signature_completed_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'signed_document_url') THEN
    ALTER TABLE lead_contracts ADD COLUMN signed_document_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'payment_method') THEN
    ALTER TABLE lead_contracts ADD COLUMN payment_method text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'payment_status') THEN
    ALTER TABLE lead_contracts ADD COLUMN payment_status text DEFAULT 'pending';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'payment_url') THEN
    ALTER TABLE lead_contracts ADD COLUMN payment_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'payment_amount') THEN
    ALTER TABLE lead_contracts ADD COLUMN payment_amount numeric(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'payment_date') THEN
    ALTER TABLE lead_contracts ADD COLUMN payment_date timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'payment_reference') THEN
    ALTER TABLE lead_contracts ADD COLUMN payment_reference text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'requires_company_notification') THEN
    ALTER TABLE lead_contracts ADD COLUMN requires_company_notification boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'company_notified_at') THEN
    ALTER TABLE lead_contracts ADD COLUMN company_notified_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'metadata') THEN
    ALTER TABLE lead_contracts ADD COLUMN metadata jsonb DEFAULT '{}';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lead_contracts_company_id ON lead_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_contracts_quote_id ON lead_contracts(quote_id);
CREATE INDEX IF NOT EXISTS idx_lead_contracts_signature_status ON lead_contracts(signature_status);
CREATE INDEX IF NOT EXISTS idx_lead_contracts_payment_status ON lead_contracts(payment_status);

-- ================================================================
-- 3. ENRICHIR CRM_LEADS
-- ================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'documents_complete') THEN
    ALTER TABLE crm_leads ADD COLUMN documents_complete boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'documents_received_at') THEN
    ALTER TABLE crm_leads ADD COLUMN documents_received_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'quote_accepted_at') THEN
    ALTER TABLE crm_leads ADD COLUMN quote_accepted_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'contract_signed_at') THEN
    ALTER TABLE crm_leads ADD COLUMN contract_signed_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'payment_completed_at') THEN
    ALTER TABLE crm_leads ADD COLUMN payment_completed_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'client_since') THEN
    ALTER TABLE crm_leads ADD COLUMN client_since timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'selected_company_id') THEN
    ALTER TABLE crm_leads ADD COLUMN selected_company_id uuid;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'selected_quote_id') THEN
    ALTER TABLE crm_leads ADD COLUMN selected_quote_id uuid;
  END IF;
END $$;

-- ================================================================
-- 4. CRÉER CRM_AUTOMATION_EVENTS
-- ================================================================

CREATE TABLE IF NOT EXISTS crm_automation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  
  event_type text NOT NULL,
  event_source text DEFAULT 'system',
  event_data jsonb DEFAULT '{}',
  
  old_status text,
  new_status text,
  
  triggered_automations jsonb DEFAULT '[]',
  
  processed boolean DEFAULT false,
  processed_at timestamptz,
  error_message text,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_automation_events_lead_id ON crm_automation_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_automation_events_type ON crm_automation_events(event_type);
CREATE INDEX IF NOT EXISTS idx_crm_automation_events_processed ON crm_automation_events(processed) WHERE NOT processed;

ALTER TABLE crm_automation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_automation_events_admin_all" ON crm_automation_events;
CREATE POLICY "crm_automation_events_admin_all" ON crm_automation_events
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- ================================================================
-- 5. CRÉER CRM_NOTIFICATION_QUEUE
-- ================================================================

CREATE TABLE IF NOT EXISTS crm_notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  event_id uuid,
  
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'push', 'internal')),
  recipient_type text NOT NULL CHECK (recipient_type IN ('client', 'team', 'company')),
  recipient_email text,
  recipient_phone text,
  recipient_user_id uuid,
  
  template_id text,
  subject text,
  content text,
  html_content text,
  
  variables jsonb DEFAULT '{}',
  attachments jsonb DEFAULT '[]',
  
  priority integer DEFAULT 5,
  scheduled_at timestamptz DEFAULT now(),
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'delivered', 'failed', 'cancelled')),
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  
  error_message text,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  
  provider_response jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_notification_queue_lead_id ON crm_notification_queue(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_notification_queue_status ON crm_notification_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_crm_notification_queue_channel ON crm_notification_queue(channel);

ALTER TABLE crm_notification_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_notification_queue_admin_all" ON crm_notification_queue;
CREATE POLICY "crm_notification_queue_admin_all" ON crm_notification_queue
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- ================================================================
-- 6. CRÉER LEAD_CLIENT_REQUESTS
-- ================================================================

CREATE TABLE IF NOT EXISTS lead_client_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  contract_id uuid,
  
  request_type text NOT NULL CHECK (request_type IN (
    'address_change', 'vehicle_change', 'payment_change', 
    'contact_change', 'claim_declaration', 'document_request',
    'cancellation', 'coverage_change', 'other'
  )),
  
  title text NOT NULL,
  description text,
  
  current_data jsonb,
  new_data jsonb,
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'cancelled')),
  
  assigned_to uuid,
  
  response text,
  resolved_at timestamptz,
  
  attachments jsonb DEFAULT '[]',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_client_requests_lead_id ON lead_client_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_client_requests_status ON lead_client_requests(status);
CREATE INDEX IF NOT EXISTS idx_lead_client_requests_type ON lead_client_requests(request_type);

ALTER TABLE lead_client_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_client_requests_admin_all" ON lead_client_requests;
CREATE POLICY "lead_client_requests_admin_all" ON lead_client_requests
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "lead_client_requests_anon_manage_own" ON lead_client_requests;
CREATE POLICY "lead_client_requests_anon_manage_own" ON lead_client_requests
  FOR ALL TO anon
  USING (
    lead_id IN (
      SELECT id FROM crm_leads WHERE access_token IS NOT NULL AND access_token != ''
    )
  );
