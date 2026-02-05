/*
  # Ajout du logo Zephir - 2026

  1. Modification
    - Ajout du logo Zephir qui existe mais n'était pas configuré
    - Le fichier existe : /logo_zephir.png

  2. Logos configurés
    - Generali : /logo_generali.png (CORRIGÉ)
    - MFA/2MA : /logo_mfa.png
    - Solly Azar : /logo-officiel-solly-azar_0.png
    - Zephir : /logo_zephir.png (NOUVEAU)
*/

-- Ajouter le logo Zephir
UPDATE insurance_companies
SET logo_url = '/logo_zephir.png'
WHERE code = 'ZEPHIR' OR name ILIKE '%zephir%' OR name ILIKE '%zéphyr%';

-- Vérification finale de tous les logos
-- SELECT code, name, logo_url, is_active FROM insurance_companies WHERE is_active = true ORDER BY priority_order;
