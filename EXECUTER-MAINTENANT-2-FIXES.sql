/*
═══════════════════════════════════════════════════════════════════
⚡ EXÉCUTER CE SQL MAINTENANT - TOUT EN 1 FICHIER
═══════════════════════════════════════════════════════════════════

Ce fichier contient 2 corrections :

1. Créer get_viral_template → Résout erreur 500 génération IA
2. Corriger get_blog_posts → Résout erreur "published_at does not exist"

COPIEZ/COLLEZ TOUT CE FICHIER dans Supabase Dashboard → SQL Editor → RUN

═══════════════════════════════════════════════════════════════════
*/

-- ═════════════════════════════════════════════════════════════
-- FIX 1: Créer fonction get_viral_template (génération IA)
-- ═════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_viral_template(text);

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
  IF p_category IS NOT NULL THEN
    RETURN QUERY
    SELECT
      vt.id, vt.name, vt.category, vt.template_text,
      vt.hashtags, vt.emoji_pattern, vt.engagement_tactics,
      vt.avg_views, vt.performance_score, vt.platforms
    FROM viral_templates vt
    WHERE vt.category = p_category
    ORDER BY vt.performance_score DESC, vt.avg_views DESC
    LIMIT 1;
  ELSE
    RETURN QUERY
    SELECT
      vt.id, vt.name, vt.category, vt.template_text,
      vt.hashtags, vt.emoji_pattern, vt.engagement_tactics,
      vt.avg_views, vt.performance_score, vt.platforms
    FROM viral_templates vt
    ORDER BY vt.performance_score DESC, vt.avg_views DESC
    LIMIT 1;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_viral_template(TEXT) TO anon, authenticated, service_role;

-- ═════════════════════════════════════════════════════════════
-- FIX 2: Corriger fonction get_blog_posts (colonnes réelles uniquement)
-- ═════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_blog_posts();
DROP FUNCTION IF EXISTS get_blog_posts(integer);
DROP FUNCTION IF EXISTS get_blog_posts(integer, integer);

CREATE OR REPLACE FUNCTION get_blog_posts(
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id TEXT,
  slug TEXT,
  title TEXT,
  excerpt TEXT,
  content TEXT,
  meta_description TEXT,
  tags TEXT[],
  published BOOLEAN,
  reading_time INTEGER,
  faq JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.slug,
    bp.title,
    bp.excerpt,
    bp.content,
    bp.meta_description,
    bp.tags,
    bp.published,
    bp.reading_time,
    bp.faq,
    bp.created_at,
    bp.updated_at
  FROM blog_posts bp
  WHERE bp.published = true
  ORDER BY bp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_blog_posts(INTEGER, INTEGER) TO anon, authenticated, service_role;

-- ═════════════════════════════════════════════════════════════
-- TESTS (vérifier que tout fonctionne)
-- ═════════════════════════════════════════════════════════════

-- Test 1: get_viral_template doit retourner 1 template
SELECT name, category, performance_score
FROM get_viral_template(NULL)
LIMIT 1;

-- Test 2: get_blog_posts doit retourner les articles publiés
SELECT id, title, published
FROM get_blog_posts(5, 0);

/*
═══════════════════════════════════════════════════════════════════
✅ RÉSULTATS ATTENDUS
═══════════════════════════════════════════════════════════════════

Test 1 → 1 ligne avec template viral
Test 2 → 5 lignes avec articles blog (ou moins si < 5 articles)

Si vous voyez ces résultats : TOUT EST OK ! ✅

Puis retestez sur le site :
- /backoffice/social-media → Génération IA → Plus d'erreur 500
- /blog → Articles affichés correctement

═══════════════════════════════════════════════════════════════════
*/
