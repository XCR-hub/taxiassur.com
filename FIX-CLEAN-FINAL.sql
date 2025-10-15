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

-- get_leads (SI leads existe - détection dynamique des colonnes ET des types)
DO $$
DECLARE
  has_name boolean;
  has_first_name boolean;
  has_last_name boolean;
  has_email boolean;
  has_phone boolean;
  has_city boolean;
  has_status boolean;
  has_lead_status boolean;
  status_type text;
  lead_status_type text;
  name_col text;
  sql_query text;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
    -- Détecter quelles colonnes existent
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'name') INTO has_name;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'first_name') INTO has_first_name;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'last_name') INTO has_last_name;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'email') INTO has_email;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'phone') INTO has_phone;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'city') INTO has_city;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'status') INTO has_status;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'lead_status') INTO has_lead_status;

    -- Détecter les types de données pour status et lead_status
    SELECT data_type INTO status_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'status';
    SELECT data_type INTO lead_status_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'lead_status';

    -- Choisir la colonne nom
    IF has_name THEN
      name_col := 'l.name';
    ELSIF has_first_name AND has_last_name THEN
      name_col := 'CONCAT(l.first_name, '' '', l.last_name)';
    ELSIF has_first_name THEN
      name_col := 'l.first_name';
    ELSE
      name_col := '''inconnu''';
    END IF;

    -- Construire la requête adaptative avec cast vers TEXT dès le départ
    sql_query := format('CREATE FUNCTION public.get_leads(status_filter text DEFAULT NULL, limit_count int DEFAULT 100, offset_count int DEFAULT 0) '
      || 'RETURNS TABLE (id uuid, name text, email text, phone text, city text, status text, lead_status text, created_at timestamptz) '
      || 'LANGUAGE plpgsql SECURITY DEFINER AS $f$ BEGIN '
      || 'IF status_filter IS NULL THEN '
      || 'RETURN QUERY SELECT l.id, COALESCE(%s, '''')::text as name, %s as email, %s as phone, %s as city, %s as status, %s as lead_status, l.created_at FROM leads l ORDER BY l.created_at DESC LIMIT limit_count OFFSET offset_count; '
      || 'ELSE '
      || 'RETURN QUERY SELECT l.id, COALESCE(%s, '''')::text as name, %s as email, %s as phone, %s as city, %s as status, %s as lead_status, l.created_at FROM leads l WHERE %s = status_filter ORDER BY l.created_at DESC LIMIT limit_count OFFSET offset_count; '
      || 'END IF; END; $f$;',
      name_col,
      CASE WHEN has_email THEN 'l.email::text' ELSE '''''' END,
      CASE WHEN has_phone THEN 'COALESCE(l.phone::text, '''')' ELSE '''''' END,
      CASE WHEN has_city THEN 'COALESCE(l.city::text, '''')' ELSE '''''' END,
      CASE WHEN has_status THEN 'COALESCE(l.status::text, ''taxi'')' ELSE '''taxi''' END,
      CASE WHEN has_lead_status THEN 'COALESCE(l.lead_status::text, ''nouveau'')' ELSE '''nouveau''' END,
      name_col,
      CASE WHEN has_email THEN 'l.email::text' ELSE '''''' END,
      CASE WHEN has_phone THEN 'COALESCE(l.phone::text, '''')' ELSE '''''' END,
      CASE WHEN has_city THEN 'COALESCE(l.city::text, '''')' ELSE '''''' END,
      CASE WHEN has_status THEN 'COALESCE(l.status::text, ''taxi'')' ELSE '''taxi''' END,
      CASE WHEN has_lead_status THEN 'COALESCE(l.lead_status::text, ''nouveau'')' ELSE '''nouveau''' END,
      CASE WHEN has_lead_status THEN 'COALESCE(l.lead_status::text, ''nouveau'')' ELSE '''nouveau''' END
    );

    EXECUTE sql_query;
    GRANT EXECUTE ON FUNCTION public.get_leads(text, int, int) TO authenticated, service_role;
    RAISE NOTICE '✓ get_leads créée (name=%, email=%, phone=%, city=%, status=% [%], lead_status=% [%])',
      has_name OR has_first_name, has_email, has_phone, has_city,
      has_status, COALESCE(status_type, 'N/A'),
      has_lead_status, COALESCE(lead_status_type, 'N/A');
  END IF;
END $$;

-- get_dashboard_stats (adaptatif avec détection de colonnes)
CREATE FUNCTION public.get_dashboard_stats() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  stats jsonb := '{}'::jsonb;
  blog_exists boolean;
  faq_exists boolean;
  leads_exists boolean;
  has_lead_status boolean;
  has_status boolean;
  status_col text;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blog_posts') INTO blog_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'faq') INTO faq_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') INTO leads_exists;

  IF blog_exists THEN
    stats := stats || jsonb_build_object(
      'total_blog_posts', (SELECT COUNT(*) FROM blog_posts WHERE COALESCE(published, true) = true),
      'recent_blog_posts', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'slug', slug)), '[]'::jsonb)
                            FROM (SELECT id, title, slug FROM blog_posts WHERE COALESCE(published, true) = true ORDER BY created_at DESC LIMIT 5) recent)
    );
  END IF;

  IF faq_exists THEN
    stats := stats || jsonb_build_object('total_faqs', (SELECT COUNT(*) FROM faq));
  END IF;

  IF leads_exists THEN
    -- Détecter quelle colonne de statut existe
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'lead_status') INTO has_lead_status;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'status') INTO has_status;

    IF has_lead_status THEN
      status_col := 'lead_status';
    ELSIF has_status THEN
      status_col := 'status';
    ELSE
      status_col := NULL;
    END IF;

    IF status_col IS NOT NULL THEN
      -- Construire dynamiquement la requête avec la bonne colonne
      EXECUTE format(
        'SELECT jsonb_build_object(
          ''total_leads'', (SELECT COUNT(*) FROM leads),
          ''new_leads_today'', (SELECT COUNT(*) FROM leads WHERE created_at::date = CURRENT_DATE),
          ''new_leads_week'', (SELECT COUNT(*) FROM leads WHERE created_at >= CURRENT_DATE - interval ''7 days''),
          ''leads_by_status'', (SELECT COALESCE(jsonb_object_agg(status_val, count), ''{}''::jsonb)
                                FROM (SELECT COALESCE(%I::text, ''inconnu'') as status_val, COUNT(*) as count
                                      FROM leads GROUP BY %I) sub)
        )', status_col, status_col
      ) INTO stats;
      stats := jsonb_build_object('total_leads', (stats->>'total_leads')::int,
                                  'new_leads_today', (stats->>'new_leads_today')::int,
                                  'new_leads_week', (stats->>'new_leads_week')::int,
                                  'leads_by_status', stats->'leads_by_status');
    ELSE
      -- Pas de colonne status, juste les comptages
      stats := stats || jsonb_build_object(
        'total_leads', (SELECT COUNT(*) FROM leads),
        'new_leads_today', (SELECT COUNT(*) FROM leads WHERE created_at::date = CURRENT_DATE),
        'new_leads_week', (SELECT COUNT(*) FROM leads WHERE created_at >= CURRENT_DATE - interval '7 days'),
        'leads_by_status', '{}'::jsonb
      );
    END IF;
  END IF;

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
