/*
  # RC Pro Swisslife addon pour compagnies n'incluant pas la RC Pro

  ## Contexte métier
  Certaines compagnies (ex: Generali) ne bundlent pas la RC Pro avec l'assurance
  auto-taxi. Pour ces devis, le commercial doit pouvoir ajouter une option RC Pro
  Swisslife séparée (devis + contrat). Un prospect peut aussi demander uniquement
  la RC Pro (produit autonome).

  ## Changements
  1. Table `insurance_companies`
     - Ajout `product_type` (text, default 'auto_taxi') — valeurs: 'auto_taxi',
       'rc_pro', 'both'. Permet de distinguer Swisslife (rc_pro) des autres.
     - Insertion de la compagnie Swisslife (code SWISSLIFE_RCPRO, product_type='rc_pro').

  2. Table `lead_company_quotes`
     - Ajout `rc_pro_addon` (boolean) — indique qu'une RC Pro Swisslife est ajoutée
       à ce devis principal.
     - Ajout `rc_pro_addon_annual` (numeric) — prime annuelle RC Pro Swisslife.
     - Ajout `rc_pro_addon_monthly` (numeric) — prime mensuelle RC Pro Swisslife.
     - Ajout `rc_pro_addon_company_id` (uuid FK -> insurance_companies) — référence
       à la compagnie RC Pro (Swisslife).
     - Ajout `rc_pro_addon_file_url` (text) — URL du devis RC Pro PDF.

  ## Sécurité
  Aucune modification RLS — les colonnes ajoutées héritent des policies existantes.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'insurance_companies' AND column_name = 'product_type'
  ) THEN
    ALTER TABLE insurance_companies
      ADD COLUMN product_type text NOT NULL DEFAULT 'auto_taxi';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_company_quotes' AND column_name = 'rc_pro_addon'
  ) THEN
    ALTER TABLE lead_company_quotes
      ADD COLUMN rc_pro_addon boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_company_quotes' AND column_name = 'rc_pro_addon_annual'
  ) THEN
    ALTER TABLE lead_company_quotes
      ADD COLUMN rc_pro_addon_annual numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_company_quotes' AND column_name = 'rc_pro_addon_monthly'
  ) THEN
    ALTER TABLE lead_company_quotes
      ADD COLUMN rc_pro_addon_monthly numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_company_quotes' AND column_name = 'rc_pro_addon_company_id'
  ) THEN
    ALTER TABLE lead_company_quotes
      ADD COLUMN rc_pro_addon_company_id uuid REFERENCES insurance_companies(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_company_quotes' AND column_name = 'rc_pro_addon_file_url'
  ) THEN
    ALTER TABLE lead_company_quotes
      ADD COLUMN rc_pro_addon_file_url text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lead_company_quotes_rc_pro_addon_company
  ON lead_company_quotes(rc_pro_addon_company_id)
  WHERE rc_pro_addon_company_id IS NOT NULL;

INSERT INTO insurance_companies (
  name, code, product_type, is_active, is_mandatory, priority_order, description
) VALUES (
  'Swisslife RC Pro',
  'SWISSLIFE_RCPRO',
  'rc_pro',
  true,
  false,
  100,
  'Responsabilité Civile Professionnelle Taxi/VTC — complément aux compagnies auto qui n''incluent pas la RC Pro (ex: Generali). Peut également être souscrit seul.'
)
ON CONFLICT (code) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  description = EXCLUDED.description;
