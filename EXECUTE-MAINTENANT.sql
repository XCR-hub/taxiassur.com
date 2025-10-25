-- SUPPRIMER DOUBLONS - EXÉCUTER DANS SUPABASE
DELETE FROM backlink_campaigns 
WHERE id NOT IN (
  SELECT DISTINCT ON (name) id
  FROM backlink_campaigns
  ORDER BY name, created_at ASC
);

-- VÉRIFICATION
SELECT 
  'RESULTAT' as check_type,
  COUNT(*) as nb_campagnes,
  string_agg(name, ', ') as campagnes
FROM backlink_campaigns;

-- COMPTER OPPORTUNITÉS
SELECT 
  'OPPORTUNITES' as type,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'new' THEN 1 END) as nouvelles
FROM backlink_opportunities;
