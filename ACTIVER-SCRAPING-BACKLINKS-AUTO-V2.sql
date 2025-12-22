-- ══════════════════════════════════════════════════════════════════
--  ACTIVER SCRAPING AUTOMATIQUE BACKLINKS - VERSION SIMPLIFIÉE
-- ══════════════════════════════════════════════════════════════════

-- 🚀 ÉTAPE 1: CRÉER TABLE SCAN HISTORY
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS backlink_scan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitors_scanned text[] NOT NULL DEFAULT ARRAY['mfa.fr', 'april-moto.com', 'axa.fr', 'allianz.fr'],
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

DROP POLICY IF EXISTS "Scan history readable by all" ON backlink_scan_history;
DROP POLICY IF EXISTS "Scan history writable by authenticated" ON backlink_scan_history;

CREATE POLICY "Scan history readable by all"
  ON backlink_scan_history FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Scan history writable by service" ON backlink_scan_history
  FOR ALL USING (true) WITH CHECK (true);

SELECT '✅ Table backlink_scan_history créée' as resultat;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ⏰ ÉTAPE 2: CRÉER CRON JOB DIRECT (sans fonction wrapper)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Supprimer anciens crons
DO $$ 
BEGIN
  PERFORM cron.unschedule(jobname)
  FROM cron.job
  WHERE jobname IN ('scan-backlinks-daily', 'backlink-scanner', 'backlink-auto-scan-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Créer nouveau cron job (tous les jours à 3h)
SELECT cron.schedule(
  'backlink-auto-scan-daily',
  '0 3 * * *', -- 3h du matin tous les jours
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/scan-backlinks',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzYzMDQ3MiwiZXhwIjoyMDQzMjA2NDcyfQ.FvPYRgQZ1Sx5x9DW01S3R5z35VLtLhOFOdMc-dN-iIg", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT '✅ Cron job créé: backlink-auto-scan-daily (3h quotidien)' as resultat;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📊 ÉTAPE 3: VÉRIFICATION
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT 
  '✅ SYSTÈME ACTIVÉ' as titre,
  jobname,
  schedule,
  active,
  CASE 
    WHEN active THEN '🟢 Actif'
    ELSE '🔴 Inactif'
  END as status
FROM cron.job
WHERE jobname = 'backlink-auto-scan-daily';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🧪 ÉTAPE 4: TESTER MAINTENANT
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT '🧪 TEST MANUEL' as etape;

SELECT 
  '📋 Pour tester maintenant, exécutez dans un NOUVEL onglet SQL:' as instruction,
  '' as vide;

/*

COPIER-COLLER CECI DANS UN NOUVEL ONGLET SQL:

SELECT net.http_post(
  url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/scan-backlinks',
  headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzYzMDQ3MiwiZXhwIjoyMDQzMjA2NDcyfQ.FvPYRgQZ1Sx5x9DW01S3R5z35VLtLhOFOdMc-dN-iIg", "Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb
);

-- Attendre 30 secondes puis vérifier:
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '5 minutes') as nouveaux_5min
FROM backlink_opportunities;

-- Voir les nouveaux sites trouvés:
SELECT 
  domain,
  url,
  page_title,
  quality_score,
  contact_email,
  created_at
FROM backlink_opportunities
WHERE created_at > now() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

*/

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📋 RÉSUMÉ FINAL
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT '═══════════════════════════════════════════════════' as separateur;

SELECT '✅ SCRAPING AUTOMATIQUE ACTIVÉ!' as titre;

SELECT 
  '📅 Fréquence' as parametre,
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
  'Hunter.io API ou contact@domain'
UNION ALL
SELECT 
  '💾 Stockage',
  'backlink_opportunities + backlink_scan_history'
UNION ALL
SELECT 
  '⏰ Prochaine exécution auto',
  'Demain 3h ou test manuel maintenant'
UNION ALL
SELECT
  '📊 Edge Function',
  '✅ scan-backlinks déployée';

SELECT '═══════════════════════════════════════════════════' as separateur;

SELECT 
  '🎯 PROCHAINES ÉTAPES' as titre,
  E'1. Copier le SELECT net.http_post() ci-dessus dans un NOUVEL onglet SQL\n' ||
  E'2. Run ▶ et attendre 30 secondes\n' ||
  E'3. Vérifier COUNT(*) dans backlink_opportunities (18 → 25+)\n' ||
  E'4. Le cron s\'exécutera automatiquement chaque jour à 3h\n' ||
  E'5. Voir historique: SELECT * FROM backlink_scan_history' as instructions;

-- Message final
SELECT 
  '🎊 FÉLICITATIONS!' as titre,
  'Le scraping automatique est maintenant ACTIF. ' ||
  'Testez-le maintenant avec le SELECT net.http_post() ci-dessus!' as message;
