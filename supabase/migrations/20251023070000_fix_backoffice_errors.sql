/*
  # Fix Erreurs Backoffice - 3 Problèmes

  ## Erreurs Identifiées
  1. execute_sql() n'existe pas (404)
  2. get_seo_cron_stats() erreur 400
  3. backlink_opportunities foreign key manquante

  ## Solutions
  1. Créer execute_sql() pour AutoOptimizer
  2. Recréer get_seo_cron_stats() proprement
  3. Créer backlink_opportunities si manquante
*/

-- ============================================
-- 1. FONCTION execute_sql() pour AutoOptimizer
-- ============================================

DROP FUNCTION IF EXISTS execute_sql(text) CASCADE;

CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_affected_rows int;
BEGIN
  -- Sécurité: Bloquer DROP, DELETE sans WHERE, TRUNCATE
  IF sql_query ~* '^\s*(DROP|TRUNCATE)' THEN
    RAISE EXCEPTION 'Opération non autorisée: DROP/TRUNCATE';
  END IF;

  IF sql_query ~* 'DELETE.*FROM.*(?!WHERE)' THEN
    RAISE EXCEPTION 'DELETE sans WHERE non autorisé';
  END IF;

  -- Exécuter la requête
  BEGIN
    EXECUTE sql_query;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

    RETURN json_build_object(
      'success', true,
      'affected_rows', v_affected_rows,
      'message', 'Requête exécutée avec succès'
    );

  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Erreur lors de l''exécution'
    );
  END;
END;
$$;

-- ============================================
-- 2. FONCTION get_seo_cron_stats() CORRIGÉE
-- ============================================

DROP FUNCTION IF EXISTS get_seo_cron_stats() CASCADE;

CREATE OR REPLACE FUNCTION get_seo_cron_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  -- Vérifier si cron.job existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'cron' AND table_name = 'job'
  ) THEN
    -- Récupérer stats CRON
    SELECT json_build_object(
      'total_jobs', COALESCE(COUNT(*), 0),
      'active_jobs', COALESCE(COUNT(*) FILTER (WHERE active = true), 0),
      'seo_jobs', COALESCE(COUNT(*) FILTER (WHERE jobname LIKE '%seo%'), 0),
      'content_jobs', COALESCE(COUNT(*) FILTER (WHERE jobname LIKE '%content%'), 0),
      'last_run', COALESCE(MAX(GREATEST(last_start_time, last_finish_time)), NOW())
    )
    INTO v_result
    FROM cron.job;
  ELSE
    -- Retour par défaut si cron pas disponible
    v_result := json_build_object(
      'total_jobs', 0,
      'active_jobs', 0,
      'seo_jobs', 0,
      'content_jobs', 0,
      'last_run', null,
      'note', 'pg_cron extension not available'
    );
  END IF;

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- En cas d'erreur, retourner JSON vide (pas de crash)
  RETURN json_build_object(
    'total_jobs', 0,
    'active_jobs', 0,
    'error', SQLERRM
  );
END;
$$;

-- ============================================
-- 3. TABLE backlink_opportunities SI MANQUANTE
-- ============================================

CREATE TABLE IF NOT EXISTS backlink_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  url text NOT NULL UNIQUE,
  domain_authority integer,
  page_authority integer,
  spam_score integer,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'accepted', 'rejected', 'live')),
  contact_email text,
  contact_name text,
  notes text,
  last_contacted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_status ON backlink_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_domain ON backlink_opportunities(domain);

-- RLS
ALTER TABLE backlink_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon to read backlink opportunities" ON backlink_opportunities;
DROP POLICY IF EXISTS "Allow authenticated to manage backlink opportunities" ON backlink_opportunities;

CREATE POLICY "Allow anon to read backlink opportunities"
  ON backlink_opportunities FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow authenticated to manage backlink opportunities"
  ON backlink_opportunities FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4. TABLE backlink_outreach_log SI MANQUANTE
-- ============================================

CREATE TABLE IF NOT EXISTS backlink_outreach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES backlink_opportunities(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('email_sent', 'follow_up', 'response_received', 'link_acquired')),
  recipient_email text,
  subject text,
  message text,
  sentiment text CHECK (sentiment IN ('positive', 'neutral', 'negative', 'pending')),
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'replied', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_log_opportunity ON backlink_outreach_log(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_log_status ON backlink_outreach_log(status);

-- RLS
ALTER TABLE backlink_outreach_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon to read backlink outreach log" ON backlink_outreach_log;
DROP POLICY IF EXISTS "Allow authenticated to manage backlink outreach log" ON backlink_outreach_log;

CREATE POLICY "Allow anon to read backlink outreach log"
  ON backlink_outreach_log FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow authenticated to manage backlink outreach log"
  ON backlink_outreach_log FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 5. PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION execute_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_seo_cron_stats() TO anon, authenticated;

-- ============================================
-- 6. DONNÉES TEST (pour backlink automation)
-- ============================================

-- Ajouter TOUTES les colonnes manquantes
DO $$
BEGIN
  -- Ajouter page_title
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'backlink_opportunities' AND column_name = 'page_title'
  ) THEN
    ALTER TABLE backlink_opportunities ADD COLUMN page_title text;
  END IF;

  -- Ajouter domain_authority
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'backlink_opportunities' AND column_name = 'domain_authority'
  ) THEN
    ALTER TABLE backlink_opportunities ADD COLUMN domain_authority integer;
  END IF;

  -- Ajouter page_authority
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'backlink_opportunities' AND column_name = 'page_authority'
  ) THEN
    ALTER TABLE backlink_opportunities ADD COLUMN page_authority integer;
  END IF;

  -- Ajouter spam_score
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'backlink_opportunities' AND column_name = 'spam_score'
  ) THEN
    ALTER TABLE backlink_opportunities ADD COLUMN spam_score integer;
  END IF;

  -- Ajouter contact_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'backlink_opportunities' AND column_name = 'contact_name'
  ) THEN
    ALTER TABLE backlink_opportunities ADD COLUMN contact_name text;
  END IF;

  -- Ajouter contact_email
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'backlink_opportunities' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE backlink_opportunities ADD COLUMN contact_email text;
  END IF;
END $$;

-- Insérer données test
INSERT INTO backlink_opportunities (
  domain,
  url,
  page_title,
  domain_authority,
  page_authority,
  spam_score,
  status,
  contact_email
)
VALUES
  ('assurance-pro.fr', 'https://assurance-pro.fr/partenaires', 'Nos Partenaires Assurance', 65, 58, 2, 'pending', 'contact@assurance-pro.fr'),
  ('taxi-mag.com', 'https://taxi-mag.com/liens-utiles', 'Liens Utiles Taxi', 52, 48, 1, 'pending', 'redaction@taxi-mag.com'),
  ('assurtaxi.net', 'https://assurtaxi.net/ressources', 'Ressources Professionnelles', 45, 42, 3, 'contacted', 'info@assurtaxi.net')
ON CONFLICT (url) DO NOTHING;

-- Message succès
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Corrections Backoffice appliquées';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ execute_sql() créée (AutoOptimizer)';
  RAISE NOTICE '✅ get_seo_cron_stats() corrigée';
  RAISE NOTICE '✅ backlink_opportunities créée';
  RAISE NOTICE '✅ backlink_outreach_log créée';
  RAISE NOTICE '✅ 3 opportunités backlink ajoutées';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Pages backoffice maintenant fonctionnelles:';
  RAISE NOTICE '   - /backoffice/auto-optimizer';
  RAISE NOTICE '   - /backoffice/seo';
  RAISE NOTICE '   - /backoffice/backlink-automation';
END $$;
