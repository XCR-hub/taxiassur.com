-- Vérifier la structure réelle de backlink_opportunities
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'backlink_opportunities'
ORDER BY ordinal_position;
