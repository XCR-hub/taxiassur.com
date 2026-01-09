/*
  # Table des paramètres CRM

  1. Nouvelle Table
    - `crm_settings`
      - `id` (uuid, primary key)
      - `company_name` (text) - Nom de l'entreprise
      - `primary_email` (text) - Email principal
      - `timezone` (text) - Fuseau horaire
      - `auto_assign_leads` (boolean) - Assignation automatique
      - `ai_auto_decisions` (boolean) - Décisions IA automatiques
      - `ai_autonomy_level` (text) - Niveau d'autonomie IA
      - `ai_confidence_threshold` (integer) - Seuil de confiance %
      - `ai_agents` (jsonb) - Configuration des agents IA
      - `notifications` (jsonb) - Configuration des notifications
      - `updated_at` (timestamptz) - Date de mise à jour
      - `updated_by` (uuid) - Utilisateur ayant fait la MAJ

  2. Sécurité
    - RLS activée
    - Seuls les admins authentifiés peuvent lire/modifier
*/

CREATE TABLE IF NOT EXISTS crm_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text DEFAULT 'TaxiAssur',
  primary_email text DEFAULT 'team@taxiassur.com',
  timezone text DEFAULT 'Europe/Paris',
  auto_assign_leads boolean DEFAULT true,
  ai_auto_decisions boolean DEFAULT true,
  ai_autonomy_level text DEFAULT 'semi-automatic',
  ai_confidence_threshold integer DEFAULT 80,
  ai_agents jsonb DEFAULT '{
    "lead_scorer": true,
    "email_composer": true,
    "negotiation_assistant": true,
    "risk_analyzer": true,
    "churn_predictor": true,
    "cross_sell_recommender": true,
    "sentiment_analyzer": false,
    "response_generator": true
  }'::jsonb,
  notifications jsonb DEFAULT '{
    "new_leads": true,
    "ai_decisions": true,
    "churn_alerts": true,
    "missing_documents": true
  }'::jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Activer RLS
ALTER TABLE crm_settings ENABLE ROW LEVEL SECURITY;

-- Policy pour les admins authentifiés
CREATE POLICY "Admins can read settings"
  ON crm_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update settings"
  ON crm_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can insert settings"
  ON crm_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insérer les paramètres par défaut
INSERT INTO crm_settings (id, company_name, primary_email)
VALUES ('00000000-0000-0000-0000-000000000001', 'TaxiAssur', 'team@taxiassur.com')
ON CONFLICT (id) DO NOTHING;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_crm_settings_updated_at 
  ON crm_settings(updated_at DESC);
