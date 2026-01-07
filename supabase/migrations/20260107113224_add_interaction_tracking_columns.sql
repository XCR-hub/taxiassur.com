/*
  # Ajout des colonnes de tracking pour les interactions CRM

  1. Nouvelles colonnes
    - `brevo_message_id` - ID du message Brevo pour tracking emails
    - `opened_at` - Date d'ouverture de l'email
    - `clicked_at` - Date de clic dans l'email  
    - `twilio_message_sid` - SID du message Twilio pour SMS/WhatsApp
    - `wa_message_sid` - SID du message WhatsApp
    - `response_time_minutes` - Temps de réponse en minutes
    - `channel` - Canal de communication (email, sms, whatsapp, phone, note)

  2. Modifications
    - Ajouter des index pour améliorer les performances des requêtes
*/

-- Ajouter les colonnes de tracking
ALTER TABLE crm_interactions
ADD COLUMN IF NOT EXISTS brevo_message_id text,
ADD COLUMN IF NOT EXISTS opened_at timestamptz,
ADD COLUMN IF NOT EXISTS clicked_at timestamptz,
ADD COLUMN IF NOT EXISTS twilio_message_sid text,
ADD COLUMN IF NOT EXISTS wa_message_sid text,
ADD COLUMN IF NOT EXISTS response_time_minutes integer,
ADD COLUMN IF NOT EXISTS channel text DEFAULT 'email';

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_crm_interactions_brevo_message_id ON crm_interactions(brevo_message_id) WHERE brevo_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_interactions_twilio_sid ON crm_interactions(twilio_message_sid) WHERE twilio_message_sid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_interactions_wa_sid ON crm_interactions(wa_message_sid) WHERE wa_message_sid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_interactions_channel ON crm_interactions(channel);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_opened_at ON crm_interactions(opened_at) WHERE opened_at IS NOT NULL;

-- Commenter les colonnes
COMMENT ON COLUMN crm_interactions.brevo_message_id IS 'ID du message Brevo pour tracking des emails';
COMMENT ON COLUMN crm_interactions.opened_at IS 'Date et heure d''ouverture de l''email';
COMMENT ON COLUMN crm_interactions.clicked_at IS 'Date et heure du clic dans l''email';
COMMENT ON COLUMN crm_interactions.twilio_message_sid IS 'SID Twilio pour SMS';
COMMENT ON COLUMN crm_interactions.wa_message_sid IS 'SID Twilio pour WhatsApp';
COMMENT ON COLUMN crm_interactions.response_time_minutes IS 'Temps de réponse en minutes depuis la dernière interaction';
COMMENT ON COLUMN crm_interactions.channel IS 'Canal de communication: email, sms, whatsapp, phone, note';