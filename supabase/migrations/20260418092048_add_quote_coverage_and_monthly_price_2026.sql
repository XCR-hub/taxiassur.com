/*
  # Ajout des garanties et du prix mensuel aux devis

  1. Nouvelles colonnes sur `lead_company_quotes`
    - `coverage_type` (text) : Type de couverture (tiers, tiers_plus, tous_risques)
    - `includes_immobilisation` (boolean) : Indemnisation suite à immobilisation
    - `includes_assistance_0km` (boolean, defaut true) : Assistance 0km
    - `includes_rc_pro` (boolean, defaut true) : Responsabilité Civile Professionnelle
    - `includes_depannage_remorquage` (boolean, defaut true) : Dépannage et remorquage
    - `monthly_price` (numeric) : Prix mensuel affiché au prospect
    - `coverage_details` (text) : Détails libres sur les garanties

  2. Mise à jour de la RPC `get_lead_quotes_by_token` pour exposer ces champs au prospect

  3. Notes importantes
    - Les colonnes par défaut reflètent les offres TaxiAssur (assistance 0km, RC pro, dépannage inclus)
    - Generali n'inclut pas la RC pro par défaut (géré côté UI)
    - Aucune donnée existante n'est modifiée
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lead_company_quotes' AND column_name='coverage_type') THEN
    ALTER TABLE lead_company_quotes ADD COLUMN coverage_type text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lead_company_quotes' AND column_name='includes_immobilisation') THEN
    ALTER TABLE lead_company_quotes ADD COLUMN includes_immobilisation boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lead_company_quotes' AND column_name='includes_assistance_0km') THEN
    ALTER TABLE lead_company_quotes ADD COLUMN includes_assistance_0km boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lead_company_quotes' AND column_name='includes_rc_pro') THEN
    ALTER TABLE lead_company_quotes ADD COLUMN includes_rc_pro boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lead_company_quotes' AND column_name='includes_depannage_remorquage') THEN
    ALTER TABLE lead_company_quotes ADD COLUMN includes_depannage_remorquage boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lead_company_quotes' AND column_name='monthly_price') THEN
    ALTER TABLE lead_company_quotes ADD COLUMN monthly_price numeric(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lead_company_quotes' AND column_name='coverage_details') THEN
    ALTER TABLE lead_company_quotes ADD COLUMN coverage_details text;
  END IF;
END $$;

ALTER TABLE lead_company_quotes DROP CONSTRAINT IF EXISTS lead_company_quotes_coverage_type_check;
ALTER TABLE lead_company_quotes ADD CONSTRAINT lead_company_quotes_coverage_type_check
  CHECK (coverage_type IS NULL OR coverage_type IN ('tiers', 'tiers_plus', 'tous_risques'));

DROP FUNCTION IF EXISTS public.get_lead_quotes_by_token(text);

CREATE OR REPLACE FUNCTION public.get_lead_quotes_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  lead_id uuid,
  company_id uuid,
  company_name text,
  company_logo_url text,
  company_code text,
  quote_file_url text,
  quote_amount numeric,
  monthly_price numeric,
  coverage_type text,
  includes_immobilisation boolean,
  includes_assistance_0km boolean,
  includes_rc_pro boolean,
  includes_depannage_remorquage boolean,
  coverage_details text,
  status text,
  submitted_at timestamptz,
  last_sent_at timestamptz,
  quote_accepted_at timestamptz,
  refusal_reason text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  SELECT cl.id INTO v_lead_id
  FROM crm_leads cl
  WHERE cl.access_token = p_token
  LIMIT 1;

  IF v_lead_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    lcq.id,
    lcq.lead_id,
    lcq.insurance_company_id AS company_id,
    COALESCE(ic.name, '') AS company_name,
    COALESCE(ic.logo_url, '') AS company_logo_url,
    COALESCE(ic.slug, '') AS company_code,
    COALESCE(lcq.quote_pdf_url, lcq.quote_file_url, '') AS quote_file_url,
    lcq.quote_amount,
    lcq.monthly_price,
    lcq.coverage_type,
    COALESCE(lcq.includes_immobilisation, false) AS includes_immobilisation,
    COALESCE(lcq.includes_assistance_0km, true) AS includes_assistance_0km,
    COALESCE(lcq.includes_rc_pro, true) AS includes_rc_pro,
    COALESCE(lcq.includes_depannage_remorquage, true) AS includes_depannage_remorquage,
    lcq.coverage_details,
    COALESCE(lcq.quote_status::text, lcq.status::text, 'pending') AS status,
    COALESCE(lcq.sent_at, lcq.submitted_at) AS submitted_at,
    lcq.last_sent_at,
    lcq.quote_accepted_at,
    lcq.refusal_reason,
    lcq.created_at,
    lcq.updated_at
  FROM lead_company_quotes lcq
  LEFT JOIN insurance_companies ic ON ic.id = lcq.insurance_company_id
  WHERE lcq.lead_id = v_lead_id
    AND (lcq.quote_pdf_url IS NOT NULL OR lcq.quote_file_url IS NOT NULL)
  ORDER BY lcq.created_at DESC;
END $$;

GRANT EXECUTE ON FUNCTION public.get_lead_quotes_by_token(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
