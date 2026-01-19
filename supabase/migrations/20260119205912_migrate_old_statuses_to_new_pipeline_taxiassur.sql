/*
  # Migration des anciens statuts vers le nouveau pipeline TaxiAssur unifié

  ## Description
  Migre tous les leads existants vers le nouveau pipeline simplifié et cohérent.
  Cette migration garantit la continuité des données tout en nettoyant les incohérences.

  ## Mapping des statuts
  
  ### Phase Prospection
  - `NEW_LEAD` → `NEW_LEAD` (inchangé)
  - `CONTACT_ATTEMPTED` → `PREMIER_CONTACT`
  - `CONTACT_CONFIRMED` → `PREMIER_CONTACT`

  ### Phase Qualification
  - `DOCUMENTS_REQUIRED` → `COLLECTE_DOCUMENTS`
  - `DOCUMENTS_PARTIAL` → `COLLECTE_DOCUMENTS`
  - `READY_FOR_QUOTE` → `PRET_DEVIS`

  ### Phase Commerciale
  - `QUOTE_SENT` → `DEVIS_EN_COURS`
  - `NO_RESPONSE` → `RELANCE`
  - `RELANCE_ACTIVE` → `RELANCE`

  ### Phase Contractuelle
  - `SIGNATURE_PENDING` → `SIGNATURE_EN_COURS`
  - `SIGNED` → `SIGNATURE_EN_COURS`
  - `DOWN_PAYMENT_REQUIRED` → `PAIEMENT_EN_ATTENTE`
  - `PAYMENT_PENDING` → `PAIEMENT_EN_ATTENTE`
  - `ACTIVE_CLIENT` → `CLIENT_ACTIF`

  ### Statuts spéciaux
  - `CLIENT_LOST` → `PERDU`
  - `LOST_RECONTACT_SCHEDULED` → `RECONTACT_PROGRAMME`
  - Les autres restent identiques

  ## Sécurité
  - Backup automatique dans une table historique
  - Rollback possible via fonction dédiée
*/

