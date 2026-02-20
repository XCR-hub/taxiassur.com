/*
  # Fix Document Counters and Progression Badge - 20 février 2026

  ## Problèmes identifiés

  1. **Badge "10/7" en rouge** : Compte TOUS les documents uploadés au lieu des TYPES distincts
     - Si un document est rejeté puis re-uploadé, il compte 2 fois
     - Devrait compter les types de documents distincts

  2. **Progression 143%** : Calcul incorrect du pourcentage
     - Divise uploaded par total alors que uploaded peut être > total
     - Devrait compter seulement les types validés

  3. **Onglet Documents pas vert** : Le champ documents_complete reste false
     - Devrait passer à true quand tous les documents requis sont validés

  ## Solution

  - Compter les DISTINCT document_type au lieu de COUNT(*)
  - Séparer uploaded_documents (uploadés) et validated_documents (validés)
  - Calculer documents_complete basé sur les documents VALIDÉS
  - Progression basée sur validated, pas uploaded
*/

-- 1. Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS public.get_lead_by_token(text);

-- 2. Créer la nouvelle fonction avec logique corrigée
CREATE OR REPLACE FUNCTION public.get_lead_by_token(p_token text)
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
  pipeline_stage text,
  lead_score integer,
  converted_to_client boolean,
  access_token text,
  contract_number text,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  document_checklist jsonb,
  documents_complete boolean,
  quote_amount numeric,
  quote_accepted_at timestamptz,
  contract_signed_at timestamptz,
  payment_completed_at timestamptz,
  contract_pdf_url text,
  attestation_pdf_url text,
  client_since timestamptz,
  current_stage_key text,
  selected_company_id uuid,
  -- Compteurs corrigés
  total_documents integer,
  uploaded_documents integer,
  validated_documents integer,
  progression_percentage integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_total_docs integer := 6; -- 6 documents OBLIGATOIRES (pas le RIB optionnel)
  v_uploaded_docs integer := 0;
  v_validated_docs integer := 0;
  v_progression integer := 0;
  v_docs_complete boolean := false;
BEGIN
  -- Récupérer l'ID du lead
  SELECT l.id INTO v_lead_id
  FROM crm_leads l
  WHERE l.access_token = p_token
    AND l.deleted_at IS NULL
    AND l.archived_at IS NULL
  LIMIT 1;

  -- Si le lead existe, calculer les compteurs
  IF v_lead_id IS NOT NULL THEN
    -- Compter les TYPES de documents distincts qui ont été uploadés
    -- (prend le dernier document de chaque type)
    SELECT COUNT(DISTINCT document_type)
    INTO v_uploaded_docs
    FROM crm_lead_documents
    WHERE lead_id = v_lead_id
      AND uploaded_at IS NOT NULL
      AND document_type IN (
        'licence_taxi',
        'permis_conduire',
        'piece_identite',
        'carte_grise',
        'autorisation_stationnement',
        'rib'
      );

    -- Compter les TYPES de documents distincts qui sont VALIDÉS
    -- Un document est validé si validated = true OU status = 'validated'
    SELECT COUNT(DISTINCT document_type)
    INTO v_validated_docs
    FROM crm_lead_documents
    WHERE lead_id = v_lead_id
      AND (validated = true OR status = 'validated')
      AND document_type IN (
        'licence_taxi',
        'permis_conduire',
        'piece_identite',
        'carte_grise',
        'autorisation_stationnement',
        'rib'
      );

    -- Calculer le pourcentage basé sur les documents VALIDÉS
    IF v_total_docs > 0 THEN
      v_progression := ROUND((v_validated_docs::numeric / v_total_docs::numeric) * 100)::integer;

      -- Documents complets = tous les documents requis sont validés
      v_docs_complete := (v_validated_docs >= v_total_docs);
    END IF;
  END IF;

  -- Retourner les données du lead avec les compteurs corrigés
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
    l.pipeline_stage,
    l.lead_score,
    l.converted_to_client,
    l.access_token,
    l.contract_number,
    l.metadata,
    l.created_at,
    l.updated_at,
    COALESCE(l.document_checklist, '{}'::jsonb) as document_checklist,
    -- ✅ Utiliser la valeur calculée au lieu de celle de la table
    v_docs_complete as documents_complete,
    l.quote_amount,
    l.quote_accepted_at,
    l.contract_signed_at,
    l.payment_completed_at,
    l.contract_pdf_url,
    l.attestation_pdf_url,
    l.client_since,
    l.current_stage_key,
    l.selected_company_id,
    -- Compteurs corrigés
    v_total_docs as total_documents,
    v_uploaded_docs as uploaded_documents,
    v_validated_docs as validated_documents,
    v_progression as progression_percentage
  FROM crm_leads l
  WHERE l.access_token = p_token
    AND l.deleted_at IS NULL
    AND l.archived_at IS NULL
  LIMIT 1;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.get_lead_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_lead_by_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lead_by_token(text) TO service_role;

-- Commentaire
COMMENT ON FUNCTION public.get_lead_by_token IS
'Récupère les informations d''un lead avec compteurs corrigés (types distincts de documents, pas tous les uploads)';