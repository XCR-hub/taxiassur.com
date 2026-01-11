/*
  # LLM Council System - Systeme de Conseil Multi-IA

  1. Nouvelles Tables
    - `llm_council_sessions` - Sessions de conversation avec le conseil
    - `llm_council_responses` - Reponses individuelles de chaque LLM
    - `llm_council_rankings` - Evaluations croisees des LLMs
    - `llm_council_configs` - Configuration des modeles du conseil

  2. Concept
    - Plusieurs LLMs repondent a une question
    - Ils s'evaluent mutuellement de maniere anonyme
    - Un Chairman compile la reponse finale

  3. Securite
    - RLS active sur toutes les tables
    - Acces authentifie uniquement
*/

-- Table de configuration des modeles
CREATE TABLE IF NOT EXISTS llm_council_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id text NOT NULL UNIQUE,
  display_name text NOT NULL,
  provider text NOT NULL,
  is_active boolean DEFAULT true,
  is_chairman boolean DEFAULT false,
  temperature numeric(3,2) DEFAULT 0.7,
  max_tokens integer DEFAULT 4096,
  priority_order integer DEFAULT 5,
  cost_per_1k_tokens numeric(10,6) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des sessions de conseil
CREATE TABLE IF NOT EXISTS llm_council_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  title text,
  query text NOT NULL,
  final_response text,
  chairman_model text,
  status text DEFAULT 'pending',
  consensus_score numeric(5,2),
  total_tokens_used integer DEFAULT 0,
  total_cost numeric(10,4) DEFAULT 0,
  processing_time_ms integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des reponses individuelles
CREATE TABLE IF NOT EXISTS llm_council_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES llm_council_sessions(id) ON DELETE CASCADE,
  model_id text NOT NULL,
  display_name text,
  response_content text,
  tokens_used integer DEFAULT 0,
  latency_ms integer,
  status text DEFAULT 'pending',
  error_message text,
  anonymous_id text,
  created_at timestamptz DEFAULT now()
);

-- Table des evaluations croisees
CREATE TABLE IF NOT EXISTS llm_council_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES llm_council_sessions(id) ON DELETE CASCADE,
  reviewer_model_id text NOT NULL,
  ranked_model_id text NOT NULL,
  anonymous_id text NOT NULL,
  accuracy_score integer CHECK (accuracy_score >= 1 AND accuracy_score <= 10),
  insight_score integer CHECK (insight_score >= 1 AND insight_score <= 10),
  clarity_score integer CHECK (clarity_score >= 1 AND clarity_score <= 10),
  overall_rank integer,
  reasoning text,
  created_at timestamptz DEFAULT now()
);

-- Table des messages de conversation
CREATE TABLE IF NOT EXISTS llm_council_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES llm_council_sessions(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  model_id text,
  tokens_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_llm_council_sessions_user ON llm_council_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_council_sessions_status ON llm_council_sessions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_council_responses_session ON llm_council_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_llm_council_rankings_session ON llm_council_rankings(session_id);
CREATE INDEX IF NOT EXISTS idx_llm_council_messages_session ON llm_council_messages(session_id, created_at);

-- Enable RLS
ALTER TABLE llm_council_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_council_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_council_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_council_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_council_messages ENABLE ROW LEVEL SECURITY;

-- Policies pour llm_council_configs (lecture publique pour config)
CREATE POLICY "llm_council_configs_read_authenticated"
  ON llm_council_configs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "llm_council_configs_admin_all"
  ON llm_council_configs FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = (SELECT auth.uid())
    )
  );

-- Policies pour llm_council_sessions
CREATE POLICY "llm_council_sessions_read_own"
  ON llm_council_sessions FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM admin_users WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "llm_council_sessions_insert_authenticated"
  ON llm_council_sessions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM admin_users WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "llm_council_sessions_update_own"
  ON llm_council_sessions FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM admin_users WHERE id = (SELECT auth.uid()))
  );

-- Policies pour llm_council_responses
CREATE POLICY "llm_council_responses_read"
  ON llm_council_responses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM llm_council_sessions s
      WHERE s.id = session_id
      AND (s.user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM admin_users WHERE id = (SELECT auth.uid())))
    )
  );

CREATE POLICY "llm_council_responses_insert"
  ON llm_council_responses FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE id = (SELECT auth.uid()))
  );

-- Policies pour llm_council_rankings
CREATE POLICY "llm_council_rankings_read"
  ON llm_council_rankings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM llm_council_sessions s
      WHERE s.id = session_id
      AND (s.user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM admin_users WHERE id = (SELECT auth.uid())))
    )
  );

CREATE POLICY "llm_council_rankings_insert"
  ON llm_council_rankings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE id = (SELECT auth.uid()))
  );

-- Policies pour llm_council_messages
CREATE POLICY "llm_council_messages_read"
  ON llm_council_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM llm_council_sessions s
      WHERE s.id = session_id
      AND (s.user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM admin_users WHERE id = (SELECT auth.uid())))
    )
  );

CREATE POLICY "llm_council_messages_insert"
  ON llm_council_messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM llm_council_sessions s
      WHERE s.id = session_id
      AND (s.user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM admin_users WHERE id = (SELECT auth.uid())))
    )
  );

-- Inserer les modeles par defaut (via OpenRouter)
INSERT INTO llm_council_configs (model_id, display_name, provider, is_active, is_chairman, temperature, max_tokens, priority_order, cost_per_1k_tokens)
VALUES
  ('openai/gpt-4o', 'GPT-4o', 'OpenAI', true, false, 0.7, 4096, 1, 0.005),
  ('anthropic/claude-sonnet-4', 'Claude Sonnet 4', 'Anthropic', true, true, 0.7, 4096, 2, 0.003),
  ('google/gemini-2.0-flash-001', 'Gemini 2.0 Flash', 'Google', true, false, 0.7, 4096, 3, 0.0001),
  ('meta-llama/llama-3.3-70b-instruct', 'Llama 3.3 70B', 'Meta', true, false, 0.7, 4096, 4, 0.0004),
  ('mistralai/mistral-large-2411', 'Mistral Large', 'Mistral', true, false, 0.7, 4096, 5, 0.002),
  ('x-ai/grok-2-1212', 'Grok 2', 'xAI', true, false, 0.7, 4096, 6, 0.002),
  ('deepseek/deepseek-chat', 'DeepSeek Chat', 'DeepSeek', true, false, 0.7, 4096, 7, 0.00014)
ON CONFLICT (model_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  provider = EXCLUDED.provider,
  cost_per_1k_tokens = EXCLUDED.cost_per_1k_tokens,
  updated_at = now();
