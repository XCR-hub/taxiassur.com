/*
  # Add Product Details to Insurance Companies

  1. Changes
    - Add `target_profile` (jsonb) - eligible client profiles
    - Add `eligibility_criteria` (jsonb) - underwriting criteria
    - Add `product_features` (jsonb) - product highlights with values
    - Add `formulas` (jsonb) - description of available formulas
    - Add `broker_advantages` (jsonb) - broker-side advantages
    - Add `useful_links` (jsonb) - documentation links
  2. Data
    - Populate Solly Azar with full taxi product data
  3. Security
    - No new tables; existing RLS on insurance_companies remains
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_companies' AND column_name='target_profile') THEN
    ALTER TABLE insurance_companies ADD COLUMN target_profile jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_companies' AND column_name='eligibility_criteria') THEN
    ALTER TABLE insurance_companies ADD COLUMN eligibility_criteria jsonb DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_companies' AND column_name='product_features') THEN
    ALTER TABLE insurance_companies ADD COLUMN product_features jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_companies' AND column_name='formulas') THEN
    ALTER TABLE insurance_companies ADD COLUMN formulas jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_companies' AND column_name='broker_advantages') THEN
    ALTER TABLE insurance_companies ADD COLUMN broker_advantages jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_companies' AND column_name='useful_links') THEN
    ALTER TABLE insurance_companies ADD COLUMN useful_links jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

UPDATE insurance_companies
SET
  target_profile = '[
    "Artisans Taxis ou conducteurs de VSL indépendants",
    "Gérants de société Taxi/VSL",
    "Conducteurs d''au moins 25 ans",
    "Permis de plus de 5 ans",
    "CRM compris entre 0,50 et 1,50",
    "Justifiant de 12 mois minimum d''assurance au cours des 36 derniers mois"
  ]'::jsonb,
  eligibility_criteria = '{
    "min_age": 25,
    "min_license_years": 5,
    "crm_min": 0.50,
    "crm_max": 1.50,
    "min_insurance_history_months": 12,
    "history_window_months": 36
  }'::jsonb,
  product_features = '[
    {"key":"valeur_majoree","title":"Indemnisation en valeur majorée","value":"+25%","description":"En cas de sinistre sur véhicule de moins de 36 mois, la valeur déterminée par l''expert est majorée de 25%.","formula_availability":"option"},
    {"key":"rc_pro","title":"Responsabilité Civile professionnelle","value":"Incluse dès la formule 2","description":"Disponible en option en formule 1, systématiquement incluse à partir de la formule 2.","formula_availability":"included_from_f2"},
    {"key":"effets_personnels","title":"Protection des effets personnels","value":"Jusqu''à 1 500€","description":"Effets et objets personnels du conducteur assurés jusqu''à 1 500€.","formula_availability":"included"},
    {"key":"bagages_marchandises","title":"Bagages et marchandises transportés","value":"Jusqu''à 5 000€","description":"Option de prise en charge des bagages et marchandises transportés jusqu''à 5 000€.","formula_availability":"option"},
    {"key":"protection_conducteur","title":"Protection du conducteur","value":"Jusqu''à 250 000€ (option 500 000€)","description":"Comprise dans les 3 formules, indemnisation jusqu''à 250 000€, extension possible jusqu''à 500 000€.","formula_availability":"included"},
    {"key":"assistance_sans_franchise","title":"Assistance sans franchise kilométrique","value":"0 km","description":"Garantie d''assistance sans franchise kilométrique disponible en option, avec véhicule de remplacement à usage privé.","formula_availability":"option"},
    {"key":"immobilisation","title":"Indemnisation immobilisation véhicule","value":"150€/jour ou véhicule relais","description":"En cas d''immobilisation suite à sinistre, indemnisation jusqu''à 150€/jour ou véhicule relais professionnel.","formula_availability":"included"}
  ]'::jsonb,
  formulas = '[
    {"name":"Formule 1","level":"Tiers","rc_pro":"Option","driver_protection":"250 000€","key_features":["Responsabilité Civile","Protection conducteur","Effets personnels"]},
    {"name":"Formule 2","level":"Tiers Plus","rc_pro":"Incluse","driver_protection":"250 000€","key_features":["RC pro incluse","Vol/Incendie","Bris de glace","Catastrophes naturelles"]},
    {"name":"Formule 3","level":"Tous Risques","rc_pro":"Incluse","driver_protection":"500 000€ (option)","key_features":["Tous accidents","Valeur majorée 25%","Assistance 0 km","Véhicule relais"]}
  ]'::jsonb,
  broker_advantages = '[
    {"title":"Prise de garantie immédiate","description":"Si le profil du client le permet, prise de garantie immédiate avec édition d''une carte verte temporaire."},
    {"title":"Loi Hamon simplifiée","description":"Parcours de souscription adapté et démarches facilitées pour les reprises à la concurrence."},
    {"title":"Paiement en ligne des impayés","description":"Régularisation des impayés par carte bancaire sur plateforme en ligne sécurisée."},
    {"title":"Signature électronique avec CB","description":"Souscription en ligne immédiate avec signature électronique et paiement par carte bancaire."}
  ]'::jsonb,
  useful_links = '[
    {"title":"Fiche pratique avenants auto/moto en ligne","type":"guide"},
    {"title":"Formulaire déclaration bris de glace","type":"form"},
    {"title":"Fiche pratique auto expertise à distance","type":"guide"},
    {"title":"Fiche de calcul du coefficient bonus/malus","type":"calculator"},
    {"title":"Fiche pratique procédure en cas d''absence de pièces","type":"guide"},
    {"title":"Guide souscription Taxi / VTC","type":"guide"}
  ]'::jsonb,
  description = COALESCE(NULLIF(description,''), 'Solly Azar propose une assurance taxi complète avec valeur majorée 25%, RC professionnelle incluse dès la formule 2, protection conducteur jusqu''à 500 000€ et assistance sans franchise kilométrique.')
WHERE code = 'SOLLY_AZAR';