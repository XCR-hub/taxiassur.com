/*
  ══════════════════════════════════════════════════════════════════
  FIX : Fonction RPC get_viral_template manquante

  Cette fonction est appelée par l'edge function ai-viral-content-generator
  et retourne un template viral performant selon la catégorie demandée
  ══════════════════════════════════════════════════════════════════
*/

-- Supprimer si existe déjà
DROP FUNCTION IF EXISTS get_viral_template(text);

-- Créer la fonction qui retourne un template viral performant
CREATE OR REPLACE FUNCTION get_viral_template(p_category TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  template_text TEXT,
  hashtags TEXT[],
  emoji_pattern TEXT,
  engagement_tactics JSONB,
  avg_views BIGINT,
  performance_score INTEGER,
  platforms TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si catégorie spécifiée, retourner le template le plus performant de cette catégorie
  IF p_category IS NOT NULL THEN
    RETURN QUERY
    SELECT
      vt.id,
      vt.name,
      vt.category,
      vt.template_text,
      vt.hashtags,
      vt.emoji_pattern,
      vt.engagement_tactics,
      vt.avg_views,
      vt.performance_score,
      vt.platforms
    FROM viral_templates vt
    WHERE vt.category = p_category
    ORDER BY vt.performance_score DESC, vt.avg_views DESC
    LIMIT 1;
  ELSE
    -- Sinon, retourner le template le plus performant global
    RETURN QUERY
    SELECT
      vt.id,
      vt.name,
      vt.category,
      vt.template_text,
      vt.hashtags,
      vt.emoji_pattern,
      vt.engagement_tactics,
      vt.avg_views,
      vt.performance_score,
      vt.platforms
    FROM viral_templates vt
    ORDER BY vt.performance_score DESC, vt.avg_views DESC
    LIMIT 1;
  END IF;
END;
$$;

-- Donner accès public à la fonction (pour edge functions)
GRANT EXECUTE ON FUNCTION get_viral_template(TEXT) TO anon, authenticated, service_role;

-- Test de la fonction
DO $$
DECLARE
  test_result RECORD;
  total_templates INTEGER;
BEGIN
  -- Compter templates
  SELECT COUNT(*) INTO total_templates FROM viral_templates;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'TEST FONCTION get_viral_template';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Templates disponibles: %', total_templates;

  IF total_templates = 0 THEN
    RAISE WARNING '⚠️ ATTENTION: Table viral_templates est VIDE !';
    RAISE NOTICE 'Exécutez d''abord: FIX-2-PROBLEMES-URGENT.sql';
  ELSE
    -- Test 1: Sans catégorie (retourne le meilleur global)
    SELECT * INTO test_result FROM get_viral_template(NULL);

    IF FOUND THEN
      RAISE NOTICE '✅ Test 1 (sans catégorie): OK';
      RAISE NOTICE '   → Template: %', test_result.name;
      RAISE NOTICE '   → Score: %', test_result.performance_score;
      RAISE NOTICE '   → Vues: %M', (test_result.avg_views / 1000000.0)::NUMERIC(10,1);
    ELSE
      RAISE WARNING '❌ Test 1 échoué: Aucun template retourné';
    END IF;

    -- Test 2: Avec catégorie 'conseil'
    SELECT * INTO test_result FROM get_viral_template('conseil');

    IF FOUND THEN
      RAISE NOTICE '✅ Test 2 (catégorie "conseil"): OK';
      RAISE NOTICE '   → Template: %', test_result.name;
      RAISE NOTICE '   → Score: %', test_result.performance_score;
    ELSE
      RAISE NOTICE '⚠️ Test 2: Aucun template "conseil" trouvé';
    END IF;

    -- Test 3: Avec catégorie 'temoignage'
    SELECT * INTO test_result FROM get_viral_template('temoignage');

    IF FOUND THEN
      RAISE NOTICE '✅ Test 3 (catégorie "temoignage"): OK';
      RAISE NOTICE '   → Template: %', test_result.name;
      RAISE NOTICE '   → Score: %', test_result.performance_score;
    ELSE
      RAISE NOTICE '⚠️ Test 3: Aucun template "temoignage" trouvé';
    END IF;
  END IF;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
