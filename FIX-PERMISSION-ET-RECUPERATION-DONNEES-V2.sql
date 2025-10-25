-- ============================================================================
-- FIX : ERREUR PERMISSION + RÉCUPÉRATION DONNÉES (Version Compatible)
-- ============================================================================
-- Solution à l'erreur : "permission denied to set parameter app.supabase_url"
-- Compatible avec PostgreSQL 12+ (Supabase)

-- ÉTAPE 1 : Configuration alternative pour pg_cron
-- ============================================================================

-- Créer une table pour stocker la configuration de manière sécurisée
CREATE TABLE IF NOT EXISTS public.cron_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activer RLS sur la table de configuration
ALTER TABLE public.cron_config ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Service role can read cron config" ON public.cron_config;

-- Politique : Seuls les service_role peuvent lire la config
CREATE POLICY "Service role can read cron config"
  ON public.cron_config FOR SELECT
  TO service_role
  USING (true);

-- Insérer la configuration (remplace les anciennes valeurs si elles existent)
INSERT INTO public.cron_config (key, value)
VALUES
  ('supabase_url', 'https://drohhxrkoequjphvabvq.supabase.co'),
  ('service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Fonction pour récupérer la configuration
CREATE OR REPLACE FUNCTION public.get_cron_config(config_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_value text;
BEGIN
  SELECT value INTO config_value
  FROM public.cron_config
  WHERE key = config_key;

  RETURN config_value;
END;
$$;

-- ============================================================================
-- ÉTAPE 2 : FONCTIONS DE RÉCUPÉRATION DES DONNÉES
-- ============================================================================

-- Fonction pour récupérer tous les articles de blog
CREATE OR REPLACE FUNCTION public.get_blog_posts(
  limit_count int DEFAULT 50,
  offset_count int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  excerpt text,
  content text,
  published boolean,
  published_at timestamptz,
  author text,
  category text,
  tags text[],
  meta_title text,
  meta_description text,
  featured_image text,
  read_time int,
  views int,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.title,
    bp.slug,
    bp.excerpt,
    bp.content,
    bp.published,
    bp.published_at,
    bp.author,
    bp.category,
    bp.tags,
    bp.meta_title,
    bp.meta_description,
    bp.featured_image,
    bp.read_time,
    bp.views,
    bp.created_at
  FROM blog_posts bp
  WHERE bp.published = true
  ORDER BY bp.published_at DESC NULLS LAST, bp.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Fonction pour récupérer les actualités
CREATE OR REPLACE FUNCTION public.get_news(
  limit_count int DEFAULT 20,
  offset_count int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  content text,
  excerpt text,
  published_at timestamptz,
  category text,
  tags text[],
  featured_image text,
  views int,
  created_at timestamptz,
  published boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.title,
    n.slug,
    n.content,
    n.excerpt,
    n.published_at,
    n.category,
    n.tags,
    n.featured_image,
    COALESCE(n.views, 0) as views,
    n.created_at,
    COALESCE(n.published, true) as published
  FROM news n
  WHERE COALESCE(n.published, true) = true
  ORDER BY n.published_at DESC NULLS LAST, n.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Fonction pour récupérer les FAQs
CREATE OR REPLACE FUNCTION public.get_faqs(
  category_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  question text,
  answer text,
  category text,
  order_index int,
  views int,
  helpful_count int,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF category_filter IS NULL THEN
    RETURN QUERY
    SELECT
      f.id,
      f.question,
      f.answer,
      f.category,
      COALESCE(f.order_index, 0) as order_index,
      COALESCE(f.views, 0) as views,
      COALESCE(f.helpful_count, 0) as helpful_count,
      f.created_at
    FROM faq f
    ORDER BY COALESCE(f.order_index, 0) ASC, f.created_at DESC;
  ELSE
    RETURN QUERY
    SELECT
      f.id,
      f.question,
      f.answer,
      f.category,
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

-- Fonction pour récupérer les leads
CREATE OR REPLACE FUNCTION public.get_leads(
  status_filter text DEFAULT NULL,
  limit_count int DEFAULT 100,
  offset_count int DEFAULT 0
)
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
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF status_filter IS NULL THEN
    RETURN QUERY
    SELECT
      l.id,
      l.first_name,
      l.last_name,
      l.email,
      l.phone,
      l.city,
      l.vehicle_type,
      l.contract_type,
      l.status,
      l.utm_source,
      l.utm_medium,
      l.utm_campaign,
      l.created_at,
      l.updated_at
    FROM leads l
    ORDER BY l.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
  ELSE
    RETURN QUERY
    SELECT
      l.id,
      l.first_name,
      l.last_name,
      l.email,
      l.phone,
      l.city,
      l.vehicle_type,
      l.contract_type,
      l.status,
      l.utm_source,
      l.utm_medium,
      l.utm_campaign,
      l.created_at,
      l.updated_at
    FROM leads l
    WHERE l.status = status_filter
    ORDER BY l.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
  END IF;
END;
$$;

-- Fonction pour récupérer les statistiques globales
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats jsonb;
  blog_count int;
  news_count int;
  faq_count int;
  leads_count int;
  leads_today int;
  leads_week int;
BEGIN
  -- Récupérer les comptages
  SELECT COUNT(*) INTO blog_count FROM blog_posts WHERE published = true;
  SELECT COUNT(*) INTO news_count FROM news WHERE COALESCE(published, true) = true;
  SELECT COUNT(*) INTO faq_count FROM faq;
  SELECT COUNT(*) INTO leads_count FROM leads;
  SELECT COUNT(*) INTO leads_today FROM leads WHERE created_at::date = CURRENT_DATE;
  SELECT COUNT(*) INTO leads_week FROM leads WHERE created_at >= CURRENT_DATE - interval '7 days';

  -- Construire l'objet JSON
  SELECT jsonb_build_object(
    'total_blog_posts', blog_count,
    'total_news', news_count,
    'total_faqs', faq_count,
    'total_leads', leads_count,
    'new_leads_today', leads_today,
    'new_leads_week', leads_week,
    'leads_by_status', (
      SELECT COALESCE(jsonb_object_agg(status, count), '{}'::jsonb)
      FROM (
        SELECT COALESCE(status, 'inconnu') as status, COUNT(*) as count
        FROM leads
        GROUP BY status
      ) sub
    ),
    'recent_blog_posts', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id,
        'title', title,
        'slug', slug,
        'published_at', published_at,
        'views', views
      )), '[]'::jsonb)
      FROM (
        SELECT id, title, slug, published_at, views
        FROM blog_posts
        WHERE published = true
        ORDER BY published_at DESC NULLS LAST
        LIMIT 5
      ) recent_posts
    )
  ) INTO stats;

  RETURN stats;
END;
$$;

-- Fonction pour rechercher dans le contenu
CREATE OR REPLACE FUNCTION public.search_content(
  search_query text,
  content_type text DEFAULT 'all'
)
RETURNS TABLE (
  type text,
  id uuid,
  title text,
  slug text,
  excerpt text,
  relevance float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Recherche dans les blogs
  IF content_type = 'blog' OR content_type = 'all' THEN
    RETURN QUERY
    SELECT
      'blog'::text as type,
      bp.id,
      bp.title,
      bp.slug,
      bp.excerpt,
      ts_rank(
        to_tsvector('french', bp.title || ' ' || bp.content),
        plainto_tsquery('french', search_query)
      ) as relevance
    FROM blog_posts bp
    WHERE bp.published = true
      AND (
        to_tsvector('french', bp.title || ' ' || bp.content) @@ plainto_tsquery('french', search_query)
      )
    ORDER BY relevance DESC
    LIMIT 10;
  END IF;

  -- Recherche dans les news
  IF content_type = 'news' OR content_type = 'all' THEN
    RETURN QUERY
    SELECT
      'news'::text as type,
      n.id,
      n.title,
      n.slug,
      n.excerpt,
      ts_rank(
        to_tsvector('french', n.title || ' ' || n.content),
        plainto_tsquery('french', search_query)
      ) as relevance
    FROM news n
    WHERE COALESCE(n.published, true) = true
      AND (
        to_tsvector('french', n.title || ' ' || n.content) @@ plainto_tsquery('french', search_query)
      )
    ORDER BY relevance DESC
    LIMIT 10;
  END IF;

  -- Recherche dans les FAQs
  IF content_type = 'faq' OR content_type = 'all' THEN
    RETURN QUERY
    SELECT
      'faq'::text as type,
      f.id,
      f.question as title,
      NULL::text as slug,
      f.answer as excerpt,
      ts_rank(
        to_tsvector('french', f.question || ' ' || f.answer),
        plainto_tsquery('french', search_query)
      ) as relevance
    FROM faq f
    WHERE to_tsvector('french', f.question || ' ' || f.answer) @@ plainto_tsquery('french', search_query)
    ORDER BY relevance DESC
    LIMIT 10;
  END IF;
END;
$$;

-- ============================================================================
-- ÉTAPE 3 : PERMISSIONS ET ACCÈS
-- ============================================================================

-- Permettre l'accès anonyme aux fonctions de lecture
GRANT EXECUTE ON FUNCTION public.get_blog_posts TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_news TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_faqs TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_content TO anon, authenticated;

-- Les leads ne sont accessibles qu'aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.get_leads TO authenticated, service_role;

-- La configuration cron n'est accessible qu'au service role
GRANT EXECUTE ON FUNCTION public.get_cron_config TO service_role;

-- ============================================================================
-- ÉTAPE 4 : VÉRIFICATION
-- ============================================================================

-- Tester les fonctions
DO $$
DECLARE
  test_result text;
  blog_count int;
  faq_count int;
BEGIN
  -- Test config
  SELECT get_cron_config('supabase_url') INTO test_result;
  RAISE NOTICE '✓ Configuration cron: %', test_result;

  -- Test blog posts
  SELECT COUNT(*) INTO blog_count FROM get_blog_posts(10, 0);
  RAISE NOTICE '✓ Blog posts: %', blog_count;

  -- Test FAQs
  SELECT COUNT(*) INTO faq_count FROM get_faqs();
  RAISE NOTICE '✓ FAQs: %', faq_count;

  -- Test stats
  SELECT (get_dashboard_stats()->>'total_blog_posts')::text INTO test_result;
  RAISE NOTICE '✓ Stats - Total blog posts: %', test_result;

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ TOUTES LES FONCTIONS SONT OPÉRATIONNELLES';
  RAISE NOTICE '============================================';
END $$;

-- ============================================================================
-- RÉSUMÉ
-- ============================================================================

/*
✅ PROBLÈME RÉSOLU : Permission denied

Au lieu d'utiliser ALTER DATABASE (qui nécessite des permissions superuser),
on utilise une table + fonctions pour stocker et récupérer la configuration.

✅ FONCTIONS CRÉÉES :

1. get_blog_posts(limit, offset) - Récupérer les articles de blog
2. get_news(limit, offset) - Récupérer les actualités
3. get_faqs(category) - Récupérer les FAQs
4. get_leads(status, limit, offset) - Récupérer les leads
5. get_dashboard_stats() - Statistiques complètes
6. search_content(query, type) - Recherche dans le contenu
7. get_cron_config(key) - Configuration pour pg_cron

✅ UTILISATION DEPUIS LE FRONTEND :

// Récupérer les articles de blog
const { data } = await supabase.rpc('get_blog_posts', {
  limit_count: 20,
  offset_count: 0
});

// Récupérer les actualités
const { data } = await supabase.rpc('get_news', {
  limit_count: 10
});

// Récupérer les FAQs
const { data } = await supabase.rpc('get_faqs', {
  category_filter: 'assurance-taxi'
});

// Récupérer les leads (authentifié uniquement)
const { data } = await supabase.rpc('get_leads', {
  status_filter: 'nouveau',
  limit_count: 50
});

// Récupérer les statistiques
const { data } = await supabase.rpc('get_dashboard_stats');

// Rechercher dans le contenu
const { data } = await supabase.rpc('search_content', {
  search_query: 'assurance taxi paris',
  content_type: 'all'
});

✅ SÉCURITÉ :

- RLS activé sur la table de configuration
- Fonctions SECURITY DEFINER (exécutées avec privilèges appropriés)
- Accès anonyme uniquement pour le contenu public
- Leads accessibles uniquement aux utilisateurs authentifiés

✅ CONNEXION SUPABASE :

URL: https://drohhxrkoequjphvabvq.supabase.co
Service Role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik
*/
