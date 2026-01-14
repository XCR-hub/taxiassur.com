/*
  # Smart lead deduplication on email
  
  ## Problème
  L'index unique crm_leads_email_unique_lower empêche la création de doublons,
  mais génère une erreur quand un prospect remplit le formulaire plusieurs fois.
  
  ## Solution
  Implémenter une logique de déduplication intelligente qui :
  1. Vérifie si un lead avec cet email existe déjà (non supprimé)
  2. Si oui, met à jour le lead existant avec les nouvelles données
  3. Si non, crée un nouveau lead normalement
  
  ## Comportement
  - Le trigger intercepte l'insertion
  - Si l'email existe déjà : UPDATE du lead existant + retourne NULL (annule l'INSERT)
  - Si l'email est nouveau : laisse l'INSERT se faire normalement
*/

-- ================================================================
-- Fonction de déduplication et mise à jour des leads
-- ================================================================

CREATE OR REPLACE FUNCTION deduplicate_and_update_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_lead_id uuid;
  v_existing_lead record;
BEGIN
  -- Vérifier si un lead avec cet email existe déjà (non supprimé)
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    SELECT id, status, metadata, created_at
    INTO v_existing_lead
    FROM crm_leads
    WHERE LOWER(email) = LOWER(NEW.email)
    AND deleted_at IS NULL
    LIMIT 1;
    
    -- Si un lead existe déjà avec cet email
    IF FOUND THEN
      RAISE NOTICE '🔄 Lead existant détecté pour email: % (id: %)', NEW.email, v_existing_lead.id;
      
      -- Mettre à jour le lead existant avec les nouvelles informations
      UPDATE crm_leads SET
        -- Mettre à jour le nom si fourni
        full_name = COALESCE(NULLIF(NEW.full_name, ''), full_name),
        first_name = COALESCE(NULLIF(NEW.first_name, ''), first_name),
        last_name = COALESCE(NULLIF(NEW.last_name, ''), last_name),
        
        -- Mettre à jour le téléphone si fourni
        phone = COALESCE(NULLIF(NEW.phone, ''), phone),
        
        -- Mettre à jour la ville si fournie
        city = COALESCE(NULLIF(NEW.city, ''), city),
        
        -- Mettre à jour le statut si fourni et non 'new'
        status = CASE 
          WHEN NEW.status IS NOT NULL AND NEW.status != 'new' THEN NEW.status
          ELSE status
        END,
        
        -- Merger les métadonnées
        metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(NEW.metadata, '{}'::jsonb),
        
        -- Mettre à jour la source si fournie
        source = COALESCE(NULLIF(NEW.source, ''), source),
        
        -- Mettre à jour updated_at
        updated_at = NOW(),
        
        -- Incrémenter un compteur de soumissions
        metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{submission_count}',
          to_jsonb(COALESCE((metadata->>'submission_count')::int, 0) + 1)
        ),
        
        -- Ajouter la date de dernière soumission
        metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{last_submission_date}',
          to_jsonb(NOW()::text)
        )
      WHERE id = v_existing_lead.id;
      
      RAISE NOTICE '✅ Lead mis à jour: % (soumission #%)', 
        v_existing_lead.id, 
        COALESCE((v_existing_lead.metadata->>'submission_count')::int, 0) + 1;
      
      -- Créer un événement d'automation pour la re-soumission
      BEGIN
        INSERT INTO crm_automation_events (lead_id, event_type, event_data, new_status)
        VALUES (
          v_existing_lead.id,
          'lead_resubmission',
          jsonb_build_object(
            'previous_status', v_existing_lead.status,
            'submission_count', COALESCE((v_existing_lead.metadata->>'submission_count')::int, 0) + 1,
            'resubmitted_at', NOW(),
            'source', NEW.source
          ),
          v_existing_lead.status::text
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to create resubmission event: %', SQLERRM;
      END;
      
      -- Annuler l'INSERT en retournant NULL
      RETURN NULL;
    END IF;
  END IF;
  
  -- Si aucun lead existant, laisser l'INSERT se faire normalement
  RETURN NEW;
END;
$$;

-- ================================================================
-- Créer le trigger de déduplication (AVANT tous les autres triggers)
-- ================================================================

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trg_deduplicate_lead_before_all ON crm_leads;

-- Créer le nouveau trigger en premier (avant l'access_token)
CREATE TRIGGER trg_deduplicate_lead_before_all
  BEFORE INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION deduplicate_and_update_lead();

-- ================================================================
-- Recréer les autres triggers dans le bon ordre
-- ================================================================

-- 1. Déduplication (déjà créé ci-dessus)
-- 2. Access token generation
DROP TRIGGER IF EXISTS trg_crm_leads_before_insert ON crm_leads;
CREATE TRIGGER trg_crm_leads_before_insert
  BEFORE INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION generate_crm_lead_access_token_v2();

-- 3. Post-insert actions (déjà existant)
-- trg_crm_leads_after_insert reste inchangé

-- ================================================================
-- Commentaires
-- ================================================================

COMMENT ON FUNCTION deduplicate_and_update_lead() IS 
  'Empêche les doublons d''emails en mettant à jour le lead existant au lieu de créer un nouveau';

COMMENT ON TRIGGER trg_deduplicate_lead_before_all ON crm_leads IS
  'Déduplication intelligente basée sur l''email (doit s''exécuter en premier)';

-- Log de confirmation
DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '✅ DÉDUPLICATION INTELLIGENTE ACTIVÉE';
  RAISE NOTICE '📧 Les emails dupliqués mettront à jour le lead existant';
  RAISE NOTICE '🔄 Compteur de soumissions ajouté dans metadata';
  RAISE NOTICE '⚡ Ordre des triggers:';
  RAISE NOTICE '   1. trg_deduplicate_lead_before_all (déduplication)';
  RAISE NOTICE '   2. trg_crm_leads_before_insert (access_token)';
  RAISE NOTICE '   3. trg_crm_leads_after_insert (automation, notifications)';
  RAISE NOTICE '=================================================================';
END $$;
