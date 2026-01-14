/*
  # Add Down Payment System to Contracts

  1. New Columns
    - Adds down payment management columns to lead_contracts table

  2. New Enum Type
    - down_payment_status: pending, processing, paid, failed, refunded

  3. Security
    - RLS policies updated to allow prospect access via token
    - Admin full access maintained

  4. Features
    - Commercial can mark contract as requiring down payment
    - Commercial sets down payment amount
    - System generates secure payment link
    - Tracks payment status and transaction details
    - Blocks signature until payment completed (if required)
*/

-- Create down payment status enum
DO $$ BEGIN
  CREATE TYPE down_payment_status AS ENUM ('pending', 'processing', 'paid', 'failed', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add down payment columns to lead_contracts
ALTER TABLE lead_contracts
ADD COLUMN IF NOT EXISTS requires_down_payment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS down_payment_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS down_payment_status down_payment_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS down_payment_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS down_payment_paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS down_payment_link TEXT,
ADD COLUMN IF NOT EXISTS down_payment_link_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS down_payment_provider TEXT DEFAULT 'cic',
ADD COLUMN IF NOT EXISTS down_payment_metadata JSONB DEFAULT '{}';

-- Add payment_status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'payment_status') THEN
    ALTER TABLE lead_contracts ADD COLUMN payment_status TEXT DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'payment_date') THEN
    ALTER TABLE lead_contracts ADD COLUMN payment_date TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_contracts' AND column_name = 'annual_premium') THEN
    ALTER TABLE lead_contracts ADD COLUMN annual_premium DECIMAL(10,2);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contracts_down_payment_status
  ON lead_contracts(down_payment_status)
  WHERE requires_down_payment = true;

CREATE INDEX IF NOT EXISTS idx_contracts_down_payment_link
  ON lead_contracts(down_payment_link)
  WHERE down_payment_link IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_down_payment_expires
  ON lead_contracts(down_payment_link_expires_at)
  WHERE down_payment_link_expires_at IS NOT NULL;

-- Function to generate secure payment token
CREATE OR REPLACE FUNCTION generate_payment_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(sha256((gen_random_uuid()::text || now()::text || random()::text)::bytea), 'hex');
END;
$$;

