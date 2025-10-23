-- DIAGNOSTIC: Contenu des Articles Blog
-- Vérifier le contenu des articles actuels

-- 1. Compter les articles et voir leur état
SELECT
  COUNT(*) as total_articles,
  COUNT(*) FILTER (WHERE published = true) as publies,
  COUNT(*) FILTER (WHERE featured_image IS NOT NULL) as avec_image,
  COUNT(*) FILTER (WHERE LENGTH(content) < 100) as contenu_court,
  COUNT(*) FILTER (WHERE content LIKE '%Contenu généré par IA%') as contenu_placeholder
FROM blog_posts;

-- 2. Voir les premiers articles (titre + début contenu + image)
SELECT
  slug,
  title,
  LEFT(content, 150) as preview_content,
  LENGTH(content) as content_length,
  featured_image IS NOT NULL as has_image,
  created_at
FROM blog_posts
WHERE published = true
ORDER BY created_at DESC
LIMIT 5;

-- 3. Voir un article spécifique complet
SELECT
  *
FROM blog_posts
WHERE slug = 'assurance-taxi-2025-guide-complet-59'
OR slug LIKE '%assurance-taxi-2025%'
LIMIT 1;

-- 4. Vérifier si les articles ont un vrai contenu HTML
SELECT
  slug,
  title,
  CASE
    WHEN content LIKE '%<h%' THEN 'HTML'
    WHEN content LIKE '%#%' THEN 'Markdown'
    ELSE 'Texte brut'
  END as content_type,
  LENGTH(content) as taille,
  featured_image IS NOT NULL as has_image
FROM blog_posts
WHERE published = true
ORDER BY created_at DESC
LIMIT 10;
