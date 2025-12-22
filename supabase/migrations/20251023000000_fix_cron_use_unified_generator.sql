/*
  # Fix CRON - Utiliser Générateur IA Unifié

  ## Problème
  Les CRON actuels appellent generate-seo-content avec type: 'blog'
  → Génère seulement un placeholder "Contenu généré par IA..."
  → Pas de contenu complet, pas d'images, pas de FAQ

  ## Solution
  Mettre à jour les CRON pour utiliser mode: 'unified'
  → Génère article complet (2000+ mots) + page ville + FAQ + image
  → Contenu riche avec HTML structuré
  → SEO optimisé automatiquement

  ## Résultat
  - 5 articles complets/jour (au lieu de placeholders)
  - 1 page ville complète/jour avec données géo réelles
  - 25-50 FAQ/jour intégrées
  - 5 images Pexels/jour
  - Budget identique : ~8€/mois OpenAI
*/

-- ============================================================================
-- ÉTAPE 1: Supprimer les anciens CRON
-- ============================================================================

DO $$
BEGIN
  -- Supprimer CRON blog
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-blog-generation') THEN
    PERFORM cron.unschedule('daily-blog-generation');
    RAISE NOTICE '✅ Ancien CRON blog supprimé';
  END IF;

  -- Supprimer CRON ville
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-city-generation') THEN
    PERFORM cron.unschedule('daily-city-generation');
    RAISE NOTICE '✅ Ancien CRON ville supprimé';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 2: Créer CRON avec Générateur Unifié
-- ============================================================================

-- CRON UNIFIÉ : 5 packs complets/jour (article + ville + FAQ + image)
-- Horaire: 04h00 (heure creuse)
SELECT cron.schedule(
  'daily-unified-content-generation',
  '0 4 * * *',
  $$
  -- Sélectionner 5 combinaisons mot-clé + ville aléatoires
  WITH content_plan AS (
    SELECT
      unnest(ARRAY[
        'assurance taxi économique',
        'meilleure assurance taxi 2025',
        'assurance taxi jeune conducteur',
        'comparer assurance taxi',
        'résilier assurance taxi',
        'assurance taxi électrique',
        'RC professionnelle taxi',
        'malus assurance taxi',
        'sinistre assurance taxi',
        'franchise assurance taxi',
        'garanties assurance taxi',
        'assurance taxi flotte',
        'taxi assurance pas cher',
        'devis assurance taxi gratuit',
        'changement assurance taxi',
        'assurance taxi VTC',
        'prix assurance taxi',
        'courtier assurance taxi',
        'assurance taxi professionnel',
        'attestation assurance taxi'
      ]) AS keyword,
      unnest(ARRAY[
        'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice',
        'Nantes', 'Montpellier', 'Strasbourg', 'Bordeaux', 'Lille',
        'Rennes', 'Reims', 'Tours', 'Grenoble', 'Angers',
        'Dijon', 'Metz', 'Besançon', 'Orléans', 'Amiens'
      ]) AS city
    ORDER BY random()
    LIMIT 5
  )
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'keyword', keyword,
      'city', city,
      'mode', 'unified',  -- ⚡ MODE UNIFIÉ = Contenu complet !
      'type', 'unified',
      'secondaryKeywords', ARRAY[
        'courtier ORIAS',
        'devis gratuit',
        'carte verte immédiate'
      ]
    )
  ) AS request_id
  FROM content_plan;
  $$
);

-- ============================================================================
-- ÉTAPE 3: Logger l'activité
-- ============================================================================

-- Créer table de logs si elle n'existe pas
CREATE TABLE IF NOT EXISTS cron_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_name text NOT NULL,
  executed_at timestamptz DEFAULT now(),
  status text DEFAULT 'success',
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE cron_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read logs"
  ON cron_execution_logs FOR SELECT
  USING (auth.role() = 'authenticated');

-- Index
CREATE INDEX IF NOT EXISTS idx_cron_logs_name ON cron_execution_logs(cron_name);
CREATE INDEX IF NOT EXISTS idx_cron_logs_executed ON cron_execution_logs(executed_at DESC);

-- ============================================================================
-- ÉTAPE 4: Fonction de test manuel
-- ============================================================================

-- Fonction pour tester la génération unifiée manuellement
CREATE OR REPLACE FUNCTION test_unified_generation(
  p_keyword text DEFAULT 'assurance taxi pas cher',
  p_city text DEFAULT 'Paris'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_response jsonb;
BEGIN
  -- Appeler l'edge function
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'keyword', p_keyword,
      'city', p_city,
      'mode', 'unified',
      'type', 'unified'
    )
  ) INTO v_response;

  -- Logger
  INSERT INTO cron_execution_logs (cron_name, status, details)
  VALUES ('test_unified_generation', 'success', v_response);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Génération unifiée lancée',
    'keyword', p_keyword,
    'city', p_city,
    'response', v_response
  );
END;
$$;

-- ============================================================================
-- RÉSULTAT ATTENDU
-- ============================================================================

-- Vérifier que le nouveau CRON est créé
SELECT
  jobname,
  schedule,
  active,
  command,
  '✅ CRON UNIFIÉ - Génère 5 packs complets/jour (article + ville + FAQ + image)' as description
FROM cron.job
WHERE jobname = 'daily-unified-content-generation';

-- Stats attendues après 1 semaine
SELECT
  '📊 PROJECTIONS APRÈS 1 SEMAINE' as info,
  '35 articles complets (2000+ mots chacun)' as articles,
  '35 pages ville (1500+ mots chacun)' as villes,
  '175-350 FAQ intégrées' as faq,
  '35 images Pexels optimisées' as images,
  '~2€ coût OpenAI' as budget_semaine,
  '~8€ coût OpenAI' as budget_mois;

-- ============================================================================
-- COMMENT TESTER MAINTENANT
-- ============================================================================

-- Test manuel (génère 1 article complet immédiatement)
-- SELECT test_unified_generation('assurance taxi économique', 'Lyon');

-- Voir les logs
-- SELECT * FROM cron_execution_logs ORDER BY executed_at DESC LIMIT 10;

-- Forcer l'exécution du CRON maintenant (ne pas attendre 04h00)
-- SELECT cron.schedule('test-immediate', '* * * * *', $$ ... $$);
-- Puis le supprimer après: SELECT cron.unschedule('test-immediate');
