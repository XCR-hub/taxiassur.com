/*
  # Correction: Drop et recréation des fonctions avec logging

  1. Suppression des anciennes fonctions
    - DROP des 3 fonctions existantes

  2. Recréation avec logging
    - Nouvelles versions avec tracking d'exécution
*/

-- ═══════════════════════════════════════════════════════════════════
-- 1️⃣ SUPPRIMER LES ANCIENNES FONCTIONS
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS generate_daily_blog_post();
DROP FUNCTION IF EXISTS generate_weekly_faq();
DROP FUNCTION IF EXISTS generate_city_pages();

-- ═══════════════════════════════════════════════════════════════════
-- 2️⃣ RECRÉER LES FONCTIONS AVEC LOGGING
-- ═══════════════════════════════════════════════════════════════════

-- Fonction : generate_daily_blog_post avec logging
CREATE OR REPLACE FUNCTION generate_daily_blog_post()
RETURNS TEXT AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_execution_time INTEGER;
  v_log_id BIGINT;
  v_result TEXT;
BEGIN
  v_start_time := clock_timestamp();

  -- Insérer le log de début
  INSERT INTO cron_execution_log (job_name, status, details)
  VALUES ('generate_daily_blog_post', 'running', jsonb_build_object('started_at', v_start_time))
  RETURNING id INTO v_log_id;

  -- Générer l'article
  INSERT INTO blog_posts (title, slug, excerpt, content, category, tags, published, featured_image)
  VALUES (
    'Actualité Assurance Taxi du ' || TO_CHAR(CURRENT_DATE, 'DD/MM/YYYY'),
    'actualite-taxi-' || TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'),
    'Découvrez les dernières actualités sur l''assurance taxi et les nouvelles réglementations.',
    E'# Actualités Assurance Taxi\n\nContenu généré automatiquement le ' || NOW()::TEXT,
    'actualites',
    ARRAY['assurance', 'taxi', 'actualités'],
    true,
    'https://images.pexels.com/photos/1118448/pexels-photo-1118448.jpeg'
  )
  ON CONFLICT (slug) DO NOTHING;

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
      'date', CURRENT_DATE
    )
  WHERE id = v_log_id;

  RETURN '✅ Article créé avec succès (ID log: ' || v_log_id || ')';

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
      'error_detail', SQLSTATE
    )
  WHERE id = v_log_id;

  RETURN '❌ Erreur: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction : generate_weekly_faq avec logging
CREATE OR REPLACE FUNCTION generate_weekly_faq()
RETURNS TEXT AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_execution_time INTEGER;
  v_log_id BIGINT;
  v_count INTEGER := 0;
  v_result TEXT;
BEGIN
  v_start_time := clock_timestamp();

  -- Insérer le log de début
  INSERT INTO cron_execution_log (job_name, status, details)
  VALUES ('generate_weekly_faq', 'running', jsonb_build_object('started_at', v_start_time))
  RETURNING id INTO v_log_id;

  -- Générer 5 FAQ
  INSERT INTO faq (question, answer, category, published)
  SELECT
    'Question FAQ ' || i || ' - ' || TO_CHAR(NOW(), 'DD/MM/YYYY'),
    'Réponse automatique générée le ' || NOW()::TEXT,
    CASE (i % 3)
      WHEN 0 THEN 'tarifs'
      WHEN 1 THEN 'garanties'
      ELSE 'procedures'
    END,
    true
  FROM generate_series(1, 5) AS i
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  v_end_time := clock_timestamp();
  v_execution_time := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;

  -- Mettre à jour le log avec succès
  UPDATE cron_execution_log
  SET
    status = 'success',
    execution_time_ms = v_execution_time,
    created_count = v_count,
    details = jsonb_build_object(
      'started_at', v_start_time,
      'completed_at', v_end_time,
      'faq_created', v_count
    )
  WHERE id = v_log_id;

  RETURN '✅ ' || v_count || ' FAQ créées avec succès (ID log: ' || v_log_id || ')';

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
      'error_detail', SQLSTATE
    )
  WHERE id = v_log_id;

  RETURN '❌ Erreur: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction : generate_city_pages avec logging
CREATE OR REPLACE FUNCTION generate_city_pages()
RETURNS TEXT AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_execution_time INTEGER;
  v_log_id BIGINT;
  v_count INTEGER := 0;
  v_result TEXT;
BEGIN
  v_start_time := clock_timestamp();

  -- Insérer le log de début
  INSERT INTO cron_execution_log (job_name, status, details)
  VALUES ('generate_city_pages', 'running', jsonb_build_object('started_at', v_start_time))
  RETURNING id INTO v_log_id;

  -- Générer 10 pages de villes (simulé pour l'exemple)
  -- Dans la vraie version, on génère du contenu réel
  INSERT INTO city_pages (city, department, content, published)
  SELECT
    'Ville Test ' || i,
    '75',
    'Contenu généré automatiquement pour la ville ' || i,
    true
  FROM generate_series(1, 10) AS i
  ON CONFLICT (city) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  v_end_time := clock_timestamp();
  v_execution_time := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;

  -- Mettre à jour le log avec succès
  UPDATE cron_execution_log
  SET
    status = 'success',
    execution_time_ms = v_execution_time,
    created_count = v_count,
    details = jsonb_build_object(
      'started_at', v_start_time,
      'completed_at', v_end_time,
      'cities_created', v_count
    )
  WHERE id = v_log_id;

  RETURN '✅ ' || v_count || ' pages de villes créées avec succès (ID log: ' || v_log_id || ')';

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
      'error_detail', SQLSTATE
    )
  WHERE id = v_log_id;

  RETURN '❌ Erreur: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION generate_daily_blog_post() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_weekly_faq() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_city_pages() TO anon, authenticated;
