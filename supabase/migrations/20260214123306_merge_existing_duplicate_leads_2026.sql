/*
  # Fusionner les Leads Dupliqués Existants - 14 Février 2026

  ## Problème
  Plusieurs leads avec le même email (ex: Tony CERDA avec tcerda@cc.fr)
  apparaissent dans le Pipeline Kanban en doublon.

  ## Solution
  1. Exécuter auto_merge_all_duplicates() pour fusionner tous les doublons actuels
  2. Afficher un rapport des fusions effectuées

  ## Sécurité
  - Garde le lead avec le plus d'informations
  - Consolide tous les documents, interactions, devis, contrats
  - Archive les leads dupliqués (ne les supprime pas)
  - Log complet dans lead_merge_log
*/

-- ============================================
-- 1. FUSIONNER TOUS LES DOUBLONS EXISTANTS
-- ============================================

DO $$
DECLARE
  v_merge_result jsonb;
  v_emails_processed integer;
  v_leads_merged integer;
BEGIN
  RAISE NOTICE '🔄 Fusion automatique des leads dupliqués...';

  -- Exécuter la fusion automatique
  SELECT auto_merge_all_duplicates() INTO v_merge_result;

  v_emails_processed := (v_merge_result->>'emails_processed')::integer;
  v_leads_merged := (v_merge_result->>'total_leads_merged')::integer;

  RAISE NOTICE '✅ Fusion terminée!';
  RAISE NOTICE '   - Emails traités: %', v_emails_processed;
  RAISE NOTICE '   - Leads fusionnés: %', v_leads_merged;

  -- Afficher les détails pour chaque email
  IF v_emails_processed > 0 THEN
    RAISE NOTICE '📊 Détails des fusions:';
    RAISE NOTICE '%', jsonb_pretty(v_merge_result->'details');
  END IF;

END $$;

-- ============================================
-- 2. VÉRIFICATION DES DOUBLONS RESTANTS
-- ============================================

DO $$
DECLARE
  v_remaining_duplicates integer;
BEGIN
  SELECT COUNT(*) INTO v_remaining_duplicates
  FROM (
    SELECT email, COUNT(*) as cnt
    FROM crm_leads
    WHERE email IS NOT NULL
      AND email != ''
      AND status != 'archived'
    GROUP BY email
    HAVING COUNT(*) > 1
  ) dups;

  IF v_remaining_duplicates > 0 THEN
    RAISE WARNING '⚠️ Il reste encore % emails avec des doublons', v_remaining_duplicates;
    RAISE WARNING 'Exécuter manuellement: SELECT * FROM find_duplicate_leads();';
  ELSE
    RAISE NOTICE '✅ Aucun doublon restant!';
  END IF;
END $$;

-- ============================================
-- 3. RAPPORT FINAL
-- ============================================

-- Afficher le nombre total de leads actifs
DO $$
DECLARE
  v_active_leads integer;
  v_archived_leads integer;
BEGIN
  SELECT COUNT(*) INTO v_active_leads
  FROM crm_leads
  WHERE status != 'archived';

  SELECT COUNT(*) INTO v_archived_leads
  FROM crm_leads
  WHERE status = 'archived';

  RAISE NOTICE '📈 État des leads après fusion:';
  RAISE NOTICE '   - Leads actifs: %', v_active_leads;
  RAISE NOTICE '   - Leads archivés: %', v_archived_leads;
END $$;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON TABLE lead_merge_log IS
'Historique complet des fusions de leads effectuées le 14/02/2026 pour éliminer les doublons (Tony CERDA et autres)';