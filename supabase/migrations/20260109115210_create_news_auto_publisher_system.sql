/*
  # Système de Publication Automatique d'Actualités - Tous les 2 Jours

  ## Description
  Ce système garantit la publication automatique d'une actualité unique tous les 2 jours avec :
  - Images UNIQUES (jamais de doublons)
  - Contenu généré par IA
  - Variété des sujets
  - Tracking des images utilisées

  ## Fonctionnalités
  1. **Cron Job** : Publication automatique tous les 2 jours à 9h00
  2. **Table de tracking** : Suivi des images utilisées pour éviter les doublons
  3. **Edge Function** : `news-auto-publisher` génère et publie

  ## Tables
  - `news_articles` : Articles publiés (table existante)
  - `used_images` : Tracking des images déjà utilisées (nouvelle)
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. TABLE DE TRACKING DES IMAGES UTILISÉES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS used_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL UNIQUE,
  source text DEFAULT 'pexels',
  article_id uuid REFERENCES news_articles(id) ON DELETE SET NULL,
  used_at timestamptz DEFAULT now(),
  keywords text[] DEFAULT ARRAY[]::text[],
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_used_images_url ON used_images(image_url);
CREATE INDEX IF NOT EXISTS idx_used_images_source ON used_images(source);
CREATE INDEX IF NOT EXISTS idx_used_images_used_at ON used_images(used_at DESC);

-- RLS
ALTER TABLE used_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read used images"
  ON used_images
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can insert used images"
  ON used_images
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. FONCTION POUR ENREGISTRER UNE IMAGE UTILISÉE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION register_used_image(
  p_image_url text,
  p_article_id uuid DEFAULT NULL,
  p_source text DEFAULT 'pexels',
  p_keywords text[] DEFAULT ARRAY[]::text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO used_images (image_url, article_id, source, keywords)
  VALUES (p_image_url, p_article_id, p_source, p_keywords)
  ON CONFLICT (image_url) DO UPDATE
  SET
    article_id = COALESCE(EXCLUDED.article_id, used_images.article_id),
    used_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. FONCTION POUR VÉRIFIER SI UNE IMAGE EST DÉJÀ UTILISÉE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_image_used(p_image_url text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM used_images
    WHERE image_url = p_image_url
  );
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. TRIGGER AUTOMATIQUE : Enregistrer les images des nouveaux articles
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION auto_register_article_image()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.image_url IS NOT NULL AND NEW.image_url != '' THEN
    PERFORM register_used_image(
      NEW.image_url,
      NEW.id,
      'auto',
      NEW.tags
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_register_image ON news_articles;
CREATE TRIGGER trigger_auto_register_image
  AFTER INSERT OR UPDATE OF image_url
  ON news_articles
  FOR EACH ROW
  WHEN (NEW.image_url IS NOT NULL)
  EXECUTE FUNCTION auto_register_article_image();

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. SUPPRIMER L'ANCIEN CRON (quotidien)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT cron.unschedule('news_aggregator_daily');
SELECT cron.unschedule('news_image_generator_daily');

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. CRÉER LE NOUVEAU CRON : TOUS LES 2 JOURS À 9H00
-- ═══════════════════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'news_auto_publisher_every_2_days',
  '0 9 */2 * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/news-auto-publisher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'auto', true,
      'timestamp', extract(epoch from now())
    ),
    timeout_milliseconds := 60000
  );
  $$
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. FONCTION DE STATISTIQUES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_image_usage_stats()
RETURNS TABLE(
  total_images bigint,
  unique_sources bigint,
  most_used_source text,
  last_used_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::bigint as total_images,
    COUNT(DISTINCT source)::bigint as unique_sources,
    MODE() WITHIN GROUP (ORDER BY source) as most_used_source,
    MAX(used_at) as last_used_at
  FROM used_images;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. FONCTION DE NETTOYAGE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION cleanup_old_used_images()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM used_images
  WHERE used_at < now() - interval '6 months'
  AND article_id IS NULL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN v_deleted;
END;
$$;

SELECT cron.schedule(
  'cleanup_old_images_monthly',
  '0 2 1 * *',
  $$ SELECT cleanup_old_used_images(); $$
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. VUE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW latest_news_articles AS
SELECT
  na.id,
  na.title,
  na.slug,
  na.excerpt,
  na.category,
  na.tags,
  na.image_url,
  na.published_at,
  na.score,
  ui.source as image_source,
  ui.used_at as image_registered_at
FROM news_articles na
LEFT JOIN used_images ui ON ui.image_url = na.image_url
WHERE na.status = 'published'
ORDER BY na.published_at DESC
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════

GRANT SELECT ON latest_news_articles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION register_used_image TO service_role;
GRANT EXECUTE ON FUNCTION is_image_used TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_image_usage_stats TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_used_images TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. MIGRER LES DONNÉES EXISTANTES
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO used_images (image_url, article_id, source, keywords, used_at)
SELECT
  image_url,
  id,
  'existing',
  tags,
  published_at
FROM news_articles
WHERE image_url IS NOT NULL
  AND image_url != ''
  AND status = 'published'
ON CONFLICT (image_url) DO NOTHING;
