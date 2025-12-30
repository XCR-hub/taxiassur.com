/*
  # Amélioration IA Master - Système Multi-Modèles

  1. Nouvelles Tables
    - `ia_model_decisions` - Décisions par modèle IA
    - `ia_consensus_votes` - Système de vote entre IAs
    - `ia_performance_tracking` - Performance par modèle
    
  2. Functions
    - calculate_consensus() - Vote pondéré
    - track_model_accuracy() - Suivi précision
*/

CREATE TABLE IF NOT EXISTS ia_model_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid REFERENCES ai_decisions_log(id),
  model_name text NOT NULL,
  model_decision jsonb NOT NULL,
  confidence_score numeric(5,2) DEFAULT 0,
  execution_time_ms integer DEFAULT 0,
  tokens_used integer DEFAULT 0,
  cost_usd numeric(10,4) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ia_consensus_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_topic text NOT NULL,
  models_participating text[] DEFAULT '{}',
  votes jsonb NOT NULL,
  consensus_reached boolean DEFAULT false,
  winning_decision jsonb,
  confidence_final numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ia_performance_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  task_type text NOT NULL,
  success_count integer DEFAULT 0,
  failure_count integer DEFAULT 0,
  avg_confidence numeric(5,2) DEFAULT 0,
  avg_execution_time_ms integer DEFAULT 0,
  total_cost_usd numeric(10,2) DEFAULT 0,
  accuracy_score numeric(5,2) DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(model_name, task_type)
);

ALTER TABLE ia_model_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_consensus_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_performance_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth manage model decisions" ON ia_model_decisions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth manage consensus votes" ON ia_consensus_votes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth manage performance tracking" ON ia_performance_tracking FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read performance" ON ia_performance_tracking FOR SELECT TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_model_decisions_model ON ia_model_decisions(model_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consensus_votes_topic ON ia_consensus_votes(vote_topic, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_model ON ia_performance_tracking(model_name, accuracy_score DESC);

CREATE OR REPLACE FUNCTION calculate_consensus(
  p_votes jsonb
)
RETURNS jsonb AS $$
DECLARE
  vote record;
  total_confidence numeric := 0;
  winning_option text;
  max_score numeric := 0;
  vote_count integer := 0;
  result jsonb;
BEGIN
  FOR vote IN SELECT * FROM jsonb_each(p_votes)
  LOOP
    vote_count := vote_count + 1;
    total_confidence := total_confidence + (vote.value->>'confidence')::numeric;
    
    IF (vote.value->>'confidence')::numeric > max_score THEN
      max_score := (vote.value->>'confidence')::numeric;
      winning_option := vote.value->>'decision';
    END IF;
  END LOOP;
  
  result := jsonb_build_object(
    'winning_decision', winning_option,
    'confidence', max_score,
    'avg_confidence', CASE WHEN vote_count > 0 THEN total_confidence / vote_count ELSE 0 END,
    'consensus_reached', max_score > 0.75
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION track_model_accuracy()
RETURNS void AS $$
BEGIN
  INSERT INTO ia_performance_tracking (
    model_name,
    task_type,
    success_count,
    avg_confidence,
    accuracy_score
  )
  SELECT 
    model_name,
    'content_generation' as task_type,
    COUNT(*) FILTER (WHERE confidence_score > 70) as success_count,
    AVG(confidence_score) as avg_confidence,
    (COUNT(*) FILTER (WHERE confidence_score > 70)::numeric / NULLIF(COUNT(*), 0) * 100) as accuracy_score
  FROM ia_model_decisions
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY model_name
  ON CONFLICT (model_name, task_type) DO UPDATE
  SET 
    success_count = EXCLUDED.success_count,
    avg_confidence = EXCLUDED.avg_confidence,
    accuracy_score = EXCLUDED.accuracy_score,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

INSERT INTO ai_keywords_strategy (keyword, search_volume, difficulty, current_position, target_position, priority_score, ai_strategy, status)
VALUES
('assurance taxi', 2400, 65, 12, 1, 85, 'Créer 5 articles piliers + 20 backlinks autorité + optimisation technique', 'active'),
('assurance taxi pas cher', 1600, 58, 8, 1, 88, 'Comparateur prix + témoignages + garantie prix', 'active'),
('prix assurance taxi', 1200, 52, 15, 3, 78, 'Calculateur instantané + grille tarifaire transparente', 'active'),
('assurance taxi paris', 800, 70, 6, 1, 72, 'Page dédiée Paris + partenariats locaux + avis chauffeurs parisiens', 'active'),
('comparateur assurance taxi', 600, 55, 18, 5, 65, 'Outil comparateur interactif + Top 10 assurances', 'active'),
('devis assurance taxi', 500, 48, 22, 8, 60, 'Formulaire ultra-rapide 2min + chatbot assistance', 'active'),
('assurance taxi professionnel', 450, 62, 14, 5, 58, 'Guide complet professionnel + RC Pro détaillée', 'active'),
('assurance taxi vtc', 400, 54, 11, 3, 62, 'Comparatif taxi vs VTC + double activité', 'active'),
('meilleure assurance taxi', 380, 68, 25, 10, 52, 'Top 5 assurances 2025 + critères sélection', 'active'),
('assurance taxi jeune conducteur', 320, 51, 19, 8, 55, 'Solutions spécialisées jeunes + témoignages', 'active'),
('assurance taxi flotte', 280, 45, 28, 12, 48, 'Offres flottes + gestion centralisée', 'active'),
('assurance taxi électrique', 250, 42, 31, 15, 45, 'Guide véhicules électriques + bonus écolo', 'active'),
('assurance taxi sinistre', 220, 47, 24, 10, 42, 'Procédure sinistres + assistance 24/7', 'active'),
('assurance taxi marseille', 200, 58, 17, 5, 48, 'Page Marseille + partenariats locaux', 'active'),
('assurance taxi lyon', 190, 56, 16, 5, 47, 'Page Lyon + chauffeurs lyonnais', 'active'),
('assurance taxi toulouse', 180, 54, 20, 8, 44, 'Page Toulouse + spécificités locales', 'active'),
('assurance taxi bordeaux', 170, 52, 23, 10, 42, 'Page Bordeaux + réseau local', 'active'),
('assurance taxi nice', 160, 51, 21, 10, 41, 'Page Nice + Côte d''Azur', 'active'),
('RC pro taxi', 150, 49, 26, 12, 38, 'Guide complet RC Professionnelle', 'active'),
('garanties assurance taxi', 140, 44, 29, 15, 36, 'Liste exhaustive garanties + explications', 'active')
ON CONFLICT (keyword) DO UPDATE
SET 
  search_volume = EXCLUDED.search_volume,
  difficulty = EXCLUDED.difficulty,
  current_position = EXCLUDED.current_position,
  priority_score = EXCLUDED.priority_score,
  ai_strategy = EXCLUDED.ai_strategy;

SELECT cron.schedule(
  'track_ia_models_performance',
  '0 */6 * * *',
  $$
  SELECT track_model_accuracy();
  $$
);