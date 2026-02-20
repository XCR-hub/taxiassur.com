/*
  # Fix validate_quote_by_token - Mise à jour complete du lead
  
  ## Problème
  Quand un prospect valide un devis depuis l'espace prospect :
  - lead_company_quotes.quote_accepted_at est bien rempli
  - MAIS crm_leads.quote_accepted_at reste à NULL
  - Résultat : l'onglet Paiement affiche "Devis non accepté"
  
  ## Solution
  Mettre à jour la fonction validate_quote_by_token pour qu'elle remplisse AUSSI :
  - crm_leads.quote_accepted_at
  - crm_leads.selected_company_id
  
  ## Changement
  Ajouter dans la mise à jour du lead :
  - quote_accepted_at = NOW()
  - selected_company_id = (l'ID de la compagnie du devis validé)
*/

DROP FUNCTION IF EXISTS public.validate_quote_by_token(text, uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.validate_quote_by_token(
  p_token text,
  p_quote_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_company_id uuid;
  v_company_name text;
  v_count integer;
BEGIN
  -- Récupérer le lead_id
  SELECT l.id INTO v_lead_id
  FROM crm_leads l
  WHERE l.access_token = p_token
    AND l.deleted_at IS NULL
    AND l.archived_at IS NULL;

  IF v_lead_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Token invalide'
    );
  END IF;

  -- Récupérer l'ID et le nom de la compagnie
  SELECT insurance_company_id, ic.name
  INTO v_company_id, v_company_name
  FROM lead_company_quotes lcq
  LEFT JOIN insurance_companies ic ON ic.id = lcq.insurance_company_id
  WHERE lcq.id = p_quote_id
    AND lcq.lead_id = v_lead_id
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Devis non trouvé'
    );
  END IF;

  -- Mettre à jour le devis
  UPDATE lead_company_quotes
  SET 
    quote_status = 'validated',
    quote_accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_quote_id
    AND lead_id = v_lead_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Mettre à jour le lead avec les infos du devis accepté
  IF v_count > 0 THEN
    UPDATE crm_leads
    SET 
      status = 'signature_devis',
      pipeline_stage = 'signature_devis',
      quote_accepted_at = NOW(),
      selected_company_id = v_company_id,
      updated_at = NOW()
    WHERE id = v_lead_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'company_name', v_company_name,
      'lead_id', v_lead_id,
      'company_id', v_company_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', false,
    'error', 'Erreur lors de la mise à jour'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_quote_by_token(text, uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.validate_quote_by_token(text, uuid) IS 
'Valide un devis depuis l''espace prospect et met à jour COMPLETEMENT le lead (quote_accepted_at + selected_company_id)';

-- Corriger le lead existant qui a des devis validés mais pas de quote_accepted_at
DO $$
DECLARE
  v_lead_id uuid;
  v_company_id uuid;
  v_accepted_at timestamptz;
BEGIN
  -- Trouver les leads qui ont des devis validés mais pas de quote_accepted_at
  FOR v_lead_id, v_company_id, v_accepted_at IN
    SELECT DISTINCT ON (lcq.lead_id)
      lcq.lead_id,
      lcq.insurance_company_id,
      lcq.quote_accepted_at
    FROM lead_company_quotes lcq
    INNER JOIN crm_leads cl ON cl.id = lcq.lead_id
    WHERE lcq.quote_status = 'validated'
      AND lcq.quote_accepted_at IS NOT NULL
      AND cl.quote_accepted_at IS NULL
      AND cl.deleted_at IS NULL
    ORDER BY lcq.lead_id, lcq.quote_accepted_at DESC
  LOOP
    -- Mettre à jour le lead
    UPDATE crm_leads
    SET 
      quote_accepted_at = v_accepted_at,
      selected_company_id = v_company_id,
      updated_at = NOW()
    WHERE id = v_lead_id;
    
    RAISE NOTICE 'Lead % corrigé avec compagnie % acceptée le %', v_lead_id, v_company_id, v_accepted_at;
  END LOOP;
END $$;
