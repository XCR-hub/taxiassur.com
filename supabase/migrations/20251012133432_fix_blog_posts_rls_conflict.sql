/*
  # Correction conflit RLS blog_posts (erreur 409)

  1. Problème
     - Erreur 409 lors de SELECT sur blog_posts
     - Conflit entre 3 policies SELECT (anon, public, authenticated)
     - La policy "public" crée un conflit avec "anon"

  2. Solution
     - Supprimer la policy "public" redondante
     - Garder seulement "anon" (utilisateurs non connectés) et "authenticated"
     - Simplifier les règles RLS

  3. Résultat
     - anon : peut lire tous les articles
     - authenticated : peut tout faire (CRUD complet)
     - service_role : peut insérer
*/

-- Supprimer la policy redondante qui cause le conflit
DROP POLICY IF EXISTS "Articles publiés visibles par tous" ON blog_posts;

-- Vérifier les policies restantes
SELECT 
  policyname,
  roles::text,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN qual::text
    ELSE 'N/A'
  END as condition
FROM pg_policies
WHERE tablename = 'blog_posts'
ORDER BY cmd, policyname;
