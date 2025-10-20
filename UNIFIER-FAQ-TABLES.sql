/*
  # Unifier les tables FAQ

  Problème :
  - Table `faq` contient 5 FAQ anciennes (statiques)
  - Table `faq_entries` contient 60 FAQ générées par l'IA
  - Le code charge depuis `faq_entries` mais les anciennes FAQ sont dans `faq`

  Solution :
  1. Migrer les 5 FAQ de `faq` vers `faq_entries`
  2. Supprimer la table `faq` (obsolète)
  3. Tout sera unifié dans `faq_entries`
*/

-- 1. Vérifier le contenu actuel
SELECT 'Table faq:' as table_name, COUNT(*) as count FROM faq
UNION ALL
SELECT 'Table faq_entries:' as table_name, COUNT(*) as count FROM faq_entries;

-- 2. Migrer les FAQ de 'faq' vers 'faq_entries' (si elles n'existent pas déjà)
INSERT INTO faq_entries (question, answer, category, status, created_at, updated_at, order_index)
SELECT
  question,
  answer,
  category,
  'published' as status,
  NOW() as created_at,
  NOW() as updated_at,
  0 as order_index
FROM faq
WHERE NOT EXISTS (
  SELECT 1 FROM faq_entries
  WHERE faq_entries.question = faq.question
);

-- 3. Vérifier que toutes les FAQ sont maintenant dans faq_entries
SELECT 'FAQ après migration:' as info, COUNT(*) as count
FROM faq_entries
WHERE status = 'published';

-- 4. Supprimer l'ancienne table faq (OPTIONNEL - décommenter si tu veux la supprimer)
-- DROP TABLE IF EXISTS faq CASCADE;

-- 5. Vérifier la fonction RPC
SELECT 'Test fonction get_faq_entries:' as info;
SELECT COUNT(*) as total_faq FROM get_faq_entries();

-- 6. Lister les 10 premières FAQ
SELECT question, category, created_at
FROM faq_entries
WHERE status = 'published'
ORDER BY created_at DESC
LIMIT 10;

-- ✅ RÉSULTAT ATTENDU :
-- - faq_entries contient maintenant TOUTES les FAQ (anciennes + IA)
-- - La fonction get_faq_entries() retourne toutes les FAQ
-- - La page /faq affiche maintenant toutes les FAQ
-- - L'ancienne table 'faq' peut être supprimée (optionnel)
