-- ============================================================================
-- FIX FINAL : Fonctions adaptatives - créées uniquement si les tables existent
-- ============================================================================

-- ÉTAPE 1 : Supprimer toutes les anciennes versions
DROP FUNCTION IF EXISTS public.get_blog_posts() CASCADE;
DROP FUNCTION IF EXISTS public.get_blog_posts(integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_blog_posts(int) CASCADE;
DROP FUNCTION IF EXISTS public.get_blog_posts(int, int) CASCADE;
DROP FUNCTION IF EXISTS public.get_news() CASCADE;
DROP FUNCTION IF EXISTS public.get_news(int) CASCADE;
DROP FUNCTION IF EXISTS public.get_news(int, int) CASCADE;
DROP FUNCTION IF EXISTS public.get_faqs() CASCADE;
DROP FUNCTION IF EXISTS public.get_faqs(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_leads() CASCADE;
DROP FUNCTION IF EXISTS public.get_leads(text, int, int) CASCADE;
DROP FUNCTION IF EXISTS public.get_dashboard_stats() CASCADE;
DROP FUNCTION IF EXISTS public.search_content(text) CASCADE;
DROP FUNCTION IF EXISTS public.search_content(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_cron_config(text) CASCADE;

-- ÉTAPE 2 : Table de configuration
CREATE TABLE IF NOT EXISTS public.cron_config (
  key text PRIMARY KEY, value text NOT NULL,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.cron_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can read cron config" ON public.cron_config;
CREATE POLICY "Service role can read cron config" ON public.cron_config FOR SELECT TO service_role USING (true);

INSERT INTO public.cron_config (key, value) VALUES
  ('supabase_url', 'https://drohhxrkoequjphvabvq.supabase.co'),
  ('service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- ÉTAPE 3 : Fonctions adaptatives
CREATE FUNCTION public.get_cron_config(config_key text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE config_value text;
BEGIN SELECT value INTO config_value FROM public.cron_config WHERE key = config_key; RETURN config_value; END; $$;

-- get_blog_posts (SI blog_posts existe)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blog_posts') THEN
    EXECUTE 'CREATE FUNCTION public.get_blog_posts(limit_count int DEFAULT 50, offset_count int DEFAULT 0) RETURNS TABLE (id uuid, title text, slug text, excerpt text, content text, published boolean, featured_image text, meta_title text, meta_description text, tags text[], read_time int, created_at timestamptz) LANGUAGE plpgsql SECURITY DEFINER AS $f$ BEGIN RETURN QUERY SELECT bp.id, bp.title, bp.slug, COALESCE(bp.excerpt, '''') as excerpt, bp.content, COALESCE(bp.published, true) as published, bp.featured_image, COALESCE(bp.meta_title, bp.title) as meta_title, COALESCE(bp.meta_description, bp.excerpt, '''') as meta_description, COALESCE(bp.tags, ARRAY[]::text[]) as tags, COALESCE(bp.read_time, 5) as read_time, bp.created_at FROM blog_posts bp WHERE COALESCE(bp.published, true) = true ORDER BY bp.created_at DESC LIMIT limit_count OFFSET offset_count; END; $f$;';
    GRANT EXECUTE ON FUNCTION public.get_blog_posts(int, int) TO anon, authenticated;
    RAISE NOTICE '✓ get_blog_posts créée';
  END IF;
END $$;

-- get_faqs (SI faq existe)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'faq') THEN
    EXECUTE 'CREATE FUNCTION public.get_faqs(category_filter text DEFAULT NULL) RETURNS TABLE (id uuid, question text, answer text, category text, order_index int, created_at timestamptz) LANGUAGE plpgsql SECURITY DEFINER AS $f$ BEGIN IF category_filter IS NULL THEN RETURN QUERY SELECT f.id, f.question, f.answer, COALESCE(f.category, ''Général'') as category, COALESCE(f.order_index, 0) as order_index, f.created_at FROM faq f ORDER BY COALESCE(f.order_index, 0) ASC, f.created_at DESC; ELSE RETURN QUERY SELECT f.id, f.question, f.answer, COALESCE(f.category, ''Général'') as category, COALESCE(f.order_index, 0) as order_index, f.created_at FROM faq f WHERE COALESCE(f.category, ''Général'') = category_filter ORDER BY COALESCE(f.order_index, 0) ASC, f.created_at DESC; END IF; END; $f$;';
    GRANT EXECUTE ON FUNCTION public.get_faqs(text) TO anon, authenticated;
    RAISE NOTICE '✓ get_faqs créée';
  END IF;
END $$;

-- get_leads (SI leads existe - structure simple réelle)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
    EXECUTE 'CREATE FUNCTION public.get_leads(status_filter text DEFAULT NULL, limit_count int DEFAULT 100, offset_count int DEFAULT 0) RETURNS TABLE (id uuid, name text, email text, phone text, city text, status text, lead_status text, created_at timestamptz) LANGUAGE plpgsql SECURITY DEFINER AS $f$ BEGIN IF status_filter IS NULL THEN RETURN QUERY SELECT l.id, COALESCE(l.name, '''') as name, l.email, COALESCE(l.phone, '''') as phone, COALESCE(l.city, '''') as city, COALESCE(l.status, ''taxi'') as status, COALESCE(l.lead_status, ''new'') as lead_status, l.created_at FROM leads l ORDER BY l.created_at DESC LIMIT limit_count OFFSET offset_count; ELSE RETURN QUERY SELECT l.id, COALESCE(l.name, '''') as name, l.email, COALESCE(l.phone, '''') as phone, COALESCE(l.city, '''') as city, COALESCE(l.status, ''taxi'') as status, COALESCE(l.lead_status, ''new'') as lead_status, l.created_at FROM leads l WHERE COALESCE(l.lead_status, ''new'') = status_filter ORDER BY l.created_at DESC LIMIT limit_count OFFSET offset_count; END IF; END; $f$;';
    GRANT EXECUTE ON FUNCTION public.get_leads(text, int, int) TO authenticated, service_role;
    RAISE NOTICE '✓ get_leads créée (structure: name, email, phone, city, status, lead_status)';
  END IF;
END $$;

-- get_dashboard_stats (adaptatif)
CREATE FUNCTION public.get_dashboard_stats() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE stats jsonb := '{}'::jsonb; blog_exists boolean; faq_exists boolean; leads_exists boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blog_posts') INTO blog_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'faq') INTO faq_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') INTO leads_exists;
  IF blog_exists THEN stats := stats || jsonb_build_object('total_blog_posts', (SELECT COUNT(*) FROM blog_posts WHERE COALESCE(published, true) = true), 'recent_blog_posts', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'slug', slug)), '[]'::jsonb) FROM (SELECT id, title, slug FROM blog_posts WHERE COALESCE(published, true) = true ORDER BY created_at DESC LIMIT 5) recent)); END IF;
  IF faq_exists THEN stats := stats || jsonb_build_object('total_faqs', (SELECT COUNT(*) FROM faq)); END IF;
  IF leads_exists THEN stats := stats || jsonb_build_object('total_leads', (SELECT COUNT(*) FROM leads), 'new_leads_today', (SELECT COUNT(*) FROM leads WHERE created_at::date = CURRENT_DATE), 'new_leads_week', (SELECT COUNT(*) FROM leads WHERE created_at >= CURRENT_DATE - interval '7 days'), 'leads_by_status', (SELECT COALESCE(jsonb_object_agg(status, count), '{}'::jsonb) FROM (SELECT COALESCE(status, 'inconnu') as status, COUNT(*) as count FROM leads GROUP BY status) sub)); END IF;
  RETURN stats;
