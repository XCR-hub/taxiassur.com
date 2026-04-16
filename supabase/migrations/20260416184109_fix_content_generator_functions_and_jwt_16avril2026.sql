/*
  # Fix content generator SQL functions - broken current_setting and dummy data

  1. Modified Functions
    - `generate_daily_blog_post()` - Fixed to use `system_config` table instead of broken `current_setting()`. Now calls `auto-generate-blog-post` (verifyJWT:false) instead of `generate-seo-content` (verifyJWT:true, 401 errors)
    - `generate_city_pages()` - Rewritten from dummy placeholder data to calling `auto-generate-city-page` edge function via `system_config`
    - `generate_weekly_faq()` - Rewritten from dummy placeholder data to calling `auto-generate-faq` edge function via `system_config`

  2. Root Cause
    - `current_setting('app.settings.supabase_url', true)` returns NULL in Supabase PostgreSQL
    - `generate_city_pages()` and `generate_weekly_faq()` never called AI, only inserted hardcoded test data
    - `generate-seo-content` edge function has verifyJWT:true causing 401 UNAUTHORIZED_LEGACY_JWT errors

  3. Important Notes
    - All functions now read URL and key from `system_config` table
    - Blog function targets `auto-generate-blog-post` (verifyJWT:false) to avoid JWT issues
    - City and FAQ functions now properly call their respective edge functions
    - Fallback content generation preserved as safety net
*/

-- 1. Fix generate_daily_blog_post() - use system_config, call auto-generate-blog-post
CREATE OR REPLACE FUNCTION generate_daily_blog_post()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_execution_time INTEGER;
  v_log_id BIGINT;
  v_city TEXT;
  v_keyword TEXT;
  v_cities TEXT[] := ARRAY['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Bordeaux', 'Nantes', 'Strasbourg', 'Lille', 'Rennes', 'Montpellier', 'Nice', 'Reims', 'Grenoble', 'Dijon'];
  v_keywords TEXT[] := ARRAY['ASSURANCE TAXI', 'RC PRO TAXI', 'GARANTIES TAXI', 'TARIFS ASSURANCE TAXI', 'DEVIS ASSURANCE TAXI', 'COURTIER TAXI', 'ASSURANCE TAXI PAS CHER'];
  v_response JSONB;
  v_blog_title TEXT;
  v_blog_slug TEXT;
  v_blog_content TEXT;
  v_blog_excerpt TEXT;
  v_blog_meta TEXT;
  v_blog_keywords TEXT[];
  v_blog_image TEXT;
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_request_id BIGINT;
BEGIN
  v_start_time := clock_timestamp();

  INSERT INTO cron_execution_log (job_name, status, details)
  VALUES ('generate_daily_blog_post', 'running', jsonb_build_object('started_at', v_start_time))
  RETURNING id INTO v_log_id;

  v_city := v_cities[1 + floor(random() * array_length(v_cities, 1))];
  v_keyword := v_keywords[1 + floor(random() * array_length(v_keywords, 1))];

  SELECT value INTO v_supabase_url FROM system_config WHERE key = 'supabase_url';
  SELECT value INTO v_service_key FROM system_config WHERE key = 'supabase_service_role_key';

  IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
    BEGIN
      SELECT net.http_post(
        url := v_supabase_url || '/functions/v1/auto-generate-blog-post',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || v_service_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'keyword', v_keyword,
          'city', v_city,
          'mode', 'unified'
        ),
        timeout_milliseconds := 55000
      ) INTO v_request_id;

      v_end_time := clock_timestamp();
      v_execution_time := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;

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
          'method', 'edge_function',
          'request_id', v_request_id
        )
      WHERE id = v_log_id;

      RETURN 'Article blog demande envoyee: ' || v_keyword || ' a ' || v_city || ' (request_id: ' || v_request_id || ')';

    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erreur appel edge function: %', SQLERRM;
    END;
  END IF;

  INSERT INTO blog_posts (
    title, slug, excerpt, content, category, tags, published, featured_image, meta_description
  )
  VALUES (
    'Actualite ' || v_keyword || ' a ' || v_city || ' - ' || TO_CHAR(CURRENT_DATE, 'DD/MM/YYYY'),
    'article-' || lower(replace(v_keyword, ' ', '-')) || '-' || lower(v_city) || '-' || TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') || '-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'Decouvrez les dernieres actualites sur ' || v_keyword || ' a ' || v_city || '. Guide complet et conseils experts.',
    '<h2>' || v_keyword || ' a ' || v_city || '</h2><p>Dans le secteur du transport de personnes, l''assurance professionnelle represente un pilier fondamental pour securiser l''activite des chauffeurs de taxi a ' || v_city || '.</p><h2>Les garanties essentielles</h2><p>La responsabilite civile professionnelle couvre les dommages causes aux tiers pendant l''exercice de l''activite. La garantie dommages tous accidents protege le vehicule.</p><h2>Tarifs et conseils</h2><p>Le cout annuel varie entre 1200 et 3000 euros selon le profil. Comparez plusieurs devis pour trouver la meilleure offre.</p>',
    'actualites',
    ARRAY['assurance', 'taxi', lower(v_city)],
    true,
    'https://images.pexels.com/photos/1118448/pexels-photo-1118448.jpeg',
    'Tout sur ' || v_keyword || ' a ' || v_city || ' en 2026. Tarifs, garanties et conseils.'
  )
  ON CONFLICT (slug) DO UPDATE SET
    content = EXCLUDED.content,
    excerpt = EXCLUDED.excerpt,
    featured_image = EXCLUDED.featured_image,
    updated_at = NOW();

  v_end_time := clock_timestamp();
  v_execution_time := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;

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
      'method', 'fallback'
    )
  WHERE id = v_log_id;

  RETURN 'Article cree (fallback): ' || v_keyword || ' a ' || v_city;

