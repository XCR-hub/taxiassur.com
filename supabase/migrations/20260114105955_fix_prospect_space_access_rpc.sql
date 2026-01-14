/*
  # Fix Prospect Space Access - Fonction RPC Sécurisée
  
  Problème identifié :
  - Les prospects ne peuvent pas accéder à leur espace via le lien avec token
  - La RLS policy permet de voir tous les leads avec token, mais le filtrage .eq() ne fonctionne pas correctement
  
  Solution :
  - Créer une fonction RPC publique qui prend le token en paramètre
  - La fonction retourne UNIQUEMENT le lead correspondant au token
  - Pas de dépendance aux RLS policies complexes
  
  Sécurité :
  - Fonction SECURITY DEFINER pour bypasser RLS
  - Validation stricte du token
  - Retourne uniquement les données nécessaires
*/

-- Fonction pour récupérer un lead par son access_token (pour prospects)
CREATE OR REPLACE FUNCTION get_lead_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  address text,
  postal_code text,
  city text,
  company_name text,
  siret text,
  status text,
  document_checklist jsonb,
  documents_complete boolean,
  quote_amount numeric,
  quote_accepted_at timestamptz,
  contract_signed_at timestamptz,
  payment_completed_at timestamptz,
  contract_pdf_url text,
  attestation_pdf_url text,
  converted_to_client boolean,
  client_since timestamptz,
  current_stage_key text,
  selected_company_id uuid,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  -- Vérifier que le token n'est pas vide
  IF p_token IS NULL OR p_token = '' THEN
    RAISE EXCEPTION 'Token invalide';
  END IF;

  -- Retourner le lead correspondant au token
  RETURN QUERY
  SELECT
    l.id,
    l.first_name,
    l.last_name,
    l.email,
    l.phone,
    l.address,
    l.postal_code,
    l.city,
    l.company_name,
    l.siret,
    l.status,
    l.document_checklist,
    l.documents_complete,
    l.quote_amount,
    l.quote_accepted_at,
    l.contract_signed_at,
    l.payment_completed_at,
    l.contract_pdf_url,
    l.attestation_pdf_url,
    l.converted_to_client,
    l.client_since,
    l.current_stage_key,
    l.selected_company_id,
    l.created_at,
    l.updated_at
  FROM crm_leads l
  WHERE l.access_token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour récupérer les documents d'un lead par token
CREATE OR REPLACE FUNCTION get_prospect_documents_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  document_type text,
  file_name text,
  file_size bigint,
  uploaded_at timestamptz,
  status text
) AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  -- Récupérer l'ID du lead correspondant au token
  SELECT l.id INTO v_lead_id
  FROM crm_leads l
  WHERE l.access_token = p_token;

  -- Si pas de lead trouvé, retourner vide
  IF v_lead_id IS NULL THEN
    RETURN;
  END IF;

  -- Retourner les documents du lead
  RETURN QUERY
  SELECT
    pd.id,
    pd.document_type,
    pd.file_name,
    pd.file_size,
    pd.uploaded_at,
    pd.status
  FROM prospect_documents pd
  WHERE pd.lead_id = v_lead_id
  ORDER BY pd.uploaded_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour uploader un document en tant que prospect (via token)
CREATE OR REPLACE FUNCTION upload_prospect_document_by_token(
  p_token text,
  p_document_type text,
  p_file_name text,
  p_file_path text,
  p_file_size bigint
)
RETURNS jsonb AS $$
DECLARE
  v_lead_id uuid;
  v_doc_id uuid;
BEGIN
  -- Récupérer l'ID du lead correspondant au token
  SELECT l.id INTO v_lead_id
  FROM crm_leads l
  WHERE l.access_token = p_token;

  -- Si pas de lead trouvé, erreur
  IF v_lead_id IS NULL THEN
    RAISE EXCEPTION 'Token invalide';
  END IF;

  -- Insérer le document
  INSERT INTO prospect_documents (
    lead_id,
    document_type,
    file_name,
    file_path,
    file_size,
    status
  ) VALUES (
    v_lead_id,
    p_document_type,
    p_file_name,
    p_file_path,
    p_file_size,
    'uploaded'
  ) RETURNING id INTO v_doc_id;

  -- Mettre à jour la checklist du lead
  UPDATE crm_leads
  SET document_checklist = jsonb_set(
    COALESCE(document_checklist, '{}'::jsonb),
    ARRAY[p_document_type],
    jsonb_build_object(
      'status', 'uploaded',
      'validated', false,
      'uploaded_at', now(),
      'file_name', p_file_name
    )
  )
  WHERE id = v_lead_id;

  RETURN jsonb_build_object(
    'success', true,
    'document_id', v_doc_id,
    'lead_id', v_lead_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions pour les fonctions (accessibles par anon)
GRANT EXECUTE ON FUNCTION get_lead_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_prospect_documents_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION upload_prospect_document_by_token(text, text, text, text, bigint) TO anon;

COMMENT ON FUNCTION get_lead_by_token IS 'Récupère les informations d''un lead via son access_token (pour espace prospect)';
COMMENT ON FUNCTION get_prospect_documents_by_token IS 'Récupère les documents d''un lead via son access_token';
COMMENT ON FUNCTION upload_prospect_document_by_token IS 'Permet à un prospect d''uploader un document via son token d''accès';
