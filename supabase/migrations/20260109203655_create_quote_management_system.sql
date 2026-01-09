/*
  # Système de Gestion des Devis CRM

  1. Modifications Tables
    - Ajouter type 'devis' à crm_lead_documents
    - Créer table crm_quote_history pour historique des envois
    - Créer table crm_quote_templates pour templates adaptés

  2. Templates par Statut
    - Templates email/SMS/WhatsApp selon statut du lead
    - Variables dynamiques (nom, prénom, ville, etc.)

  3. Sécurité
    - RLS activé sur toutes les tables
    - Accès admin uniquement

  4. Automatisation
    - Fonction pour tracker les envois
    - Trigger pour mise à jour statut lead après envoi devis
*/

-- Ajouter le type 'devis' aux documents existants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'crm_lead_documents_document_type_check'
  ) THEN
    ALTER TABLE crm_lead_documents
    DROP CONSTRAINT IF EXISTS crm_lead_documents_document_type_check;
  END IF;
END $$;

ALTER TABLE crm_lead_documents
DROP CONSTRAINT IF EXISTS crm_lead_documents_document_type_check;

ALTER TABLE crm_lead_documents
ADD CONSTRAINT crm_lead_documents_document_type_check
CHECK (document_type IN (
  'carte_grise',
  'permis_conduire',
  'licence_taxi',
  'carte_identite',
  'rib',
  'contrat_signe',
  'autorisation_stationnement',
  'devis',
  'autre'
));

-- Table historique des envois de devis
CREATE TABLE IF NOT EXISTS crm_quote_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  document_id uuid REFERENCES crm_lead_documents(id) ON DELETE SET NULL,
  template_id uuid,
  sent_via text NOT NULL CHECK (sent_via IN ('email', 'sms', 'whatsapp')),
  sent_to text NOT NULL,
  subject text,
  body text,
  lead_status_at_send text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz,
  downloaded_at timestamptz,
  replied_at timestamptz,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'downloaded', 'replied', 'failed')),
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_quote_history_lead_id ON crm_quote_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_quote_history_status ON crm_quote_history(status);
CREATE INDEX IF NOT EXISTS idx_crm_quote_history_sent_at ON crm_quote_history(sent_at DESC);

-- Table templates de devis par statut
CREATE TABLE IF NOT EXISTS crm_quote_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  applicable_status text[] NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'all')),
  subject_template text,
  body_template text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  tone text DEFAULT 'professional' CHECK (tone IN ('professional', 'friendly', 'urgent', 'formal')),
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  success_rate numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_crm_quote_templates_active ON crm_quote_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_crm_quote_templates_channel ON crm_quote_templates(channel);

-- RLS
ALTER TABLE crm_quote_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_quote_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access crm_quote_history"
  ON crm_quote_history
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin full access crm_quote_templates"
  ON crm_quote_templates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fonction pour mettre à jour le statut du lead après envoi devis
CREATE OR REPLACE FUNCTION update_lead_after_quote_sent()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE crm_leads
  SET
    status = 'QUOTE_SENT',
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{last_quote_sent_at}',
      to_jsonb(now())
    ),
    updated_at = now()
  WHERE id = NEW.lead_id
    AND status = 'READY_FOR_QUOTE';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_lead_after_quote_sent ON crm_quote_history;
CREATE TRIGGER trigger_update_lead_after_quote_sent
  AFTER INSERT ON crm_quote_history
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_after_quote_sent();

-- Fonction pour incrémenter le compteur d'utilisation des templates
CREATE OR REPLACE FUNCTION increment_quote_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    UPDATE crm_quote_templates
    SET
      usage_count = usage_count + 1,
      updated_at = now()
    WHERE id = NEW.template_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_increment_quote_template_usage ON crm_quote_history;
CREATE TRIGGER trigger_increment_quote_template_usage
  AFTER INSERT ON crm_quote_history
  FOR EACH ROW
  EXECUTE FUNCTION increment_quote_template_usage();

-- Insérer des templates par défaut
INSERT INTO crm_quote_templates (name, description, applicable_status, channel, subject_template, body_template, variables, tone, priority) VALUES

('Premier Contact - Nouveau Lead', 'Template pour l''envoi d''un premier devis à un nouveau lead',
ARRAY['NEW_LEAD', 'CONTACT_ATTEMPTED'], 'email',
'Votre devis assurance taxi - {{first_name}} {{last_name}}',
'<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><div style="max-width: 600px; margin: 0 auto; padding: 20px;"><h2 style="color: #f59e0b;">Bonjour {{first_name}},</h2><p>Merci pour votre demande d''assurance taxi !</p><p>Nous avons le plaisir de vous transmettre votre devis personnalisé en pièce jointe.</p><div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0;"><strong>📋 Votre devis comprend :</strong></p><ul style="margin: 10px 0;"><li>RC Professionnelle</li><li>Tous risques</li><li>Assistance 24h/24</li><li>Protection juridique</li></ul></div><p><strong>👉 Prochaines étapes :</strong></p><ol><li>Consultez votre devis</li><li>Si vous avez des questions, répondez simplement à cet email</li><li>Une fois validé, nous vous enverrons le contrat à signer</li></ol><p>Je reste à votre disposition pour toute question.</p><p style="margin-top: 30px;">Cordialement,<br><strong>L''équipe TaxiAssur</strong><br>📞 01 80 85 57 86<br>📧 contact@taxiassur.com</p></div></body></html>',
'["first_name", "last_name", "email", "phone", "city"]'::jsonb,
'friendly', 1),

