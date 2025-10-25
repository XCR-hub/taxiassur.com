/*
  # Ajout des policies d'écriture pour utilisateurs authentifiés

  1. Problème
    - Le backoffice ne peut pas écrire avec la clé anon
    - La service_role_key ne doit pas être exposée côté client
    
  2. Solution
    - Ajouter des policies pour permettre aux utilisateurs authentifiés d'écrire
    - Cela permettra au backoffice de fonctionner après authentification
*/

-- Policies pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can insert blog posts"
  ON blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update blog posts"
  ON blog_posts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete blog posts"
  ON blog_posts FOR DELETE
  TO authenticated
  USING (true);

-- Vérification
DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'blog_posts';
  RAISE NOTICE '✅ Total policies blog_posts: %', policy_count;
  RAISE NOTICE '✅ Les utilisateurs authentifiés peuvent maintenant écrire';
END $$;
