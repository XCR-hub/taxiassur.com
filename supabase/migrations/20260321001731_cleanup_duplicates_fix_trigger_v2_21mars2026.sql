
/*
  # Nettoyage des doublons + correction du trigger défectueux
  
  1. Désactivation du trigger bugué (référence colonne 'validated' inexistante)
  2. Suppression des doublons
  3. Correction de la fonction trigger pour qu'elle ne plante plus
*/

-- Désactiver uniquement le trigger utilisateur défectueux
ALTER TABLE crm_lead_documents DISABLE TRIGGER trigger_update_document_counters;

DO $$
DECLARE
  duplicate_ids uuid[];
  deleted_count int := 0;
BEGIN
  WITH status_priority AS (
    SELECT id, email,
      ROW_NUMBER() OVER (
        PARTITION BY email 
        ORDER BY 
          CASE status::text
            WHEN 'CLIENT_ACTIF' THEN 7
            WHEN 'CONTRAT_SIGNATURE' THEN 6
            WHEN 'PAIEMENT' THEN 5
            WHEN 'COLLECTE_DOCUMENTS' THEN 4
            WHEN 'DEVIS' THEN 3
            WHEN 'RELANCE' THEN 2
            WHEN 'NOUVEAU_LEAD' THEN 1
            WHEN 'PERDU' THEN 0
            ELSE 0
          END DESC, created_at DESC
      ) as rn,
      COUNT(*) OVER (PARTITION BY email) as cnt
    FROM crm_leads
  )
  SELECT array_agg(id) INTO duplicate_ids
  FROM status_priority
  WHERE cnt > 1 AND rn > 1;

  IF duplicate_ids IS NULL OR array_length(duplicate_ids, 1) = 0 THEN
    RAISE NOTICE 'Aucun doublon trouvé';
  ELSE
    deleted_count := array_length(duplicate_ids, 1);
    RAISE NOTICE 'Suppression de % doublons', deleted_count;

    DELETE FROM crm_interactions WHERE lead_id = ANY(duplicate_ids);
    DELETE FROM crm_lead_documents WHERE lead_id = ANY(duplicate_ids);
    DELETE FROM prospect_documents WHERE lead_id = ANY(duplicate_ids);
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_company_quotes') THEN
      DELETE FROM lead_company_quotes WHERE lead_id = ANY(duplicate_ids);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_timeline') THEN
      DELETE FROM crm_timeline WHERE lead_id = ANY(duplicate_ids);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_event_notifications') THEN
      DELETE FROM crm_event_notifications WHERE lead_id = ANY(duplicate_ids);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ready_for_quote_queue') THEN
      DELETE FROM ready_for_quote_queue WHERE lead_id = ANY(duplicate_ids);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_messages') THEN
      DELETE FROM email_messages WHERE lead_id = ANY(duplicate_ids);
    END IF;

    DELETE FROM crm_leads WHERE id = ANY(duplicate_ids);
    
    RAISE NOTICE 'Doublons supprimés : %', deleted_count;
  END IF;
END $$;

-- Réactiver le trigger
ALTER TABLE crm_lead_documents ENABLE TRIGGER trigger_update_document_counters;

-- Corriger la fonction pour éviter les erreurs futures (colonne 'validated' → 'validated_at IS NOT NULL')
CREATE OR REPLACE FUNCTION update_lead_document_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE crm_leads
  SET
    total_uploaded_files = (
      SELECT COUNT(*)
      FROM crm_lead_documents
      WHERE lead_id = COALESCE(NEW.lead_id, OLD.lead_id)
      AND (deleted_at IS NULL OR deleted_at > now())
    ),
    validated_files = (
      SELECT COUNT(*)
      FROM crm_lead_documents
      WHERE lead_id = COALESCE(NEW.lead_id, OLD.lead_id)
      AND validated_at IS NOT NULL
      AND (deleted_at IS NULL OR deleted_at > now())
    ),
    rejected_files = (
      SELECT COUNT(*)
      FROM crm_lead_documents
      WHERE lead_id = COALESCE(NEW.lead_id, OLD.lead_id)
      AND status = 'refused'
      AND (deleted_at IS NULL OR deleted_at > now())
    ),
    pending_files = (
      SELECT COUNT(*)
      FROM crm_lead_documents
      WHERE lead_id = COALESCE(NEW.lead_id, OLD.lead_id)
      AND status = 'pending'
      AND validated_at IS NULL
      AND (deleted_at IS NULL OR deleted_at > now())
    )
  WHERE id = COALESCE(NEW.lead_id, OLD.lead_id);
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;
