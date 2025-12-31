/*
  # Système WhatsApp CRM - Version corrigée

  Tables pour gérer WhatsApp via Twilio avec CRM complet
*/

-- Contacts WhatsApp
CREATE TABLE IF NOT EXISTS wa_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text UNIQUE NOT NULL,
  display_name text,
  opted_out boolean DEFAULT false,
  last_interaction timestamptz,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Conversations
CREATE TABLE IF NOT EXISTS wa_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES wa_contacts(id) ON DELETE CASCADE NOT NULL,
  assigned_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  last_message_at timestamptz,
  unread_count integer DEFAULT 0,
  tags text[] DEFAULT ARRAY[]::text[],
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Messages
CREATE TABLE IF NOT EXISTS wa_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES wa_conversations(id) ON DELETE CASCADE NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body text,
  media_url text,
  media_content_type text,
  media_size integer,
  message_sid text UNIQUE,
  status text DEFAULT 'received' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'received')),
  error_code text,
  error_message text,
  sent_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Templates
CREATE TABLE IF NOT EXISTS wa_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  language text DEFAULT 'fr',
  body text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  approved boolean DEFAULT false,
  category text DEFAULT 'general',
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Webhooks log
CREATE TABLE IF NOT EXISTS wa_webhooks_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type text NOT NULL,
  message_sid text,
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  error text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wa_contacts_phone ON wa_contacts(phone_e164);
CREATE INDEX IF NOT EXISTS idx_wa_contacts_lead ON wa_contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_contact ON wa_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_assigned ON wa_conversations(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_last_msg ON wa_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_conversation ON wa_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_sid ON wa_messages(message_sid);
CREATE INDEX IF NOT EXISTS idx_wa_webhooks_processed ON wa_webhooks_log(processed, created_at);

-- RLS
ALTER TABLE wa_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_webhooks_log ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Auth view contacts" ON wa_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage contacts" ON wa_contacts FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth view conversations" ON wa_conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage conversations" ON wa_conversations FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth view messages" ON wa_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth send messages" ON wa_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update messages" ON wa_messages FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth view templates" ON wa_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage templates" ON wa_templates FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth view webhooks" ON wa_webhooks_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert webhooks" ON wa_webhooks_log FOR INSERT TO authenticated WITH CHECK (true);

-- Function: Upsert contact + conversation
CREATE OR REPLACE FUNCTION upsert_wa_contact_conversation(
  p_phone text,
  p_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contact_id uuid;
  v_conv_id uuid;
BEGIN
  INSERT INTO wa_contacts (phone_e164, display_name)
  VALUES (p_phone, COALESCE(p_name, p_phone))
  ON CONFLICT (phone_e164) DO UPDATE
  SET display_name = COALESCE(EXCLUDED.display_name, wa_contacts.display_name),
      updated_at = now()
  RETURNING id INTO v_contact_id;
  
  SELECT id INTO v_conv_id
  FROM wa_conversations
  WHERE contact_id = v_contact_id
  AND status != 'archived'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_conv_id IS NULL THEN
    INSERT INTO wa_conversations (contact_id, status)
    VALUES (v_contact_id, 'open')
    RETURNING id INTO v_conv_id;
  END IF;
  
  RETURN v_conv_id;
END;
$$;

-- Trigger: Update conversation
CREATE OR REPLACE FUNCTION update_wa_conv_on_msg()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE wa_conversations
  SET 
    last_message_at = NEW.created_at,
    unread_count = CASE WHEN NEW.direction = 'inbound' THEN unread_count + 1 ELSE unread_count END,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  
  UPDATE wa_contacts
  SET last_interaction = NEW.created_at, updated_at = now()
  WHERE id = (SELECT contact_id FROM wa_conversations WHERE id = NEW.conversation_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_wa_conv ON wa_messages;
CREATE TRIGGER trg_update_wa_conv
  AFTER INSERT ON wa_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_wa_conv_on_msg();

-- Templates par défaut
INSERT INTO wa_templates (name, language, body, variables, category, approved) VALUES
('wa_bienvenue', 'fr', 'Bonjour {{prenom}} 👋 Merci pour votre demande chez TaxiAssur ! Un conseiller vous contactera sous 24h.', '["prenom"]'::jsonb, 'welcome', true),
('wa_pieces', 'fr', 'Bonjour {{prenom}}, pour finaliser : {{liste_pieces}}. Envoyez-les ici sur WhatsApp 📄', '["prenom", "liste_pieces"]'::jsonb, 'documents', true),
('wa_devis', 'fr', '🎉 {{prenom}}, votre devis est prêt : {{montant}}€/mois. Lien : {{lien}}', '["prenom", "montant", "lien"]'::jsonb, 'quote', true),
('wa_rdv', 'fr', '📅 Rappel RDV avec {{conseiller}} le {{date}} à {{heure}}.', '["conseiller", "date", "heure"]'::jsonb, 'reminder', true),
('wa_confirm', 'fr', 'Félicitations {{prenom}} ! 🎊 Votre assurance taxi est activée. Documents par email sous 24h.', '["prenom"]'::jsonb, 'confirmation', true),
('wa_relance', 'fr', 'Bonjour {{prenom}}, votre demande de devis est toujours valable ? Répondez OUI 🚕', '["prenom"]'::jsonb, 'followup', true)
ON CONFLICT (name) DO NOTHING;