EXCEPTION WHEN OTHERS THEN
  v_end_time := clock_timestamp();
  v_execution_time := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;

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

  RETURN 'Erreur: ' || SQLERRM;
END;
$$;


-- 2. Fix generate_city_pages() - call edge function instead of inserting dummy data
CREATE OR REPLACE FUNCTION generate_city_pages()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_execution_time INTEGER;
  v_log_id BIGINT;
  v_count INTEGER := 0;
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_request_id BIGINT;
BEGIN
  v_start_time := clock_timestamp();

  INSERT INTO cron_execution_log (job_name, status, details)
  VALUES ('generate_city_pages', 'running', jsonb_build_object('started_at', v_start_time))
  RETURNING id INTO v_log_id;

  SELECT value INTO v_supabase_url FROM system_config WHERE key = 'supabase_url';
  SELECT value INTO v_service_key FROM system_config WHERE key = 'supabase_service_role_key';

  IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
    BEGIN
      SELECT net.http_post(
        url := v_supabase_url || '/functions/v1/auto-generate-city-page',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || v_service_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object('batch', true, 'count', 5),
        timeout_milliseconds := 55000
      ) INTO v_request_id;

      v_count := 1;

      v_end_time := clock_timestamp();
      v_execution_time := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;

      UPDATE cron_execution_log
      SET
        status = 'success',
        execution_time_ms = v_execution_time,
        created_count = v_count,
        details = jsonb_build_object(
          'started_at', v_start_time,
          'completed_at', v_end_time,
          'method', 'edge_function',
          'request_id', v_request_id
        )
      WHERE id = v_log_id;

      RETURN 'Pages ville demande envoyee (request_id: ' || v_request_id || ')';

    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erreur appel edge function city: %', SQLERRM;
    END;
  END IF;

  v_end_time := clock_timestamp();
  v_execution_time := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;

  UPDATE cron_execution_log
  SET
    status = 'error',
    execution_time_ms = v_execution_time,
    error_message = 'system_config missing supabase_url or supabase_service_role_key',
    details = jsonb_build_object(
      'started_at', v_start_time,
      'completed_at', v_end_time,
      'method', 'none',
      'reason', 'missing_config'
    )
  WHERE id = v_log_id;

  RETURN 'Erreur: configuration manquante dans system_config';

EXCEPTION WHEN OTHERS THEN
  v_end_time := clock_timestamp();
  v_execution_time := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;

  UPDATE cron_execution_log
  SET
    status = 'error',
    execution_time_ms = v_execution_time,
    error_message = SQLERRM,
    details = jsonb_build_object('error', SQLERRM, 'error_detail', SQLSTATE)
  WHERE id = v_log_id;

  RETURN 'Erreur: ' || SQLERRM;
END;
$$;


-- 3. Fix generate_weekly_faq() - call edge function instead of inserting dummy data
CREATE OR REPLACE FUNCTION generate_weekly_faq()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_execution_time INTEGER;
  v_log_id BIGINT;
  v_count INTEGER := 0;
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_request_id BIGINT;
BEGIN
  v_start_time := clock_timestamp();

  INSERT INTO cron_execution_log (job_name, status, details)
  VALUES ('generate_weekly_faq', 'running', jsonb_build_object('started_at', v_start_time))
  RETURNING id INTO v_log_id;

  SELECT value INTO v_supabase_url FROM system_config WHERE key = 'supabase_url';
  SELECT value INTO v_service_key FROM system_config WHERE key = 'supabase_service_role_key';

  IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
    BEGIN
      SELECT net.http_post(
        url := v_supabase_url || '/functions/v1/auto-generate-faq',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || v_service_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object('count', 5),
        timeout_milliseconds := 55000
      ) INTO v_request_id;

      v_count := 1;

      v_end_time := clock_timestamp();
      v_execution_time := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;

      UPDATE cron_execution_log
      SET
        status = 'success',
        execution_time_ms = v_execution_time,
        created_count = v_count,
        details = jsonb_build_object(
          'started_at', v_start_time,
          'completed_at', v_end_time,
          'method', 'edge_function',
          'request_id', v_request_id
        )
      WHERE id = v_log_id;

      RETURN 'FAQ demande envoyee (request_id: ' || v_request_id || ')';

    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erreur appel edge function faq: %', SQLERRM;
    END;
  END IF;

  v_end_time := clock_timestamp();
  v_execution_time := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;

  UPDATE cron_execution_log
  SET
    status = 'error',
    execution_time_ms = v_execution_time,
    error_message = 'system_config missing supabase_url or supabase_service_role_key',
    details = jsonb_build_object(
      'started_at', v_start_time,
      'completed_at', v_end_time,
      'method', 'none',
      'reason', 'missing_config'
    )
  WHERE id = v_log_id;

  RETURN 'Erreur: configuration manquante dans system_config';

EXCEPTION WHEN OTHERS THEN
  v_end_time := clock_timestamp();
  v_execution_time := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;

  UPDATE cron_execution_log
  SET
    status = 'error',
    execution_time_ms = v_execution_time,
    error_message = SQLERRM,
    details = jsonb_build_object('error', SQLERRM, 'error_detail', SQLSTATE)
  WHERE id = v_log_id;

  RETURN 'Erreur: ' || SQLERRM;
END;
$$;
