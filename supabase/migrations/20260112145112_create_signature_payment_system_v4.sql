/*
  # Electronic Signature and Payment System v4
  
  1. New Tables
    - lead_signatures: Track electronic signatures
    - available_payment_types: Payment methods catalog
    
  2. Enhance existing lead_payments table
  
  3. Functions for signature and payment processing
*/

-- Create lead_signatures table
CREATE TABLE IF NOT EXISTS lead_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES lead_contracts(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES lead_quotes(id) ON DELETE SET NULL,
  
  signature_token text UNIQUE NOT NULL,
  document_type text NOT NULL DEFAULT 'contract',
  document_url text,
  
  status signature_status DEFAULT 'PENDING',
  
  signature_data text,
  signature_image_url text,
  signer_name text,
  signer_email text,
  signer_ip text,
  signer_user_agent text,
  
  sent_at timestamptz DEFAULT now(),
  viewed_at timestamptz,
  signed_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  
  created_by uuid REFERENCES admin_users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add missing columns to lead_payments if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_payments' AND column_name = 'contract_id') THEN
    ALTER TABLE lead_payments ADD COLUMN contract_id uuid REFERENCES lead_contracts(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_payments' AND column_name = 'signature_id') THEN
    ALTER TABLE lead_payments ADD COLUMN signature_id uuid;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_payments' AND column_name = 'payer_email') THEN
    ALTER TABLE lead_payments ADD COLUMN payer_email text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_payments' AND column_name = 'payer_name') THEN
    ALTER TABLE lead_payments ADD COLUMN payer_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_payments' AND column_name = 'payer_ip') THEN
    ALTER TABLE lead_payments ADD COLUMN payer_ip text;
  END IF;
END $$;

-- Create available_payment_types table
CREATE TABLE IF NOT EXISTS available_payment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  provider text DEFAULT 'stripe',
  is_active boolean DEFAULT true,
  display_order int DEFAULT 0,
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE lead_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE available_payment_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_signatures
DROP POLICY IF EXISTS "Admin full access lead_signatures" ON lead_signatures;
CREATE POLICY "Admin full access lead_signatures" ON lead_signatures
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Anon can select lead_signatures" ON lead_signatures;
CREATE POLICY "Anon can select lead_signatures" ON lead_signatures
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anon can update lead_signatures" ON lead_signatures;
CREATE POLICY "Anon can update lead_signatures" ON lead_signatures
  FOR UPDATE TO anon USING (true);

-- RLS for available_payment_types
DROP POLICY IF EXISTS "Anyone can view available_payment_types" ON available_payment_types;
CREATE POLICY "Anyone can view available_payment_types" ON available_payment_types
  FOR SELECT USING (is_active = true);

-- Insert default payment types
INSERT INTO available_payment_types (code, name, description, icon, display_order, is_active)
VALUES
  ('card', 'Carte bancaire', 'Visa, Mastercard, CB', 'CreditCard', 1, true),
  ('sepa', 'Prelevement SEPA', 'Prelevement bancaire automatique', 'Building', 2, true),
  ('transfer', 'Virement bancaire', 'Virement depuis votre banque', 'ArrowRightLeft', 3, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- Function to generate signature token
CREATE OR REPLACE FUNCTION generate_signature_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(sha256((gen_random_uuid()::text || now()::text || random()::text)::bytea), 'hex');
END;
$$;

-- Function to create signature request
CREATE OR REPLACE FUNCTION create_signature_request(
  p_lead_id uuid,
  p_contract_id uuid DEFAULT NULL,
  p_quote_id uuid DEFAULT NULL,
  p_document_type text DEFAULT 'contract',
  p_document_url text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signature_id uuid;
  v_token text;
  v_lead record;
BEGIN
  SELECT * INTO v_lead FROM crm_leads WHERE id = p_lead_id;
  
  IF v_lead IS NULL THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;
  
  v_token := generate_signature_token();
  
  INSERT INTO lead_signatures (
    lead_id, contract_id, quote_id, signature_token, document_type, document_url,
    signer_name, signer_email, created_by
  ) VALUES (
    p_lead_id, p_contract_id, p_quote_id, v_token, p_document_type, p_document_url,
    COALESCE(v_lead.first_name || ' ' || v_lead.last_name, v_lead.full_name),
    v_lead.email, p_created_by
  )
  RETURNING id INTO v_signature_id;
  
  PERFORM queue_event_notifications(
    p_lead_id, 'contract_ready', 
    jsonb_build_object('signature_id', v_signature_id, 'signature_token', v_token)
  );
  
  RETURN v_signature_id;
END;
$$;

-- Function to record signature
CREATE OR REPLACE FUNCTION record_signature(
  p_signature_token text,
  p_signature_data text,
  p_signer_ip text DEFAULT NULL,
  p_signer_user_agent text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signature record;
BEGIN
  SELECT * INTO v_signature 
  FROM lead_signatures 
  WHERE signature_token = p_signature_token
    AND status = 'PENDING'
    AND expires_at > now();
  
  IF v_signature IS NULL THEN
    RETURN false;
  END IF;
  
  UPDATE lead_signatures SET
    status = 'SIGNED',
    signature_data = p_signature_data,
    signed_at = now(),
    signer_ip = p_signer_ip,
    signer_user_agent = p_signer_user_agent,
    updated_at = now()
  WHERE id = v_signature.id;
  
  IF v_signature.contract_id IS NOT NULL THEN
    UPDATE lead_contracts SET
      status = 'signed',
      signed_at = now(),
      updated_at = now()
    WHERE id = v_signature.contract_id;
  END IF;
  
  UPDATE crm_leads SET
    status = 'contract_signed',
    updated_at = now()
  WHERE id = v_signature.lead_id;
  
  RETURN true;
END;
$$;

-- Function to record payment (using existing columns)
CREATE OR REPLACE FUNCTION record_payment_complete(
  p_lead_id uuid,
  p_amount decimal,
  p_payment_method text,
  p_transaction_id text DEFAULT NULL,
  p_contract_id uuid DEFAULT NULL,
  p_signature_id uuid DEFAULT NULL,
  p_payer_email text DEFAULT NULL,
  p_payer_name text DEFAULT NULL,
  p_payer_ip text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id uuid;
BEGIN
  INSERT INTO lead_payments (
    lead_id, contract_id, signature_id, amount, payment_method,
    transaction_id, status, payer_email, payer_name, payer_ip, paid_at
  ) VALUES (
    p_lead_id, p_contract_id, p_signature_id, p_amount, p_payment_method,
    p_transaction_id, 'COMPLETED', p_payer_email, p_payer_name, p_payer_ip, now()
  )
  RETURNING id INTO v_payment_id;
  
  IF p_contract_id IS NOT NULL THEN
    UPDATE lead_contracts SET
      payment_status = 'paid',
      payment_date = now(),
      updated_at = now()
    WHERE id = p_contract_id;
  END IF;
  
  UPDATE crm_leads SET
    status = 'active',
    converted_at = now(),
    updated_at = now()
  WHERE id = p_lead_id;
  
  PERFORM queue_event_notifications(
    p_lead_id, 'payment_received', 
    jsonb_build_object('payment_id', v_payment_id, 'amount', p_amount)
  );
  
  RETURN v_payment_id;
END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lead_signatures_lead_id ON lead_signatures(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_signatures_token ON lead_signatures(signature_token);
CREATE INDEX IF NOT EXISTS idx_lead_signatures_status ON lead_signatures(status);

-- Notification templates
INSERT INTO crm_notification_templates (template_id, name, channel, subject, content, variables, is_active)
VALUES
('signature_reminder', 'Rappel signature', 'email', 
'Rappel : Votre contrat attend votre signature - TaxiAssur',
E'Bonjour {{first_name}},\n\nVotre contrat d''assurance taxi est en attente de signature.\n\nSignez en ligne : {{signature_link}}\n\nCe lien expire dans {{days_left}} jours.\n\nCordialement,\nL''equipe TaxiAssur',
'["first_name", "signature_link", "days_left"]'::jsonb, true),

('payment_reminder', 'Rappel paiement', 'email',
'Rappel : Finalisez votre assurance taxi - TaxiAssur',
E'Bonjour {{first_name}},\n\nVotre contrat est signe ! Il ne reste plus qu''a finaliser le paiement.\n\nMontant : {{amount}} EUR\n\nPayez en ligne : {{payment_link}}\n\nCordialement,\nL''equipe TaxiAssur',
'["first_name", "amount", "payment_link"]'::jsonb, true),

('payment_confirmed', 'Confirmation paiement', 'email',
'Paiement confirme - Bienvenue chez TaxiAssur !',
E'Bonjour {{first_name}},\n\nPaiement recu !\n\nVotre attestation est disponible dans votre espace client :\n{{client_link}}\n\nBienvenue chez TaxiAssur !\n\nL''equipe TaxiAssur\n01 76 39 00 60',
'["first_name", "client_link"]'::jsonb, true)

ON CONFLICT (template_id) DO UPDATE SET
  name = EXCLUDED.name,
  content = EXCLUDED.content,
  is_active = EXCLUDED.is_active;
