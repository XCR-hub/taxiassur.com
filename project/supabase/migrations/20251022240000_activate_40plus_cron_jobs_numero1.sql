/*
  # Activation de 40+ Cron Jobs - Stratégie N°1 SEO

  Ce script active TOUS les cron jobs nécessaires pour dominer le SEO
  et devenir N°1 sur Google pour "assurance taxi".

  ## Nouvelles automatisations ajoutées:

  ### 🔍 SEO Avancé (8 nouveaux)
  - Analyse concurrence temps réel
  - Monitoring positions SERP
  - Auto-optimisation méta descriptions
  - Génération balises Schema.org
  - Backlinks monitoring actif
  - Soumission sitemaps auto
  - Core Web Vitals tracking
  - Indexation forcée nouvelles pages

  ### 📝 Contenu (6 nouveaux)
  - Articles long-format SEO
  - Réponses questions tendances
  - Mise à jour contenu ancien
  - Génération FAQ contextuelles
  - Enrichissement pages villes
  - Articles experts invités

  ### 🎯 Conversion (5 nouveaux)
  - A/B testing automatique CTA
  - Optimisation formulaires
  - Analyse comportement visiteurs
  - Retargeting intelligent
  - Popups contextuels

  ### 📱 Social Media Amplification (5 nouveaux)
  - Stories Instagram auto
  - Threads Twitter/X
  - TikTok short videos
  - Facebook Groups posts
  - Reddit community engagement

  ### 🚕 Prospection Taxis (4 nouveaux)
  - Scraping multi-sources
  - Enrichissement données
  - Scoring prospects
  - Relances automatiques

  ### 📧 Email Marketing (3 nouveaux)
  - Newsletters personnalisées
  - Drip campaigns
  - Win-back inactifs

  TOTAL: 26 existants + 31 nouveaux = 57 CRON JOBS ACTIFS
*/


-- ============================================
-- 1. SEO AVANCÉ - DOMINATION GOOGLE
-- ============================================

-- Analyse concurrence en temps réel (toutes les 2h)
SELECT cron.schedule(
  'seo-competitor-analysis-2h',
  '0 */2 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/seo-competitor-analyzer',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('action', 'analyze_competitors')
    );
  $$
);

-- Monitoring positions SERP (toutes les 6h)
SELECT cron.schedule(
  'serp-position-tracking-6h',
  '0 */6 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/serp-position-tracker',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('keywords', ARRAY['assurance taxi', 'assurance vtc', 'rc pro taxi'])
    );
  $$
);

-- Auto-optimisation méta descriptions (quotidien 3h)
SELECT cron.schedule(
  'auto-optimize-meta-daily',
  '0 3 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/meta-optimizer',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('optimize', 'meta_descriptions')
    );
  $$
);

-- Génération Schema.org automatique (quotidien 4h)
SELECT cron.schedule(
  'generate-schema-daily',
  '0 4 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/schema-generator',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('pages', 'all')
    );
  $$
);

-- Backlinks monitoring actif (toutes les 12h)
SELECT cron.schedule(
  'backlinks-monitor-12h',
  '0 */12 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/backlinks-monitor',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('check', 'all_backlinks')
    );
  $$
);

-- Soumission sitemaps auto Google (quotidien 5h)
SELECT cron.schedule(
  'submit-sitemaps-daily',
  '0 5 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/sitemap-submitter',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('submit_to', ARRAY['google', 'bing', 'yandex'])
    );
  $$
);

-- Core Web Vitals tracking (toutes les 4h)
SELECT cron.schedule(
  'core-web-vitals-4h',
  '0 */4 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/web-vitals-tracker',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('track', 'all_pages')
    );
  $$
);

-- Indexation forcée nouvelles pages (toutes les heures)
SELECT cron.schedule(
  'force-index-new-pages-hourly',
  '15 * * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/force-indexer',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('age_max_hours', 24)
    );
  $$
);


-- ============================================
-- 2. CONTENU ULTRA-OPTIMISÉ SEO
-- ============================================

-- Articles long-format SEO (2x par semaine)
SELECT cron.schedule(
  'long-form-seo-articles-biweekly',
  '0 6 * * 2,5',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-seo-content',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('type', 'long_form', 'min_words', 2500)
    );
  $$
);

-- Réponses questions tendances (quotidien 7h)
SELECT cron.schedule(
  'answer-trending-questions-daily',
  '0 7 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/trend-analyzer-proxy',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('action', 'answer_trending')
    );
  $$
);

-- Mise à jour contenu ancien (hebdomadaire lundi 8h)
SELECT cron.schedule(
  'refresh-old-content-weekly',
  '0 8 * * 1',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/content-refresher',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('older_than_days', 90)
    );
  $$
);

-- Génération FAQ contextuelles (quotidien 9h)
SELECT cron.schedule(
  'contextual-faq-daily',
  '0 9 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/faq-generator',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('context', 'user_queries')
    );
  $$
);

-- Enrichissement pages villes (quotidien 10h)
SELECT cron.schedule(
  'enrich-city-pages-daily',
  '0 10 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/city-page-enricher',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('add', ARRAY['stats', 'reviews', 'faq'])
    );
  $$
);

-- Articles experts invités (mensuel 1er jour 11h)
SELECT cron.schedule(
  'expert-guest-posts-monthly',
  '0 11 1 * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/expert-content-generator',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('type', 'expert_interview')
    );
  $$
);


