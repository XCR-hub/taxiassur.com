/*
  # Correction trigger + Migration complète des 52 leads

  Problème: Le trigger utilise 'PIPELINE' mais doit utiliser 'SYSTEM'
  Solution: Corriger le trigger puis migrer tous les leads
*/

-- 1. CORRIGER LE TRIGGER D'ABORD
CREATE OR REPLACE FUNCTION trigger_pipeline_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status text;
  v_new_status text;
BEGIN
  v_old_status := OLD.status::text;
  v_new_status := NEW.status::text;

  -- Si le statut a changé
  IF v_old_status IS DISTINCT FROM v_new_status THEN
    -- Enregistrer la transition avec 'SYSTEM' au lieu de 'PIPELINE'
    INSERT INTO crm_state_transitions (
      lead_id,
      from_state,
      to_state,
      triggered_by,
      transitioned_at
    ) VALUES (
      NEW.id,
      v_old_status::lead_status,
      v_new_status::lead_status,
      'SYSTEM',  -- ✅ Changé de 'PIPELINE' à 'SYSTEM'
      NOW()
    );

    -- Mettre à jour last_contact_at
    NEW.last_contact_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- 2. BACKUP COMPLET
CREATE TABLE IF NOT EXISTS crm_leads_backup_final_v4 AS
SELECT * FROM crm_leads;

DO $$
DECLARE
  v_total integer;
BEGIN
  SELECT COUNT(*) INTO v_total FROM crm_leads;
  RAISE NOTICE '╔═══════════════════════════════════════╗';
  RAISE NOTICE '║  BACKUP: % leads sauvegardés        ║', v_total;
  RAISE NOTICE '╚═══════════════════════════════════════╝';
END $$;

-- 3. MIGRATION DES 52 LEADS
DO $$
DECLARE
  v_updated integer;
  v_total_migrated integer := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔄 MIGRATION EN COURS...';
  RAISE NOTICE '';

  -- Batch 1: NEW_LEAD → NOUVEAU_LEAD (41 leads)
  UPDATE crm_leads 
  SET status = 'NOUVEAU_LEAD'::lead_status, updated_at = now()
  WHERE status::text = 'NEW_LEAD';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_migrated := v_total_migrated + v_updated;
  RAISE NOTICE '✓ NEW_LEAD → NOUVEAU_LEAD: % leads', v_updated;

  -- Batch 2: CONTACT_CONFIRMED → NOUVEAU_LEAD (2 leads)
  UPDATE crm_leads 
  SET status = 'NOUVEAU_LEAD'::lead_status, updated_at = now()
  WHERE status::text = 'CONTACT_CONFIRMED';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_migrated := v_total_migrated + v_updated;
  RAISE NOTICE '✓ CONTACT_CONFIRMED → NOUVEAU_LEAD: % leads', v_updated;

  -- Batch 3: CONTACT_ATTEMPTED → NOUVEAU_LEAD (1 lead)
  UPDATE crm_leads 
  SET status = 'NOUVEAU_LEAD'::lead_status, updated_at = now()
  WHERE status::text = 'CONTACT_ATTEMPTED';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_migrated := v_total_migrated + v_updated;
  RAISE NOTICE '✓ CONTACT_ATTEMPTED → NOUVEAU_LEAD: % leads', v_updated;

  -- Batch 4: DOCUMENTS_REQUIRED → COLLECTE_DOCUMENTS (1 lead)
  UPDATE crm_leads 
  SET status = 'COLLECTE_DOCUMENTS'::lead_status, updated_at = now()
  WHERE status::text = 'DOCUMENTS_REQUIRED';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_migrated := v_total_migrated + v_updated;
  RAISE NOTICE '✓ DOCUMENTS_REQUIRED → COLLECTE_DOCUMENTS: % leads', v_updated;

  -- Batch 5: READY_FOR_QUOTE → COLLECTE_DOCUMENTS (1 lead)
  UPDATE crm_leads 
  SET status = 'COLLECTE_DOCUMENTS'::lead_status, updated_at = now()
  WHERE status::text = 'READY_FOR_QUOTE';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_migrated := v_total_migrated + v_updated;
  RAISE NOTICE '✓ READY_FOR_QUOTE → COLLECTE_DOCUMENTS: % leads', v_updated;

  -- Batch 6: QUOTE_SENT → DEVIS (1 lead)
  UPDATE crm_leads 
  SET status = 'DEVIS'::lead_status, updated_at = now()
  WHERE status::text = 'QUOTE_SENT';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_migrated := v_total_migrated + v_updated;
  RAISE NOTICE '✓ QUOTE_SENT → DEVIS: % leads', v_updated;

  -- Batch 7: ACTIVE_CLIENT → CLIENT_ACTIF (2 leads)
  UPDATE crm_leads 
  SET status = 'CLIENT_ACTIF'::lead_status, updated_at = now()
  WHERE status::text = 'ACTIVE_CLIENT';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_migrated := v_total_migrated + v_updated;
  RAISE NOTICE '✓ ACTIVE_CLIENT → CLIENT_ACTIF: % leads', v_updated;

  -- Batch 8: LOST_RECONTACT_SCHEDULED → RECONTACT_PROGRAMME (3 leads)
  UPDATE crm_leads 
  SET status = 'RECONTACT_PROGRAMME'::lead_status, updated_at = now()
  WHERE status::text = 'LOST_RECONTACT_SCHEDULED';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_migrated := v_total_migrated + v_updated;
  RAISE NOTICE '✓ LOST_RECONTACT_SCHEDULED → RECONTACT_PROGRAMME: % leads', v_updated;

  RAISE NOTICE '';
  RAISE NOTICE '✅ TOTAL MIGRÉ: % leads', v_total_migrated;
