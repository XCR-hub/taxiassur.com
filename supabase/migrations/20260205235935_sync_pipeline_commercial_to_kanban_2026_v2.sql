/*
  # Synchronisation Pipeline Commercial → Pipeline Kanban - 2026

  1. Objectif
    - Synchroniser automatiquement le statut Kanban avec l'étape du pipeline commercial
    - Le commercial travaille dans le Pipeline Commercial (7 étapes)
    - Le statut Kanban se met à jour automatiquement

  2. Mapping Pipeline Commercial → Kanban
    - nouveau_lead         → NOUVEAU_LEAD
    - collecte_documents   → COLLECTE_DOCUMENTS
    - saisie_devis         → DEVIS
    - validation_devis     → DECISION_CLIENT
    - signature_devis      → DECISION_CLIENT
    - paiement_rib         → PAIEMENT
    - contrat_final        → CONTRAT_SIGNATURE
    - [Bouton Valider]     → CLIENT_ACTIF

  3. Fonctionnement
    - Trigger automatique sur changement de pipeline_stage
    - Fonction RPC pour passer en "Client Actif" manuellement
    - Historique des changements de statut

  4. Sécurité
    - Fonction SECURITY DEFINER pour accès contrôlé
    - Pas de régression possible (sauf via fonction dédiée)
*/

-- Fonction de mapping pipeline_stage → status
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
    WHEN 'signature_devis' THEN 'DECISION_CLIENT'::lead_status
    WHEN 'paiement_rib' THEN 'PAIEMENT'::lead_status
    WHEN 'contrat_final' THEN 'CONTRAT_SIGNATURE'::lead_status
    ELSE NULL
  END;
END;
$$;

-- Fonction trigger pour synchroniser automatiquement
CREATE OR REPLACE FUNCTION sync_pipeline_to_kanban()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_status lead_status;
BEGIN
  -- Ne rien faire si le lead est déjà client actif ou perdu
  IF NEW.status IN ('CLIENT_ACTIF', 'PERDU', 'CLIENT_LOST') THEN
    RETURN NEW;
  END IF;

  -- Calculer le nouveau statut Kanban
  v_new_status := map_pipeline_stage_to_status(NEW.pipeline_stage);

  -- Mettre à jour le statut si mapping trouvé
  IF v_new_status IS NOT NULL AND v_new_status != OLD.status THEN
    NEW.status := v_new_status;

    -- Logger le changement
    INSERT INTO crm_event_notifications (
      lead_id,
      event_type,
      title,
      message,
      priority,
      metadata
    ) VALUES (
      NEW.id,
      'status_auto_updated',
      'Statut Kanban mis à jour',
      format('Passage automatique de "%s" à "%s" (étape commercial: %s)', 
        OLD.status, v_new_status, NEW.pipeline_stage),
      'low',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', v_new_status,
        'pipeline_stage', NEW.pipeline_stage,
        'trigger', 'automatic'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Créer ou remplacer le trigger
DROP TRIGGER IF EXISTS trigger_sync_pipeline_to_kanban ON crm_leads;

CREATE TRIGGER trigger_sync_pipeline_to_kanban
  BEFORE UPDATE OF pipeline_stage ON crm_leads
  FOR EACH ROW
  WHEN (OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage)
  EXECUTE FUNCTION sync_pipeline_to_kanban();

-- Fonction RPC pour valider manuellement et passer en "Client Actif"
CREATE OR REPLACE FUNCTION activate_lead_as_client(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead record;
  v_result jsonb;
BEGIN
  -- Vérifier que le lead existe et est à l'étape contrat_final
  SELECT * INTO v_lead
  FROM crm_leads
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Lead non trouvé'
    );
  END IF;

  -- Vérifier qu'on est bien à l'étape contrat_final
  IF v_lead.pipeline_stage != 'contrat_final' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Le lead doit être à l''étape "Contrat Final" (actuellement: %s)', v_lead.pipeline_stage),
      'current_stage', v_lead.pipeline_stage
    );
  END IF;

  -- Vérifier que le statut n'est pas déjà CLIENT_ACTIF
  IF v_lead.status = 'CLIENT_ACTIF' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Le lead est déjà un client actif'
    );
  END IF;

  -- Mettre à jour le statut en CLIENT_ACTIF
  UPDATE crm_leads
  SET 
    status = 'CLIENT_ACTIF'::lead_status,
    updated_at = now()
  WHERE id = p_lead_id;

  -- Logger l'événement
  INSERT INTO crm_event_notifications (
    lead_id,
    event_type,
    title,
    message,
    priority,
    metadata
  ) VALUES (
    p_lead_id,
    'lead_activated',
    'Lead activé en Client Actif',
    format('%s %s est maintenant un client actif !', v_lead.first_name, v_lead.last_name),
    'high',
    jsonb_build_object(
      'old_status', v_lead.status,
      'new_status', 'CLIENT_ACTIF',
      'pipeline_stage', 'contrat_final',
      'activated_by', auth.uid(),
      'activated_at', now()
    )
  );

  -- TODO: Déclencher d'autres actions si nécessaire
  -- - Envoyer email de bienvenue au client
  -- - Créer la fiche client dans un système externe
  -- - etc.

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Lead activé avec succès en Client Actif',
    'lead_id', p_lead_id,
    'new_status', 'CLIENT_ACTIF'
  );
END;
$$;

-- Fonction pour obtenir le prochain statut Kanban selon le pipeline stage
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
    WHEN 'saisie_devis' THEN 'validation_devis'
    WHEN 'validation_devis' THEN 'signature_devis'
    WHEN 'signature_devis' THEN 'paiement_rib'
    WHEN 'paiement_rib' THEN 'contrat_final'
    WHEN 'contrat_final' THEN 'client_actif'
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

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_pipeline_stage_status 
  ON crm_leads(pipeline_stage, status) 
  WHERE status NOT IN ('PERDU', 'CLIENT_LOST');

-- Commentaires
COMMENT ON FUNCTION map_pipeline_stage_to_status IS 'Mappe une étape du pipeline commercial vers un statut Kanban';
COMMENT ON FUNCTION sync_pipeline_to_kanban IS 'Synchronise automatiquement le statut Kanban avec l''étape du pipeline commercial';
COMMENT ON FUNCTION activate_lead_as_client IS 'Active manuellement un lead en Client Actif (depuis étape Contrat Final)';
COMMENT ON FUNCTION get_next_kanban_status IS 'Retourne le prochain statut Kanban selon l''étape pipeline actuelle';
COMMENT ON TRIGGER trigger_sync_pipeline_to_kanban ON crm_leads IS 'Synchronise automatiquement pipeline_stage → status Kanban';