('Devis Suite Contact - Confirmé', 'Template après un contact confirmé avec le prospect',
ARRAY['CONTACT_CONFIRMED', 'DOCUMENTS_REQUIRED'], 'email',
'Suite à notre échange - Votre devis TaxiAssur',
'<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><div style="max-width: 600px; margin: 0 auto; padding: 20px;"><h2 style="color: #f59e0b;">Bonjour {{first_name}},</h2><p>Suite à notre échange téléphonique, je vous transmets comme convenu votre devis personnalisé.</p><div style="background: #dcfce7; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0;"><strong>✅ Points abordés lors de notre échange :</strong></p><ul style="margin: 10px 0;"><li>Garanties adaptées à votre activité</li><li>Tarif compétitif</li><li>Prise en charge rapide</li></ul></div><p>Le devis est valable 30 jours. Pour finaliser votre souscription, nous aurons besoin de :</p><ul><li>📄 Copie de la carte grise</li><li>🪪 Copie du permis de conduire</li><li>🚕 Copie de la licence taxi</li><li>💳 RIB</li></ul><p><strong>N''hésitez pas à me contacter directement si vous avez la moindre question !</strong></p><p style="margin-top: 30px;">Bien cordialement,<br><strong>L''équipe TaxiAssur</strong><br>📞 01 80 85 57 86<br>📧 contact@taxiassur.com</p></div></body></html>',
'["first_name", "last_name", "email", "phone", "city"]'::jsonb,
'professional', 2),

('Relance Devis - Sans Réponse', 'Template de relance si pas de réponse',
ARRAY['NO_RESPONSE', 'RELANCE_ACTIVE'], 'email',
'Relance : Votre devis assurance taxi',
'<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><div style="max-width: 600px; margin: 0 auto; padding: 20px;"><h2 style="color: #f59e0b;">Bonjour {{first_name}},</h2><p>Je me permets de revenir vers vous concernant le devis que je vous ai transmis.</p><div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;"><p style="margin: 0;"><strong>⏰ Votre devis expire bientôt !</strong></p><p style="margin: 10px 0 0 0;">Pour bénéficier de ce tarif, nous devons finaliser avant la fin du mois.</p></div><p><strong>Avez-vous eu l''occasion de le consulter ?</strong></p><p>Si vous avez des questions, je suis là pour vous accompagner.</p><p>💡 <strong>Rappel de vos avantages :</strong></p><ul><li>✅ Garanties complètes</li><li>✅ Prix compétitif</li><li>✅ Souscription rapide (48h)</li><li>✅ Service client dédié</li></ul><p>Répondez simplement à cet email ou appelez-moi !</p><p style="margin-top: 30px;">Bien à vous,<br><strong>L''équipe TaxiAssur</strong><br>📞 01 80 85 57 86<br>📧 contact@taxiassur.com</p></div></body></html>',
'["first_name", "last_name", "email", "phone"]'::jsonb,
'urgent', 3),

('SMS - Premier Devis', 'SMS court pour envoi du premier devis',
ARRAY['NEW_LEAD', 'CONTACT_ATTEMPTED', 'CONTACT_CONFIRMED'], 'sms',
NULL,
'Bonjour {{first_name}}, votre devis assurance taxi TaxiAssur est prêt ! Consultez votre email ou appelez-nous au 01 80 85 57 86. Équipe TaxiAssur',
'["first_name"]'::jsonb,
'friendly', 1),

('SMS - Relance Devis', 'SMS de relance pour devis sans réponse',
ARRAY['NO_RESPONSE', 'RELANCE_ACTIVE'], 'sms',
NULL,
'Bonjour {{first_name}}, votre devis TaxiAssur expire bientôt ! Des questions ? Appelez-nous au 01 80 85 57 86. Équipe TaxiAssur',
'["first_name"]'::jsonb,
'urgent', 2),

('WhatsApp - Premier Devis', 'Message WhatsApp pour envoi du premier devis',
ARRAY['NEW_LEAD', 'CONTACT_ATTEMPTED', 'CONTACT_CONFIRMED'], 'whatsapp',
NULL,
'👋 Bonjour {{first_name}} !

Votre devis assurance taxi est prêt ! 📋

✅ RC Pro + Tous risques
✅ Assistance 24h/24
✅ Prix compétitif

📧 Consultez votre email pour le devis complet

Des questions ? Répondez à ce message ou appelez : 📞 01 80 85 57 86

L''équipe TaxiAssur 🚕',
'["first_name"]'::jsonb,
'friendly', 1),

('WhatsApp - Relance Devis', 'Message WhatsApp de relance',
ARRAY['NO_RESPONSE', 'RELANCE_ACTIVE'], 'whatsapp',
NULL,
'👋 Bonjour {{first_name}},

Je reviens vers vous concernant votre devis TaxiAssur.

⏰ Il expire bientôt !

Avez-vous eu l''occasion de le consulter ?

💡 Besoin d''ajustements ?

Répondez ou appelez : 📞 01 80 85 57 86

L''équipe TaxiAssur 🚕',
'["first_name"]'::jsonb,
'urgent', 2)

ON CONFLICT DO NOTHING;
