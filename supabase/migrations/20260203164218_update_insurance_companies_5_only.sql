/*
  # Mise à jour des 5 compagnies d'assurance taxi

  1. Modifications
    - Correction du nom de MFA en 2MA
    - Marquer les 5 compagnies comme obligatoires (is_mandatory = true)
    - Désactiver toutes les autres compagnies

  2. Compagnies actives
    - Generali
    - 2MA
    - Plus Simple
    - Zéphyr
    - Solly Azar
*/

-- Désactiver toutes les compagnies sauf les 5 principales
UPDATE insurance_companies
SET is_active = false, is_mandatory = false
WHERE code NOT IN ('GENERALI', 'MFA', 'PLUSSIMPLE', 'ZEPHYR', 'SOLLYAZAR');

-- Corriger le nom de MFA en 2MA et activer
UPDATE insurance_companies
SET
  name = '2MA',
  code = '2MA',
  description = 'Courtier grossiste spécialisé dans l''assurance des professionnels du taxi',
  is_active = true,
  is_mandatory = true
WHERE code = 'MFA';

-- Marquer toutes les 5 compagnies comme obligatoires
UPDATE insurance_companies
SET is_mandatory = true, is_active = true
WHERE code IN ('GENERALI', '2MA', 'PLUSSIMPLE', 'ZEPHYR', 'SOLLYAZAR');
