/*
  ════════════════════════════════════════════════════════════════
  DIAGNOSTIC GÉNÉRATION IA RÉSEAUX SOCIAUX
  Vérifie ce qui manque pour que la génération fonctionne
  ════════════════════════════════════════════════════════════════
*/

-- ═══════════════════════════════════════════════════════════════
-- TEST 1: Vérifier table viral_templates existe
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'viral_templates'
  ) THEN
    RAISE NOTICE '✅ Table viral_templates existe';
  ELSE
    RAISE NOTICE '❌ Table viral_templates MANQUANTE';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- TEST 2: Compter templates viraux
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  template_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count FROM viral_templates;

  IF template_count > 0 THEN
    RAISE NOTICE '✅ Templates viraux: % trouvés', template_count;
  ELSE
    RAISE NOTICE '❌ AUCUN template viral en base !';
    RAISE NOTICE '→ Action requise: Exécuter PEUPLER-VILLES-ET-TEMPLATES-MAINTENANT.sql';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- TEST 3: Afficher templates existants
-- ═══════════════════════════════════════════════════════════════

SELECT
  name as "Nom Template",
  category as "Catégorie",
  performance_score as "Score",
  avg_views as "Vues Potentielles",
  is_active as "Actif"
FROM viral_templates
ORDER BY performance_score DESC;

-- ═══════════════════════════════════════════════════════════════
-- TEST 4: Vérifier fonction RPC get_viral_template existe
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'get_viral_template'
  ) THEN
    RAISE NOTICE '✅ Fonction get_viral_template existe';
  ELSE
    RAISE NOTICE '❌ Fonction get_viral_template MANQUANTE';
    RAISE NOTICE '→ Action requise: Exécuter migration 20251020100000';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- TEST 5: Tester fonction RPC get_viral_template
-- ═══════════════════════════════════════════════════════════════

SELECT
  'TEST get_viral_template()' as test,
  COUNT(*) as templates_retournes
FROM get_viral_template(NULL);

-- ═══════════════════════════════════════════════════════════════
-- TEST 6: Vérifier colonnes nécessaires table
-- ═══════════════════════════════════════════════════════════════

SELECT
  column_name as "Colonne",
  data_type as "Type",
  is_nullable as "Nullable"
FROM information_schema.columns
WHERE table_name = 'viral_templates'
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════
-- TEST 7: Vérifier RLS policies
-- ═══════════════════════════════════════════════════════════════

SELECT
  schemaname as "Schema",
  tablename as "Table",
  policyname as "Policy",
  roles as "Roles",
  cmd as "Commande"
FROM pg_policies
WHERE tablename = 'viral_templates';

-- ═══════════════════════════════════════════════════════════════
-- TEST 8: Vérifier table social_media_posts existe
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'social_media_posts'
  ) THEN
    RAISE NOTICE '✅ Table social_media_posts existe';
  ELSE
    RAISE NOTICE '⚠️  Table social_media_posts manquante (optionnel)';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- TEST 9: Vérifier Edge Function ai-viral-content-generator
-- ═══════════════════════════════════════════════════════════════

-- Note: On ne peut pas tester Edge Functions depuis SQL
-- Vérifier manuellement dans Dashboard → Edge Functions

-- ═══════════════════════════════════════════════════════════════
-- RÉSUMÉ DIAGNOSTIC
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  template_count INTEGER;
  has_function BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO template_count FROM viral_templates;
  SELECT EXISTS (SELECT FROM pg_proc WHERE proname = 'get_viral_template') INTO has_function;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 RÉSUMÉ DIAGNOSTIC';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  IF template_count > 0 THEN
    RAISE NOTICE '✅ Templates viraux: % en base', template_count;
  ELSE
    RAISE NOTICE '❌ PROBLÈME: Aucun template viral';
    RAISE NOTICE '   → Exécuter: PEUPLER-VILLES-ET-TEMPLATES-MAINTENANT.sql';
  END IF;

  IF has_function THEN
    RAISE NOTICE '✅ Fonction get_viral_template: OK';
  ELSE
    RAISE NOTICE '❌ PROBLÈME: Fonction manquante';
    RAISE NOTICE '   → Exécuter migration 20251020100000';
  END IF;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'IMPORTANT: Vérifier aussi dans Dashboard Supabase:';
  RAISE NOTICE '1. Settings → Secrets → OPENAI_API_KEY configuré';
  RAISE NOTICE '2. Edge Functions → ai-viral-content-generator déployée';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
