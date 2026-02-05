/*
  # Système de paiement comptant Monético - 2026

  1. Nouvelle table
    - lead_down_payments : Gestion des paiements comptant

  2. Fonctionnalités
    - Création de demandes de paiement comptant (optionnel)
    - Suivi du statut des paiements
    - Intégration avec l'API Monético (à venir)
    - Lien de paiement envoyé au prospect

  3. Workflow
    - Commercial crée une demande de paiement avec montant
    - Système génère un lien de paiement Monético
    - Email envoyé au prospect avec le lien
    - Webhook Monético met à jour le statut
    - Lead peut passer à l'étape suivante

  4. Sécurité
    - RLS activé
    - Seuls les commerciaux peuvent créer des demandes
    - Traçabilité complète
*/

-- Créer la table des paiements comptant
CREATE TABLE IF NOT EXISTS lead_down_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  
  -- Montant et méthode
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  currency text DEFAULT 'EUR' NOT NULL,
  payment_method text DEFAULT 'monetico' NOT NULL,
  
  -- Statut du paiement
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  
  -- Informations Monético
  payment_url text,
  transaction_id text,
  monetico_reference text,
  monetico_order_id text,
  
  -- Dates
  paid_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  
  -- Métadonnées
  failure_reason text,
  payment_metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_lead_down_payments_lead_id ON lead_down_payments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_down_payments_status ON lead_down_payments(status);
CREATE INDEX IF NOT EXISTS idx_lead_down_payments_transaction_id ON lead_down_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_lead_down_payments_created_at ON lead_down_payments(created_at DESC);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_lead_down_payments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_lead_down_payments_updated_at ON lead_down_payments;

CREATE TRIGGER trigger_update_lead_down_payments_updated_at
  BEFORE UPDATE ON lead_down_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_down_payments_updated_at();

-- RLS
ALTER TABLE lead_down_payments ENABLE ROW LEVEL SECURITY;

-- Politique : Commerciaux et admins peuvent voir tous les paiements
CREATE POLICY "Authenticated users can view down payments"
  ON lead_down_payments
  FOR SELECT
  TO authenticated
  USING (true);

-- Politique : Commerciaux peuvent créer des demandes de paiement
CREATE POLICY "Authenticated users can create down payments"
  ON lead_down_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Politique : Seuls les créateurs et admins peuvent modifier
CREATE POLICY "Users can update own down payments"
  ON lead_down_payments
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR auth.uid() IN (SELECT id FROM admin_users WHERE role = 'admin'))
  WITH CHECK (created_by = auth.uid() OR auth.uid() IN (SELECT id FROM admin_users WHERE role = 'admin'));

-- Politique : Service role pour les webhooks Monético
CREATE POLICY "Service role can manage all down payments"
  ON lead_down_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fonction pour obtenir le dernier paiement d'un lead
CREATE OR REPLACE FUNCTION get_lead_last_down_payment(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment jsonb;
BEGIN
  SELECT to_jsonb(ldp.*)
  INTO v_payment
  FROM lead_down_payments ldp
  WHERE ldp.lead_id = p_lead_id
  ORDER BY ldp.created_at DESC
  LIMIT 1;

  RETURN v_payment;
END;
$$;

-- Vue pour le dashboard commercial
CREATE OR REPLACE VIEW down_payments_summary AS
SELECT 
  ldp.id,
  ldp.lead_id,
  ldp.amount,
  ldp.status,
  ldp.payment_url,
  ldp.transaction_id,
  ldp.paid_at,
  ldp.created_at,
  cl.email as lead_email,
  cl.first_name || ' ' || cl.last_name as lead_name,
  cl.pipeline_stage
FROM lead_down_payments ldp
JOIN crm_leads cl ON cl.id = ldp.lead_id
WHERE ldp.status != 'cancelled'
ORDER BY ldp.created_at DESC;

-- Commentaires
COMMENT ON TABLE lead_down_payments IS 'Paiements comptant pour lancement de contrat via Monético';
COMMENT ON COLUMN lead_down_payments.amount IS 'Montant du paiement comptant en euros';
COMMENT ON COLUMN lead_down_payments.status IS 'Statut : pending, paid, failed, cancelled, refunded';
COMMENT ON COLUMN lead_down_payments.payment_url IS 'URL de paiement Monético envoyée au prospect';
COMMENT ON COLUMN lead_down_payments.transaction_id IS 'ID de transaction Monético';
COMMENT ON FUNCTION get_lead_last_down_payment IS 'Récupère le dernier paiement comptant d''un lead';
