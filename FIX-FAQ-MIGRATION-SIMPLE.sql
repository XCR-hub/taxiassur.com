/*
  # Migration FAQ Simple - Sans Erreur

  Étape par étape pour migrer les FAQ de 'faq' vers 'faq_entries'
*/

-- ÉTAPE 1 : Vérifier les structures des tables
-- Copie le résultat de cette requête :
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('faq', 'faq_entries')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- ÉTAPE 2 : Compter les FAQ dans chaque table
SELECT 'Table faq' as source, COUNT(*) as count FROM faq
UNION ALL
SELECT 'Table faq_entries' as source, COUNT(*) as count FROM faq_entries;

-- ÉTAPE 3 : Voir le contenu de la table 'faq'
SELECT * FROM faq LIMIT 5;

-- ÉTAPE 4 : Voir le contenu de la table 'faq_entries'
SELECT question, category, status, created_at
FROM faq_entries
ORDER BY created_at DESC
LIMIT 5;
