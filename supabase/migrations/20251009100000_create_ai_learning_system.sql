/*
  # Système IA Auto-Apprenante TaxiAssur

  1. Nouvelles Tables
    - `ai_training_data` : Données d'entraînement IA
    - `social_posts_scraped` : Posts scrapés réseaux sociaux
    - `ai_responses_generated` : Réponses générées par IA
    - `ai_comments_published` : Commentaires publiés automatiquement
    - `ai_engagement_stats` : Stats engagement IA
    - `ai_learning_feedback` : Feedback pour apprentissage
    - `email_threads` : Conversations emails
    - `ai_knowledge_base` : Base de connaissance auto-construite

  2. Edge Functions Déclenchées
    - Scraping quotidien posts taxi
    - Génération réponses contextuelles
    - Publication auto commentaires
    - Apprentissage continu
*/

-- Activer extension pgvector pour embeddings (optionnel)
CREATE EXTENSION IF NOT EXISTS vector;

-- Table Données d'Entraînement IA
CREATE TABLE IF NOT EXISTS ai_training_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type text NOT NULL CHECK (data_type IN ('conversation', 'article', 'faq', 'review', 'email', 'social_post')),
  source text NOT NULL,
  content text NOT NULL,
  response text,
  keywords text[],
  sentiment text CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  quality_score decimal DEFAULT 0,
  used_for_training boolean DEFAULT false,
  embedding_text text, -- Stockage texte embeddings (alternative à vector)
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Table Posts Scrapés Réseaux Sociaux
CREATE TABLE IF NOT EXISTS social_posts_scraped (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL CHECK (platform IN ('facebook', 'linkedin', 'twitter', 'instagram', 'reddit')),
  post_url text UNIQUE NOT NULL,
  author text,
  content text NOT NULL,
  post_date timestamptz,
  engagement_count integer DEFAULT 0,
  keywords_detected text[],
  relevance_score decimal DEFAULT 0,
  should_respond boolean DEFAULT false,
  response_generated boolean DEFAULT false,
  response_published boolean DEFAULT false,
  scraped_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Table Réponses Générées par IA
CREATE TABLE IF NOT EXISTS ai_responses_generated (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('social_post', 'email', 'comment', 'review')),
  target_id uuid,
  original_content text NOT NULL,
  generated_response text NOT NULL,
  confidence_score decimal DEFAULT 0,
  tone text DEFAULT 'professional' CHECK (tone IN ('professional', 'casual', 'empathetic', 'promotional')),
  includes_link boolean DEFAULT false,
  link_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'published', 'rejected')),
  published_at timestamptz,
  engagement_received integer DEFAULT 0,
  generated_at timestamptz DEFAULT now(),
  approved_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Table Commentaires Publiés Auto
CREATE TABLE IF NOT EXISTS ai_comments_published (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  post_url text NOT NULL,
  comment_text text NOT NULL,
  includes_link boolean DEFAULT false,
  link_url text,
  response_id uuid REFERENCES ai_responses_generated(id),
  status text DEFAULT 'published' CHECK (status IN ('published', 'deleted', 'flagged', 'hidden')),
  likes_received integer DEFAULT 0,
  replies_received integer DEFAULT 0,
  clicks_received integer DEFAULT 0,
  conversion_generated integer DEFAULT 0,
  published_at timestamptz DEFAULT now(),
  last_checked_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Table Stats Engagement IA
CREATE TABLE IF NOT EXISTS ai_engagement_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date DEFAULT CURRENT_DATE,
  platform text NOT NULL,
  posts_scraped integer DEFAULT 0,
  posts_responded integer DEFAULT 0,
  comments_published integer DEFAULT 0,
  total_engagement integer DEFAULT 0,
  clicks_generated integer DEFAULT 0,
  leads_generated integer DEFAULT 0,
  avg_confidence_score decimal DEFAULT 0,
  success_rate decimal DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(date, platform)
);

