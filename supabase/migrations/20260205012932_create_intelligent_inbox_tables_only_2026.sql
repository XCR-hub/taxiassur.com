/*
  # Système Inbox Multicanal Intelligent - Tables

  Création des tables pour l'organisation type Outlook
*/

-- Table des dossiers
CREATE TABLE IF NOT EXISTS inbox_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  folder_type text NOT NULL DEFAULT 'custom',
  parent_folder_id uuid REFERENCES inbox_folders(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  icon text,
  color text,
  position integer DEFAULT 0,
  is_system boolean DEFAULT false,
  is_auto boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table de classification
CREATE TABLE IF NOT EXISTS email_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid REFERENCES email_messages(id) ON DELETE CASCADE,
  classification_type text NOT NULL,
  confidence_score decimal(3,2),
  suggested_action text,
  suggested_lead_id uuid REFERENCES crm_leads(id),
  reason text,
  keywords_matched text[],
  is_reviewed boolean DEFAULT false,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Table des règles
CREATE TABLE IF NOT EXISTS email_classification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rule_type text NOT NULL,
  pattern text NOT NULL,
  classification_type text NOT NULL,
  confidence_weight decimal(3,2) DEFAULT 0.5,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table liaison emails-dossiers
CREATE TABLE IF NOT EXISTS email_folder_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid REFERENCES email_messages(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES inbox_folders(id) ON DELETE CASCADE,
  assigned_by uuid,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(email_id, folder_id)
);

-- Table actions
CREATE TABLE IF NOT EXISTS email_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid REFERENCES email_messages(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  performed_by uuid,
  metadata jsonb,
  performed_at timestamptz DEFAULT now()
);

-- Table threads
CREATE TABLE IF NOT EXISTS email_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  lead_id uuid REFERENCES crm_leads(id) ON DELETE SET NULL,
  first_message_id uuid REFERENCES email_messages(id),
  last_message_id uuid REFERENCES email_messages(id),
  message_count integer DEFAULT 1,
  participants text[],
  is_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table thread_messages
CREATE TABLE IF NOT EXISTS email_thread_messages (
  thread_id uuid REFERENCES email_threads(id) ON DELETE CASCADE,
  email_id uuid REFERENCES email_messages(id) ON DELETE CASCADE,
  position integer,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (thread_id, email_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inbox_folders_parent ON inbox_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_inbox_folders_lead ON inbox_folders(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_classifications_email ON email_classifications(email_id);
CREATE INDEX IF NOT EXISTS idx_email_folder_assignments_email ON email_folder_assignments(email_id);
CREATE INDEX IF NOT EXISTS idx_email_folder_assignments_folder ON email_folder_assignments(folder_id);
CREATE INDEX IF NOT EXISTS idx_email_actions_email ON email_actions(email_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_lead ON email_threads(lead_id);

-- RLS
ALTER TABLE inbox_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_classification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_folder_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_thread_messages ENABLE ROW LEVEL SECURITY;

-- Policies simples
DROP POLICY IF EXISTS "Authenticated can view folders" ON inbox_folders;
CREATE POLICY "Authenticated can view folders" ON inbox_folders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can manage folders" ON inbox_folders;
CREATE POLICY "Authenticated can manage folders" ON inbox_folders FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can view classifications" ON email_classifications;
CREATE POLICY "Authenticated can view classifications" ON email_classifications FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can manage classifications" ON email_classifications;
CREATE POLICY "Authenticated can manage classifications" ON email_classifications FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can view rules" ON email_classification_rules;
CREATE POLICY "Authenticated can view rules" ON email_classification_rules FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can manage rules" ON email_classification_rules;
CREATE POLICY "Authenticated can manage rules" ON email_classification_rules FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can view assignments" ON email_folder_assignments;
CREATE POLICY "Authenticated can view assignments" ON email_folder_assignments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can manage assignments" ON email_folder_assignments;
CREATE POLICY "Authenticated can manage assignments" ON email_folder_assignments FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can view actions" ON email_actions;
CREATE POLICY "Authenticated can view actions" ON email_actions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can create actions" ON email_actions;
CREATE POLICY "Authenticated can create actions" ON email_actions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can view threads" ON email_threads;
CREATE POLICY "Authenticated can view threads" ON email_threads FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can manage threads" ON email_threads;
CREATE POLICY "Authenticated can manage threads" ON email_threads FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can view thread messages" ON email_thread_messages;
CREATE POLICY "Authenticated can view thread messages" ON email_thread_messages FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can manage thread messages" ON email_thread_messages;
CREATE POLICY "Authenticated can manage thread messages" ON email_thread_messages FOR ALL TO authenticated USING (true);
