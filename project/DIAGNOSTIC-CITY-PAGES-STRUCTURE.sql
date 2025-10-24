-- Diagnostic complet de la table city_pages

-- 1. Vérifier si la table existe
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'city_pages'
) as table_exists;

-- 2. Lister TOUTES les colonnes de city_pages
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'city_pages'
ORDER BY ordinal_position;

-- 3. Voir un exemple de données
SELECT * FROM city_pages LIMIT 3;

-- 4. Compter les enregistrements
SELECT COUNT(*) as total FROM city_pages;