-- Table Feedback Apprentissage
CREATE TABLE IF NOT EXISTS ai_learning_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid REFERENCES ai_responses_generated(id),
  feedback_type text NOT NULL CHECK (feedback_type IN ('upvote', 'downvote', 'edit', 'flag', 'conversion')),
  feedback_text text,
  user_id uuid,
  engagement_result jsonb,
  created_at timestamptz DEFAULT now()
);

-- Table Conversations Email
CREATE TABLE IF NOT EXISTS email_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id text UNIQUE NOT NULL,
  from_email text NOT NULL,
  to_email text NOT NULL,
  subject text NOT NULL,
  messages jsonb DEFAULT '[]'::jsonb,
  last_message_at timestamptz,
  auto_responded boolean DEFAULT false,
  requires_human boolean DEFAULT false,
  lead_id uuid REFERENCES leads(id),
  sentiment text,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table Base de Connaissance Auto-Construite
CREATE TABLE IF NOT EXISTS ai_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  source text,
  confidence decimal DEFAULT 0,
  usage_count integer DEFAULT 0,
  last_used_at timestamptz,
  keywords text[],
  embedding_text text, -- Stockage texte embeddings (alternative à vector)
  verified boolean DEFAULT false,
  verified_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_training_data_type ON ai_training_data(data_type);
