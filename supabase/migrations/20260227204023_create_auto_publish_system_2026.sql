/*
  # Système de publication automatique de code

  1. Nouvelles Tables
    - `code_publish_queue` - File d'attente des modifications de code à publier
    - `code_publish_history` - Historique des publications
    - `git_repository_config` - Configuration du repository Git

  2. Fonctionnalités
    - IA écrit du code React (nouvelles pages, modifications)
    - Système commit automatique vers Git
    - Trigger rebuild Bolt.new
    - Gestion des conflits intelligente

  3. Sécurité
    - RLS activé sur toutes les tables
    - Seuls les services peuvent publier
    - Logs détaillés de toutes les modifications
*/

-- Table de configuration Git
CREATE TABLE IF NOT EXISTS git_repository_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_url text NOT NULL,
  branch_name text NOT NULL DEFAULT 'main',
  github_token_encrypted text,
  auto_commit_enabled boolean DEFAULT true,
  auto_deploy_enabled boolean DEFAULT true,
  commit_message_prefix text DEFAULT '[IA SEO]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE git_repository_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for git config"
  ON git_repository_config
  FOR ALL
  USING (auth.role() = 'service_role');

-- Table de file d'attente des modifications de code
CREATE TABLE IF NOT EXISTS code_publish_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path text NOT NULL,
  file_content text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  commit_message text NOT NULL,
  priority integer DEFAULT 5,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'published', 'failed', 'cancelled')),
  triggered_by text NOT NULL,
  metadata jsonb DEFAULT '{}',
  error_message text,
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  scheduled_for timestamptz DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE code_publish_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage publish queue"
  ON code_publish_queue
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated can view publish queue"
  ON code_publish_queue
  FOR SELECT
  TO authenticated
  USING (true);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_code_publish_queue_status ON code_publish_queue(status);
CREATE INDEX IF NOT EXISTS idx_code_publish_queue_priority ON code_publish_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_code_publish_queue_scheduled ON code_publish_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_code_publish_queue_created ON code_publish_queue(created_at DESC);

-- Table d'historique des publications
CREATE TABLE IF NOT EXISTS code_publish_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid REFERENCES code_publish_queue(id) ON DELETE SET NULL,
  file_path text NOT NULL,
  operation text NOT NULL,
  commit_sha text,
  commit_message text NOT NULL,
  triggered_by text NOT NULL,
  success boolean NOT NULL,
  error_message text,
  metadata jsonb DEFAULT '{}',
  published_at timestamptz DEFAULT now()
);

ALTER TABLE code_publish_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage publish history"
  ON code_publish_history
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated can view publish history"
  ON code_publish_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_code_publish_history_published ON code_publish_history(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_code_publish_history_success ON code_publish_history(success);

-- Fonction pour ajouter du code à publier
CREATE OR REPLACE FUNCTION add_code_to_publish_queue(
  p_file_path text,
  p_file_content text,
  p_operation text,
  p_commit_message text,
  p_triggered_by text,
  p_priority integer DEFAULT 5,
  p_metadata jsonb DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_id uuid;
BEGIN
  INSERT INTO code_publish_queue (
    file_path,
    file_content,
    operation,
    commit_message,
    priority,
    triggered_by,
    metadata
  ) VALUES (
    p_file_path,
    p_file_content,
    p_operation,
    p_commit_message,
    p_priority,
    p_triggered_by,
    p_metadata
  )
  RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$;

-- Fonction pour marquer une publication comme complétée
CREATE OR REPLACE FUNCTION mark_publish_completed(
  p_queue_id uuid,
  p_commit_sha text,
  p_success boolean,
  p_error_message text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_record RECORD;
BEGIN
  SELECT * INTO v_queue_record
  FROM code_publish_queue
  WHERE id = p_queue_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Queue item not found: %', p_queue_id;
  END IF;

  UPDATE code_publish_queue
  SET
    status = CASE WHEN p_success THEN 'published' ELSE 'failed' END,
    error_message = p_error_message,
    processed_at = now(),
    attempts = attempts + 1,
    updated_at = now()
  WHERE id = p_queue_id;

  INSERT INTO code_publish_history (
    queue_id,
    file_path,
    operation,
    commit_sha,
    commit_message,
    triggered_by,
    success,
    error_message,
    metadata
  ) VALUES (
    p_queue_id,
    v_queue_record.file_path,
    v_queue_record.operation,
    p_commit_sha,
    v_queue_record.commit_message,
    v_queue_record.triggered_by,
    p_success,
    p_error_message,
    v_queue_record.metadata
  );
END;
$$;

-- Fonction pour obtenir les modifications en attente
CREATE OR REPLACE FUNCTION get_pending_code_publishes(p_limit integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  file_path text,
  file_content text,
  operation text,
  commit_message text,
  priority integer,
  triggered_by text,
  metadata jsonb,
  attempts integer,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.file_path,
    q.file_content,
    q.operation,
    q.commit_message,
    q.priority,
    q.triggered_by,
    q.metadata,
    q.attempts,
    q.created_at
  FROM code_publish_queue q
  WHERE q.status = 'pending'
    AND q.scheduled_for <= now()
    AND q.attempts < q.max_attempts
  ORDER BY q.priority DESC, q.created_at ASC
  LIMIT p_limit;
END;
$$;

-- Fonction pour obtenir les stats de publication
CREATE OR REPLACE FUNCTION get_publish_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'processing', COUNT(*) FILTER (WHERE status = 'processing'),
    'published', COUNT(*) FILTER (WHERE status = 'published'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'total_last_24h', COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours'),
    'success_rate', ROUND(
      100.0 * COUNT(*) FILTER (WHERE status = 'published') / NULLIF(COUNT(*), 0),
      2
    )
  ) INTO v_stats
  FROM code_publish_queue;

  RETURN v_stats;
END;
$$;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_code_publish_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_code_publish_queue_updated_at
  BEFORE UPDATE ON code_publish_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_code_publish_updated_at();

CREATE TRIGGER trigger_git_repository_config_updated_at
  BEFORE UPDATE ON git_repository_config
  FOR EACH ROW
  EXECUTE FUNCTION update_code_publish_updated_at();

-- Configuration par défaut
INSERT INTO git_repository_config (
  repository_url,
  branch_name,
  auto_commit_enabled,
  auto_deploy_enabled,
  commit_message_prefix
) VALUES (
  'https://github.com/votre-repo/taxiassur',
  'main',
  true,
  true,
  '[IA SEO]'
) ON CONFLICT DO NOTHING;