END; $$;

-- search_content (adaptatif)
CREATE FUNCTION public.search_content(search_query text, content_type text DEFAULT 'all') RETURNS TABLE (type text, id uuid, title text, slug text, excerpt text, relevance float) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE blog_exists boolean; faq_exists boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blog_posts') INTO blog_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'faq') INTO faq_exists;
  IF blog_exists AND content_type IN ('blog', 'all') THEN RETURN QUERY SELECT 'blog'::text, bp.id, bp.title, bp.slug, COALESCE(bp.excerpt, '')::text, ts_rank(to_tsvector('french', bp.title || ' ' || bp.content), plainto_tsquery('french', search_query)) as relevance FROM blog_posts bp WHERE COALESCE(bp.published, true) = true AND to_tsvector('french', bp.title || ' ' || bp.content) @@ plainto_tsquery('french', search_query) ORDER BY relevance DESC LIMIT 10; END IF;
  IF faq_exists AND content_type IN ('faq', 'all') THEN RETURN QUERY SELECT 'faq'::text, f.id, f.question, NULL::text, f.answer, ts_rank(to_tsvector('french', f.question || ' ' || f.answer), plainto_tsquery('french', search_query)) as relevance FROM faq f WHERE to_tsvector('french', f.question || ' ' || f.answer) @@ plainto_tsquery('french', search_query) ORDER BY relevance DESC LIMIT 10; END IF;
END; $$;

GRANT EXECUTE ON FUNCTION public.search_content(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_config(text) TO service_role;

-- ÉTAPE 4 : Tests
DO $$
DECLARE test_result text; test_count int; blog_exists boolean; faq_exists boolean; leads_exists boolean;
BEGIN
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '✅ TESTS';
  SELECT get_cron_config('supabase_url') INTO test_result; RAISE NOTICE '✓ get_cron_config: OK';
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blog_posts') INTO blog_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'faq') INTO faq_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') INTO leads_exists;
  IF blog_exists THEN SELECT COUNT(*) INTO test_count FROM get_blog_posts(5, 0); RAISE NOTICE '✓ get_blog_posts: % articles', test_count; END IF;
  IF faq_exists THEN SELECT COUNT(*) INTO test_count FROM get_faqs(NULL); RAISE NOTICE '✓ get_faqs: % questions', test_count; END IF;
  IF leads_exists THEN SELECT COUNT(*) INTO test_count FROM get_leads(NULL, 5, 0); RAISE NOTICE '✓ get_leads: % leads', test_count; END IF;
  SELECT (get_dashboard_stats()->>'total_blog_posts')::text INTO test_result;
  IF test_result IS NOT NULL THEN RAISE NOTICE '✓ get_dashboard_stats: % articles', test_result; ELSE RAISE NOTICE '✓ get_dashboard_stats: OK'; END IF;
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '🎉 SUCCÈS - Tables: blog=% faq=% leads=%', blog_exists, faq_exists, leads_exists;
  RAISE NOTICE 'Lancez: npm run dev → /backoffice/data';
END $$;
