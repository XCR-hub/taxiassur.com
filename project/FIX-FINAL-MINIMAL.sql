-- ============================================================================
-- FIX FINAL MINIMAL : Fonctions avec SEULEMENT les colonnes qui existent
-- ============================================================================
-- Basé sur la structure réelle de votre base de données

-- ÉTAPE 1 : Supprimer toutes les anciennes versions des fonctions
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_blog_posts() CASCADE;
DROP FUNCTION IF EXISTS public.get_blog_posts(integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_blog_posts(integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_blog_posts(int) CASCADE;
DROP FUNCTION IF EXISTS public.get_blog_posts(int, int) CASCADE;
DROP FUNCTION IF EXISTS public.get_blog_posts(limit_count integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_blog_posts(limit_count integer, offset_count integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_blog_posts(limit_count int) CASCADE;
DROP FUNCTION IF EXISTS public.get_blog_posts(limit_count int, offset_count int) CASCADE;

DROP FUNCTION IF EXISTS public.get_news() CASCADE;
DROP FUNCTION IF EXISTS public.get_news(integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_news(integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_news(int) CASCADE;
DROP FUNCTION IF EXISTS public.get_news(int, int) CASCADE;
DROP FUNCTION IF EXISTS public.get_news(limit_count int) CASCADE;
DROP FUNCTION IF EXISTS public.get_news(limit_count int, offset_count int) CASCADE;

DROP FUNCTION IF EXISTS public.get_faqs() CASCADE;
DROP FUNCTION IF EXISTS public.get_faqs(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_faqs(category_filter text) CASCADE;

DROP FUNCTION IF EXISTS public.get_leads() CASCADE;
DROP FUNCTION IF EXISTS public.get_leads(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_leads(text, int) CASCADE;
DROP FUNCTION IF EXISTS public.get_leads(text, int, int) CASCADE;
DROP FUNCTION IF EXISTS public.get_leads(status_filter text) CASCADE;
DROP FUNCTION IF EXISTS public.get_leads(status_filter text, limit_count int) CASCADE;
DROP FUNCTION IF EXISTS public.get_leads(status_filter text, limit_count int, offset_count int) CASCADE;

DROP FUNCTION IF EXISTS public.get_dashboard_stats() CASCADE;
DROP FUNCTION IF EXISTS public.search_content(text) CASCADE;
DROP FUNCTION IF EXISTS public.search_content(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.search_content(search_query text, content_type text) CASCADE;
DROP FUNCTION IF EXISTS public.get_cron_config(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_cron_config(config_key text) CASCADE;

-- ÉTAPE 2 : Configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cron_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.cron_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can read cron config" ON public.cron_config;
CREATE POLICY "Service role can read cron config" ON public.cron_config FOR SELECT TO service_role USING (true);

INSERT INTO public.cron_config (key, value)
VALUES
  ('supabase_url', 'https://drohhxrkoequjphvabvq.supabase.co'),
  ('service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- ÉTAPE 3 : Créer les fonctions MINIMALES
-- ============================================================================

-- Fonction 1 : get_cron_config
CREATE FUNCTION public.get_cron_config(config_key text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE config_value text;
BEGIN
  SELECT value INTO config_value FROM public.cron_config WHERE key = config_key;
  RETURN config_value;
END; $$;

-- Fonction 2 : get_blog_posts (SEULEMENT les colonnes qui existent)
CREATE FUNCTION public.get_blog_posts(limit_count int DEFAULT 50, offset_count int DEFAULT 0)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  excerpt text,
  content text,
  published boolean,
  featured_image text,
  meta_title text,
  meta_description text,
  tags text[],
  read_time int,
  created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.title,
    bp.slug,
    COALESCE(bp.excerpt, '') as excerpt,
    bp.content,
    COALESCE(bp.published, true) as published,
    bp.featured_image,
    COALESCE(bp.meta_title, bp.title) as meta_title,
    COALESCE(bp.meta_description, bp.excerpt, '') as meta_description,
    COALESCE(bp.tags, ARRAY[]::text[]) as tags,
    COALESCE(bp.read_time, 5) as read_time,
    bp.created_at
  FROM blog_posts bp
  WHERE COALESCE(bp.published, true) = true
  ORDER BY bp.created_at DESC
  LIMIT limit_count OFFSET offset_count;
END; $$;

-- Fonction 3 : get_news (SEULEMENT les colonnes qui existent)
CREATE FUNCTION public.get_news(limit_count int DEFAULT 20, offset_count int DEFAULT 0)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  content text,
  excerpt text,
  tags text[],
  featured_image text,
  created_at timestamptz,
  published boolean
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.title,
    n.slug,
    n.content,
    COALESCE(n.excerpt, '') as excerpt,
    COALESCE(n.tags, ARRAY[]::text[]) as tags,
    n.featured_image,
    n.created_at,
    COALESCE(n.published, true) as published
  FROM news n
  WHERE COALESCE(n.published, true) = true
  ORDER BY n.created_at DESC
  LIMIT limit_count OFFSET offset_count;
END; $$;

-- Fonction 4 : get_faqs
CREATE FUNCTION public.get_faqs(category_filter text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  question text,
  answer text,
  category text,
  order_index int,
  created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF category_filter IS NULL THEN
    RETURN QUERY
    SELECT
      f.id,
      f.question,
      f.answer,
      COALESCE(f.category, 'Général') as category,
      COALESCE(f.order_index, 0) as order_index,
      f.created_at
    FROM faq f
    ORDER BY COALESCE(f.order_index, 0) ASC, f.created_at DESC;
  ELSE
    RETURN QUERY
    SELECT
      f.id,
      f.question,
      f.answer,
      COALESCE(f.category, 'Général') as category,
      COALESCE(f.order_index, 0) as order_index,
      f.created_at
    FROM faq f
    WHERE COALESCE(f.category, 'Général') = category_filter
    ORDER BY COALESCE(f.order_index, 0) ASC, f.created_at DESC;
  END IF;
END; $$;

-- Fonction 5 : get_leads
CREATE FUNCTION public.get_leads(status_filter text DEFAULT NULL, limit_count int DEFAULT 100, offset_count int DEFAULT 0)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  city text,
  vehicle_type text,
  contract_type text,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF status_filter IS NULL THEN
    RETURN QUERY
    SELECT
      l.id, l.first_name, l.last_name, l.email, l.phone,
      l.city, l.vehicle_type, l.contract_type, l.status, l.created_at
    FROM leads l
    ORDER BY l.created_at DESC
    LIMIT limit_count OFFSET offset_count;
  ELSE
    RETURN QUERY
    SELECT
      l.id, l.first_name, l.last_name, l.email, l.phone,
      l.city, l.vehicle_type, l.contract_type, l.status, l.created_at
    FROM leads l
    WHERE l.status = status_filter
    ORDER BY l.created_at DESC
    LIMIT limit_count OFFSET offset_count;
  END IF;
END; $$;

-- Fonction 6 : get_dashboard_stats
CREATE FUNCTION public.get_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_blog_posts', (SELECT COUNT(*) FROM blog_posts WHERE COALESCE(published, true) = true),
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
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'slug', slug)), '[]'::jsonb)
      FROM (SELECT id, title, slug FROM blog_posts WHERE COALESCE(published, true) = true ORDER BY created_at DESC LIMIT 5) recent_posts
    )
  ) INTO stats;
  RETURN stats;
END; $$;

-- Fonction 7 : search_content
CREATE FUNCTION public.search_content(search_query text, content_type text DEFAULT 'all')
RETURNS TABLE (type text, id uuid, title text, slug text, excerpt text, relevance float)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF content_type IN ('blog', 'all') THEN
    RETURN QUERY
    SELECT
      'blog'::text, bp.id, bp.title, bp.slug, COALESCE(bp.excerpt, '')::text,
      ts_rank(to_tsvector('french', bp.title || ' ' || bp.content), plainto_tsquery('french', search_query)) as relevance
    FROM blog_posts bp
    WHERE COALESCE(bp.published, true) = true
      AND to_tsvector('french', bp.title || ' ' || bp.content) @@ plainto_tsquery('french', search_query)
    ORDER BY relevance DESC LIMIT 10;
  END IF;

  IF content_type IN ('news', 'all') THEN
    RETURN QUERY
    SELECT
      'news'::text, n.id, n.title, n.slug, COALESCE(n.excerpt, '')::text,
      ts_rank(to_tsvector('french', n.title || ' ' || n.content), plainto_tsquery('french', search_query)) as relevance
    FROM news n
    WHERE COALESCE(n.published, true) = true
      AND to_tsvector('french', n.title || ' ' || n.content) @@ plainto_tsquery('french', search_query)
    ORDER BY relevance DESC LIMIT 10;
  END IF;

  IF content_type IN ('faq', 'all') THEN
    RETURN QUERY
    SELECT
      'faq'::text, f.id, f.question, NULL::text, f.answer,
      ts_rank(to_tsvector('french', f.question || ' ' || f.answer), plainto_tsquery('french', search_query)) as relevance
    FROM faq f
    WHERE to_tsvector('french', f.question || ' ' || f.answer) @@ plainto_tsquery('french', search_query)
    ORDER BY relevance DESC LIMIT 10;
  END IF;
END; $$;

-- ÉTAPE 4 : Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_blog_posts(int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_news(int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_faqs(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_content(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_leads(text, int, int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_cron_config(text) TO service_role;

-- ÉTAPE 5 : Tests
-- ============================================================================

DO $$
DECLARE test_result text; test_count int;
BEGIN
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '✅ TESTS DES FONCTIONS';
  RAISE NOTICE '════════════════════════════════════════';

  SELECT get_cron_config('supabase_url') INTO test_result;
  RAISE NOTICE '✓ get_cron_config OK';

  SELECT COUNT(*) INTO test_count FROM get_blog_posts(5, 0);
  RAISE NOTICE '✓ get_blog_posts: % articles', test_count;

  SELECT COUNT(*) INTO test_count FROM get_news(5, 0);
  RAISE NOTICE '✓ get_news: % actualités', test_count;

  SELECT COUNT(*) INTO test_count FROM get_faqs(NULL);
  RAISE NOTICE '✓ get_faqs: % questions', test_count;

  SELECT COUNT(*) INTO test_count FROM get_leads(NULL, 5, 0);
  RAISE NOTICE '✓ get_leads: % leads', test_count;

  SELECT (get_dashboard_stats()->>'total_blog_posts')::text INTO test_result;
  RAISE NOTICE '✓ get_dashboard_stats: % articles', test_result;

  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '🎉 TOUT FONCTIONNE !';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Lancez : npm run dev';
  RAISE NOTICE 'Allez sur : /backoffice/data';
  RAISE NOTICE '';
END $$;
