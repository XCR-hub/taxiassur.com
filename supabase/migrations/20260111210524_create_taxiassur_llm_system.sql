/*
  # TaxiAssur LLM System - Complete Architecture

  This migration creates a comprehensive LLM system for TaxiAssur with:
  
  1. Core LLM Tables
    - `llm_agents` - Registry of all AI agents (Brain, RAG, Conversion, etc.)
    - `llm_conversations` - Multi-turn conversation history
    - `llm_messages` - Individual messages within conversations
    - `llm_agent_tasks` - Task queue for autonomous agents
    - `llm_agent_memory` - Long-term memory storage for agents
    
  2. Knowledge Base (RAG)
    - `llm_knowledge_documents` - Source documents for RAG
    - `llm_knowledge_chunks` - Chunked and embedded document segments
    - `llm_knowledge_queries` - Query history and analytics
    
  3. Agent Orchestration
    - `llm_orchestrator_runs` - Multi-agent workflow executions
    - `llm_agent_interactions` - Agent-to-agent communication logs
    - `llm_tool_calls` - Tool/function call history
    
  4. Performance & Learning
    - `llm_feedback` - Human feedback for RLHF
    - `llm_metrics` - Performance metrics and analytics
    - `llm_prompts` - Prompt templates and versions
    
  5. Security
    - RLS policies for all tables
    - Audit logging
    - Rate limiting integration
*/

-- =====================================================
-- SECTION 1: CORE LLM TABLES
-- =====================================================

-- Agent Registry
CREATE TABLE IF NOT EXISTS llm_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  agent_type text NOT NULL CHECK (agent_type IN ('brain', 'rag', 'conversion', 'email', 'content', 'orchestrator', 'specialist', 'autonomous')),
  model_id text DEFAULT 'gpt-4o-mini',
  system_prompt text,
  capabilities jsonb DEFAULT '[]'::jsonb,
  tools jsonb DEFAULT '[]'::jsonb,
  config jsonb DEFAULT '{}'::jsonb,
  temperature numeric(3,2) DEFAULT 0.7,
  max_tokens integer DEFAULT 4096,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 5,
  rate_limit_per_minute integer DEFAULT 60,
  total_calls bigint DEFAULT 0,
  total_tokens_used bigint DEFAULT 0,
  avg_response_time_ms integer DEFAULT 0,
  success_rate numeric(5,2) DEFAULT 100.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Conversations (multi-turn)
CREATE TABLE IF NOT EXISTS llm_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_id uuid,
  agent_id uuid REFERENCES llm_agents(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  title text,
  context jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived', 'error')),
  total_messages integer DEFAULT 0,
  total_tokens integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Individual Messages
CREATE TABLE IF NOT EXISTS llm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES llm_conversations(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES llm_agents(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool', 'function')),
  content text NOT NULL,
  tool_calls jsonb,
  tool_call_id text,
  tokens_used integer DEFAULT 0,
  latency_ms integer,
  model_used text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Agent Task Queue
CREATE TABLE IF NOT EXISTS llm_agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES llm_agents(id) ON DELETE CASCADE,
  task_type text NOT NULL,
  priority integer DEFAULT 5,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  input_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_data jsonb,
  error_message text,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  scheduled_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Agent Long-term Memory
CREATE TABLE IF NOT EXISTS llm_agent_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES llm_agents(id) ON DELETE CASCADE,
  memory_type text NOT NULL CHECK (memory_type IN ('fact', 'preference', 'insight', 'pattern', 'decision')),
  key text NOT NULL,
  value jsonb NOT NULL,
  importance numeric(3,2) DEFAULT 0.5,
  access_count integer DEFAULT 0,
  last_accessed_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- SECTION 2: KNOWLEDGE BASE (RAG)
-- =====================================================

-- Source Documents
CREATE TABLE IF NOT EXISTS llm_knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('manual', 'web', 'pdf', 'email', 'blog', 'faq', 'policy', 'product')),
  source_url text,
  content text NOT NULL,
  content_hash text,
  metadata jsonb DEFAULT '{}'::jsonb,
  category text,
  tags text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  chunk_count integer DEFAULT 0,
  last_indexed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Document Chunks (for RAG retrieval)
CREATE TABLE IF NOT EXISTS llm_knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES llm_knowledge_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  token_count integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Query History (for analytics and improvement)
CREATE TABLE IF NOT EXISTS llm_knowledge_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text text NOT NULL,
  query_embedding vector(1536),
  retrieved_chunk_ids uuid[],
  relevance_scores numeric[],
  reranked_order integer[],
  response_generated text,
  user_feedback text CHECK (user_feedback IN ('helpful', 'not_helpful', 'partially_helpful')),
  latency_ms integer,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- SECTION 3: AGENT ORCHESTRATION
-- =====================================================

-- Multi-Agent Workflow Runs
CREATE TABLE IF NOT EXISTS llm_orchestrator_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_name text NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'event', 'api', 'agent')),
  trigger_data jsonb DEFAULT '{}'::jsonb,
  agents_involved uuid[] DEFAULT '{}',
  status text DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled', 'paused')),
  current_step integer DEFAULT 0,
  total_steps integer DEFAULT 1,
  steps_log jsonb DEFAULT '[]'::jsonb,
  final_output jsonb,
  error_details jsonb,
  total_tokens_used integer DEFAULT 0,
  total_cost_usd numeric(10,6) DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Agent-to-Agent Interactions
