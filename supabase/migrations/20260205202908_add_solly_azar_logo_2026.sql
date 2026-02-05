/*
  # Ajout du logo Solly Azar

  1. Modification
    - Ajout du logo officiel Solly Azar
    - Configuration de l'URL publique

  2. Logo disponible
    - Solly Azar : logo officiel depuis /logo-officiel-solly-azar_0.png
*/

-- Mettre à jour le logo de Solly Azar
UPDATE insurance_companies
SET logo_url = '/logo-officiel-solly-azar_0.png'
WHERE code = 'SOLLY_AZAR' OR name ILIKE '%Solly%Azar%';

-- Alternative si le code est différent
UPDATE insurance_companies
SET logo_url = '/logo-officiel-solly-azar_0.png'
WHERE LOWER(name) LIKE '%solly%' AND LOWER(name) LIKE '%azar%';
