/*
  # Système Collaboration Temps Réel

  1. Tables
    - collaboration_documents - Documents collaboratifs
    - collaboration_comments - Commentaires et annotations
    - collaboration_sessions - Sessions actives
    - collaboration_presence - Présence utilisateurs

  2. Features
    - Editing collaboratif temps réel
    - Comments threading
    - @mentions
    - Activity feed
    - Conflict resolution
*/

CREATE TABLE IF NOT EXISTS collaboration_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content jsonb NOT NULL,
  document_type text NOT NULL, -- email_template, landing_page, contract
  owner_id uuid REFERENCES auth.users(id),
  version int DEFAULT 1,
  is_locked boolean DEFAULT false,
  locked_by uuid REFERENCES auth.users(id),
  locked_at timestamptz,
  permissions jsonb DEFAULT '{"public_read":false,"public_write":false}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collaboration_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES collaboration_documents(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES collaboration_comments(id),
  user_id uuid REFERENCES auth.users(id),
  content text NOT NULL,
  position jsonb, -- Position dans le document
  mentions uuid[], -- User IDs mentionnés
  is_resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collaboration_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES collaboration_documents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  session_start timestamptz DEFAULT now(),
  session_end timestamptz,
  edits_count int DEFAULT 0,
  last_activity_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collaboration_presence (
  user_id uuid REFERENCES auth.users(id) PRIMARY KEY,
  document_id uuid REFERENCES collaboration_documents(id),
  cursor_position jsonb,
  status text DEFAULT 'active', -- active, idle, away
  last_seen_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_collab_docs_owner ON collaboration_documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_collab_comments_doc ON collaboration_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_collab_comments_user ON collaboration_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_collab_sessions_doc ON collaboration_sessions(document_id);
CREATE INDEX IF NOT EXISTS idx_collab_presence_doc ON collaboration_presence(document_id);

-- RLS
ALTER TABLE collaboration_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own docs" ON collaboration_documents FOR SELECT TO authenticated USING (owner_id = auth.uid() OR (permissions->>'public_read')::boolean = true);
CREATE POLICY "Users create docs" ON collaboration_documents FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners update docs" ON collaboration_documents FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users view comments on accessible docs" ON collaboration_comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM collaboration_documents WHERE collaboration_documents.id = collaboration_comments.document_id AND (collaboration_documents.owner_id = auth.uid() OR (collaboration_documents.permissions->>'public_read')::boolean = true)));
CREATE POLICY "Users create comments" ON collaboration_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own sessions" ON collaboration_sessions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Everyone view presence" ON collaboration_presence FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own presence" ON collaboration_presence FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
