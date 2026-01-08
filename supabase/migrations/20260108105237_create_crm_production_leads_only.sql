/*
  # CRM - Module Production (version simplifiée)
*/

-- Documents
CREATE TABLE IF NOT EXISTS crm_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  name TEXT NOT NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  doc_status document_status DEFAULT 'RECEIVED',
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_docs_lead_prod ON crm_documents(lead_id);

-- Signatures
CREATE TABLE IF NOT EXISTS crm_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  sig_status signature_status DEFAULT 'PENDING',
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sigs_lead_prod ON crm_signatures(lead_id);

-- Paiements
CREATE TABLE IF NOT EXISTS crm_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'EUR',
  payment_type TEXT NOT NULL,
  pay_status payment_status DEFAULT 'PENDING',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pays_lead_prod ON crm_payments(lead_id);

-- Contrats (nécessite crm_clients)
CREATE TABLE IF NOT EXISTS crm_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL UNIQUE,
  product_type TEXT NOT NULL,
  annual_premium DECIMAL(10, 2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contr_cli_prod ON crm_contracts(client_id);

-- RLS
ALTER TABLE crm_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins all docs prod"
  ON crm_documents FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins all sigs prod"
  ON crm_signatures FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins all pays prod"
  ON crm_payments FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins all contr prod"
  ON crm_contracts FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

COMMENT ON TABLE crm_documents IS 'Documents téléchargés';
COMMENT ON TABLE crm_signatures IS 'Signatures électroniques';
COMMENT ON TABLE crm_payments IS 'Paiements';
COMMENT ON TABLE crm_contracts IS 'Contrats assurance';
