/*
  # Documents de l'assureur dans l'espace client sinistres

  1. Modifications
    - Ajout d'un lien utile "Déclaration de sinistre" sur la fiche Zephir
      dans `insurance_companies.useful_links` (jsonb)
    - Création de la fonction RPC `get_client_insurance_company_by_email`
      qui retourne la compagnie d'assurance du contrat actif d'un client
      (via `lead_contracts.is_active = true` et `client_portal_users.email`),
      avec les liens utiles associés (incluant le document de déclaration
      de sinistre).

  2. Sécurité
    - La RPC est SECURITY DEFINER, restreinte aux rôles authenticated/anon
      via lookup par email + activation du compte client.

  3. Notes
    - L'URL placeholder peut être remplacée par l'URL réelle du document
      Zephir via le backoffice (InsuranceCompaniesManager) sans changement
      de code.
*/

UPDATE insurance_companies
SET useful_links = COALESCE(useful_links, '[]'::jsonb) || jsonb_build_array(
  jsonb_build_object(
    'label', 'Déclaration de sinistre',
    'url', '/documents/zephir-declaration-sinistre.pdf',
    'type', 'claim_form',
    'description', 'Formulaire officiel de déclaration de sinistre Zephir'
  )
)
WHERE code = 'ZEPHIR'
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(useful_links, '[]'::jsonb)) link
    WHERE link->>'type' = 'claim_form'
  );

CREATE OR REPLACE FUNCTION public.get_client_insurance_company_by_email(p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_is_active boolean;
  v_company json;
BEGIN
  IF p_email IS NULL OR p_email = '' THEN
    RETURN json_build_object('success', false, 'error', 'Email invalide');
  END IF;

  SELECT lead_id, is_active INTO v_lead_id, v_is_active
  FROM client_portal_users
  WHERE email = lower(trim(p_email))
  LIMIT 1;

  IF v_lead_id IS NULL OR NOT COALESCE(v_is_active, false) THEN
    RETURN json_build_object('success', false, 'error', 'Compte non trouvé ou inactif');
  END IF;

  SELECT json_build_object(
    'id', ic.id,
    'name', ic.name,
    'code', ic.code,
    'logo_url', ic.logo_url,
    'useful_links', COALESCE(ic.useful_links, '[]'::jsonb),
    'contract_number', lc.contract_number
  )
  INTO v_company
  FROM lead_contracts lc
  JOIN insurance_companies ic ON ic.id = lc.company_id
  WHERE lc.lead_id = v_lead_id
    AND lc.is_active = true
  ORDER BY lc.created_at DESC
  LIMIT 1;

  RETURN json_build_object(
    'success', true,
    'company', v_company
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_insurance_company_by_email(text) TO authenticated, anon;
