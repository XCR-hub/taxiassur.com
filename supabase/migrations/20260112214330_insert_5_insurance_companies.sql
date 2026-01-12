/*
  # Insertion des 5 compagnies d'assurance taxi

  1. Compagnies
    - Generali
    - MFA (Mutuelle Fraternelle via 2MA)
    - Plus Simple
    - Zéphyr
    - Sollyazar

  2. Configuration
    - Informations de contact
    - URLs
    - Horaires
*/

-- Insérer les 5 compagnies
INSERT INTO insurance_companies (name, code, contact_email, contact_phone, contact_hours, website, description, is_active, priority_order) VALUES
(
  'Generali',
  'GENERALI',
  'courtage.professionnel@generali.fr',
  '01 58 38 41 00',
  'Lundi au vendredi de 9h00 à 12h30 et de 13h30 à 17h30',
  'https://www.generali.fr',
  'Compagnie d''assurance leader pour les professionnels du taxi',
  true,
  1
),
(
  'MFA - Mutuelle Fraternelle (via 2MA)',
  'MFA',
  'contact@mfa.fr',
  '01 40 22 79 00',
  'Lundi au vendredi de 9h00 à 12h00 et de 14h00 à 17h00',
  'https://www.mfa.fr',
  'Mutuelle spécialisée dans l''assurance des taxis via le courtier grossiste 2MA',
  true,
  2
),
(
  'Plus Simple',
  'PLUSSIMPLE',
  'contact@plussimple.fr',
  '01 83 62 04 00',
  'Lundi au vendredi de 9h00 à 18h00',
  'https://www.plussimple.fr',
  'Assureur digital spécialisé dans les solutions simples et rapides',
  true,
  3
),
(
  'Zéphyr',
  'ZEPHYR',
  'contact@zephyr-assurances.com',
  '04 72 81 67 00',
  'Lundi au vendredi de 8h30 à 12h00 et de 13h30 à 17h30',
  'https://www.zephyr-assurances.com',
  'Assureur spécialisé dans les risques professionnels automobiles',
  true,
  4
),
(
  'Solly Azar',
  'SOLLYAZAR',
  'courtage@sollyazar.com',
  '01 40 92 44 00',
  'Lundi au vendredi de 9h00 à 17h30',
  'https://www.sollyazar.com',
  'Courtier grossiste spécialisé dans l''assurance des professionnels',
  true,
  5
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  contact_email = EXCLUDED.contact_email,
  contact_phone = EXCLUDED.contact_phone,
  contact_hours = EXCLUDED.contact_hours,
  website = EXCLUDED.website,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  priority_order = EXCLUDED.priority_order;

COMMENT ON TABLE insurance_companies IS 'Les 5 compagnies partenaires pour l''assurance taxi';
