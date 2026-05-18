/*
  # SMS Conversations System - Full bidirectional SMS management

  1. New Tables
    - `sms_conversations` - Thread-based SMS conversations linked to leads
      - `id` (uuid, primary key)
      - `lead_id` (uuid, FK to crm_leads)
      - `phone_number` (text) - The external phone number
      - `our_number` (text) - Our TaxiAssur number (07 44 41 05 98)
      - `last_message_at` (timestamptz)
      - `unread_count` (integer, default 0)
      - `status` (text) - active, archived
      - `assigned_to` (uuid) - Commercial assigned
      - `created_at` (timestamptz)

    - `sms_messages` - Individual messages within a conversation
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, FK to sms_conversations)
      - `lead_id` (uuid, FK to crm_leads)
      - `direction` (text) - inbound, outbound
      - `from_number` (text)
      - `to_number` (text)
      - `content` (text)
      - `status` (text) - sent, delivered, failed, received
      - `provider_message_id` (text)
      - `ai_analysis` (jsonb) - AI interpretation of intent
      - `ai_suggested_reply` (text) - AI drafted response
      - `is_automated` (boolean) - Was this sent by automation
      - `workflow_trigger` (text) - Which workflow triggered this
      - `created_at` (timestamptz)
      - `delivered_at` (timestamptz)

    - `sms_workflow_rules` - Automated SMS triggers at pipeline stages
      - `id` (uuid, primary key)
      - `name` (text)
      - `trigger_type` (text) - stage_change, time_based, inbound_sms, event
      - `trigger_config` (jsonb) - Conditions
      - `message_template` (text) - With {{variables}}
      - `delay_minutes` (integer) - Delay before sending
      - `is_active` (boolean)
      - `priority` (integer)
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on all tables
    - Only authenticated admin users can access

  3. Important Notes
    - Our number: 07 44 41 05 98 (formatted +33744410598)
    - Uses Brevo SMS API for sending and receiving
    - AI analysis via OpenAI for intent detection
*/

-- SMS Conversations
CREATE TABLE IF NOT EXISTS sms_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE SET NULL,
  phone_number text NOT NULL,
  our_number text NOT NULL DEFAULT '+33744410598',
  last_message_at timestamptz DEFAULT now(),
  unread_count integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  assigned_to uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sms_conversations"
  ON sms_conversations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "Authenticated users can insert sms_conversations"
  ON sms_conversations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "Authenticated users can update sms_conversations"
  ON sms_conversations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "Authenticated users can delete sms_conversations"
  ON sms_conversations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

-- SMS Messages
CREATE TABLE IF NOT EXISTS sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES sms_conversations(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES crm_leads(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number text NOT NULL,
  to_number text NOT NULL,
  content text NOT NULL,
  status text DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'received')),
  provider_message_id text,
  ai_analysis jsonb,
  ai_suggested_reply text,
  is_automated boolean DEFAULT false,
  workflow_trigger text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  delivered_at timestamptz
);

ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sms_messages"
  ON sms_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "Authenticated users can insert sms_messages"
  ON sms_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "Authenticated users can update sms_messages"
  ON sms_messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