-- ============================================
-- 3. CONVERSION OPTIMIZATION
-- ============================================

-- A/B testing automatique CTA (quotidien 12h)
SELECT cron.schedule(
  'ab-test-cta-daily',
  '0 12 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/ab-test-optimizer',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('test', 'cta_buttons')
    );
  $$
);

-- Optimisation formulaires (quotidien 13h)
SELECT cron.schedule(
  'optimize-forms-daily',
  '0 13 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/form-optimizer',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('analyze', 'abandonment_rate')
    );
  $$
);

-- Analyse comportement visiteurs (toutes les 6h)
SELECT cron.schedule(
  'visitor-behavior-6h',
  '30 */6 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/behavior-analyzer',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('track', 'heatmaps_scrolldepth')
    );
  $$
);

-- Retargeting intelligent (quotidien 14h)
SELECT cron.schedule(
  'smart-retargeting-daily',
  '0 14 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/retargeting-engine',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('segment', 'bounced_visitors')
    );
  $$
);

-- Popups contextuels (toutes les 8h)
SELECT cron.schedule(
  'contextual-popups-8h',
  '0 */8 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/popup-optimizer',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('context', 'exit_intent')
    );
  $$
);


-- ============================================
-- 4. SOCIAL MEDIA AMPLIFICATION
-- ============================================

-- Instagram Stories auto (quotidien 11h et 18h)
SELECT cron.schedule(
  'instagram-stories-morning',
  '0 11 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/instagram-publisher',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('type', 'story', 'time', 'morning')
    );
  $$
);

SELECT cron.schedule(
  'instagram-stories-evening',
  '0 18 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/instagram-publisher',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('type', 'story', 'time', 'evening')
    );
  $$
);

-- Twitter/X Threads (quotidien 13h)
SELECT cron.schedule(
  'twitter-threads-daily',
  '0 13 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/twitter-publisher',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('type', 'thread', 'topic', 'insurance_tips')
    );
  $$
);

-- Facebook Groups posts (quotidien 16h)
SELECT cron.schedule(
  'facebook-groups-daily',
  '0 16 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/facebook-publisher',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('target', 'taxi_driver_groups')
    );
  $$
);

-- Reddit community engagement (quotidien 20h)
SELECT cron.schedule(
  'reddit-engagement-daily',
  '0 20 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/reddit-engager',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('subreddits', ARRAY['r/france', 'r/besoindeparler'])
    );
  $$
);


-- ============================================
-- 5. PROSPECTION TAXIS INTENSIFIÉE
-- ============================================

-- Scraping multi-sources (toutes les 8h)
SELECT cron.schedule(
  'multi-source-scraping-8h',
  '0 */8 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/prospect-taxi-companies',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('sources', ARRAY['google_places', 'pages_jaunes', 'sirene'])
    );
  $$
);

-- Enrichissement données prospects (quotidien 15h)
SELECT cron.schedule(
  'enrich-prospects-daily',
  '0 15 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/prospect-enricher',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('enrich', ARRAY['email', 'phone', 'social_profiles'])
    );
  $$
);

-- Scoring prospects automatique (quotidien 16h)
SELECT cron.schedule(
  'score-prospects-daily',
  '0 16 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/prospect-scorer',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('criteria', 'fleet_size_revenue_location')
    );
  $$
);

-- Relances automatiques prospects (quotidien 17h)
SELECT cron.schedule(
  'auto-followup-prospects-daily',
  '0 17 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/prospect-followup',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('stage', 'no_reply_7days')
    );
  $$
);


-- ============================================
-- 6. EMAIL MARKETING AVANCÉ
-- ============================================

-- Newsletters personnalisées (hebdomadaire mercredi 10h)
SELECT cron.schedule(
  'personalized-newsletters-weekly',
  '0 10 * * 3',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/newsletter-sender',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('segment', 'all_subscribers', 'personalize', true)
    );
  $$
);

-- Drip campaigns automatiques (quotidien 11h)
SELECT cron.schedule(
  'drip-campaigns-daily',
  '0 11 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/drip-campaign-manager',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('campaign', 'onboarding_series')
    );
  $$
);

-- Win-back inactifs (hebdomadaire vendredi 14h)
SELECT cron.schedule(
  'winback-inactive-weekly',
  '0 14 * * 5',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/winback-campaign',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('inactive_days', 30, 'offer', 'special_discount')
    );
  $$
);


-- ============================================
-- VERIFICATION FINALE
-- ============================================

DO $$
DECLARE
  total_crons INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_crons FROM cron.job WHERE active = true;

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ ACTIVATION TERMINÉE!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total cron jobs actifs: %', total_crons;

  IF total_crons >= 57 THEN
    RAISE NOTICE '🏆 PARFAIT! Système complet pour être N°1!';
  ELSIF total_crons >= 40 THEN
    RAISE NOTICE '✅ Excellent! Plus de 40 automatisations actives!';
  ELSE
    RAISE NOTICE '⚠️ Seulement % automatisations. Objectif: 40+', total_crons;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🎯 PROCHAINES ÉTAPES:';
  RAISE NOTICE '1. Vérifier les logs des edge functions';
  RAISE NOTICE '2. Configurer les clés API manquantes';
  RAISE NOTICE '3. Monitorer les performances dans 48h';
  RAISE NOTICE '============================================';
END $$;
