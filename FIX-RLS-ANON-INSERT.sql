/*
  # Fix RLS pour permettre insertions anonymes depuis backoffice
  
  PROBLÈME: Le backoffice utilise la clé ANON pour publier
  SOLUTION: Permettre insertions anonymes mais UNIQUEMENT pour blog_posts, faq_entries, city_pages
  
  SÉCURITÉ: En production, il faudra soit:
  1. Protéger le backoffice par authentification
  2. Utiliser une clé SERVICE_ROLE côté serveur
  3. Créer des Edge Functions protégées
  
  Pour l'instant: on autorise les insertions anonymes pour débloquer
*/

-- ============================================
-- BLOG POSTS: Autoriser insertions anonymes
-- ============================================

DROP POLICY IF EXISTS "Allow anon insert blog posts" ON blog_posts;
CREATE POLICY "Allow anon insert blog posts"
  ON blog_posts FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update blog posts" ON blog_posts;
CREATE POLICY "Allow anon update blog posts"
  ON blog_posts FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================
-- FAQ ENTRIES: Autoriser insertions anonymes
-- ============================================

DROP POLICY IF EXISTS "Allow anon insert FAQ" ON faq_entries;
CREATE POLICY "Allow anon insert FAQ"
  ON faq_entries FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update FAQ" ON faq_entries;
CREATE POLICY "Allow anon update FAQ"
  ON faq_entries FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================
-- CITY PAGES: Autoriser insertions anonymes
-- ============================================

-- Créer la table city_pages si elle n'existe pas
CREATE TABLE IF NOT EXISTS city_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL,
  meta_description text,
  keywords text[],
  status text DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE city_pages ENABLE ROW LEVEL SECURITY;

-- Lecture publique
DROP POLICY IF EXISTS "Allow public read city pages" ON city_pages;
CREATE POLICY "Allow public read city pages"
  ON city_pages FOR SELECT
  TO anon
  USING (status = 'published');

-- Insertion anonyme
DROP POLICY IF EXISTS "Allow anon insert city pages" ON city_pages;
CREATE POLICY "Allow anon insert city pages"
  ON city_pages FOR INSERT
  TO anon
  WITH CHECK (true);

-- Update anonyme
DROP POLICY IF EXISTS "Allow anon update city pages" ON city_pages;
CREATE POLICY "Allow anon update city pages"
  ON city_pages FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Afficher toutes les policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('blog_posts', 'faq_entries', 'city_pages')
ORDER BY tablename, policyname;

