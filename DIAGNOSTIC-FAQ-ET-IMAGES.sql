-- ============================================================================
-- DIAGNOSTIC COMPLET : FAQ + IMAGES
-- ============================================================================

-- 1. VÉRIFIER STRUCTURE FAQ
SELECT '=== STRUCTURE FAQ_ENTRIES ===' as info;

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'faq_entries'
ORDER BY ordinal_position;

SELECT 'Total FAQ existantes:' as info, COUNT(*) as count FROM faq_entries;

-- 2. VÉRIFIER POLICIES RLS FAQ
SELECT '=== POLICIES RLS FAQ ===' as info;

SELECT
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'faq_entries';

-- 3. TEST INSERTION FAQ
SELECT '=== TEST INSERT FAQ ===' as info;

INSERT INTO faq_entries (question, answer, category, order_index)
VALUES (
  'Test FAQ diagnostic ?',
  'Ceci est un test d''insertion FAQ',
  'Test',
  9999
)
RETURNING id, question, category;

-- Nettoyer
DELETE FROM faq_entries WHERE order_index = 9999;

-- 4. VÉRIFIER STRUCTURE BLOG_POSTS (IMAGES)
SELECT '=== STRUCTURE BLOG_POSTS (IMAGES) ===' as info;

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'blog_posts'
AND column_name IN ('featured_image', 'image_alt', 'author', 'keywords')
ORDER BY column_name;

-- 5. VÉRIFIER ARTICLES AVEC/SANS IMAGES
SELECT '=== ARTICLES AVEC IMAGES ===' as info;

SELECT
  COUNT(*) FILTER (WHERE featured_image IS NOT NULL) as avec_image,
  COUNT(*) FILTER (WHERE featured_image IS NULL) as sans_image,
  COUNT(*) as total
FROM blog_posts
WHERE published = true;

-- 6. AFFICHER DERNIERS ARTICLES AVEC STATUT IMAGE
SELECT '=== 5 DERNIERS ARTICLES ===' as info;

SELECT
  title,
  CASE
    WHEN featured_image IS NOT NULL THEN '✅ OUI'
    ELSE '❌ NON'
  END as a_une_image,
  LEFT(featured_image, 50) as debut_url_image,
  created_at
FROM blog_posts
WHERE published = true
ORDER BY created_at DESC
LIMIT 5;

-- 7. VÉRIFIER POLICIES RLS BLOG_POSTS
SELECT '=== POLICIES RLS BLOG_POSTS ===' as info;

SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'blog_posts'
ORDER BY cmd;

-- 8. TEST INSERTION ARTICLE AVEC IMAGE
SELECT '=== TEST INSERT ARTICLE AVEC IMAGE ===' as info;

INSERT INTO blog_posts (
  slug,
  title,
  excerpt,
  content,
  meta_title,
  meta_description,
  keywords,
  published,
  read_time,
  author,
  featured_image,
  image_alt
)
VALUES (
  'test-diagnostic-image-' || EXTRACT(EPOCH FROM NOW())::text,
  'Test Diagnostic Image',
  'Test d''insertion avec image',
  '<p>Contenu de test</p>',
  'Test',
  'Test meta',
  ARRAY['test']::text[],
  false,
  1,
  'TaxiAssur',
  'https://images.pexels.com/photos/test.jpg',
  'Test image alt'
)
RETURNING
  id,
  title,
  featured_image IS NOT NULL as image_sauvegardee,
  image_alt IS NOT NULL as alt_sauvegarde;

-- Nettoyer
DELETE FROM blog_posts WHERE slug LIKE 'test-diagnostic-image-%';

-- 9. RÉSUMÉ FINAL
SELECT '=== RÉSUMÉ ===' as info;

SELECT
  'FAQ' as table_name,
  COUNT(*) as total_entries,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'faq_entries') as nb_policies
FROM faq_entries
UNION ALL
SELECT
  'BLOG_POSTS' as table_name,
  COUNT(*) as total_entries,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'blog_posts') as nb_policies
FROM blog_posts;

SELECT '✅ DIAGNOSTIC TERMINÉ' as status;
