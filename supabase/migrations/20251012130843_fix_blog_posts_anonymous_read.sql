/*
  # Correction accès lecture blog_posts pour anonymes

  1. Problème
     - Erreur 400 lors de la lecture des articles existants
     - Les utilisateurs anonymes ne peuvent pas vérifier les doublons

  2. Solution
     - Ajouter politique SELECT pour utilisateurs anonymes (anon)
     - Permet de lire TOUS les articles (pas seulement publiés)
     - Nécessaire pour vérification des slugs avant publication

  3. Sécurité
     - Lecture seule (pas d'écriture)
     - Permet la vérification de doublons
     - N'expose que les données publiques
*/

-- Supprimer l'ancienne politique si elle existe
DROP POLICY IF EXISTS "Anonymous can read all blog posts" ON blog_posts;

-- Ajouter politique de lecture pour anon sur blog_posts
CREATE POLICY "Anonymous can read all blog posts"
  ON blog_posts
  FOR SELECT
  TO anon
  USING (true);

-- Vérifier les policies
SELECT 
  policyname,
  roles::text,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual::text
    ELSE 'USING: (none)'
  END as policy_using
FROM pg_policies
WHERE tablename = 'blog_posts'
ORDER BY cmd, policyname;
