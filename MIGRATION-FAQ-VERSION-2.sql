/*
  # Migration FAQ - Version 2 (Tous les Champs)

  Si la table 'faq' a tous les champs complets
*/

-- Migrer avec tous les champs
INSERT INTO faq_entries (
  question,
  answer,
  category,
  status,
  created_at,
  updated_at,
  order_index,
  tags
)
SELECT
  question,
  answer,
  COALESCE(category, 'general'),
  'published',
  COALESCE(created_at, NOW()),
  COALESCE(updated_at, NOW()),
  0,
  CASE
    WHEN category IS NOT NULL THEN ARRAY[category]
    ELSE ARRAY['general']
  END
FROM faq
WHERE question IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM faq_entries fe
    WHERE fe.question = faq.question
  );

-- Vérifier
SELECT COUNT(*) FROM faq_entries WHERE status = 'published';
