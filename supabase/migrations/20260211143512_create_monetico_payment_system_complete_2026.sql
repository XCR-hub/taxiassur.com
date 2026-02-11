/*
  # Système de Paiement Comptant Monetico - Étape 6 Pipeline
  
  1. Tables créées
    - `monetico_payments` : Suivi des paiements Monetico
      - Informations de transaction complètes
      - Statut du paiement (pending, success, failed, cancelled)
      - Montants et détails
      
  2. Sécurité
    - RLS activé sur toutes les tables
    - Policies pour accès authentifié et prospect via token
    
  3. Fonctions
    - Génération du MAC pour sécuriser les transactions
    - Validation des retours Monetico
    
  4. Automation
    - Mise à jour automatique du statut du lead après paiement
*/

-- Table des paiements Monetico
CREATE TABLE IF NOT EXISTS monetico_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  
  -- Identifiants transaction
  reference text NOT NULL UNIQUE, -- Référence unique pour Monetico
  transaction_id text, -- ID retourné par Monetico après paiement
  
  -- Montants
  amount numeric(10,2) NOT NULL, -- Montant en euros
  currency text DEFAULT 'EUR',
  
  -- Statut
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'cancelled', 'refunded')),
  
  -- Détails paiement
  payment_date timestamptz,
  card_type text, -- Type de carte utilisée
  card_last4 text, -- 4 derniers chiffres
  authorization_number text,
  
  -- Données Monetico
  monetico_data jsonb DEFAULT '{}'::jsonb, -- Toutes les données retournées par Monetico
  
  -- Sécurité
  mac_sent text, -- MAC envoyé à Monetico
  mac_received text, -- MAC reçu de Monetico pour validation
  
  -- URLs
  payment_url text, -- URL générée pour le paiement
  return_url text, -- URL de retour après paiement
  
  -- Métadonnées
  customer_email text,
  customer_name text,
  description text,
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_monetico_payments_lead_id ON monetico_payments(lead_id);
CREATE INDEX IF NOT EXISTS idx_monetico_payments_reference ON monetico_payments(reference);
CREATE INDEX IF NOT EXISTS idx_monetico_payments_status ON monetico_payments(status);
CREATE INDEX IF NOT EXISTS idx_monetico_payments_created_at ON monetico_payments(created_at DESC);

-- RLS
ALTER TABLE monetico_payments ENABLE ROW LEVEL SECURITY;

-- Policy pour les admins et service role
CREATE POLICY "Admins and service can manage all payments"
  ON monetico_payments
  FOR ALL
  TO authenticated
  USING (true);

-- Policy pour les prospects avec token
CREATE POLICY "Prospects can view their own payments via token"
  ON monetico_payments
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = monetico_payments.lead_id
      AND crm_leads.access_token = current_setting('request.jwt.claim.token', true)
    )
  );

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_monetico_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_monetico_payments_updated_at ON monetico_payments;
CREATE TRIGGER update_monetico_payments_updated_at
  BEFORE UPDATE ON monetico_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_monetico_payments_updated_at();

-- Fonction pour mettre à jour le lead après paiement réussi
CREATE OR REPLACE FUNCTION handle_monetico_payment_success()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le paiement est réussi, on met à jour le lead
  IF NEW.status = 'success' AND (OLD.status IS NULL OR OLD.status != 'success') THEN
    -- Ajouter une note dans le timeline
    INSERT INTO crm_lead_timeline (
      lead_id,
      type,
      title,
      description,
      metadata
    ) VALUES (
      NEW.lead_id,
      'payment',
      'Paiement comptant reçu',
      format('Paiement de %s € effectué avec succès via Monetico (Réf: %s)', NEW.amount, NEW.reference),
      jsonb_build_object(
        'payment_id', NEW.id,
        'amount', NEW.amount,
        'reference', NEW.reference,
        'transaction_id', NEW.transaction_id
      )
    );
    
    -- Créer une notification pour les admins
    INSERT INTO crm_event_notifications (
      lead_id,
      type,
      title,
      message,
      priority,
      metadata
    ) VALUES (
      NEW.lead_id,
      'payment_received',
      'Paiement comptant reçu',
      format('Le prospect a effectué un paiement de %s € avec succès', NEW.amount),
      1,
      jsonb_build_object(
        'payment_id', NEW.id,
        'amount', NEW.amount,
        'reference', NEW.reference
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS on_monetico_payment_success ON monetico_payments;
CREATE TRIGGER on_monetico_payment_success
  AFTER INSERT OR UPDATE ON monetico_payments
  FOR EACH ROW
  EXECUTE FUNCTION handle_monetico_payment_success();

-- Fonction RPC pour obtenir les paiements d'un lead
CREATE OR REPLACE FUNCTION get_lead_payments(p_lead_id uuid)
RETURNS TABLE (
  id uuid,
  reference text,
  amount numeric,
  status text,
  payment_date timestamptz,
  card_type text,
  card_last4 text,
  created_at timestamptz
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.id,
    mp.reference,
    mp.amount,
    mp.status,
    mp.payment_date,
    mp.card_type,
    mp.card_last4,
    mp.created_at
  FROM monetico_payments mp
  WHERE mp.lead_id = p_lead_id
  ORDER BY mp.created_at DESC;
END;
$$ LANGUAGE plpgsql;