END $$;

-- 4. VÉRIFICATION
DO $$
DECLARE
  v_before integer;
  v_after integer;
BEGIN
  SELECT COUNT(*) INTO v_before FROM crm_leads_backup_final_v4;
  SELECT COUNT(*) INTO v_after FROM crm_leads;

  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════╗';
  RAISE NOTICE '║      VÉRIFICATION INTÉGRITÉ           ║';
  RAISE NOTICE '╠═══════════════════════════════════════╣';
  RAISE NOTICE '║ Leads AVANT: %                      ║', LPAD(v_before::text, 4);
  RAISE NOTICE '║ Leads APRÈS: %                      ║', LPAD(v_after::text, 4);
  RAISE NOTICE '║ Différence: %                        ║', LPAD((v_after - v_before)::text, 4);
  
  IF v_before = v_after THEN
    RAISE NOTICE '╠═══════════════════════════════════════╣';
    RAISE NOTICE '║  ✅✅✅ AUCUN LEAD PERDU! ✅✅✅      ║';
  ELSE
    RAISE NOTICE '╠═══════════════════════════════════════╣';
    RAISE NOTICE '║  ⚠️  ATTENTION: DIFFÉRENCE DÉTECTÉE  ║';
  END IF;
  RAISE NOTICE '╚═══════════════════════════════════════╝';
END $$;

-- 5. NOUVELLE RÉPARTITION
DO $$
DECLARE
  v_rec record;
  v_total integer;
BEGIN
  SELECT COUNT(*) INTO v_total FROM crm_leads;

  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════╗';
  RAISE NOTICE '║   NOUVELLE RÉPARTITION - 7 ÉTAPES             ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════╝';
  
  FOR v_rec IN
    SELECT 
      status::text as statut, 
      COUNT(*) as nombre
    FROM crm_leads
    GROUP BY status::text
    ORDER BY
      CASE status::text
        WHEN 'NOUVEAU_LEAD' THEN 1
        WHEN 'COLLECTE_DOCUMENTS' THEN 2
        WHEN 'DEVIS' THEN 3
        WHEN 'DECISION_CLIENT' THEN 4
        WHEN 'PAIEMENT' THEN 5
        WHEN 'CONTRAT_SIGNATURE' THEN 6
        WHEN 'CLIENT_ACTIF' THEN 7
        ELSE 99
      END,
      nombre DESC
  LOOP
    RAISE NOTICE '  % : % leads', RPAD(v_rec.statut, 25), v_rec.nombre;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '  TOTAL: % leads', v_total;
  RAISE NOTICE '╚═══════════════════════════════════════════════╝';
END $$;

-- 6. RÉSUMÉ
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔═════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ PIPELINE SIMPLIFIÉ ACTIVÉ - 7 ÉTAPES       ║';
  RAISE NOTICE '╠═════════════════════════════════════════════════╣';
  RAISE NOTICE '║                                                 ║';
  RAISE NOTICE '║  1️⃣  NOUVEAU_LEAD       - Demande reçue        ║';
  RAISE NOTICE '║  2️⃣  COLLECTE_DOCUMENTS - Documents             ║';
  RAISE NOTICE '║  3️⃣  DEVIS              - Devis envoyé          ║';
  RAISE NOTICE '║  4️⃣  DECISION_CLIENT    - Accepté/Refusé        ║';
  RAISE NOTICE '║  5️⃣  PAIEMENT           - CB/Prélèvement        ║';
  RAISE NOTICE '║  6️⃣  CONTRAT_SIGNATURE  - Signature             ║';
  RAISE NOTICE '║  7️⃣  CLIENT_ACTIF       - Espace client         ║';
  RAISE NOTICE '║                                                 ║';
  RAISE NOTICE '╠═════════════════════════════════════════════════╣';
  RAISE NOTICE '║  🔒 VERROUS: Docs, Paiement, Signature         ║';
  RAISE NOTICE '║  💾 Backup: crm_leads_backup_final_v4           ║';
  RAISE NOTICE '╚═════════════════════════════════════════════════╝';
END $$;
