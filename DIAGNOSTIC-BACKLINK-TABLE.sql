-- Diagnostic de la structure de backlink_campaigns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'backlink_campaigns'
ORDER BY ordinal_position;

-- Voir les données existantes
SELECT * FROM backlink_campaigns LIMIT 3;
