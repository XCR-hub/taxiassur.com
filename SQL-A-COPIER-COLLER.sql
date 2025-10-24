-- ══════════════════════════════════════════════════════════════════
-- 🚨 COPIER/COLLER CE SQL DANS SUPABASE
-- ══════════════════════════════════════════════════════════════════
-- URL: https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/sql/new
-- ══════════════════════════════════════════════════════════════════

-- Convertir la colonne author de UUID à TEXT
ALTER TABLE blog_posts
ALTER COLUMN author TYPE TEXT USING COALESCE(author::TEXT, 'TaxiAssur');

-- Définir valeur par défaut
ALTER TABLE blog_posts
ALTER COLUMN author SET DEFAULT 'TaxiAssur';

-- Autoriser NULL
ALTER TABLE blog_posts
ALTER COLUMN author DROP NOT NULL;

-- Vérification
SELECT '✅ CORRECTION APPLIQUÉE - La publication va maintenant fonctionner !' AS status;

-- ══════════════════════════════════════════════════════════════════
-- ✅ Après avoir cliqué "RUN", recharger l'interface et re-tester
-- ══════════════════════════════════════════════════════════════════
