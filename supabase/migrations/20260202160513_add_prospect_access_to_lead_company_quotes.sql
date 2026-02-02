/*
  # Accès prospect aux devis (lead_company_quotes)

  1. Modifications
    - Ajout policy RLS pour accès anonyme aux devis via token prospect
    - Permet au prospect de consulter les devis de son dossier

  2. Sécurité
    - Accès uniquement via token valide (crm_leads.access_token)
    - Lecture seule pour les prospects
    - Vérifie que le token correspond au lead_id
*/

-- Policy pour permettre l'accès anonyme aux devis via le token du lead
CREATE POLICY "Prospects can view their quotes via token"
  ON lead_company_quotes
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = lead_company_quotes.lead_id
        AND crm_leads.access_token IS NOT NULL
        AND crm_leads.access_token = current_setting('request.headers', true)::json->>'x-lead-token'
    )
  );
