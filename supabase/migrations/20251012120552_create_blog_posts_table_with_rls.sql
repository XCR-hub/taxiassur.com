/*
  # Création de la table blog_posts pour les articles automatiques

  1. Nouvelle Table
    - `blog_posts`
      - `id` (text, primary key) - Slug de l'article
      - `title` (text) - Titre de l'article
      - `excerpt` (text) - Résumé court
      - `content` (text) - Contenu HTML complet
      - `author` (text) - Auteur
      - `cover_image` (text) - URL de l'image de couverture
      - `tags` (text[]) - Tags/catégories
      - `published` (boolean) - Publié ou brouillon
      - `created_at` (timestamptz) - Date de création
      - `updated_at` (timestamptz) - Date de mise à jour
      - `faq` (jsonb) - FAQ associée à l'article
      
  2. Sécurité
    - Enable RLS sur `blog_posts`
    - Lecture publique pour les articles publiés
    - Écriture réservée aux utilisateurs authentifiés
*/

CREATE TABLE IF NOT EXISTS blog_posts (
  id text PRIMARY KEY,
  title text NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  author text DEFAULT 'TaxiAssur' NOT NULL,
  cover_image text,
  tags text[] DEFAULT ARRAY[]::text[],
  published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  faq jsonb DEFAULT '[]'::jsonb
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS blog_posts_created_at_idx ON blog_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_published_idx ON blog_posts(published) WHERE published = true;
CREATE INDEX IF NOT EXISTS blog_posts_tags_idx ON blog_posts USING gin(tags);

-- Enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Politique de lecture publique pour les articles publiés
CREATE POLICY "Articles publiés visibles par tous"
  ON blog_posts
  FOR SELECT
  USING (published = true);

-- Politique de lecture complète pour les utilisateurs authentifiés
CREATE POLICY "Tous les articles visibles pour les authentifiés"
  ON blog_posts
  FOR SELECT
  TO authenticated
  USING (true);

-- Politique d'insertion pour les utilisateurs authentifiés
CREATE POLICY "Insertion d'articles pour les authentifiés"
  ON blog_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Politique de mise à jour pour les utilisateurs authentifiés
CREATE POLICY "Mise à jour d'articles pour les authentifiés"
  ON blog_posts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Politique de suppression pour les utilisateurs authentifiés
CREATE POLICY "Suppression d'articles pour les authentifiés"
  ON blog_posts
  FOR DELETE
  TO authenticated
  USING (true);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
