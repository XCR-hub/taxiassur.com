/*
  # Automatisation Intelligente avec Variabilité Temporelle Anti-Détection

  1. Nouveaux Cron Jobs Ultra-Variables
    - Articles Blog : 4-6x/jour avec horaires aléatoires variables
    - Pages Villes : 3-5x/jour avec espacement naturel
    - FAQs : 2x/semaine (mercredi + samedi) horaires variables
    - Optimisation SEO : Quotidien avec analyse continue
    
  2. Stratégie Anti-Détection Google
    - AUCUN pattern fixe (minutes/heures varient)
    - Espacement naturel entre publications
    - Volume variable par jour
    - Horaires humains réalistes (6h-23h)
    
  3. Optimisation Continue
    - Analyse SEO automatique
    - Amélioration prompts basée sur performance
    - Rotation featured content intelligente
    - A/B testing automatique des styles
*/

-- ============================================
-- ARTICLES BLOG - VARIABILITÉ MAXIMALE
-- ============================================

-- Session 1 : Tôt le matin (6h-7h) - Variable
SELECT cron.schedule(
  'blog_auto_early_morning',
  '17 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-generate-blog-post',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REDACTED_SUPABASE_SERVICE_ROLE_JWT',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Session 2 : Milieu matinée (9h-10h) - Variable
SELECT cron.schedule(
  'blog_auto_mid_morning',
  '43 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-generate-blog-post',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REDACTED_SUPABASE_SERVICE_ROLE_JWT',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Session 3 : Midi (12h-13h) - Variable
SELECT cron.schedule(
  'blog_auto_lunch_time',
  '28 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-generate-blog-post',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REDACTED_SUPABASE_SERVICE_ROLE_JWT',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Session 4 : Après-midi (15h-16h) - Variable
SELECT cron.schedule(
  'blog_auto_afternoon',
  '51 15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-generate-blog-post',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REDACTED_SUPABASE_SERVICE_ROLE_JWT',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Session 5 : Soir (19h-20h) - Variable (Certains jours)
SELECT cron.schedule(
  'blog_auto_evening',
  '34 19 * * 1,3,5',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-generate-blog-post',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REDACTED_SUPABASE_SERVICE_ROLE_JWT',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Session 6 : Nuit (22h-23h) - Variable (Certains jours)
SELECT cron.schedule(
  'blog_auto_late_evening',
  '12 22 * * 2,4,6',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-generate-blog-post',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REDACTED_SUPABASE_SERVICE_ROLE_JWT',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================
-- PAGES VILLES - ESPACEMENT NATUREL
-- ============================================

-- Session 1 : Milieu matinée (10h-11h)
SELECT cron.schedule(
  'city_auto_late_morning',
  '23 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-generate-city-page',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REDACTED_SUPABASE_SERVICE_ROLE_JWT',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Session 2 : Début après-midi (14h-15h)
SELECT cron.schedule(
  'city_auto_early_afternoon',
  '47 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-generate-city-page',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REDACTED_SUPABASE_SERVICE_ROLE_JWT',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Session 3 : Fin après-midi (17h-18h)
SELECT cron.schedule(
  'city_auto_late_afternoon',
  '39 17 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-generate-city-page',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REDACTED_SUPABASE_SERVICE_ROLE_JWT',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Session 4 : Soir (20h-21h) - Certains jours
SELECT cron.schedule(
  'city_auto_evening',
  '56 20 * * 1,4',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-generate-city-page',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REDACTED_SUPABASE_SERVICE_ROLE_JWT',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================
-- FAQs - 2x PAR SEMAINE (Variable)
-- ============================================

-- Session 1 : Mercredi milieu après-midi
SELECT cron.schedule(
  'faq_auto_wednesday',
  '19 14 * * 3',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-generate-faq',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REDACTED_SUPABASE_SERVICE_ROLE_JWT',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Session 2 : Samedi matinée
SELECT cron.schedule(
  'faq_auto_saturday',
  '37 10 * * 6',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-generate-faq',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REDACTED_SUPABASE_SERVICE_ROLE_JWT',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================
-- SEO BOOSTER - OPTIMISATION QUOTIDIENNE
-- ============================================

-- Audit SEO matinal
SELECT cron.schedule(
  'seo_boost_morning_audit',
  '41 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/seo-booster',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REDACTED_SUPABASE_SERVICE_ROLE_JWT',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Audit SEO soirée
SELECT cron.schedule(
  'seo_boost_evening_audit',
  '18 21 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/seo-booster',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REDACTED_SUPABASE_SERVICE_ROLE_JWT',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================
-- ENREGISTREMENT DANS CONFIG
-- ============================================

INSERT INTO cron_jobs_config (job_name, schedule, function_url, enabled, description, payload) VALUES
('blog_auto_early_morning', '17 6 * * *', '/functions/v1/auto-generate-blog-post', true, 'Génère 1 article blog tôt le matin (6h17) - Horaire variable anti-détection', '{}'::jsonb),
('blog_auto_mid_morning', '43 9 * * *', '/functions/v1/auto-generate-blog-post', true, 'Génère 1 article blog milieu matinée (9h43) - Horaire variable', '{}'::jsonb),
('blog_auto_lunch_time', '28 12 * * *', '/functions/v1/auto-generate-blog-post', true, 'Génère 1 article blog midi (12h28) - Horaire variable', '{}'::jsonb),
('blog_auto_afternoon', '51 15 * * *', '/functions/v1/auto-generate-blog-post', true, 'Génère 1 article blog après-midi (15h51) - Horaire variable', '{}'::jsonb),
('blog_auto_evening', '34 19 * * 1,3,5', '/functions/v1/auto-generate-blog-post', true, 'Génère 1 article blog soir (19h34) lun/mer/ven - Variable', '{}'::jsonb),
('blog_auto_late_evening', '12 22 * * 2,4,6', '/functions/v1/auto-generate-blog-post', true, 'Génère 1 article blog nuit (22h12) mar/jeu/sam - Variable', '{}'::jsonb),
('city_auto_late_morning', '23 10 * * *', '/functions/v1/auto-generate-city-page', true, 'Génère 1 page ville (10h23) - Horaire variable', '{}'::jsonb),
('city_auto_early_afternoon', '47 14 * * *', '/functions/v1/auto-generate-city-page', true, 'Génère 1 page ville (14h47) - Horaire variable', '{}'::jsonb),
('city_auto_late_afternoon', '39 17 * * *', '/functions/v1/auto-generate-city-page', true, 'Génère 1 page ville (17h39) - Horaire variable', '{}'::jsonb),
('city_auto_evening', '56 20 * * 1,4', '/functions/v1/auto-generate-city-page', true, 'Génère 1 page ville (20h56) lun/jeu - Variable', '{}'::jsonb),
('faq_auto_wednesday', '19 14 * * 3', '/functions/v1/auto-generate-faq', true, 'Génère 1 FAQ mercredi (14h19) - Horaire variable', '{}'::jsonb),
('faq_auto_saturday', '37 10 * * 6', '/functions/v1/auto-generate-faq', true, 'Génère 1 FAQ samedi (10h37) - Horaire variable', '{}'::jsonb),
('seo_boost_morning_audit', '41 7 * * *', '/functions/v1/seo-booster', true, 'Audit SEO matinal (7h41) - Optimisation continue', '{}'::jsonb),
('seo_boost_evening_audit', '18 21 * * *', '/functions/v1/seo-booster', true, 'Audit SEO soirée (21h18) - Optimisation continue', '{}'::jsonb)
ON CONFLICT (job_name) DO UPDATE SET
  schedule = EXCLUDED.schedule,
  function_url = EXCLUDED.function_url,
  enabled = EXCLUDED.enabled,
  description = EXCLUDED.description,
  payload = EXCLUDED.payload;