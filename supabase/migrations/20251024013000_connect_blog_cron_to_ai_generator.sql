/*
  # Connexion du cron blog à l'IA unifiée

  1. Stratégie
    - La fonction SQL crée un "déclencheur" dans une table
    - L'Edge Function surveille cette table et génère le contenu
    - Solution simple sans extension http

  2. Tables
    - content_generation_queue: File d'attente pour générations
*/

-- Créer la table de file d'attente si elle n'existe pas
CREATE TABLE IF NOT EXISTS content_generation_queue (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL, -- 'blog', 'faq', 'city_page'
  keyword TEXT NOT NULL,
  city TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_content_queue_status ON content_generation_queue(status, created_at);

-- RLS
ALTER TABLE content_generation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON content_generation_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read completed" ON content_generation_queue
  FOR SELECT TO anon USING (status = 'completed');

-- Drop l'ancienne fonction
DROP FUNCTION IF EXISTS generate_daily_blog_post();

-- Nouvelle fonction simplifiée qui utilise la queue
CREATE OR REPLACE FUNCTION generate_daily_blog_post()
RETURNS TEXT AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_execution_time INTEGER;
  v_log_id BIGINT;
  v_queue_id BIGINT;
  v_city TEXT;
  v_cities TEXT[] := ARRAY['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Bordeaux', 'Nantes', 'Strasbourg', 'Lille', 'Rennes', 'Montpellier', 'Nice', 'Reims', 'Grenoble', 'Dijon'];
  v_keywords TEXT[] := ARRAY['ASSURANCE TAXI', 'RC PRO TAXI', 'GARANTIES TAXI', 'TARIFS ASSURANCE TAXI'];
  v_keyword TEXT;
  v_wait_count INTEGER := 0;
  v_max_wait INTEGER := 30; -- Maximum 30 secondes d'attente
  v_queue_status TEXT;
  v_result JSONB;
  v_blog_data JSONB;
BEGIN
  v_start_time := clock_timestamp();

  -- Insérer le log de début
  INSERT INTO cron_execution_log (job_name, status, details)
  VALUES ('generate_daily_blog_post', 'running', jsonb_build_object('started_at', v_start_time))
  RETURNING id INTO v_log_id;

  -- Sélectionner une ville et un mot-clé aléatoires
  v_city := v_cities[1 + floor(random() * array_length(v_cities, 1))];
  v_keyword := v_keywords[1 + floor(random() * array_length(v_keywords, 1))];

  -- Ajouter une demande à la queue
  INSERT INTO content_generation_queue (type, keyword, city, status)
  VALUES ('blog', v_keyword, v_city, 'pending')
  RETURNING id INTO v_queue_id;

  -- Attendre que la queue soit traitée (polling simple)
  -- Note: Cette approche est pour le cron. L'Edge Function process-queue traitera la queue.
  -- Pour l'instant, on crée un article simple et la queue sera traitée plus tard.

  -- Créer un article basique immédiatement (sera remplacé par l'IA plus tard)
  INSERT INTO blog_posts (
    title,
    slug,
    excerpt,
    content,
    category,
    tags,
    published,
    featured_image,
    author_id,
    meta_description
  )
  VALUES (
    'Actualité ' || v_keyword || ' à ' || v_city || ' - ' || TO_CHAR(CURRENT_DATE, 'DD/MM/YYYY'),
    'article-' || lower(replace(v_keyword, ' ', '-')) || '-' || lower(v_city) || '-' || TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'),
    'Découvrez les dernières actualités sur ' || v_keyword || ' à ' || v_city || '. Guide complet et conseils d''experts.',
    E'<h2>Introduction</h2><p>Bienvenue dans notre guide complet sur ' || v_keyword || ' à ' || v_city || '.</p><h2>Points clés</h2><ul><li>Protection optimale</li><li>Tarifs compétitifs</li><li>Service rapide</li></ul><p><em>⚠️ Contenu enrichi en cours de génération par notre IA...</em></p><p>Queue ID: ' || v_queue_id || '</p>',
    'actualites',
    ARRAY['assurance', 'taxi', lower(v_city)],
    true,
    'https://images.pexels.com/photos/1118448/pexels-photo-1118448.jpeg',
    'ia-system',
    'Tout sur ' || v_keyword || ' à ' || v_city || ' en 2025. Tarifs, garanties et conseils.'
  )
  ON CONFLICT (slug) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = NOW();

  v_end_time := clock_timestamp();
  v_execution_time := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;

  -- Mettre à jour le log avec succès
  UPDATE cron_execution_log
  SET
    status = 'success',
    execution_time_ms = v_execution_time,
    created_count = 1,
    details = jsonb_build_object(
      'started_at', v_start_time,
      'completed_at', v_end_time,
      'city', v_city,
      'keyword', v_keyword,
      'queue_id', v_queue_id,
      'note', 'Article basique créé, enrichissement IA en attente (queue)'
    )
  WHERE id = v_log_id;

  RETURN '✅ Article créé: ' || v_keyword || ' à ' || v_city || ' (Queue: ' || v_queue_id || ', Log: ' || v_log_id || ')';

EXCEPTION WHEN OTHERS THEN
  v_end_time := clock_timestamp();
  v_execution_time := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;

  -- Logger l'erreur
  UPDATE cron_execution_log
  SET
    status = 'error',
    execution_time_ms = v_execution_time,
    error_message = SQLERRM,
    details = jsonb_build_object(
      'error', SQLERRM,
      'error_detail', SQLSTATE,
      'city', v_city,
      'keyword', v_keyword
    )
  WHERE id = v_log_id;

  RETURN '❌ Erreur: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION generate_daily_blog_post() TO anon, authenticated, service_role;

-- Commentaire
COMMENT ON FUNCTION generate_daily_blog_post() IS 'Génère un article de blog quotidien. Crée un article basique immédiatement et ajoute une demande dans la queue pour enrichissement IA ultérieur.';
