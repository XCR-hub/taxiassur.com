/*
  TEST: Génération Directe d'un Article dans Supabase

  Ce script crée directement un article de test dans blog_posts
  pour vérifier que le système fonctionne.
*/

-- 1. Créer un article de test MAINTENANT
INSERT INTO blog_posts (
  id,
  slug,
  title,
  excerpt,
  content,
  meta_description,
  tags,
  published,
  reading_time,
  faq,
  created_at,
  updated_at
) VALUES (
  'test-article-' || extract(epoch from now())::text,
  'test-article-generation-automatique-' || to_char(now(), 'YYYY-MM-DD-HH24-MI-SS'),
  'TEST : Article Généré Automatiquement le ' || to_char(now(), 'DD/MM/YYYY à HH24:MI'),
  'Ceci est un article de test généré automatiquement pour vérifier que le système de publication fonctionne correctement.',
  '<h2>Article de Test</h2>
   <p>Cet article a été créé automatiquement le ' || to_char(now(), 'DD/MM/YYYY à HH24:MI:SS') || ' pour vérifier que :</p>
   <ul>
     <li>La table blog_posts fonctionne correctement</li>
     <li>Les articles sont bien publiés</li>
     <li>La fonction get_blog_posts() retourne les résultats</li>
     <li>Le site web affiche les nouveaux articles</li>
   </ul>
   <h2>Prochaines Étapes</h2>
   <p>Si vous voyez cet article sur taxiassur.com/blog, cela signifie que le système fonctionne parfaitement !</p>
   <p>Vous pouvez maintenant activer les automatisations complètes avec le fichier ACTIVATION-TOTALE-AUTOMATISATIONS.sql</p>',
  'Article de test pour vérifier la publication automatique sur TaxiAssur',
  ARRAY['test', 'automatisation', 'blog'],
  true, -- PUBLISHED = TRUE !
  2,
  '[]'::jsonb,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  updated_at = now();

-- 2. Vérifier que l'article est créé
SELECT
  id,
  title,
  slug,
  published,
  created_at,
  'Article créé avec succès !' as status
FROM blog_posts
WHERE id LIKE 'test-article-%'
ORDER BY created_at DESC
LIMIT 1;

-- 3. Compter les articles d'aujourd'hui
SELECT
  COUNT(*) as "Articles créés aujourd'hui",
  MAX(created_at) as "Dernier article"
FROM blog_posts
WHERE DATE(created_at) = CURRENT_DATE;

-- 4. Tester la fonction RPC
SELECT * FROM get_blog_posts() LIMIT 3;