CREATE TABLE IF NOT EXISTS llm_agent_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orchestrator_run_id uuid REFERENCES llm_orchestrator_runs(id) ON DELETE CASCADE,
  from_agent_id uuid REFERENCES llm_agents(id) ON DELETE SET NULL,
  to_agent_id uuid REFERENCES llm_agents(id) ON DELETE SET NULL,
  interaction_type text NOT NULL CHECK (interaction_type IN ('request', 'response', 'delegation', 'collaboration', 'feedback')),
  message jsonb NOT NULL,
  response jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- Tool/Function Calls
CREATE TABLE IF NOT EXISTS llm_tool_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES llm_agents(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES llm_conversations(id) ON DELETE SET NULL,
  message_id uuid REFERENCES llm_messages(id) ON DELETE SET NULL,
  tool_name text NOT NULL,
  tool_input jsonb NOT NULL,
  tool_output jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error')),
  error_message text,
  latency_ms integer,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- SECTION 4: PERFORMANCE & LEARNING
-- =====================================================

-- Human Feedback (for RLHF)
CREATE TABLE IF NOT EXISTS llm_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES llm_messages(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES llm_conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  feedback_type text CHECK (feedback_type IN ('quality', 'accuracy', 'helpfulness', 'safety', 'relevance')),
  chosen_response text,
  rejected_response text,
  comments text,
  created_at timestamptz DEFAULT now()
);

-- Performance Metrics
CREATE TABLE IF NOT EXISTS llm_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES llm_agents(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  dimensions jsonb DEFAULT '{}'::jsonb,
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Prompt Templates
CREATE TABLE IF NOT EXISTS llm_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  version integer DEFAULT 1,
  agent_id uuid REFERENCES llm_agents(id) ON DELETE SET NULL,
  prompt_type text NOT NULL CHECK (prompt_type IN ('system', 'user', 'few_shot', 'chain_of_thought', 'react')),
  template text NOT NULL,
  variables text[] DEFAULT '{}',
  examples jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  performance_score numeric(5,2),
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- SECTION 5: INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_llm_agents_type ON llm_agents(agent_type);
CREATE INDEX IF NOT EXISTS idx_llm_agents_active ON llm_agents(is_active);
CREATE INDEX IF NOT EXISTS idx_llm_conversations_user ON llm_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_conversations_lead ON llm_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_llm_conversations_session ON llm_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_llm_messages_conversation ON llm_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_llm_messages_role ON llm_messages(role);
CREATE INDEX IF NOT EXISTS idx_llm_agent_tasks_status ON llm_agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_llm_agent_tasks_scheduled ON llm_agent_tasks(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_llm_agent_memory_agent ON llm_agent_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_llm_agent_memory_key ON llm_agent_memory(key);
CREATE INDEX IF NOT EXISTS idx_llm_knowledge_docs_category ON llm_knowledge_documents(category);
CREATE INDEX IF NOT EXISTS idx_llm_knowledge_docs_active ON llm_knowledge_documents(is_active);
CREATE INDEX IF NOT EXISTS idx_llm_knowledge_chunks_doc ON llm_knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_llm_orchestrator_runs_status ON llm_orchestrator_runs(status);
CREATE INDEX IF NOT EXISTS idx_llm_tool_calls_agent ON llm_tool_calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_llm_feedback_message ON llm_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_llm_metrics_agent ON llm_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_llm_prompts_agent ON llm_prompts(agent_id);

-- =====================================================
-- SECTION 6: RLS POLICIES
-- =====================================================

ALTER TABLE llm_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_knowledge_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_orchestrator_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_agent_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_prompts ENABLE ROW LEVEL SECURITY;

-- Admin access policies (authenticated users who are admins)
CREATE POLICY "Admin full access llm_agents" ON llm_agents
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admin full access llm_conversations" ON llm_conversations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admin full access llm_messages" ON llm_messages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admin full access llm_agent_tasks" ON llm_agent_tasks
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admin full access llm_agent_memory" ON llm_agent_memory
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admin full access llm_knowledge_documents" ON llm_knowledge_documents
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admin full access llm_knowledge_chunks" ON llm_knowledge_chunks
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admin full access llm_knowledge_queries" ON llm_knowledge_queries
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admin full access llm_orchestrator_runs" ON llm_orchestrator_runs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admin full access llm_agent_interactions" ON llm_agent_interactions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admin full access llm_tool_calls" ON llm_tool_calls
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admin full access llm_feedback" ON llm_feedback
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admin full access llm_metrics" ON llm_metrics
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admin full access llm_prompts" ON llm_prompts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Service role access for edge functions
CREATE POLICY "Service role access llm_agents" ON llm_agents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role access llm_conversations" ON llm_conversations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role access llm_messages" ON llm_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role access llm_agent_tasks" ON llm_agent_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role access llm_agent_memory" ON llm_agent_memory FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role access llm_knowledge_documents" ON llm_knowledge_documents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role access llm_knowledge_chunks" ON llm_knowledge_chunks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role access llm_knowledge_queries" ON llm_knowledge_queries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role access llm_orchestrator_runs" ON llm_orchestrator_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role access llm_agent_interactions" ON llm_agent_interactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role access llm_tool_calls" ON llm_tool_calls FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role access llm_feedback" ON llm_feedback FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role access llm_metrics" ON llm_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role access llm_prompts" ON llm_prompts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- SECTION 7: SEED AGENTS
-- =====================================================

INSERT INTO llm_agents (name, slug, description, agent_type, model_id, system_prompt, capabilities, tools, temperature, priority) VALUES
(
  'TaxiAssur Brain',
  'brain',
  'Agent principal orchestrateur - Cerveau central du systeme LLM TaxiAssur',
  'brain',
  'gpt-4o',
  'Tu es le cerveau central de TaxiAssur, le leader francais du courtage en assurance taxi. Tu coordonnes tous les autres agents et prends les decisions strategiques. Tu analyses les situations complexes et delegues aux agents specialises. Tu parles toujours en francais professionnel et bienveillant. Tu connais parfaitement le marche de l''assurance taxi en France.',
  '["orchestration", "decision_making", "strategy", "delegation", "analysis"]'::jsonb,
  '["delegate_to_agent", "analyze_lead", "make_decision", "search_knowledge", "send_notification"]'::jsonb,
  0.7,
  10
),
(
  'TaxiAssur RAG Expert',
  'rag-expert',
  'Agent specialise dans la recuperation et generation de reponses basees sur la knowledge base',
  'rag',
  'gpt-4o-mini',
  'Tu es l''expert en assurance taxi de TaxiAssur. Tu reponds aux questions en te basant UNIQUEMENT sur la base de connaissances fournie. Si tu ne trouves pas l''information, dis-le honnetement. Tu cites toujours tes sources. Tu expliques les concepts d''assurance de maniere simple et accessible.',
  '["knowledge_retrieval", "question_answering", "source_citation", "explanation"]'::jsonb,
  '["search_knowledge", "retrieve_documents", "generate_response", "cite_sources"]'::jsonb,
  0.3,
  8
),
(
  'TaxiAssur Conversion Agent',
  'conversion',
  'Agent autonome specialise dans la conversion des leads en clients',
  'conversion',
  'gpt-4o',
  'Tu es l''expert en conversion de TaxiAssur. Ta mission est de transformer les leads en clients satisfaits. Tu analyses le profil de chaque lead, identifies ses besoins, et proposes des actions personnalisees. Tu es persuasif mais jamais agressif. Tu comprends les objections courantes des chauffeurs de taxi et sais y repondre.',
  '["lead_analysis", "personalization", "objection_handling", "follow_up", "closing"]'::jsonb,
  '["analyze_lead", "generate_email", "schedule_followup", "calculate_score", "recommend_action"]'::jsonb,
  0.8,
  9
),
(
  'TaxiAssur Email Composer',
  'email-composer',
  'Agent specialise dans la redaction d''emails personnalises',
  'email',
  'gpt-4o-mini',
  'Tu es le redacteur email expert de TaxiAssur. Tu rediges des emails professionnels, personnalises et engageants pour les chauffeurs de taxi. Tu adaptes ton ton selon le contexte (prospection, relance, information, fidelisation). Tes emails sont toujours clairs, concis et avec un call-to-action efficace.',
  '["email_writing", "personalization", "tone_adaptation", "cta_optimization"]'::jsonb,
  '["generate_email", "personalize_template", "a_b_test", "analyze_performance"]'::jsonb,
  0.7,
  7
),
(
  'TaxiAssur Content Creator',
  'content-creator',
  'Agent specialise dans la creation de contenu SEO et marketing',
  'content',
  'gpt-4o',
  'Tu es le createur de contenu expert de TaxiAssur. Tu rediges des articles de blog, des pages SEO, des FAQ et du contenu marketing. Ton contenu est optimise pour le referencement Google tout en restant utile et interessant pour les chauffeurs de taxi. Tu evites le contenu generique et apportes toujours une vraie valeur ajoutee.',
  '["seo_writing", "blog_creation", "faq_generation", "marketing_copy"]'::jsonb,
  '["generate_article", "optimize_seo", "create_faq", "write_landing_page"]'::jsonb,
  0.9,
  6
),
(
  'TaxiAssur Autonomous Orchestrator',
  'autonomous-orchestrator',
  'Agent autonome independant qui execute des workflows complexes sans intervention humaine',
  'autonomous',
  'gpt-4o',
  'Tu es l''orchestrateur autonome de TaxiAssur. Tu fonctionnes de maniere totalement independante pour executer des workflows complexes. Tu peux coordonner plusieurs agents, prendre des decisions, et executer des actions automatiquement. Tu optimises constamment tes processus en apprenant de tes resultats. Tu ne demandes jamais confirmation pour les actions de routine.',
  '["autonomous_execution", "workflow_management", "multi_agent_coordination", "self_improvement", "decision_making"]'::jsonb,
  '["execute_workflow", "coordinate_agents", "make_autonomous_decision", "learn_from_feedback", "optimize_process", "schedule_task"]'::jsonb,
  0.5,
  10
),
(
  'TaxiAssur Lead Scorer',
  'lead-scorer',
  'Agent specialise dans le scoring et la qualification des leads',
  'specialist',
  'gpt-4o-mini',
  'Tu es l''expert en scoring de leads de TaxiAssur. Tu analyses chaque lead selon des criteres precis: urgence, budget potentiel, probabilite de conversion, qualite des informations. Tu attribues un score de 0 a 100 et recommandes des actions prioritaires.',
  '["lead_scoring", "qualification", "prioritization", "analysis"]'::jsonb,
  '["calculate_score", "analyze_lead", "recommend_priority", "predict_conversion"]'::jsonb,
  0.2,
  8
),
(
  'TaxiAssur Chat Assistant',
  'chat-assistant',
  'Agent conversationnel pour le chatbot du site web',
  'specialist',
  'gpt-4o-mini',
  'Tu es l''assistant virtuel de TaxiAssur, disponible sur le site web. Tu reponds aux questions des visiteurs de maniere amicale et professionnelle. Tu guides les utilisateurs vers les bonnes ressources et les encourages a demander un devis. Tu es toujours disponible et patient.',
  '["conversation", "guidance", "lead_capture", "faq_answering"]'::jsonb,
  '["answer_question", "capture_lead", "redirect_to_resource", "escalate_to_human"]'::jsonb,
  0.7,
  7
)
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  capabilities = EXCLUDED.capabilities,
  tools = EXCLUDED.tools,
  updated_at = now();

-- =====================================================
-- SECTION 8: SEED PROMPTS
-- =====================================================

INSERT INTO llm_prompts (name, slug, prompt_type, template, variables, agent_id) VALUES
(
  'Lead Analysis Prompt',
  'lead-analysis',
  'chain_of_thought',
  'Analyse ce lead pour TaxiAssur:

Informations du lead:
- Nom: {{name}}
- Email: {{email}}
- Telephone: {{phone}}
- Ville: {{city}}
- Type de vehicule: {{vehicle_type}}
- Message: {{message}}
- Source: {{source}}
- Date: {{date}}

Etape 1 - Analyse du profil:
Analyse les informations fournies et identifie les points cles.

Etape 2 - Evaluation de l''urgence:
Determine le niveau d''urgence (1-10) base sur les indices dans le message.

Etape 3 - Estimation du potentiel:
Evalue le potentiel commercial de ce lead.

Etape 4 - Recommandations:
Propose 3 actions concretes a entreprendre.

Format de reponse JSON:
{
  "score": 0-100,
  "urgence": 1-10,
  "potentiel": "faible|moyen|eleve|tres_eleve",
  "points_cles": [],
  "recommandations": [],
  "prochain_contact": "date ISO",
  "template_email_suggere": "slug"
}',
  ARRAY['name', 'email', 'phone', 'city', 'vehicle_type', 'message', 'source', 'date'],
  (SELECT id FROM llm_agents WHERE slug = 'lead-scorer')
),
(
  'Email Personnalise Bienvenue',
  'email-welcome',
  'user',
  'Redige un email de bienvenue personnalise pour ce nouveau lead TaxiAssur:

Lead:
- Prenom: {{first_name}}
- Ville: {{city}}
- Type de taxi: {{taxi_type}}
- Besoin principal: {{main_need}}

Contexte: C''est le premier contact apres une demande de devis.

Contraintes:
- Ton professionnel mais chaleureux
- Maximum 150 mots
- Inclure un appel a l''action clair
- Mentionner les 35% d''economies moyennes
- Proposer un rappel telephonique

Ne pas inclure:
- De formules trop generiques
- De promesses non tenables
- D''informations techniques complexes',
  ARRAY['first_name', 'city', 'taxi_type', 'main_need'],
  (SELECT id FROM llm_agents WHERE slug = 'email-composer')
),
(
  'Autonomous Workflow Decision',
  'autonomous-decision',
  'react',
  'Tu dois prendre une decision autonome pour TaxiAssur.

Contexte actuel:
{{context}}

Tache a accomplir:
{{task}}

Agents disponibles:
{{available_agents}}

Outils disponibles:
{{available_tools}}

Historique recent:
{{recent_history}}

REACT Format:
Thought: Reflechis a la meilleure approche pour cette tache.
Action: Choisis l''action a executer.
Action Input: Fournis les parametres necessaires.
Observation: Analyse le resultat.
... (repete si necessaire)
Final Answer: Conclus avec le resultat final.

Regles:
1. Priorise toujours l''experience client
2. Optimise pour la conversion
3. Respecte les delais
4. Documente tes decisions
5. Apprends de chaque interaction',
  ARRAY['context', 'task', 'available_agents', 'available_tools', 'recent_history'],
  (SELECT id FROM llm_agents WHERE slug = 'autonomous-orchestrator')
)
ON CONFLICT (slug) DO UPDATE SET
  template = EXCLUDED.template,
  variables = EXCLUDED.variables,
  updated_at = now();

-- =====================================================
-- SECTION 9: SEED KNOWLEDGE BASE
-- =====================================================

INSERT INTO llm_knowledge_documents (title, source_type, content, category, tags) VALUES
(
  'Guide Complet Assurance Taxi France 2025',
  'manual',
  'L''assurance taxi en France est obligatoire pour tout chauffeur de taxi professionnel. Les garanties minimales incluent:

1. Responsabilite Civile Professionnelle (RC Pro):
- Couvre les dommages causes aux tiers
- Obligatoire pour exercer
- Plafond minimum de 1 million d''euros

2. Garantie Dommages au Vehicule:
- Protection contre le vol, incendie, bris de glace
- Option tous risques recommandee
- Franchise variable selon les contrats

3. Protection du Conducteur:
- Indemnisation en cas de blessure
- Capital deces et invalidite
- Frais medicaux

4. Assistance 24/7:
- Depannage et remorquage
- Vehicule de remplacement
- Rapatriement

TaxiAssur propose des tarifs negocies avec les meilleurs assureurs francais, permettant des economies moyennes de 35% par rapport aux offres directes.

Prix moyens 2025:
- Paris: 2500-4000 euros/an
- Grandes villes: 2000-3500 euros/an
- Province: 1500-2500 euros/an

Facteurs influencant le prix:
- Bonus/Malus
- Experience de conduite
- Type de vehicule
- Zone geographique
- Franchises choisies',
  'assurance',
  ARRAY['assurance', 'taxi', 'obligatoire', 'tarifs', 'garanties']
),
(
  'FAQ Assurance Taxi - Questions Frequentes',
  'faq',
  'Q: Combien coute une assurance taxi en moyenne?
R: Entre 1500 et 4000 euros par an selon votre profil et votre ville. TaxiAssur vous fait economiser en moyenne 35%.

Q: Quelles garanties sont obligatoires?
R: La RC Professionnelle est obligatoire. Nous recommandons fortement l''assistance 24/7 et la protection conducteur.

Q: Comment obtenir un devis rapidement?
R: Remplissez notre formulaire en 2 minutes sur taxiassur.com. Un conseiller vous rappelle sous 15 minutes.

Q: Puis-je changer d''assurance en cours d''annee?
R: Oui, grace a la loi Hamon, vous pouvez resilier apres 1 an de contrat a tout moment.

Q: TaxiAssur est-il un courtier agree?
R: Oui, TaxiAssur est immatricule a l''ORIAS et travaille avec les plus grands assureurs francais.

Q: Que faire en cas de sinistre?
R: Contactez notre service sinistres au 01 80 85 57 86. Nous gerons tout pour vous.

Q: Les VTC peuvent-ils etre assures?
R: Oui, nous proposons egalement des assurances VTC adaptees.

Q: Y a-t-il des remises pour les flottes?
R: Oui, des tarifs degressifs sont disponibles a partir de 3 vehicules.',
  'faq',
  ARRAY['faq', 'questions', 'reponses', 'tarifs', 'garanties']
),
(
  'Processus Commercial TaxiAssur',
  'manual',
  'Processus de conversion des leads TaxiAssur:

ETAPE 1 - RECEPTION DU LEAD (J0)
- Lead recu via formulaire web
- Scoring automatique par l''IA
- Attribution a un conseiller

ETAPE 2 - PREMIER CONTACT (J0, -15min)
- Rappel telephonique sous 15 minutes
- Qualification des besoins
- Envoi du devis personnalise

ETAPE 3 - SUIVI (J+1 a J+3)
- Email de relance automatique J+1
- Appel de suivi J+2 si pas de reponse
- SMS de rappel J+3

ETAPE 4 - NEGOCIATION (J+3 a J+7)
- Traitement des objections
- Ajustement du devis si necessaire
- Presentation des avantages TaxiAssur

ETAPE 5 - CLOSING (J+7 a J+14)
- Proposition finale
- Facilitation de la signature electronique
- Accompagnement administratif

ETAPE 6 - ONBOARDING CLIENT
- Envoi des documents
- Presentation de l''espace client
- Appel de bienvenue

Taux de conversion cible: 25%
Delai moyen de conversion: 7 jours',
  'commercial',
  ARRAY['process', 'commercial', 'conversion', 'leads', 'etapes']
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- SECTION 10: HELPER FUNCTIONS
-- =====================================================

-- Function to get active agents
CREATE OR REPLACE FUNCTION get_active_llm_agents()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  agent_type text,
  capabilities jsonb,
  tools jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, slug, agent_type, capabilities, tools
  FROM llm_agents
  WHERE is_active = true
  ORDER BY priority DESC;
$$;

-- Function to log agent metric
CREATE OR REPLACE FUNCTION log_llm_metric(
  p_agent_id uuid,
  p_metric_type text,
  p_metric_name text,
  p_metric_value numeric,
  p_dimensions jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metric_id uuid;
BEGIN
  INSERT INTO llm_metrics (agent_id, metric_type, metric_name, metric_value, dimensions)
  VALUES (p_agent_id, p_metric_type, p_metric_name, p_metric_value, p_dimensions)
  RETURNING id INTO v_metric_id;
  
  RETURN v_metric_id;
END;
$$;

-- Function to update agent stats
CREATE OR REPLACE FUNCTION update_llm_agent_stats(
  p_agent_id uuid,
  p_tokens_used integer,
  p_response_time_ms integer,
  p_success boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE llm_agents
  SET 
    total_calls = total_calls + 1,
    total_tokens_used = total_tokens_used + p_tokens_used,
    avg_response_time_ms = (avg_response_time_ms * total_calls + p_response_time_ms) / (total_calls + 1),
    success_rate = CASE 
      WHEN p_success THEN (success_rate * total_calls + 100) / (total_calls + 1)
      ELSE (success_rate * total_calls) / (total_calls + 1)
    END,
    updated_at = now()
  WHERE id = p_agent_id;
END;
$$;
