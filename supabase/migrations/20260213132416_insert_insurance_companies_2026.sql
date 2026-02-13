/*
  # Insertion des compagnies d'assurance
  
  Insère les 5 compagnies d'assurance partenaires
*/

INSERT INTO insurance_companies (name, slug, logo_url, website_url, is_active)
VALUES
  ('Solly Azar', 'solly_azar', '/logo-officiel-solly-azar_0.png', 'https://www.sollyazar.com', true),
  ('Generali', 'generali', '/logo_generali.png', 'https://www.generali.fr', true),
  ('Zephir', 'zephir', '/logo_zephir.png', 'https://www.zephir.fr', true),
  ('+Simple', 'plus_simple', '/logo_plu_simple.png', 'https://www.plussimple.fr', true),
  ('2MA (MFA)', '2ma', '/logo_mfa.png', 'https://www.2ma.fr', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  logo_url = EXCLUDED.logo_url,
  website_url = EXCLUDED.website_url,
  is_active = EXCLUDED.is_active,
  updated_at = now();