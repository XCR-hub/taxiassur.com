/*
  DIAGNOSTIC COMPLET - STRUCTURE CITY_PAGES ET DONNÉES
*/

-- 1. Vérifier colonnes city_pages
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'city_pages'
ORDER BY ordinal_position;

-- 2. Compter les pages villes
SELECT
  COUNT(*) as total_pages,
  COUNT(*) FILTER (WHERE published = true) as published_pages,
  COUNT(*) FILTER (WHERE dept IS NOT NULL) as with_dept,
  COUNT(*) FILTER (WHERE region IS NOT NULL) as with_region,
  COUNT(*) FILTER (WHERE taxi_count > 0) as with_taxi_count
FROM city_pages;

-- 3. Voir exemples de données city_pages
SELECT
  city_name,
  slug,
  dept,
  region,
  taxi_count,
  published,
  LENGTH(content::text) as content_size
FROM city_pages
ORDER BY city_name
LIMIT 5;

-- 4. Vérifier structure FAQ
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'faq'
ORDER BY ordinal_position;

-- 5. Compter les FAQ
SELECT
  COUNT(*) as total_faq,
  COUNT(DISTINCT city) as cities_with_faq
FROM faq;

-- 6. Vérifier structure blog_posts
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'blog_posts'
ORDER BY ordinal_position;

-- 7. Compter les articles
SELECT
  COUNT(*) as total_articles,
  COUNT(*) FILTER (WHERE published = true) as published_articles
FROM blog_posts;

-- 8. Vérifier structure news_articles
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'news_articles'
ORDER BY ordinal_position;

-- 9. Compter les news
SELECT
  COUNT(*) as total_news,
  COUNT(*) FILTER (WHERE published = true) as published_news
FROM news_articles;

-- 10. Résumé final
SELECT
  'city_pages' as table_name,
  COUNT(*) as count,
  MAX(updated_at) as last_update
FROM city_pages
UNION ALL
SELECT
  'faq' as table_name,
  COUNT(*) as count,
  MAX(updated_at) as last_update
FROM faq
UNION ALL
SELECT
  'blog_posts' as table_name,
  COUNT(*) as count,
  MAX(updated_at) as last_update
FROM blog_posts
UNION ALL
SELECT
  'news_articles' as table_name,
  COUNT(*) as count,
  MAX(updated_at) as last_update
FROM news_articles;
