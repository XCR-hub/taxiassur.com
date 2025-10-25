/*
  # Migration FAQ - Version 1 (Structure Basique)

  Si la table 'faq' a les colonnes : id, question, answer, category
*/

-- Migrer les FAQ (version simple)
INSERT INTO faq_entries (question, answer, category, status)
SELECT
  question,
  answer,
  COALESCE(category, 'general') as category,
  'published' as status
FROM faq
WHERE question IS NOT NULL
  AND answer IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM faq_entries fe
    WHERE fe.question = faq.question
  );

-- Vérifier le résultat
SELECT COUNT(*) as total_faq FROM faq_entries WHERE status = 'published';
