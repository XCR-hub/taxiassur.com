/*
  # Compteurs Détaillés Documents - 21 Février 2026

  ## Problème

  Le compteur affiche "1/6" alors que plusieurs documents ont été uploadés et validés.

  La fonction actuelle compte seulement les TYPES DISTINCTS de documents :
  - 1 type = 1 dans le compteur
  - Même si 5 documents du même type sont uploadés, ça compte 1

  ## Solution

  Ajouter des compteurs détaillés pour que le prospect puisse suivre :
  - Nombre TOTAL de documents uploadés (tous les fichiers)
  - Nombre TOTAL de documents validés
  - Nombre TOTAL de documents refusés
  - Nombre TOTAL de documents en attente de validation

  ## Compteurs

  1. **total_uploaded_files** : Tous les fichiers uploadés (COUNT(*))
  2. **validated_files** : Fichiers avec status='validated' ou validated=true
  3. **rejected_files** : Fichiers avec status='rejected'
  4. **pending_files** : Fichiers en attente (status='pending' ou uploaded mais pas encore traité)
  5. **document_types_complete** : Types de documents complétés (logique existante)
*/

-- 1. Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS public.get_lead_by_token(text);

-- 2. Créer la nouvelle fonction avec compteurs détaillés
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
  -- Compteurs existants (types distincts)
  total_documents integer,
  uploaded_documents integer,
  validated_documents integer,
  progression_percentage integer,
  -- Nouveaux compteurs détaillés (tous les fichiers)
  total_uploaded_files integer,
  validated_files integer,
  rejected_files integer,
  pending_files integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_total_docs integer := 6; -- 6 types de documents OBLIGATOIRES
  v_uploaded_types integer := 0;
  v_validated_types integer := 0;
  v_progression integer := 0;
  v_docs_complete boolean := false;
  -- Nouveaux compteurs
  v_total_uploaded_files integer := 0;
  v_validated_files integer := 0;
  v_rejected_files integer := 0;
  v_pending_files integer := 0;
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
    -- ========================================
    -- COMPTEURS PAR TYPE (logique existante)
    -- ========================================

    -- Compter les TYPES de documents distincts qui ont été uploadés
    SELECT COUNT(DISTINCT document_type)
    INTO v_uploaded_types
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
    SELECT COUNT(DISTINCT document_type)
    INTO v_validated_types
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

    -- ========================================
    -- NOUVEAUX COMPTEURS DÉTAILLÉS (tous les fichiers)
    -- ========================================

    -- Nombre TOTAL de fichiers uploadés
    SELECT COUNT(*)
    INTO v_total_uploaded_files
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

    -- Nombre de fichiers VALIDÉS
    SELECT COUNT(*)
    INTO v_validated_files
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

    -- Nombre de fichiers REFUSÉS
    SELECT COUNT(*)
    INTO v_rejected_files
    FROM crm_lead_documents
    WHERE lead_id = v_lead_id
      AND status = 'rejected'
      AND document_type IN (
        'licence_taxi',
        'permis_conduire',
        'piece_identite',
        'carte_grise',
        'autorisation_stationnement',
        'rib'
      );

    -- Nombre de fichiers EN ATTENTE
    SELECT COUNT(*)
    INTO v_pending_files
    FROM crm_lead_documents
    WHERE lead_id = v_lead_id
      AND uploaded_at IS NOT NULL
      AND COALESCE(validated, false) = false
      AND COALESCE(status, 'pending') NOT IN ('validated', 'rejected')
      AND document_type IN (
        'licence_taxi',
        'permis_conduire',
        'piece_identite',
        'carte_grise',
        'autorisation_stationnement',
        'rib'
      );

    -- Calculer le pourcentage basé sur les TYPES de documents VALIDÉS
    IF v_total_docs > 0 THEN
      v_progression := ROUND((v_validated_types::numeric / v_total_docs::numeric) * 100)::integer;
      v_docs_complete := (v_validated_types >= v_total_docs);
    END IF;
  END IF;

  -- Retourner les données du lead avec tous les compteurs
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
    -- Compteurs par type (existants)
    v_total_docs as total_documents,
    v_uploaded_types as uploaded_documents,
    v_validated_types as validated_documents,
    v_progression as progression_percentage,
    -- Nouveaux compteurs détaillés (tous les fichiers)
    v_total_uploaded_files as total_uploaded_files,
    v_validated_files as validated_files,
    v_rejected_files as rejected_files,
    v_pending_files as pending_files
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
'Récupère les informations d''un lead avec compteurs détaillés : types distincts + compteurs de tous les fichiers uploadés/validés/refusés';