/*
  # Fix Publications Sociales LinkedIn & Pinterest V2

  ## Corrections
  - Mettre à jour les posts avec platform NULL
  - Créer des fonctions helper pour les publications
  - Recréer les crons avec appels simplifiés
*/

-- 1. Mettre à jour les posts existants
UPDATE social_posts 
SET platform = 'linkedin'
WHERE platform IS NULL AND status IN ('draft', 'scheduled');

-- 2. Supprimer les anciens crons
SELECT cron.unschedule('linkedin_morning_post');
SELECT cron.unschedule('linkedin_afternoon_post');
SELECT cron.unschedule('pinterest_morning');
SELECT cron.unschedule('pinterest_afternoon');
SELECT cron.unschedule('pinterest_evening');

-- 3. Créer les nouveaux crons LinkedIn (appel direct aux edge functions)
SELECT cron.schedule(
  'linkedin_auto_post_morning',
  '0 9 * * 1-5',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/social-media-publisher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'platform', 'linkedin',
      'auto_generate', true,
      'auto_publish', true
    )
  );
  $$
);

SELECT cron.schedule(
  'linkedin_auto_post_afternoon',
  '0 15 * * 1-5',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/social-media-publisher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'platform', 'linkedin',
      'auto_generate', true,
      'auto_publish', true
    )
  );
  $$
);

-- 4. Créer les crons Pinterest
SELECT cron.schedule(
  'pinterest_auto_post_morning',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/social-media-publisher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'platform', 'pinterest',
      'auto_generate', true,
      'auto_publish', true
    )
  );
  $$
);

SELECT cron.schedule(
  'pinterest_auto_post_afternoon',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/social-media-publisher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'platform', 'pinterest',
      'auto_generate', true,
      'auto_publish', true
    )
  );
  $$
);

SELECT cron.schedule(
  'pinterest_auto_post_evening',
  '0 19 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/social-media-publisher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'platform', 'pinterest',
      'auto_generate', true,
      'auto_publish', true
    )
  );
  $$
);

-- Vérification
DO $$
BEGIN
  RAISE NOTICE '✅ Publications sociales configurées :';
  RAISE NOTICE '   - LinkedIn : 9h et 15h (jours ouvrables)';
  RAISE NOTICE '   - Pinterest : 10h, 14h, 19h (tous les jours)';
  RAISE NOTICE '   - Génération + Publication automatique';
END $$;