CREATE INDEX IF NOT EXISTS idx_training_data_keywords ON ai_training_data USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_posts_scraped(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_should_respond ON social_posts_scraped(should_respond);
CREATE INDEX IF NOT EXISTS idx_social_posts_scraped_at ON social_posts_scraped(scraped_at);
CREATE INDEX IF NOT EXISTS idx_responses_status ON ai_responses_generated(status);
CREATE INDEX IF NOT EXISTS idx_responses_target_type ON ai_responses_generated(target_type);
CREATE INDEX IF NOT EXISTS idx_comments_platform ON ai_comments_published(platform);
CREATE INDEX IF NOT EXISTS idx_comments_published_at ON ai_comments_published(published_at);
CREATE INDEX IF NOT EXISTS idx_engagement_stats_date ON ai_engagement_stats(date, platform);
CREATE INDEX IF NOT EXISTS idx_email_threads_auto_responded ON email_threads(auto_responded);
CREATE INDEX IF NOT EXISTS idx_email_threads_requires_human ON email_threads(requires_human);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON ai_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_keywords ON ai_knowledge_base USING GIN(keywords);

-- RLS Policies

-- Training Data : Lecture publique pour IA, écriture authentifiée
ALTER TABLE ai_training_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read training data"
  ON ai_training_data FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated can insert training data"
  ON ai_training_data FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Social Posts : Lecture publique, écriture système
ALTER TABLE social_posts_scraped ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read scraped posts"
  ON social_posts_scraped FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can insert posts"
  ON social_posts_scraped FOR INSERT
  TO public
  WITH CHECK (true);

-- AI Responses : Lecture publique pour dashboard
ALTER TABLE ai_responses_generated ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read responses"
  ON ai_responses_generated FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can create responses"
  ON ai_responses_generated FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Authenticated can update responses"
  ON ai_responses_generated FOR UPDATE
  TO authenticated
  USING (true);

-- Comments Published : Lecture publique
ALTER TABLE ai_comments_published ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published comments"
  ON ai_comments_published FOR SELECT
  TO public
  USING (true);

-- Engagement Stats : Lecture publique
ALTER TABLE ai_engagement_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read engagement stats"
  ON ai_engagement_stats FOR SELECT
  TO public
  USING (true);

-- Learning Feedback : Authentifiés peuvent donner feedback
ALTER TABLE ai_learning_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can provide feedback"
  ON ai_learning_feedback FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Email Threads : Authentifiés seulement
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read email threads"
  ON email_threads FOR SELECT
  TO authenticated
  USING (true);

-- Knowledge Base : Lecture publique
ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read knowledge base"
  ON ai_knowledge_base FOR SELECT
  TO public
  USING (true);

-- Fonction : Calculer score de pertinence
CREATE OR REPLACE FUNCTION calculate_relevance_score(
  post_content text,
  keywords_array text[]
)
RETURNS decimal AS $$
DECLARE
  score decimal := 0;
  keyword text;
  content_lower text;
BEGIN
  content_lower := lower(post_content);
  
  FOREACH keyword IN ARRAY keywords_array
  LOOP
    IF position(lower(keyword) in content_lower) > 0 THEN
      score := score + 1;
    END IF;
  END LOOP;
  
  -- Normaliser le score (0-1)
  IF array_length(keywords_array, 1) > 0 THEN
    score := score / array_length(keywords_array, 1);
  END IF;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Détecter si un post nécessite une réponse
CREATE OR REPLACE FUNCTION should_respond_to_post()
RETURNS TRIGGER AS $$
DECLARE
  relevance decimal;
  target_keywords text[] := ARRAY[
    'assurance taxi', 'assurance vtc', 'tarif assurance',
    'courtier', 'devis taxi', 'rc pro taxi',
    'flotte taxi', 'sinistre taxi', 'carte taxi'
  ];
BEGIN
  -- Calculer score de pertinence
  relevance := calculate_relevance_score(NEW.content, target_keywords);
  
  -- Stocker keywords détectés
  NEW.keywords_detected := target_keywords;
  NEW.relevance_score := relevance;
  
  -- Décider si on doit répondre (score > 0.3)
  IF relevance > 0.3 THEN
    NEW.should_respond := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour détection auto
DROP TRIGGER IF EXISTS trigger_detect_relevant_post ON social_posts_scraped;
CREATE TRIGGER trigger_detect_relevant_post
  BEFORE INSERT ON social_posts_scraped
  FOR EACH ROW
  EXECUTE FUNCTION should_respond_to_post();

-- Fonction : Mettre à jour stats engagement
CREATE OR REPLACE FUNCTION update_engagement_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ai_engagement_stats (
    date,
    platform,
    comments_published,
    total_engagement,
    clicks_generated
  )
  VALUES (
    CURRENT_DATE,
    NEW.platform,
    1,
    NEW.likes_received + NEW.replies_received,
    NEW.clicks_received
  )
  ON CONFLICT (date, platform)
  DO UPDATE SET
    comments_published = ai_engagement_stats.comments_published + 1,
    total_engagement = ai_engagement_stats.total_engagement + NEW.likes_received + NEW.replies_received,
    clicks_generated = ai_engagement_stats.clicks_generated + NEW.clicks_received;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour stats
DROP TRIGGER IF EXISTS trigger_update_engagement_stats ON ai_comments_published;
CREATE TRIGGER trigger_update_engagement_stats
  AFTER INSERT OR UPDATE ON ai_comments_published
  FOR EACH ROW
  EXECUTE FUNCTION update_engagement_stats();

-- Fonction : Apprendre des feedbacks
CREATE OR REPLACE FUNCTION learn_from_feedback()
RETURNS TRIGGER AS $$
BEGIN
  -- Si feedback positif, augmenter quality_score des données similaires
  IF NEW.feedback_type IN ('upvote', 'conversion') THEN
    UPDATE ai_responses_generated
    SET confidence_score = LEAST(confidence_score + 0.1, 1.0)
    WHERE id = NEW.response_id;
  END IF;
  
  -- Si feedback négatif, diminuer score
  IF NEW.feedback_type IN ('downvote', 'flag') THEN
    UPDATE ai_responses_generated
    SET confidence_score = GREATEST(confidence_score - 0.2, 0.0)
    WHERE id = NEW.response_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger apprentissage
DROP TRIGGER IF EXISTS trigger_learn_from_feedback ON ai_learning_feedback;
CREATE TRIGGER trigger_learn_from_feedback
  AFTER INSERT ON ai_learning_feedback
  FOR EACH ROW
  EXECUTE FUNCTION learn_from_feedback();
