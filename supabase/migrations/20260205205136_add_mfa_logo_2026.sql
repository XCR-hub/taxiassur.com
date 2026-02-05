/*
  # Ajout du logo MFA/2MA - 2026

  1. Modification
    - Ajout du logo MFA (qui est le même que 2MA)
    - Configuration de l'URL publique

  2. Logos disponibles
    - MFA/2MA : /logo_mfa.png
    - Solly Azar : /logo-officiel-solly-azar_0.png
    - Generali : /logo_generali.png
    - Zephyr : /logo_zephir.png (déjà existant)
*/

-- Mettre à jour le logo MFA
UPDATE insurance_companies
SET logo_url = '/logo_mfa.png'
WHERE code = 'MFA' OR name ILIKE '%MFA%' OR name ILIKE '%2MA%';

-- Mettre à jour le logo Zephyr
UPDATE insurance_companies
SET logo_url = '/logo_zephir.png'
WHERE code = 'ZEPHYR' OR name ILIKE '%Zephyr%' OR name ILIKE '%Zéphyr%';

-- Vérifier que Solly Azar et Generali ont bien leur logo
UPDATE insurance_companies
SET logo_url = '/logo_generali.png'
WHERE (code = 'GENERALI' OR name ILIKE '%Generali%') AND (logo_url IS NULL OR logo_url = '');

UPDATE insurance_companies
SET logo_url = '/logo-officiel-solly-azar_0.png'
WHERE (code = 'SOLLYAZAR' OR code = 'SOLLY_AZAR' OR name ILIKE '%Solly%Azar%') AND (logo_url IS NULL OR logo_url = '');
