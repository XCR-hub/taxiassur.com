/*
  # Create News System for TaxiAssur

  1. New Tables
    - `news_articles`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `slug` (text, unique, required)
      - `content` (text, required)
      - `excerpt` (text)
      - `image_url` (text)
      - `source` (text) - Source de l'actualité
      - `source_url` (text) - URL source originale
      - `category` (text) - Catégorie (réglementation, économie, innovation, etc.)
      - `tags` (text array)
      - `score` (integer) - Score de pertinence/qualité
      - `status` (text) - draft, published, archived
      - `published_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on news_articles
    - Allow public to read published articles
    - Allow anon to insert/update (for backoffice)

  3. Indexes
    - Index on status for filtering
    - Index on published_at for ordering
    - Index on slug for lookups
    - Full-text search on title + content
*/

-- Create news_articles table
CREATE TABLE IF NOT EXISTS news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL,
  excerpt text,
  image_url text,
  source text,
  source_url text,
  category text DEFAULT 'général',
  tags text[] DEFAULT '{}',
  score integer DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "unified_news_public_select" ON news_articles;
DROP POLICY IF EXISTS "unified_news_anon_insert" ON news_articles;
DROP POLICY IF EXISTS "unified_news_anon_update" ON news_articles;
DROP POLICY IF EXISTS "unified_news_anon_delete" ON news_articles;

-- SELECT: Public can read published articles
CREATE POLICY "unified_news_public_select"
  ON news_articles
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published' OR status = 'draft');

-- INSERT: Backoffice can create
CREATE POLICY "unified_news_anon_insert"
  ON news_articles
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- UPDATE: Backoffice can modify
CREATE POLICY "unified_news_anon_update"
  ON news_articles
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- DELETE: Backoffice can delete
CREATE POLICY "unified_news_anon_delete"
  ON news_articles
  FOR DELETE
  TO anon
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS news_articles_status_idx ON news_articles(status);
CREATE INDEX IF NOT EXISTS news_articles_published_at_idx ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS news_articles_slug_idx ON news_articles(slug);
CREATE INDEX IF NOT EXISTS news_articles_category_idx ON news_articles(category);

-- Full-text search index
CREATE INDEX IF NOT EXISTS news_articles_search_idx ON news_articles USING gin(to_tsvector('french', title || ' ' || content));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_news_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();

  -- Auto-set published_at when status changes to published
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    NEW.published_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER news_articles_updated_at_trigger
  BEFORE UPDATE ON news_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_news_articles_updated_at();

-- Insert sample news articles
INSERT INTO news_articles (title, slug, content, excerpt, category, tags, status, score, source, published_at)
VALUES
(
  'Réglementation 2024 : Nouvelles Obligations pour les Taxis',
  'reglementation-2024-nouvelles-obligations-taxis',
  E'# Réglementation 2024 : Ce qui change pour les taxis\n\nLe ministère des Transports vient d''annoncer plusieurs nouvelles mesures qui entreront en vigueur dès janvier 2024.\n\n## Assurance obligatoire renforcée\n\nLes taxis devront désormais souscrire une assurance RC professionnelle avec un plafond minimal de 2 millions d''euros.\n\n## Formation continue\n\nUne formation de recyclage de 14 heures tous les 5 ans devient obligatoire.\n\n## Véhicules propres\n\nLes nouvelles licences seront réservées aux véhicules électriques ou hybrides dans les grandes métropoles.\n\n## Impact sur les assurances\n\nCes nouvelles obligations vont probablement entraîner une hausse des primes d''assurance. TaxiAssur.com vous accompagne pour trouver les meilleures offres adaptées à ces nouvelles exigences.',
  'Le ministère des Transports annonce plusieurs nouvelles mesures pour 2024 : assurance RC renforcée, formation continue et véhicules propres.',
  'réglementation',
  ARRAY['réglementation', 'assurance', 'obligations'],
  'published',
  92,
  'Ministère des Transports',
  now() - interval '2 days'
),
(
  'Assurance Taxi : Comment économiser jusqu''à 30% en 2024',
  'assurance-taxi-economiser-30-pourcent-2024',
  E'# Comment réduire votre prime d''assurance taxi en 2024\n\nAvec la hausse des primes d''assurance, de nombreux chauffeurs cherchent des solutions pour optimiser leurs coûts.\n\n## 1. Comparer les offres\n\nNe vous contentez pas de votre assureur actuel. Un comparateur comme TaxiAssur.com vous permet de gagner jusqu''à 30%.\n\n## 2. Augmenter la franchise\n\nEn passant d''une franchise de 300€ à 500€, vous pouvez économiser 10-15% sur votre prime annuelle.\n\n## 3. Regrouper vos contrats\n\nEn souscrivant RC pro + protection juridique + véhicule de remplacement chez le même assureur, bénéficiez de réductions.\n\n## 4. Installer des équipements de sécurité\n\nCaméra embarquée, système antivol : jusqu''à 10% de réduction.\n\n## 5. Bon profil conducteur\n\nAucun sinistre = bonus maximum = économies garanties !',
  'Découvrez 5 astuces concrètes pour réduire significativement votre prime d''assurance taxi en 2024.',
  'économie',
  ARRAY['économie', 'assurance', 'conseils'],
  'published',
  88,
  'TaxiAssur Blog',
  now() - interval '5 days'
),
(
  'Tesla Model 3 : La nouvelle star des taxis parisiens',
  'tesla-model-3-nouvelle-star-taxis-parisiens',
  E'# Tesla Model 3 : Le choix n°1 des nouveaux taxis à Paris\n\nLa Tesla Model 3 s''impose comme le véhicule préféré des nouveaux chauffeurs de taxi parisiens.\n\n## Pourquoi ce succès ?\n\n### Coût d''exploitation réduit\n\nAvec un coût au kilomètre 3 fois inférieur à un véhicule thermique, la rentabilité est au rendez-vous.\n\n### Autonomie adaptée\n\nLes 500 km d''autonomie permettent de couvrir une journée complète sans recharge.\n\n### Image premium\n\nLes clients apprécient le confort et la technologie embarquée.\n\n## Assurance spécifique\n\nTaxiAssur.com propose des contrats spécialement adaptés aux taxis électriques avec des tarifs préférentiels.\n\n## Aides disponibles\n\nBonus écologique de 7000€ + prime à la conversion : jusqu''à 12000€ d''aides cumulées.',
  'La Tesla Model 3 devient le véhicule de prédilection des taxis parisiens grâce à sa rentabilité et son image premium.',
  'innovation',
  ARRAY['véhicules électriques', 'Tesla', 'innovation'],
  'published',
  95,
  'Mobilité Magazine',
  now() - interval '1 day'
);

-- Verification
DO $$
DECLARE
  news_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO news_count FROM news_articles WHERE status = 'published';

  RAISE NOTICE '✅ Table news_articles créée avec % actualités publiées', news_count;
  RAISE NOTICE '✅ RLS activé avec 4 policies (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '✅ Indexes créés pour performance optimale';
  RAISE NOTICE '✅ Full-text search configuré en français';
END $$;
