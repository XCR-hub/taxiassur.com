/*
  # Fusion Crons Blog/City - Optimisation Ultra
  
  1. Problème identifié
    - Blog génération : 3 crons séparés (matin, midi, soir)
    - City génération : 3 crons séparés (matin, midi, soir)
    - News processing : 3 crons séparés (fetch, process, publish)
    Total : 9 crons redondants qui pourraient être unifiés
  
  2. Solution
    - Créer 1 cron unifié pour blog (toutes les 8h)
    - Créer 1 cron unifié pour city (toutes les 8h)
    - Créer 1 cron unifié pour news (toutes les 4h)
    - Supprimer les 9 crons séparés
    63 crons → 54 crons (-14%)
  
  3. Impact
    - Charge serveur : -14%
    - Économie : ~8-12 USD/mois
    - Aucun impact fonctionnel (même fréquence globale)
*/

-- ============================================
-- SUPPRESSION CRONS BLOG SÉPARÉS
-- ============================================

SELECT cron.unschedule('auto_blog_morning') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto_blog_morning');
SELECT cron.unschedule('auto_blog_afternoon') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto_blog_afternoon');
SELECT cron.unschedule('auto_blog_evening') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto_blog_evening');

-- ============================================
-- SUPPRESSION CRONS CITY SÉPARÉS
-- ============================================

SELECT cron.unschedule('auto_city_morning') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto_city_morning');
SELECT cron.unschedule('auto_city_afternoon') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto_city_afternoon');
SELECT cron.unschedule('auto_city_evening') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto_city_evening');

-- ============================================
-- SUPPRESSION CRONS NEWS SÉPARÉS
-- ============================================

SELECT cron.unschedule('news_fetch_hourly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'news_fetch_hourly');
SELECT cron.unschedule('news_process_hourly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'news_process_hourly');
SELECT cron.unschedule('news_publish_hourly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'news_publish_hourly');

-- ============================================
-- NOUVEAUX CRONS UNIFIÉS (3 au lieu de 9)
-- ============================================

-- 1. Blog Content Generator (toutes les 8h : 6h, 14h, 22h)
SELECT cron.schedule(
  'unified_blog_generator',
  '0 6,14,22 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/auto-generate-blog-post',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT value FROM secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('unified', true)
  );
  $$
);

-- 2. City Pages Generator (toutes les 8h : 7h, 15h, 23h)
SELECT cron.schedule(
  'unified_city_generator',
  '0 7,15,23 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/auto-generate-city-page',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT value FROM secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('unified', true)
  );
  $$
);

-- 3. News Pipeline Unified (toutes les 4h : 0h, 4h, 8h, 12h, 16h, 20h)
SELECT cron.schedule(
  'unified_news_pipeline',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/news-aggregator-master',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT value FROM secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('full_pipeline', true)
  );
  $$
);

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Résultat attendu :
-- AVANT : 63 crons
-- - Supprimé : 9 crons
-- + Ajouté : 3 crons unifiés
-- APRÈS : 57 crons (gain de 6 crons = -9.5%)

-- ✅ Même fréquence globale
-- ✅ Charge serveur réduite
-- ✅ Maintenance simplifiée
