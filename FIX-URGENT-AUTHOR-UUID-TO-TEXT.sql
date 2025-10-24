-- ══════════════════════════════════════════════════════════════════
-- 🚨 FIX URGENT - Erreur 400 "COALESCE types uuid and integer"
-- ══════════════════════════════════════════════════════════════════
-- 
-- PROBLÈME : La colonne 'author' est UUID mais l'app envoie TEXT
-- SOLUTION : Convertir UUID → TEXT
-- TEMPS   : 10 secondes
--
-- ══════════════════════════════════════════════════════════════════

-- 1️⃣ DIAGNOSTIC - Vérifier le type actuel
SELECT
  '🔍 TYPE ACTUEL' AS step,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'blog_posts'
  AND column_name = 'author';

-- 2️⃣ CORRECTION - Convertir en TEXT
ALTER TABLE blog_posts
ALTER COLUMN author TYPE TEXT 
USING COALESCE(author::TEXT, 'TaxiAssur');

-- 3️⃣ SÉCURITÉ - Définir valeur par défaut
ALTER TABLE blog_posts
ALTER COLUMN author SET DEFAULT 'TaxiAssur';

-- 4️⃣ FLEXIBILITÉ - Autoriser NULL
ALTER TABLE blog_posts
ALTER COLUMN author DROP NOT NULL;

-- 5️⃣ VÉRIFICATION - Confirmer le changement
SELECT
  '✅ TYPE CORRIGÉ' AS step,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'blog_posts'
  AND column_name = 'author';

-- 6️⃣ TEST - Insérer un article de test
INSERT INTO blog_posts (
  title,
  slug,
  excerpt,
  content,
  published,
  author,
  featured_image,
  image_alt
)
VALUES (
  '✅ Test Correction Author Column',
  'test-correction-author-' || EXTRACT(EPOCH FROM NOW())::TEXT,
  'Article de test pour vérifier que la colonne author accepte maintenant du TEXT',
  '<h1>Test Réussi</h1><p>La colonne author accepte maintenant "TaxiAssur" (TEXT) au lieu de UUID.</p>',
  true,
  'TaxiAssur',
  'https://images.pexels.com/photos/13801858/pexels-photo-13801858.jpeg?auto=compress',
  'Test image taxi'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  updated_at = NOW()
RETURNING
  '🎉 TEST INSERTION RÉUSSI' AS step,
  id,
  title,
  author,
  LENGTH(content) AS content_length,
  featured_image IS NOT NULL AS has_image,
  created_at;

-- ══════════════════════════════════════════════════════════════════
-- ✅ SI VOUS VOYEZ "TEST INSERTION RÉUSSI", C'EST CORRIGÉ !
-- ══════════════════════════════════════════════════════════════════
--
-- PROCHAINES ÉTAPES :
-- 1. Recharger l'interface : https://taxiassur.com/backoffice/ai-generator
-- 2. Vider le cache : Ctrl+Shift+R (ou Cmd+Shift+R sur Mac)
-- 3. Re-tester : Générer + Publier
--
-- RÉSULTAT ATTENDU : ✅ Publication réussie avec image
--
-- ══════════════════════════════════════════════════════════════════
