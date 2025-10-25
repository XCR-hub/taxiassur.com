/*
  # TEMPORAIRE : Autoriser anon à écrire dans blog_posts

  1. Problème
    - Le backoffice ne peut pas écrire avec la clé anon
    - Pas d'authentification implémentée pour l'instant
    
  2. Solution TEMPORAIRE
    - Permettre à anon d'écrire dans blog_posts
    - À REMPLACER par une vraie authentification en production
    
  3. Sécurité
    - Cette configuration est TEMPORAIRE et pour développement seulement
    - En production, il faut implémenter une authentification utilisateur
*/

-- Policies temporaires pour anon (DÉVELOPPEMENT SEULEMENT)
CREATE POLICY "TEMP: Allow anon insert blog posts"
  ON blog_posts FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "TEMP: Allow anon update blog posts"
  ON blog_posts FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "TEMP: Allow anon delete blog posts"
  ON blog_posts FOR DELETE
  TO anon
  USING (true);

-- Avertissement
DO $$
BEGIN
  RAISE NOTICE '⚠️  ATTENTION: Policies TEMPORAIRES activées pour développement';
  RAISE NOTICE '⚠️  En production, implémenter une vraie authentification !';
  RAISE NOTICE '✅ Anon peut maintenant écrire dans blog_posts';
END $$;
