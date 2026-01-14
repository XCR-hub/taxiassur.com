/*
  # Add Company Quote Refusal Reasons

  1. New Table
    - company_quote_refusal_reasons: Reasons why an insurance company refuses to quote
    - Different from quote_refusal_motives which is for client refusing a quote

  2. Purpose
    - TaxiAssur process requires a mandatory reason when a company refuses to provide a quote
    - This tracks why GENERALI, MFA, +Simple, Solly Azar, or Zephir cannot provide a quote
*/

CREATE TABLE IF NOT EXISTS company_quote_refusal_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE company_quote_refusal_reasons ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'company_quote_refusal_reasons' AND policyname = 'company_quote_refusal_reasons_read_all'
  ) THEN
    CREATE POLICY "company_quote_refusal_reasons_read_all" ON company_quote_refusal_reasons FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

INSERT INTO company_quote_refusal_reasons (code, label, description, display_order)
VALUES 
  ('AGE_VEHICULE', 'Age du vehicule trop eleve', 'Le vehicule depasse l''age maximum accepte par l''assureur', 1),
  ('SINISTRALITE', 'Sinistralite trop elevee', 'Trop de sinistres declares dans les 3 dernieres annees', 2),
  ('MALUS', 'Malus trop important', 'Coefficient bonus/malus trop eleve', 3),
  ('RESILIE', 'Antecedent de resiliation', 'Le prospect a ete resilie par un assureur precedent', 4),
  ('ZONE_GEOGRAPHIQUE', 'Zone geographique non couverte', 'La zone d''activite n''est pas couverte par cet assureur', 5),
  ('PROFIL_NON_ELIGIBLE', 'Profil non eligible', 'Le profil du chauffeur ne correspond pas aux criteres', 6),
  ('DOCUMENTS_INCOMPLETS', 'Documents incomplets ou non conformes', 'Les documents fournis ne permettent pas l''etude', 7),
  ('EXPERIENCE_INSUFFISANTE', 'Experience insuffisante', 'Nombre d''annees de permis ou d''activite taxi insuffisant', 8),
  ('VEHICULE_NON_ELIGIBLE', 'Vehicule non eligible', 'Type ou modele de vehicule non couvert', 9),
  ('SUSPENSION_PERMIS', 'Suspension de permis', 'Antecedent de suspension ou retrait de permis', 10),
  ('AUTRE', 'Autre motif', 'Motif specifique a preciser dans les notes', 99)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lead_company_quotes' AND column_name = 'refusal_reason_code'
  ) THEN
    ALTER TABLE lead_company_quotes ADD COLUMN refusal_reason_code text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lead_company_quotes_lead_id ON lead_company_quotes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_company_quotes_company_id ON lead_company_quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_company_quotes_status ON lead_company_quotes(status);
