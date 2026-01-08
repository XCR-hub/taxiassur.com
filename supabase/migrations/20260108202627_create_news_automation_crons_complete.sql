/*
  # Système d'Actualités Automatique Quotidien

  ## Description
  Automatisation complète du système d'actualités avec :
  - Agrégation quotidienne des sources
  - Génération des images manquantes
  - Publication automatique sur la page /actualites

  ## Cron Jobs Créés
  1. **news_aggregator_daily** : Tous les jours à 7h00
     - Scrape les sources professionnelles
     - Condense et résume avec l'IA
     - Crée des articles SEO-optimisés

  2. **news_image_generator_daily** : Tous les jours à 8h00
     - Génère les images manquantes
     - Utilise Pexels API
     - Optimise pour le SEO

  ## Tables Utilisées
  - news_articles : Stockage des articles
  - news_sources : Sources configurées
  - news_digest : Condensés quotidiens
*/

-- Cron job 1 : Agrégation quotidienne des actualités (7h00)
SELECT cron.schedule(
  'news_aggregator_daily',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/news-aggregator-master',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'scheduled', true,
      'auto_publish', true
    )
  );
  $$
);

-- Cron job 2 : Génération des images manquantes (8h00)
SELECT cron.schedule(
  'news_image_generator_daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-article-images',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'mode', 'auto',
      'limit', 10
    )
  );
  $$
);

-- Cron job 3 : Génération du digest hebdomadaire (Lundi 9h00)
SELECT cron.schedule(
  'news_digest_weekly',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/news-digest-generator',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'type', 'weekly',
      'send_email', true
    )
  );
  $$
);

-- Vérification : Afficher les crons créés
DO $$
BEGIN
  RAISE NOTICE '✅ Crons d''actualités créés :';
  RAISE NOTICE '   - news_aggregator_daily : Tous les jours à 7h00';
  RAISE NOTICE '   - news_image_generator_daily : Tous les jours à 8h00';
  RAISE NOTICE '   - news_digest_weekly : Tous les lundis à 9h00';
END $$;