-- SMS Workflow Rules
CREATE TABLE IF NOT EXISTS sms_workflow_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL CHECK (trigger_type IN ('stage_change', 'time_based', 'inbound_sms', 'event', 'no_response')),
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  message_template text NOT NULL,
  delay_minutes integer DEFAULT 0,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 5,
  send_window_start integer DEFAULT 8,
  send_window_end integer DEFAULT 20,
  max_per_lead_per_day integer DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sms_workflow_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage sms_workflow_rules"
  ON sms_workflow_rules FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "Authenticated users can insert sms_workflow_rules"
  ON sms_workflow_rules FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "Authenticated users can update sms_workflow_rules"
  ON sms_workflow_rules FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sms_conversations_lead_id ON sms_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_sms_conversations_phone ON sms_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_conversations_status ON sms_conversations(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sms_messages_conversation_id ON sms_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_lead_id ON sms_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_direction ON sms_messages(direction, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at DESC);

-- Function to get or create conversation for a phone number
CREATE OR REPLACE FUNCTION get_or_create_sms_conversation(
  p_phone_number text,
  p_lead_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
  v_normalized_phone text;
BEGIN
  v_normalized_phone := regexp_replace(p_phone_number, '[\s\-\.]', '', 'g');
  IF v_normalized_phone LIKE '0%' THEN
    v_normalized_phone := '+33' || substring(v_normalized_phone from 2);
  END IF;
  IF v_normalized_phone NOT LIKE '+%' THEN
    v_normalized_phone := '+' || v_normalized_phone;
  END IF;

  SELECT id INTO v_conversation_id
  FROM sms_conversations
  WHERE phone_number = v_normalized_phone AND status = 'active'
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    INSERT INTO sms_conversations (phone_number, lead_id)
    VALUES (v_normalized_phone, p_lead_id)
    RETURNING id INTO v_conversation_id;
  ELSIF p_lead_id IS NOT NULL THEN
    UPDATE sms_conversations SET lead_id = p_lead_id WHERE id = v_conversation_id AND lead_id IS NULL;
  END IF;

  RETURN v_conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_sms_conversation(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_sms_conversation(text, uuid) TO service_role;

-- Insert default workflow rules for key commercial moments
INSERT INTO sms_workflow_rules (name, description, trigger_type, trigger_config, message_template, delay_minutes, priority) VALUES
(
  'Bienvenue nouveau lead',
  'SMS automatique 2min apres reception d''un nouveau lead',
  'stage_change',
  '{"from_stage": null, "to_stage": "nouveau_lead"}'::jsonb,
  'Bonjour {{first_name}}, merci pour votre demande de devis assurance taxi ! Un conseiller vous contactera dans les prochaines minutes. TaxiAssur - 01 76 41 05 98',
  2,
  10
),
(
  'Relance documents manquants J+1',
  'SMS de relance 24h apres si documents non recus',
  'no_response',
  '{"condition": "missing_documents", "hours_since_last_contact": 24}'::jsonb,
  'Bonjour {{first_name}}, pour finaliser votre devis taxi, merci de deposer vos documents ici : {{prospect_url}} Besoin d''aide ? Repondez a ce SMS ! TaxiAssur',
  1440,
  7
),
(
  'Devis prets notification',
  'SMS quand les devis sont prets a consulter',
  'stage_change',
  '{"from_stage": "collecte_documents", "to_stage": "saisie_devis"}'::jsonb,
  'Bonne nouvelle {{first_name}} ! Vos devis assurance taxi sont prets. Consultez-les : {{prospect_url}} Des questions ? Repondez ici ! TaxiAssur',
  0,
  10
),
(
  'Relance devis non consultes J+2',
  'SMS si devis non consultes apres 48h',
  'no_response',
  '{"condition": "quotes_not_viewed", "hours_since_last_contact": 48}'::jsonb,
  '{{first_name}}, vos devis taxi expirent bientot ! Consultez-les avant qu''il ne soit trop tard : {{prospect_url}} TaxiAssur',
  2880,
  6
),
(
  'Confirmation paiement recu',
  'SMS de confirmation apres paiement',
  'event',
  '{"event": "payment_received"}'::jsonb,
  '{{first_name}}, votre paiement de {{amount}}EUR est bien recu ! Votre contrat sera actif sous 24h. Merci de votre confiance ! TaxiAssur',
  0,
  10
),
(
  'Rappel signature contrat',
  'SMS rappel pour signer le contrat',
  'stage_change',
  '{"from_stage": "saisie_devis", "to_stage": "signature_contrat"}'::jsonb,
  '{{first_name}}, votre contrat d''assurance taxi est pret a signer ! Signez en ligne : {{prospect_url}} Pour toute question repondez ici. TaxiAssur',
  5,
  9
),
(
  'Reponse intelligente entrant',
  'Analyse IA et suggestion de reponse pour les SMS entrants',
  'inbound_sms',
  '{"auto_reply": false, "ai_analyze": true}'::jsonb,
  '',
  0,
  10
),
(
  'Relance lead inactif J+7',
  'SMS de relance apres 7 jours sans activite',
  'no_response',
  '{"condition": "no_activity", "hours_since_last_contact": 168}'::jsonb,
  '{{first_name}}, votre devis assurance taxi est toujours disponible ! Tarifs a partir de 89EUR/mois. Repondez OUI pour etre rappele. TaxiAssur',
  10080,
  4
)
ON CONFLICT DO NOTHING;
