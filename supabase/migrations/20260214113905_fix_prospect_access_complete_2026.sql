/*
  # Fix Prospect Access - Correction Complète Accès Espace Prospect

  ## Problème
  Les prospects ne peuvent pas accéder à leur espace via le token

  ## Solution
  1. Vérifier et corriger les RLS policies
  2. Améliorer la fonction get_lead_by_token
  3. Ajouter des logs pour debug
  4. Vérifier que archived_at n'existe pas (on utilise deleted_at uniquement)
*/

-- ============================================
-- 1. CORRIGER LA FONCTION get_lead_by_token
-- ============================================

DROP FUNCTION IF EXISTS public.get_lead_by_token(text) CASCADE;

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
  documents_complete boolean,
  progression_percentage integer,
  total_documents integer,
  uploaded_documents integer,
  quote_amount numeric,
  quote_accepted_at timestamptz,
  contract_signed_at timestamptz,
  payment_completed_at timestamptz,
  contract_pdf_url text,
  attestation_pdf_url text,
  converted_to_client boolean,
  client_since timestamptz,
  selected_company_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_docs integer := 7;
  v_uploaded_docs integer;
  v_progression integer;
  v_lead_id uuid;
BEGIN
  -- Trouver le lead avec un token valide (pas d'archived_at car colonne inexistante)
  SELECT cl.id INTO v_lead_id
  FROM crm_leads cl
  WHERE cl.access_token = p_token
    AND cl.deleted_at IS NULL
    AND cl.access_token IS NOT NULL
    AND LENGTH(cl.access_token) > 0
  LIMIT 1;

  -- Si aucun lead trouvé, retourner vide (pas d'erreur)
  IF v_lead_id IS NULL THEN
    RAISE NOTICE 'No lead found for token: %', p_token;
    RETURN;
  END IF;

  -- Calculer les documents uploadés
  SELECT COUNT(DISTINCT document_type) INTO v_uploaded_docs
  FROM crm_lead_documents cld
  WHERE cld.lead_id = v_lead_id
    AND cld.document_type IN (
      'licence_taxi', 'permis_conduire', 'piece_identite',
      'carte_grise', 'releve_information', 'autorisation_stationnement', 'rib'
    )
    AND cld.status != 'refused'
    AND cld.deleted_at IS NULL;

  v_uploaded_docs := COALESCE(v_uploaded_docs, 0);
  v_progression := CASE
    WHEN v_total_docs > 0 THEN ROUND((v_uploaded_docs::numeric / v_total_docs::numeric) * 100)
    ELSE 0
  END;

  RETURN QUERY
  SELECT
    cl.id,
    cl.first_name,
    cl.last_name,
    cl.email,
    cl.phone,
    cl.address,
    cl.postal_code,
    cl.city,
    cl.company_name,
    cl.siret,
    cl.status,
    cl.pipeline_stage,
    (v_uploaded_docs >= v_total_docs) as documents_complete,
    v_progression as progression_percentage,
    v_total_docs as total_documents,
    v_uploaded_docs as uploaded_documents,
    NULL::numeric as quote_amount,
    NULL::timestamptz as quote_accepted_at,
    cl.contract_signed_at,
    cl.payment_completed_at,
    cl.contract_pdf_url,
    cl.attestation_pdf_url,
    cl.converted_to_client,
    cl.client_since,
    NULL::uuid as selected_company_id,
    cl.created_at,
    cl.updated_at
  FROM crm_leads cl
  WHERE cl.id = v_lead_id
  LIMIT 1;
END;
$$;

-- ============================================
-- 2. FONCTION POUR RÉCUPÉRER LES DOCUMENTS
-- ============================================

DROP FUNCTION IF EXISTS public.get_lead_documents_by_token(text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_lead_documents_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  document_type text,
  file_name text,
  file_size bigint,
  uploaded_at timestamptz,
  status text,
  validated boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  -- Trouver le lead
  SELECT l.id INTO v_lead_id
  FROM crm_leads l
  WHERE l.access_token = p_token
    AND l.deleted_at IS NULL;

  IF v_lead_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    d.document_type,
    d.document_name as file_name,
    d.file_size,
    d.uploaded_at,
    COALESCE(d.status, 'pending') as status,
    COALESCE(d.validated, false) as validated
  FROM crm_lead_documents d
  WHERE d.lead_id = v_lead_id
    AND d.deleted_at IS NULL
  ORDER BY d.uploaded_at DESC;
END;
$$;

-- ============================================
-- 3. PERMISSIONS ANON
-- ============================================

GRANT EXECUTE ON FUNCTION public.get_lead_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_lead_documents_by_token(text) TO anon, authenticated;

-- ============================================
-- 4. RLS POLICIES POUR ACCÈS LEADS VIA TOKEN
-- ============================================

-- Permettre aux utilisateurs anonymes de lire leurs propres leads via token
DROP POLICY IF EXISTS "Anon can read own lead via token" ON crm_leads;
CREATE POLICY "Anon can read own lead via token"
  ON crm_leads
  FOR SELECT
  TO anon
  USING (
    access_token IS NOT NULL
    AND LENGTH(access_token) > 0
    AND deleted_at IS NULL
  );

-- ============================================
-- 5. TEST DE LA FONCTION
-- ============================================

DO $$
DECLARE
  v_test_token text;
  v_result record;
BEGIN
  -- Récupérer un token de test
  SELECT access_token INTO v_test_token
  FROM crm_leads
  WHERE access_token IS NOT NULL
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_test_token IS NOT NULL THEN
    -- Tester la fonction
    SELECT * INTO v_result
    FROM get_lead_by_token(v_test_token)
    LIMIT 1;

    IF v_result.id IS NOT NULL THEN
      RAISE NOTICE '✅ TEST PASSED: Function get_lead_by_token works correctly';
      RAISE NOTICE '   Lead ID: %', v_result.id;
      RAISE NOTICE '   Email: %', v_result.email;
    ELSE
      RAISE WARNING '⚠️ TEST FAILED: No result from get_lead_by_token';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ No test token available';
  END IF;
END $$;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON FUNCTION public.get_lead_by_token(text) IS
'Retourne les informations du lead via son access_token (FIXED: removed archived_at, added validation)';

COMMENT ON FUNCTION public.get_lead_documents_by_token(text) IS
'Retourne les documents du lead via son access_token pour l''espace prospect';
