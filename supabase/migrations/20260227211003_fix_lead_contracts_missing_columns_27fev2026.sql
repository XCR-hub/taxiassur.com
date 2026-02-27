/*
  # Fix lead_contracts - Colonnes manquantes

  1. Modifications
    - Ajouter `status` à lead_contracts
    - Ajouter `down_payment_status` à lead_contracts
    - Ajouter `down_payment_amount` à lead_contracts
    - Ajouter index pour performance

  2. Sécurité
    - RLS déjà activé sur la table
*/

-- Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS lead_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  company_id UUID REFERENCES insurance_companies(id),
  contract_number TEXT,
  contract_file_url TEXT,
  contract_uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES admin_users(id),
  signature_required BOOLEAN DEFAULT true,
  signature_url TEXT,
  signed_at TIMESTAMPTZ,
  signed_file_url TEXT,
  signature_ip TEXT,
  signature_user_agent TEXT,
  sent_to_company_at TIMESTAMPTZ,
  sent_by UUID REFERENCES admin_users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter les colonnes manquantes
ALTER TABLE lead_contracts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE lead_contracts ADD COLUMN IF NOT EXISTS down_payment_status TEXT DEFAULT 'pending';
ALTER TABLE lead_contracts ADD COLUMN IF NOT EXISTS down_payment_amount NUMERIC(10,2);

-- Index
CREATE INDEX IF NOT EXISTS idx_lead_contracts_lead_id ON lead_contracts(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_contracts_status ON lead_contracts(status);
CREATE INDEX IF NOT EXISTS idx_lead_contracts_down_payment_status ON lead_contracts(down_payment_status);

-- RLS
ALTER TABLE lead_contracts ENABLE ROW LEVEL SECURITY;

-- Politique pour les utilisateurs authentifiés
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'lead_contracts' 
    AND policyname = 'Authenticated can view lead contracts'
  ) THEN
    CREATE POLICY "Authenticated can view lead contracts"
      ON lead_contracts
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'lead_contracts' 
    AND policyname = 'Service role can manage lead contracts'
  ) THEN
    CREATE POLICY "Service role can manage lead contracts"
      ON lead_contracts
      FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;
