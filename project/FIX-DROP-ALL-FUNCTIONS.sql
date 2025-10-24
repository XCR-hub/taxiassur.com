-- ============================================================================
-- ÉTAPE 1 : Identifier et supprimer TOUTES les versions des fonctions
-- ============================================================================
-- Ce script liste d'abord les fonctions existantes, puis les supprime toutes

-- Voir toutes les versions de get_blog_posts
SELECT
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  'DROP FUNCTION IF EXISTS public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') CASCADE;' as drop_command
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE 'get_%'
ORDER BY p.proname, p.oid;

-- Supprimer TOUTES les versions possibles de get_blog_posts
DROP FUNCTION IF EXISTS public.get_blog_posts() CASCADE;
DROP FUNCTION IF EXISTS public.get_blog_posts(integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_blog_posts(integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_blog_posts(int) CASCADE;
DROP FUNCTION IF EXISTS public.get_blog_posts(int, int) CASCADE;
DROP FUNCTION IF EXISTS public.get_blog_posts(limit_count integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_blog_posts(limit_count integer, offset_count integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_blog_posts(limit_count int) CASCADE;
DROP FUNCTION IF EXISTS public.get_blog_posts(limit_count int, offset_count int) CASCADE;

-- Supprimer TOUTES les versions possibles de get_news
DROP FUNCTION IF EXISTS public.get_news() CASCADE;
DROP FUNCTION IF EXISTS public.get_news(integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_news(integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_news(int) CASCADE;
DROP FUNCTION IF EXISTS public.get_news(int, int) CASCADE;
DROP FUNCTION IF EXISTS public.get_news(limit_count integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_news(limit_count integer, offset_count integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_news(limit_count int) CASCADE;
DROP FUNCTION IF EXISTS public.get_news(limit_count int, offset_count int) CASCADE;

-- Supprimer TOUTES les versions possibles de get_faqs
DROP FUNCTION IF EXISTS public.get_faqs() CASCADE;
DROP FUNCTION IF EXISTS public.get_faqs(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_faqs(category_filter text) CASCADE;

-- Supprimer TOUTES les versions possibles de get_leads
DROP FUNCTION IF EXISTS public.get_leads() CASCADE;
DROP FUNCTION IF EXISTS public.get_leads(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_leads(text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_leads(text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_leads(text, int) CASCADE;
DROP FUNCTION IF EXISTS public.get_leads(text, int, int) CASCADE;
DROP FUNCTION IF EXISTS public.get_leads(status_filter text) CASCADE;
DROP FUNCTION IF EXISTS public.get_leads(status_filter text, limit_count integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_leads(status_filter text, limit_count integer, offset_count integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_leads(status_filter text, limit_count int) CASCADE;
DROP FUNCTION IF EXISTS public.get_leads(status_filter text, limit_count int, offset_count int) CASCADE;

-- Supprimer TOUTES les versions possibles de get_dashboard_stats
DROP FUNCTION IF EXISTS public.get_dashboard_stats() CASCADE;

-- Supprimer TOUTES les versions possibles de search_content
DROP FUNCTION IF EXISTS public.search_content(text) CASCADE;
DROP FUNCTION IF EXISTS public.search_content(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.search_content(search_query text) CASCADE;
DROP FUNCTION IF EXISTS public.search_content(search_query text, content_type text) CASCADE;

-- Supprimer TOUTES les versions possibles de get_cron_config
DROP FUNCTION IF EXISTS public.get_cron_config(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_cron_config(config_key text) CASCADE;

-- ============================================================================
-- ÉTAPE 2 : Créer/Vérifier la table de configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cron_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.cron_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can read cron config" ON public.cron_config;

CREATE POLICY "Service role can read cron config"
  ON public.cron_config FOR SELECT
  TO service_role
  USING (true);

INSERT INTO public.cron_config (key, value)
VALUES
  ('supabase_url', 'https://drohhxrkoequjphvabvq.supabase.co'),
  ('service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- ============================================================================
-- ÉTAPE 3 : Créer les nouvelles fonctions
-- ============================================================================

-- Fonction 1 : get_cron_config
CREATE FUNCTION public.get_cron_config(config_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_value text;
BEGIN
  SELECT value INTO config_value FROM public.cron_config WHERE key = config_key;
  RETURN config_value;
END;
$$;

-- Fonction 2 : get_blog_posts
CREATE FUNCTION public.get_blog_posts(
  limit_count int DEFAULT 50,
  offset_count int DEFAULT 0
)
RETURNS TABLE (
  id uuid, title text, slug text, excerpt text, content text,
  published boolean, published_at timestamptz, author text,
  category text, tags text[], meta_title text, meta_description text,
  featured_image text, read_time int, views int, created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT bp.id, bp.title, bp.slug, bp.excerpt, bp.content, bp.published,
         bp.published_at, bp.author, bp.category, bp.tags, bp.meta_title,
         bp.meta_description, bp.featured_image, bp.read_time, bp.views, bp.created_at
  FROM blog_posts bp
  WHERE bp.published = true
  ORDER BY bp.published_at DESC NULLS LAST, bp.created_at DESC
  LIMIT limit_count OFFSET offset_count;
END;
$$;

-- Fonction 3 : get_news
CREATE FUNCTION public.get_news(
  limit_count int DEFAULT 20,
  offset_count int DEFAULT 0
)
RETURNS TABLE (
  id uuid, title text, slug text, content text, excerpt text,
  published_at timestamptz, category text, tags text[], featured_image text,
  views int, created_at timestamptz, published boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT n.id, n.title, n.slug, n.content, n.excerpt, n.published_at,
         n.category, n.tags, n.featured_image, COALESCE(n.views, 0) as views,
         n.created_at, COALESCE(n.published, true) as published
  FROM news n
  WHERE COALESCE(n.published, true) = true
  ORDER BY n.published_at DESC NULLS LAST, n.created_at DESC
  LIMIT limit_count OFFSET offset_count;
END;
$$;

-- Fonction 4 : get_faqs
CREATE FUNCTION public.get_faqs(category_filter text DEFAULT NULL)
RETURNS TABLE (
  id uuid, question text, answer text, category text,
  order_index int, views int, helpful_count int, created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF category_filter IS NULL THEN
    RETURN QUERY
    SELECT f.id, f.question, f.answer, f.category,
           COALESCE(f.order_index, 0) as order_index,
           COALESCE(f.views, 0) as views,
           COALESCE(f.helpful_count, 0) as helpful_count,
           f.created_at
    FROM faq f
    ORDER BY COALESCE(f.order_index, 0) ASC, f.created_at DESC;
  ELSE
    RETURN QUERY
    SELECT f.id, f.question, f.answer, f.category,
           COALESCE(f.order_index, 0) as order_index,
           COALESCE(f.views, 0) as views,
           COALESCE(f.helpful_count, 0) as helpful_count,
           f.created_at
    FROM faq f
    WHERE f.category = category_filter
    ORDER BY COALESCE(f.order_index, 0) ASC, f.created_at DESC;
  END IF;
END;
$$;

-- Fonction 5 : get_leads
CREATE FUNCTION public.get_leads(
  status_filter text DEFAULT NULL,
  limit_count int DEFAULT 100,
  offset_count int DEFAULT 0
)
RETURNS TABLE (
  id uuid, first_name text, last_name text, email text, phone text,
  city text, vehicle_type text, contract_type text, status text,
  utm_source text, utm_medium text, utm_campaign text,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF status_filter IS NULL THEN
    RETURN QUERY
    SELECT l.id, l.first_name, l.last_name, l.email, l.phone, l.city,
           l.vehicle_type, l.contract_type, l.status, l.utm_source,
           l.utm_medium, l.utm_campaign, l.created_at, l.updated_at
    FROM leads l
    ORDER BY l.created_at DESC
    LIMIT limit_count OFFSET offset_count;
  ELSE
    RETURN QUERY
    SELECT l.id, l.first_name, l.last_name, l.email, l.phone, l.city,
           l.vehicle_type, l.contract_type, l.status, l.utm_source,
           l.utm_medium, l.utm_campaign, l.created_at, l.updated_at
    FROM leads l
    WHERE l.status = status_filter
    ORDER BY l.created_at DESC
    LIMIT limit_count OFFSET offset_count;
  END IF;
END;
$$;

-- Fonction 6 : get_dashboard_stats
CREATE FUNCTION public.get_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_blog_posts', (SELECT COUNT(*) FROM blog_posts WHERE published = true),
    'total_news', (SELECT COUNT(*) FROM news WHERE COALESCE(published, true) = true),
    'total_faqs', (SELECT COUNT(*) FROM faq),
    'total_leads', (SELECT COUNT(*) FROM leads),
    'new_leads_today', (SELECT COUNT(*) FROM leads WHERE created_at::date = CURRENT_DATE),
    'new_leads_week', (SELECT COUNT(*) FROM leads WHERE created_at >= CURRENT_DATE - interval '7 days'),
    'leads_by_status', (
      SELECT COALESCE(jsonb_object_agg(status, count), '{}'::jsonb)
      FROM (SELECT COALESCE(status, 'inconnu') as status, COUNT(*) as count FROM leads GROUP BY status) sub
    ),
    'recent_blog_posts', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'slug', slug, 'published_at', published_at, 'views', views)), '[]'::jsonb)
      FROM (SELECT id, title, slug, published_at, views FROM blog_posts WHERE published = true ORDER BY published_at DESC NULLS LAST LIMIT 5) recent_posts
    )
  ) INTO stats;
  RETURN stats;
END;
$$;

-- Fonction 7 : search_content
CREATE FUNCTION public.search_content(
  search_query text,
  content_type text DEFAULT 'all'
)
RETURNS TABLE (type text, id uuid, title text, slug text, excerpt text, relevance float)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF content_type IN ('blog', 'all') THEN
    RETURN QUERY
    SELECT 'blog'::text, bp.id, bp.title, bp.slug, bp.excerpt,
           ts_rank(to_tsvector('french', bp.title || ' ' || bp.content), plainto_tsquery('french', search_query)) as relevance
    FROM blog_posts bp
    WHERE bp.published = true AND to_tsvector('french', bp.title || ' ' || bp.content) @@ plainto_tsquery('french', search_query)
    ORDER BY relevance DESC LIMIT 10;
  END IF;

  IF content_type IN ('news', 'all') THEN
    RETURN QUERY
    SELECT 'news'::text, n.id, n.title, n.slug, n.excerpt,
           ts_rank(to_tsvector('french', n.title || ' ' || n.content), plainto_tsquery('french', search_query)) as relevance
    FROM news n
    WHERE COALESCE(n.published, true) = true AND to_tsvector('french', n.title || ' ' || n.content) @@ plainto_tsquery('french', search_query)
    ORDER BY relevance DESC LIMIT 10;
  END IF;

  IF content_type IN ('faq', 'all') THEN
    RETURN QUERY
    SELECT 'faq'::text, f.id, f.question, NULL::text, f.answer,
           ts_rank(to_tsvector('french', f.question || ' ' || f.answer), plainto_tsquery('french', search_query)) as relevance
    FROM faq f
    WHERE to_tsvector('french', f.question || ' ' || f.answer) @@ plainto_tsquery('french', search_query)
    ORDER BY relevance DESC LIMIT 10;
  END IF;
END;
$$;

-- ============================================================================
-- ÉTAPE 4 : Accorder les permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_blog_posts(int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_news(int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_faqs(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_content(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_leads(text, int, int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_cron_config(text) TO service_role;

-- ============================================================================
-- ÉTAPE 5 : Tests automatiques
-- ============================================================================

DO $$
DECLARE
  test_result text;
  test_count int;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 TESTS DES FONCTIONS';
  RAISE NOTICE '========================================';

  SELECT get_cron_config('supabase_url') INTO test_result;
  RAISE NOTICE '✓ get_cron_config: %', LEFT(test_result, 40) || '...';

  SELECT COUNT(*) INTO test_count FROM get_blog_posts(5, 0);
  RAISE NOTICE '✓ get_blog_posts: % articles', test_count;

  SELECT COUNT(*) INTO test_count FROM get_news(5, 0);
  RAISE NOTICE '✓ get_news: % actualités', test_count;

  SELECT COUNT(*) INTO test_count FROM get_faqs(NULL);
  RAISE NOTICE '✓ get_faqs: % questions', test_count;

  SELECT COUNT(*) INTO test_count FROM get_leads(NULL, 5, 0);
  RAISE NOTICE '✓ get_leads: % leads', test_count;

  SELECT (get_dashboard_stats()->>'total_blog_posts')::text INTO test_result;
  RAISE NOTICE '✓ get_dashboard_stats: % articles total', test_result;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ TOUTES LES FONCTIONS SONT OPÉRATIONNELLES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Vous pouvez maintenant :';
  RAISE NOTICE '   • Lancer npm run dev';
  RAISE NOTICE '   • Aller sur /backoffice/data';
  RAISE NOTICE '   • Profiter de vos données !';
END $$;
