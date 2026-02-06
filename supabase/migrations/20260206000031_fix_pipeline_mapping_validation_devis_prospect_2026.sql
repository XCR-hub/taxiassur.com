/*
  # Correction du mapping Pipeline Commercial - 2026

  1. Correction
    - Ajouter le mapping pour 'validation_devis_prospect'
    - Corriger 'contrat_signature' vers 'contrat_final'

  2. Mapping mis à jour
    - nouveau_lead                 → NOUVEAU_LEAD
    - collecte_documents           → COLLECTE_DOCUMENTS
    - saisie_devis                 → DEVIS
    - validation_devis             → DECISION_CLIENT
    - validation_devis_prospect    → DECISION_CLIENT (nouveau)
    - signature_devis              → DECISION_CLIENT
    - paiement_rib                 → PAIEMENT
    - contrat_final                → CONTRAT_SIGNATURE
    - contrat_signature            → CONTRAT_SIGNATURE (alias)
*/

-- Mettre à jour la fonction de mapping
CREATE OR REPLACE FUNCTION map_pipeline_stage_to_status(p_pipeline_stage text)
RETURNS lead_status
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_pipeline_stage
    WHEN 'nouveau_lead' THEN 'NOUVEAU_LEAD'::lead_status
    WHEN 'collecte_documents' THEN 'COLLECTE_DOCUMENTS'::lead_status
    WHEN 'saisie_devis' THEN 'DEVIS'::lead_status
    WHEN 'validation_devis' THEN 'DECISION_CLIENT'::lead_status
    WHEN 'validation_devis_prospect' THEN 'DECISION_CLIENT'::lead_status
    WHEN 'signature_devis' THEN 'DECISION_CLIENT'::lead_status
    WHEN 'paiement_rib' THEN 'PAIEMENT'::lead_status
    WHEN 'contrat_final' THEN 'CONTRAT_SIGNATURE'::lead_status
    WHEN 'contrat_signature' THEN 'CONTRAT_SIGNATURE'::lead_status
    ELSE NULL
  END;
END;
$$;

-- Mettre à jour la fonction get_next_kanban_status
CREATE OR REPLACE FUNCTION get_next_kanban_status(p_pipeline_stage text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status lead_status;
  v_next_stage text;
  v_next_status lead_status;
BEGIN
  v_current_status := map_pipeline_stage_to_status(p_pipeline_stage);

  -- Déterminer la prochaine étape
  v_next_stage := CASE p_pipeline_stage
    WHEN 'nouveau_lead' THEN 'collecte_documents'
    WHEN 'collecte_documents' THEN 'saisie_devis'
    WHEN 'saisie_devis' THEN 'validation_devis_prospect'
    WHEN 'validation_devis' THEN 'signature_devis'
    WHEN 'validation_devis_prospect' THEN 'signature_devis'
    WHEN 'signature_devis' THEN 'paiement_rib'
    WHEN 'paiement_rib' THEN 'contrat_final'
    WHEN 'contrat_final' THEN 'client_actif'
    WHEN 'contrat_signature' THEN 'client_actif'
    ELSE NULL
  END;

  v_next_status := map_pipeline_stage_to_status(v_next_stage);

  RETURN jsonb_build_object(
    'current_stage', p_pipeline_stage,
    'current_status', v_current_status,
    'next_stage', v_next_stage,
    'next_status', v_next_status
  );
END;
$$;

COMMENT ON FUNCTION map_pipeline_stage_to_status IS 'Mappe une étape du pipeline commercial vers un statut Kanban (mis à jour avec validation_devis_prospect)';
