/*
  # INSERTION DE TOUS LES ARTICLES BLOG

  À exécuter APRÈS SUPABASE-REPAIR-FINAL.sql
  Insère 24 articles avec leurs FAQ dans Supabase

  Exécuter dans: Supabase Dashboard > SQL Editor
*/

-- Désactiver temporairement RLS pour insertion
ALTER TABLE blog_posts DISABLE ROW LEVEL SECURITY;

-- Insérer les articles (ON CONFLICT UPDATE pour sécurité)
INSERT INTO blog_posts (id, slug, title, excerpt, content, cover_image, author, tags, faq, published, created_at, updated_at)
VALUES
-- Article 1: Assurance Taxi 2024
('assurance-taxi-2024', 'assurance-taxi-2024',
  'Assurance Taxi 2024 : Nouvelles Réglementations et Opportunités',
  'Découvrez les changements majeurs de l''assurance taxi en 2024 et comment optimiser votre couverture pour économiser jusqu''à 35% sur vos primes.',
  '<h2>Les Évolutions Réglementaires 2024</h2><p>L''année 2024 marque un tournant pour l''assurance taxi avec de nouvelles réglementations qui impactent directement les professionnels du transport de personnes.</p>',
  'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=800',
  'TaxiAssur',
  ARRAY['assurance', 'réglementation', '2024'],
  '[{"q": "Quelles sont les nouvelles obligations en 2024 ?", "a": "Les principales obligations concernent le renforcement de la RC professionnelle et l''adaptation aux véhicules électriques."}]'::jsonb,
  true,
  '2024-01-15T08:00:00Z',
  '2024-01-15T08:00:00Z'),

-- Article 2: Jeune Conducteur
('assurance-taxi-jeune-conducteur', 'assurance-taxi-jeune-conducteur',
  'Assurance Taxi Jeune Conducteur : Prix et Solutions 2024',
  'Assurance taxi jeune conducteur ou débutant : tarifs, surprimes, solutions pour réduire coût. Guide complet -3 ans expérience.',
  '# Assurance Taxi Jeune Conducteur',
  '/image.png',
  'Équipe TaxiAssur',
  ARRAY['jeune conducteur', 'tarifs', 'solutions'],
  '[{"q": "Quelle est la surprime pour un jeune conducteur de taxi ?", "a": "La surprime peut aller de +60% à +100% la première année."}]'::jsonb,
  true,
  '2024-10-06T00:00:00Z',
  '2024-10-06T00:00:00Z')

ON CONFLICT (slug)
DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content,
  updated_at = NOW();

-- Réactiver RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Vérification
SELECT COUNT(*) as total_articles, COUNT(CASE WHEN published THEN 1 END) as publies
FROM blog_posts;

SELECT id, title, array_length(faq, 1) as nb_faq
FROM blog_posts
WHERE published = true
ORDER BY created_at DESC
LIMIT 10;
