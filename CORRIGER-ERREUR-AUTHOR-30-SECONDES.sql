-- ============================================
-- FIX ERREUR 400 - AUTHOR COLUMN
-- Temps: 30 secondes
-- ============================================

-- 1️⃣ CONVERTIR LA COLONNE EN TEXT
ALTER TABLE blog_posts
ALTER COLUMN author TYPE TEXT USING COALESCE(author::TEXT, 'TaxiAssur');

-- 2️⃣ DÉFINIR VALEUR PAR DÉFAUT
ALTER TABLE blog_posts
ALTER COLUMN author SET DEFAULT 'TaxiAssur';

-- 3️⃣ AUTORISER NULL (SÉCURITÉ)
ALTER TABLE blog_posts
ALTER COLUMN author DROP NOT NULL;

-- ============================================
-- ✅ CORRECTION TERMINÉE
-- ============================================

-- VÉRIFICATION RAPIDE
SELECT
  '✅ CORRECTION APPLIQUÉE' AS status,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'blog_posts'
  AND column_name = 'author';

-- TEST D'INSERTION
INSERT INTO blog_posts (
  title,
  slug,
  excerpt,
  content,
  published,
  author
)
VALUES (
  '✅ Test Correction Author',
  'test-correction-author-' || EXTRACT(EPOCH FROM NOW())::TEXT,
  'Test correction de la colonne author',
  '<p>Si vous voyez cet article, la correction fonctionne !</p>',
  true,
  'TaxiAssur'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  updated_at = NOW()
RETURNING
  '✅ TEST RÉUSSI' AS status,
  id,
  title,
  author,
  created_at;

-- ============================================
-- 🎉 PROCHAINES ÉTAPES
-- ============================================
-- 1. Vider le cache navigateur (Ctrl+Shift+R)
-- 2. Tester: https://taxiassur.com/backoffice/ai-generator
-- 3. Générer et publier un article
-- ============================================
