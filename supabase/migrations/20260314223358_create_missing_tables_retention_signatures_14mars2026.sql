/*
  # Création des tables manquantes : crm_retention_alerts et crm_lead_signatures

  ## Contexte
  Ces deux tables sont référencées dans le code frontend mais n'existent pas en base.
  Cela provoque des erreurs 404 à chaque chargement des composants CRMKillerDashboard
  et CRMProductionManager.

  ## Nouvelles tables

  ### crm_retention_alerts
  - Stocke les alertes de rétention client (risque churn, inactivité, etc.)
  - Liée à crm_leads
  - Champs : type d'alerte, sévérité, message, statut résolu

  ### crm_lead_signatures
  - Stocke le suivi des signatures électroniques envoyées aux leads/clients
  - Liée à crm_leads
  - Champs : nom du document, date d'envoi, statut (pending/opened/signed)

  ## Sécurité
  - RLS activé sur les deux tables
  - Accès réservé aux utilisateurs authentifiés
*/

-- ============================================================
-- TABLE : crm_retention_alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_retention_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  alert_type text NOT NULL DEFAULT 'churn_risk',
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL DEFAULT '',
  message text,
  trigger_date timestamptz DEFAULT now(),
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT crm_retention_alerts_alert_type_check
    CHECK (alert_type IN ('churn_risk', 'renewal_due', 'inactivity', 'payment_late', 'premium_increase')),
  CONSTRAINT crm_retention_alerts_severity_check
    CHECK (severity IN ('low', 'medium', 'high', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_crm_retention_alerts_lead_id ON crm_retention_alerts(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_retention_alerts_alert_type ON crm_retention_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_crm_retention_alerts_resolved ON crm_retention_alerts(resolved);

ALTER TABLE crm_retention_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view retention alerts"
  ON crm_retention_alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert retention alerts"
  ON crm_retention_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update retention alerts"
  ON crm_retention_alerts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete retention alerts"
  ON crm_retention_alerts FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- TABLE : crm_lead_signatures
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_lead_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  document_name text NOT NULL DEFAULT '',
  document_type text DEFAULT 'contract',
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  signed_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  signature_provider text DEFAULT 'yousign',
  external_reference text,
  document_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT crm_lead_signatures_status_check
    CHECK (status IN ('pending', 'sent', 'opened', 'signed', 'refused', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_crm_lead_signatures_lead_id ON crm_lead_signatures(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_signatures_status ON crm_lead_signatures(status);

ALTER TABLE crm_lead_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view signatures"
  ON crm_lead_signatures FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert signatures"
  ON crm_lead_signatures FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update signatures"
  ON crm_lead_signatures FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete signatures"
  ON crm_lead_signatures FOR DELETE
  TO authenticated
  USING (true);