-- Table de backup des anciens statuts
CREATE TABLE IF NOT EXISTS crm_leads_status_migration_backup (
  id uuid PRIMARY KEY,
  lead_id uuid NOT NULL,
  old_status text NOT NULL,
  new_status text NOT NULL,
  migrated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Fonction de migration des statuts
CREATE OR REPLACE FUNCTION migrate_lead_statuses_to_new_pipeline()
RETURNS TABLE (
  total_leads bigint,
  migrated_count bigint,
  unchanged_count bigint,
  error_count bigint
) AS $$
DECLARE
  v_total bigint := 0;
  v_migrated bigint := 0;
  v_unchanged bigint := 0;
  v_errors bigint := 0;
  v_lead_record RECORD;
  v_new_status text;
BEGIN
  -- Compter le total
  SELECT COUNT(*) INTO v_total FROM crm_leads WHERE deleted_at IS NULL;

  -- Parcourir tous les leads
  FOR v_lead_record IN 
    SELECT id, status 
    FROM crm_leads 
    WHERE deleted_at IS NULL
  LOOP
    BEGIN
      -- Déterminer le nouveau statut
      v_new_status := CASE v_lead_record.status
        -- Phase Prospection
        WHEN 'NEW_LEAD' THEN 'NEW_LEAD'
        WHEN 'CONTACT_ATTEMPTED' THEN 'PREMIER_CONTACT'
        WHEN 'CONTACT_CONFIRMED' THEN 'PREMIER_CONTACT'

        -- Phase Qualification
        WHEN 'DOCUMENTS_REQUIRED' THEN 'COLLECTE_DOCUMENTS'
        WHEN 'DOCUMENTS_PARTIAL' THEN 'COLLECTE_DOCUMENTS'
        WHEN 'READY_FOR_QUOTE' THEN 'PRET_DEVIS'

        -- Phase Commerciale
        WHEN 'QUOTE_SENT' THEN 'DEVIS_EN_COURS'
        WHEN 'NO_RESPONSE' THEN 'RELANCE'
        WHEN 'RELANCE_ACTIVE' THEN 'RELANCE'

        -- Phase Contractuelle
        WHEN 'SIGNATURE_PENDING' THEN 'SIGNATURE_EN_COURS'
        WHEN 'SIGNED' THEN 'SIGNATURE_EN_COURS'
        WHEN 'DOWN_PAYMENT_REQUIRED' THEN 'PAIEMENT_EN_ATTENTE'
        WHEN 'PAYMENT_PENDING' THEN 'PAIEMENT_EN_ATTENTE'
        WHEN 'ACTIVE_CLIENT' THEN 'CLIENT_ACTIF'

        -- Statuts spéciaux
        WHEN 'CLIENT_LOST' THEN 'PERDU'
        WHEN 'LOST_RECONTACT_SCHEDULED' THEN 'RECONTACT_PROGRAMME'

        -- Gestion client (inchangés)
        WHEN 'CROSS_SELLING' THEN 'CROSS_SELLING'
        WHEN 'RISK_CHURN' THEN 'RISK_CHURN'
        WHEN 'SINISTER' THEN 'SINISTER'
        WHEN 'ATTESTATION_REQUEST' THEN 'ATTESTATION_REQUEST'
        WHEN 'SUPPORT_ASSISTANCE' THEN 'SUPPORT_ASSISTANCE'

        -- Par défaut, garder le statut actuel
        ELSE v_lead_record.status
      END;

      -- Si le statut change
      IF v_new_status != v_lead_record.status THEN
        -- Backup de l'ancien statut
        INSERT INTO crm_leads_status_migration_backup (
          id,
          lead_id,
          old_status,
          new_status,
          metadata
        ) VALUES (
          gen_random_uuid(),
          v_lead_record.id,
          v_lead_record.status,
          v_new_status,
          jsonb_build_object(
            'migration_version', '1.0',
            'migrated_by', 'auto_migration_script'
          )
        );

        -- Mise à jour du lead
        UPDATE crm_leads
        SET 
          status = v_new_status,
          updated_at = now()
        WHERE id = v_lead_record.id;

        -- Ajouter une entrée dans la timeline
        INSERT INTO crm_timeline (
          id,
          lead_id,
          event_type,
          title,
          description,
          metadata,
          created_at
        ) VALUES (
          gen_random_uuid(),
          v_lead_record.id,
          'status_change',
          'Migration vers nouveau pipeline TaxiAssur',
          format('Statut migré automatiquement de "%s" vers "%s"', v_lead_record.status, v_new_status),
          jsonb_build_object(
            'from_status', v_lead_record.status,
            'to_status', v_new_status,
            'migration_type', 'automatic',
            'migration_date', now()
          ),
          now()
        );

        v_migrated := v_migrated + 1;
      ELSE
        v_unchanged := v_unchanged + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE WARNING 'Erreur lors de la migration du lead %: %', v_lead_record.id, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT v_total, v_migrated, v_unchanged, v_errors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction de rollback (si besoin)
CREATE OR REPLACE FUNCTION rollback_pipeline_migration()
RETURNS bigint AS $$
DECLARE
  v_rollback_count bigint := 0;
  v_backup_record RECORD;
BEGIN
  FOR v_backup_record IN 
    SELECT * FROM crm_leads_status_migration_backup
    ORDER BY migrated_at DESC
  LOOP
    UPDATE crm_leads
    SET 
      status = v_backup_record.old_status,
      updated_at = now()
    WHERE id = v_backup_record.lead_id;

    v_rollback_count := v_rollback_count + 1;
  END LOOP;

  RETURN v_rollback_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- EXÉCUTION DE LA MIGRATION
DO $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT * INTO v_result FROM migrate_lead_statuses_to_new_pipeline();
  
  RAISE NOTICE '🎯 MIGRATION PIPELINE TAXIASSUR TERMINÉE';
  RAISE NOTICE '   Total leads: %', v_result.total_leads;
  RAISE NOTICE '   Migrés: %', v_result.migrated_count;
  RAISE NOTICE '   Inchangés: %', v_result.unchanged_count;
  RAISE NOTICE '   Erreurs: %', v_result.error_count;
  
  IF v_result.error_count > 0 THEN
    RAISE WARNING '⚠️  Des erreurs sont survenues pendant la migration. Vérifiez les logs.';
  END IF;
END $$;

-- Commentaires
COMMENT ON FUNCTION migrate_lead_statuses_to_new_pipeline IS 'Migre tous les leads vers le nouveau pipeline TaxiAssur unifié avec backup automatique';
COMMENT ON FUNCTION rollback_pipeline_migration IS 'Rollback de la migration vers les anciens statuts (à utiliser en cas d''urgence)';
COMMENT ON TABLE crm_leads_status_migration_backup IS 'Backup des anciens statuts avant migration - permet le rollback';
