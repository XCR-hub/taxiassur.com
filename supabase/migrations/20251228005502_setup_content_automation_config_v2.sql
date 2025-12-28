/*
  # Configuration des Automatisations de Contenu - Version 2

  1. Ajout des configurations
    - Enregistre les 3 nouveaux cron jobs dans cron_jobs_config
    - Ajoute les colonnes manquantes aux tables blog_posts et city_pages
    - Crée les index de performance

  2. Cron Jobs configurés
    - `auto-blog-4x-daily` : Génère 4 articles/jour (0h, 6h, 12h, 18h)
    - `auto-city-3x-daily` : Génère 3 pages ville/jour (10h, 16h, 22h)
    - `auto-faq-weekly` : Génère 1 FAQ/semaine (mercredi 14h)
*/

-- Ajouter colonnes manquantes à blog_posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'naturalness_score'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN naturalness_score integer DEFAULT 70;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'writing_style'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN writing_style text DEFAULT 'professionnel';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'author_name'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN author_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'author_bio'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN author_bio text;
  END IF;
END $$;

-- Ajouter colonnes manquantes à city_pages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'naturalness_score'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN naturalness_score integer DEFAULT 70;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'writing_style'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN writing_style text DEFAULT 'professionnel';
  END IF;
END $$;

-- Créer index pour performances
CREATE INDEX IF NOT EXISTS idx_blog_posts_naturalness ON blog_posts(naturalness_score DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_name) WHERE author_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_city_pages_naturalness ON city_pages(naturalness_score DESC);
CREATE INDEX IF NOT EXISTS idx_faq_items_naturalness ON faq_items(naturalness_score DESC);

-- Fonction helper pour obtenir l'URL Supabase
CREATE OR REPLACE FUNCTION get_supabase_url()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN current_setting('app.settings.supabase_url', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'https://your-project.supabase.co';
END;
$$;

-- Enregistrer les cron jobs dans la configuration
INSERT INTO cron_jobs_config (job_name, schedule, function_url, enabled, description, payload) VALUES
(
  'auto-blog-4x-daily',
  '0 0,6,12,18 * * *',
  '/functions/v1/auto-generate-blog-post',
  true,
  'Génère automatiquement 4 articles blog par jour avec anti-détection IA (minuit, 6h, midi, 18h)',
  '{}'::jsonb
),
(
  'auto-city-3x-daily',
  '0 10,16,22 * * *',
  '/functions/v1/auto-generate-city-page',
  true,
  'Génère automatiquement 3 pages ville par jour priorisées par population (10h, 16h, 22h)',
  '{}'::jsonb
),
(
  'auto-faq-weekly',
  '0 14 * * 3',
  '/functions/v1/auto-generate-faq',
  true,
  'Génère automatiquement 1 FAQ par semaine chaque mercredi à 14h',
  '{}'::jsonb
)
ON CONFLICT (job_name) DO UPDATE SET
  schedule = EXCLUDED.schedule,
  function_url = EXCLUDED.function_url,
  enabled = EXCLUDED.enabled,
  description = EXCLUDED.description,
  payload = EXCLUDED.payload;