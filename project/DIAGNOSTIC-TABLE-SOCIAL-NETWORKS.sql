-- Vérifier la structure de la table social_networks
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'social_networks'
ORDER BY ordinal_position;

-- Voir les données actuelles
SELECT * FROM social_networks LIMIT 5;
