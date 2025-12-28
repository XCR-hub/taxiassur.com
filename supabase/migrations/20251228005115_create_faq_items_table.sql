/*
  # Création de la table FAQ Items pour automatisation

  1. Nouvelle Table
    - `faq_items`
      - `id` (uuid, primary key)
      - `question` (text, not null) - Question de la FAQ
      - `answer` (text, not null) - Réponse détaillée
      - `category` (text, not null) - Catégorie (Prix, Garanties, Sinistres, etc.)
      - `keywords` (text[]) - Mots-clés pour SEO
      - `slug` (text, unique) - URL-friendly slug
      - `naturalness_score` (integer) - Score 0-100 de naturalité du contenu
      - `writing_style` (text) - Style d'écriture utilisé
      - `featured` (boolean) - Mise en avant
      - `views_count` (integer) - Nombre de vues
      - `published_at` (timestamptz) - Date de publication
      - `created_at` (timestamptz) - Date de création
      - `updated_at` (timestamptz) - Date de mise à jour

  2. Security
    - Enable RLS on `faq_items` table
    - Add policy for public to read published FAQs
    - Add policy for authenticated users to manage all FAQs
*/

CREATE TABLE IF NOT EXISTS faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL DEFAULT 'Général',
  keywords text[] DEFAULT '{}',
  slug text UNIQUE,
  naturalness_score integer DEFAULT 0,
  writing_style text DEFAULT 'professionnel',
  featured boolean DEFAULT false,
  views_count integer DEFAULT 0,
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_faq_items_category ON faq_items(category);
CREATE INDEX IF NOT EXISTS idx_faq_items_published ON faq_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_faq_items_featured ON faq_items(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_faq_items_slug ON faq_items(slug);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_faq_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER faq_items_updated_at
  BEFORE UPDATE ON faq_items
  FOR EACH ROW
  EXECUTE FUNCTION update_faq_items_updated_at();

-- Enable Row Level Security
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;

-- Policy: Public peut voir les FAQs publiées
CREATE POLICY "Public can view published FAQs"
  ON faq_items
  FOR SELECT
  USING (published_at <= now());

-- Policy: Authenticated peut tout voir
CREATE POLICY "Authenticated users can view all FAQs"
  ON faq_items
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated peut insérer
CREATE POLICY "Authenticated users can insert FAQs"
  ON faq_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated peut modifier
CREATE POLICY "Authenticated users can update FAQs"
  ON faq_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated peut supprimer
CREATE POLICY "Authenticated users can delete FAQs"
  ON faq_items
  FOR DELETE
  TO authenticated
  USING (true);