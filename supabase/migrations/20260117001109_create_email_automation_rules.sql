/*
  # Système de règles d'automatisation pour les emails

  1. Nouvelles tables
    - `email_automation_rules`
      - `id` (uuid, primary key)
      - `name` (text) - Nom de la règle
      - `condition_field` (text) - Champ à vérifier (subject, from_email, body, etc.)
      - `condition_operator` (text) - Opérateur (contains, equals, starts_with, etc.)
      - `condition_value` (text) - Valeur à comparer
      - `action_type` (text) - Type d'action (link_to_lead, create_lead, archive, mark_spam, etc.)
      - `action_value` (text) - Valeur de l'action (lead_id, tag, etc.)
      - `priority` (integer) - Priorité d'exécution (1 = haute priorité)
      - `enabled` (boolean) - Règle activée ou non
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Sécurité
    - Enable RLS on `email_automation_rules` table
    - Add policies for authenticated admins to manage rules
*/

-- Table des règles d'automatisation
CREATE TABLE IF NOT EXISTS email_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  condition_field text NOT NULL,
  condition_operator text NOT NULL,
  condition_value text NOT NULL,
  action_type text NOT NULL,
  action_value text,
  priority integer DEFAULT 10,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_automation_rules ENABLE ROW LEVEL SECURITY;

-- Policies: Seuls les admins authentifiés peuvent gérer les règles
CREATE POLICY "Admins can view rules"
  ON email_automation_rules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert rules"
  ON email_automation_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can update rules"
  ON email_automation_rules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete rules"
  ON email_automation_rules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_email_automation_rules_enabled ON email_automation_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_email_automation_rules_priority ON email_automation_rules(priority);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_email_automation_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS trigger_update_email_automation_rules_updated_at ON email_automation_rules;
CREATE TRIGGER trigger_update_email_automation_rules_updated_at
  BEFORE UPDATE ON email_automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_email_automation_rules_updated_at();

-- Insérer quelques règles d'exemple
INSERT INTO email_automation_rules (name, description, condition_field, condition_operator, condition_value, action_type, action_value, priority, enabled) VALUES
  ('Devis automatique', 'Emails contenant "devis" sont marqués haute priorité', 'subject', 'contains', 'devis', 'set_priority', '9', 1, true),
  ('Leads urgents', 'Emails contenant "urgent" sont notifiés immédiatement', 'body', 'contains', 'urgent', 'notify_admin', 'urgent', 2, true),
  ('Spam marketing', 'Emails de marketing sont archivés', 'from_email', 'contains', 'marketing@', 'archive', '', 5, false)
ON CONFLICT DO NOTHING;
