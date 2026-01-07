/*
  # Système IA Chat Multi-Providers

  1. Tables
    - ai_providers - Providers disponibles
    - ai_chat_sessions - Sessions de chat
    - ai_chat_messages - Messages
    - ai_usage_tracking - Suivi des coûts

  2. Providers supportés
    - OpenAI (GPT-4o, GPT-4o-mini)
    - Anthropic (Claude 3.5 Sonnet)
    - Google (Gemini 1.5 Pro)
    - Mistral AI
*/

CREATE TABLE IF NOT EXISTS ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  enabled boolean DEFAULT true,
  default_model text,
  models jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  lead_id uuid REFERENCES leads(id),
  provider text NOT NULL,
  model text NOT NULL,
  title text,
  system_prompt text,
  total_tokens int DEFAULT 0,
  total_cost numeric(10,4) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  tokens int DEFAULT 0,
  cost numeric(10,4) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  provider text NOT NULL,
  model text NOT NULL,
  tokens int NOT NULL,
  cost numeric(10,4) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user ON ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON ai_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage_tracking(user_id);

-- RLS
ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone view providers" ON ai_providers FOR SELECT TO authenticated USING (enabled = true);
CREATE POLICY "Users view own sessions" ON ai_chat_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users create sessions" ON ai_chat_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users view own messages" ON ai_chat_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM ai_chat_sessions WHERE ai_chat_sessions.id = ai_chat_messages.session_id AND ai_chat_sessions.user_id = auth.uid()));
CREATE POLICY "Users create messages" ON ai_chat_messages FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM ai_chat_sessions WHERE ai_chat_sessions.id = ai_chat_messages.session_id AND ai_chat_sessions.user_id = auth.uid()));
CREATE POLICY "Users view own usage" ON ai_usage_tracking FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System create usage" ON ai_usage_tracking FOR INSERT TO authenticated WITH CHECK (true);

-- Insérer providers
INSERT INTO ai_providers (name, display_name, default_model, models) VALUES
('openai', 'OpenAI', 'gpt-4o', '["gpt-4o","gpt-4o-mini","gpt-4-turbo"]'::jsonb),
('anthropic', 'Anthropic', 'claude-3-5-sonnet-20241022', '["claude-3-5-sonnet-20241022","claude-3-haiku-20240307"]'::jsonb),
('google', 'Google', 'gemini-1.5-pro', '["gemini-1.5-pro","gemini-1.5-flash"]'::jsonb),
('mistral', 'Mistral', 'mistral-large-latest', '["mistral-large-latest","mistral-small-latest"]'::jsonb)
ON CONFLICT (name) DO NOTHING;
