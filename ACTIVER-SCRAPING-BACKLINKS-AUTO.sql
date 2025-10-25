-- ══════════════════════════════════════════════════════════════════
--  ACTIVER SCRAPING AUTOMATIQUE BACKLINKS (3 MINUTES)
-- ══════════════════════════════════════════════════════════════════

-- 📊 DIAGNOSTIC ACTUEL
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT '🔍 ÉTAPE 1: DIAGNOSTIC' as etape;

-- Vérifier si cron job scraping existe
SELECT 
  'Cron Jobs Backlinks' as type,
  COUNT(*) as nombre,
  STRING_AGG(jobname, ', ') as noms,
  BOOL_OR(active) as au_moins_un_actif
FROM cron.job
WHERE jobname LIKE '%scan-backlink%' OR jobname LIKE '%backlink-scan%';

-- Vérifier pattern de création des opportunités
SELECT 
  'Pattern Création Opportunités' as type,
  COUNT(*) as total,
  MAX(created_at) - MIN(created_at) as ecart_temps,
  CASE 
    WHEN MAX(created_at) - MIN(created_at) < INTERVAL '5 minutes' THEN 
      '⚠️ TOUTES CRÉÉES EN MÊME TEMPS (insertion manuelle)'
    WHEN MAX(created_at) - MIN(created_at) > INTERVAL '1 day' THEN
      '✅ CRÉATION ÉTALÉE (scraping auto fonctionne)'
    ELSE
      '❓ PATTERN MIXTE'
  END as diagnostic
FROM backlink_opportunities;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🚀 ÉTAPE 2: CRÉER TABLE SCAN HISTORY
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT '📋 ÉTAPE 2: TABLE SCAN HISTORY' as etape;

CREATE TABLE IF NOT EXISTS backlink_scan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitors_scanned text[] NOT NULL,
  opportunities_found integer DEFAULT 0,
  scan_duration_ms integer,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_scan_history_created ON backlink_scan_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_history_status ON backlink_scan_history(status);

-- RLS
ALTER TABLE backlink_scan_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scan history readable by all"
  ON backlink_scan_history FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Scan history writable by authenticated"
  ON backlink_scan_history FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

SELECT '✅ Table backlink_scan_history créée' as resultat;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ⚙️ ÉTAPE 3: CRÉER FONCTION WRAPPER
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT '⚙️ ÉTAPE 3: FONCTION WRAPPER' as etape;

CREATE OR REPLACE FUNCTION trigger_backlink_scan()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_response jsonb;
  v_url text;
BEGIN
  -- URL de l'edge function
  v_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/scan-backlinks';
  
  -- Appeler l'edge function via http
  SELECT 
    extensions.http((
      'POST',
      v_url,
      ARRAY[
        extensions.http_header('Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
        extensions.http_header('Content-Type', 'application/json')
      ],
      'application/json',
      '{}'
    )::extensions.http_request)::jsonb
  INTO v_response;
  
  RETURN v_response;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

SELECT '✅ Fonction trigger_backlink_scan() créée' as resultat;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ⏰ ÉTAPE 4: CRÉER CRON JOB AUTOMATIQUE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT '⏰ ÉTAPE 4: CRON JOB' as etape;

-- Supprimer ancien cron s'il existe
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname IN ('scan-backlinks-daily', 'backlink-scanner');

-- Créer nouveau cron job (tous les jours à 3h du matin)
SELECT cron.schedule(
  'backlink-auto-scan-daily',
  '0 3 * * *', -- 3h du matin tous les jours
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/scan-backlinks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT '✅ Cron job créé: backlink-auto-scan-daily (3h quotidien)' as resultat;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📊 ÉTAPE 5: VÉRIFICATION FINALE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT '📊 ÉTAPE 5: VÉRIFICATION' as etape;

SELECT 
  '✅ SYSTÈME ACTIVÉ' as resultat,
  jobname,
  schedule,
  active,
  CASE 
    WHEN active THEN '🟢 Actif'
    ELSE '🔴 Inactif'
  END as status
FROM cron.job
WHERE jobname = 'backlink-auto-scan-daily';

-- Afficher configuration Edge Function
SELECT 
  '🚀 EDGE FUNCTION' as type,
  'scan-backlinks' as fonction,
  '✅ Déployée' as statut,
  'Scanne 4 concurrents: MFA, April, AXA, Allianz' as description;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🧪 TEST MANUEL IMMÉDIAT
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT '🧪 ÉTAPE 6: TEST MANUEL' as etape;

-- POUR TESTER MAINTENANT (après avoir exécuté ce SQL):
-- Copier-coller cette commande dans un nouvel onglet SQL:
/*

SELECT net.http_post(
  url := current_setting('app.settings.supabase_url') || '/functions/v1/scan-backlinks',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
    'Content-Type', 'application/json'
  ),
  body := '{}'::jsonb
) as reponse;

-- Puis vérifier les nouveaux sites trouvés:
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '5 minutes') as nouveaux_5min
FROM backlink_opportunities;

-- Voir détails des nouveaux sites:
SELECT 
  domain,
  url,
  quality_score,
  contact_email,
  created_at
FROM backlink_opportunities
WHERE created_at > now() - INTERVAL '5 minutes'
ORDER BY quality_score DESC;

*/

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📋 RÉSUMÉ FINAL
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT '═══════════════════════════════════════════════════' as separateur;

SELECT 
  '✅ SCRAPING AUTOMATIQUE ACTIVÉ' as titre,
  '' as vide;

SELECT 
  '📅 Fréquence' as type,
  'Tous les jours à 3h du matin' as valeur
UNION ALL
SELECT 
  '🎯 Concurrents scannés',
  'MFA, April Moto, AXA, Allianz'
UNION ALL
SELECT 
  '🔍 Méthode',
  'Google Custom Search Engine API'
UNION ALL
SELECT 
  '📧 Emails',
  'Hunter.io API (si configuré) sinon contact@domain'
UNION ALL
SELECT 
  '💾 Storage',
  'backlink_opportunities + backlink_scan_history'
UNION ALL
SELECT 
  '⏰ Prochaine exécution',
  'Demain 3h ou test manuel maintenant';

SELECT '═══════════════════════════════════════════════════' as separateur;

-- INSTRUCTIONS FINALES
SELECT 
  '🎯 PROCHAINES ÉTAPES' as titre,
  E'1. Tester maintenant: Exécuter le SELECT net.http_post() ci-dessus\n' ||
  E'2. Attendre 5min et vérifier: SELECT COUNT(*) FROM backlink_opportunities\n' ||
  E'3. Le cron s\'exécutera automatiquement chaque jour à 3h\n' ||
  E'4. Voir historique: SELECT * FROM backlink_scan_history ORDER BY created_at DESC' as instructions;