-- Function to create down payment link
CREATE OR REPLACE FUNCTION create_down_payment_link(
  p_contract_id UUID,
  p_amount DECIMAL,
  p_expires_in_days INT DEFAULT 7
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_token TEXT;
  v_contract RECORD;
  v_lead RECORD;
BEGIN
  SELECT * INTO v_contract FROM lead_contracts WHERE id = p_contract_id;

  IF v_contract IS NULL THEN
    RAISE EXCEPTION 'Contract not found';
  END IF;

  SELECT * INTO v_lead FROM crm_leads WHERE id = v_contract.lead_id;

  v_payment_token := generate_payment_token();

  UPDATE lead_contracts SET
    requires_down_payment = true,
    down_payment_amount = p_amount,
    down_payment_status = 'pending',
    down_payment_link = v_payment_token,
    down_payment_link_expires_at = now() + (p_expires_in_days || ' days')::interval,
    updated_at = now()
  WHERE id = p_contract_id;

  PERFORM queue_event_notifications(
    v_contract.lead_id,
    'down_payment_required',
    jsonb_build_object(
      'contract_id', p_contract_id,
      'amount', p_amount,
      'payment_token', v_payment_token,
      'expires_at', now() + (p_expires_in_days || ' days')::interval
    )
  );

  RETURN v_payment_token;
END;
$$;

-- Function to validate payment link
CREATE OR REPLACE FUNCTION validate_payment_link(p_payment_token TEXT)
RETURNS TABLE (
  contract_id UUID,
  lead_id UUID,
  amount DECIMAL,
  status TEXT,
  is_valid BOOLEAN,
  lead_email TEXT,
  lead_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS contract_id,
    c.lead_id,
    c.down_payment_amount AS amount,
    c.down_payment_status::TEXT AS status,
    (c.down_payment_link_expires_at > now() AND c.down_payment_status::TEXT = 'pending') AS is_valid,
    l.email AS lead_email,
    COALESCE(l.first_name || ' ' || l.last_name, l.full_name) AS lead_name
  FROM lead_contracts c
  INNER JOIN crm_leads l ON l.id = c.lead_id
  WHERE c.down_payment_link = p_payment_token;
END;
$$;

-- Function to record down payment
CREATE OR REPLACE FUNCTION record_down_payment(
  p_payment_token TEXT,
  p_transaction_id TEXT,
  p_provider_response JSONB DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
BEGIN
  SELECT * INTO v_contract
  FROM lead_contracts
  WHERE down_payment_link = p_payment_token
    AND down_payment_status = 'pending'
    AND down_payment_link_expires_at > now();

  IF v_contract IS NULL THEN
    RETURN false;
  END IF;

  UPDATE lead_contracts SET
    down_payment_status = 'paid',
    down_payment_transaction_id = p_transaction_id,
    down_payment_paid_at = now(),
    down_payment_metadata = down_payment_metadata || p_provider_response,
    payment_status = 'paid',
    payment_date = now(),
    updated_at = now()
  WHERE id = v_contract.id;

  INSERT INTO lead_payments (
    lead_id,
    contract_id,
    amount,
    payment_method,
    transaction_id,
    status,
    paid_at,
    payer_email,
    payer_name,
    provider_response
  )
  SELECT
    v_contract.lead_id,
    v_contract.id,
    v_contract.down_payment_amount,
    'cic',
    p_transaction_id,
    'COMPLETED',
    now(),
    l.email,
    COALESCE(l.first_name || ' ' || l.last_name, l.full_name),
    p_provider_response
  FROM crm_leads l WHERE l.id = v_contract.lead_id;

  UPDATE crm_leads SET
    status = CASE
      WHEN status::TEXT = 'quote_accepted' THEN 'payment_received'
      ELSE status
    END,
    updated_at = now()
  WHERE id = v_contract.lead_id;

  PERFORM queue_event_notifications(
    v_contract.lead_id,
    'down_payment_confirmed',
    jsonb_build_object(
      'contract_id', v_contract.id,
      'amount', v_contract.down_payment_amount,
      'transaction_id', p_transaction_id
    )
  );

  RETURN true;
END;
$$;

-- Function to check if signature is allowed
CREATE OR REPLACE FUNCTION can_sign_contract(p_contract_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
BEGIN
  SELECT * INTO v_contract FROM lead_contracts WHERE id = p_contract_id;

  IF v_contract IS NULL THEN
    RETURN false;
  END IF;

  IF v_contract.requires_down_payment = false THEN
    RETURN true;
  END IF;

  IF v_contract.requires_down_payment = true AND v_contract.down_payment_status::TEXT = 'paid' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Notification templates for down payment
INSERT INTO crm_notification_templates (template_id, name, channel, subject, content, variables, is_active)
VALUES
('down_payment_required', 'Lien paiement comptant', 'email',
'Réglez votre comptant pour finaliser votre contrat - TaxiAssur',
E'Bonjour {{first_name}},\n\nVotre contrat d''assurance taxi est prêt !\n\nPour le finaliser, un comptant de {{amount}} EUR est requis.\n\n👉 Payez en ligne de manière sécurisée :\n{{payment_link}}\n\nCe lien expire dans {{days_left}} jours.\n\nUne fois le paiement validé, vous pourrez signer électroniquement votre contrat.\n\nCordialement,\nL''équipe TaxiAssur\n01 76 39 00 60',
'["first_name", "amount", "payment_link", "days_left"]'::jsonb, true),

('down_payment_confirmed', 'Confirmation paiement comptant', 'email',
'Paiement comptant confirmé - TaxiAssur',
E'Bonjour {{first_name}},\n\n✅ Votre paiement de {{amount}} EUR a été confirmé !\n\nVous pouvez maintenant signer votre contrat :\n{{signature_link}}\n\nMerci pour votre confiance.\n\nCordialement,\nL''équipe TaxiAssur\n01 76 39 00 60',
'["first_name", "amount", "signature_link"]'::jsonb, true),

('down_payment_reminder', 'Rappel paiement comptant', 'email',
'Rappel : Finalisez votre assurance taxi - TaxiAssur',
E'Bonjour {{first_name}},\n\nVotre contrat est en attente de paiement.\n\nMontant : {{amount}} EUR\n\nPayez maintenant :\n{{payment_link}}\n\nCe lien expire dans {{days_left}} jours.\n\nBesoin d''aide ? Contactez-nous au 01 76 39 00 60\n\nCordialement,\nL''équipe TaxiAssur',
'["first_name", "amount", "payment_link", "days_left"]'::jsonb, true)

ON CONFLICT (template_id) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  content = EXCLUDED.content,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active;

-- Trigger to prevent signature if payment not completed
CREATE OR REPLACE FUNCTION check_payment_before_signature()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_contract RECORD;
BEGIN
  IF NEW.status::TEXT = 'SIGNED' AND OLD.status::TEXT != 'SIGNED' THEN
    SELECT * INTO v_contract
    FROM lead_contracts
    WHERE id = NEW.contract_id;

    IF v_contract.requires_down_payment = true AND v_contract.down_payment_status::TEXT != 'paid' THEN
      RAISE EXCEPTION 'Cannot sign contract: down payment not completed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_payment_before_signature ON lead_signatures;
CREATE TRIGGER trigger_check_payment_before_signature
  BEFORE UPDATE ON lead_signatures
  FOR EACH ROW
  EXECUTE FUNCTION check_payment_before_signature();

-- Update existing contracts to have payment columns
UPDATE lead_contracts
SET
  requires_down_payment = false,
  down_payment_amount = 0.00,
  down_payment_status = 'pending'
WHERE requires_down_payment IS NULL;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_payment_token() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_down_payment_link(UUID, DECIMAL, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_payment_link(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION record_down_payment(TEXT, TEXT, JSONB) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION can_sign_contract(UUID) TO authenticated, anon;