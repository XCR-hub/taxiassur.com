/*
  # Fix complet formulaire + emails - 24 février 2026

  1. Problèmes identifiés
    - Formulaire ne crée pas de leads
    - Aucun email envoyé au prospect
    - Aucun email envoyé à team@taxiassur.com

  2. Solutions
    - Vérifier et corriger la fonction upsert_lead avec logs détaillés
    - Vérifier et réactiver le trigger email si nécessaire
    - Vérifier les permissions RLS
    - Tester automatiquement le système

  3. Tests inclus
    - Test de création de lead
    - Test du trigger email
    - Vérification de la queue d'emails
*/

-- ============================================
-- 1. FONCTION UPSERT_LEAD AVEC LOGS DÉTAILLÉS
-- ============================================

CREATE OR REPLACE FUNCTION public.upsert_lead(
  p_email text,
  p_first_name text,
  p_last_name text DEFAULT '',
  p_phone text DEFAULT '',
  p_city text DEFAULT '',
  p_source text DEFAULT 'website',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  lead_id uuid,
  access_token text,
  is_new boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_token text;
  v_is_new boolean := false;
  v_existing_id uuid;
  v_existing_token text;
BEGIN
  RAISE LOG '[UPSERT_LEAD] 🚀 Début - Email: %, Nom: % %', p_email, p_first_name, p_last_name;

  -- Vérifier si le lead existe
  SELECT id, access_token
  INTO v_existing_id, v_existing_token
  FROM crm_leads
  WHERE email = p_email
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Lead existant : mise à jour
    RAISE LOG '[UPSERT_LEAD] ℹ️  Lead existant trouvé: %', v_existing_id;
    v_lead_id := v_existing_id;
    v_is_new := false;

    -- Générer un nouveau token si vide
    IF v_existing_token IS NULL OR v_existing_token = '' THEN
      v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
      RAISE LOG '[UPSERT_LEAD] 🔑 Nouveau token généré';
    ELSE
      v_token := v_existing_token;
      RAISE LOG '[UPSERT_LEAD] 🔑 Token existant réutilisé';
    END IF;

    -- Mettre à jour
    UPDATE crm_leads SET
      first_name = COALESCE(p_first_name, first_name),
      last_name = COALESCE(NULLIF(p_last_name, ''), last_name),
      phone = COALESCE(NULLIF(p_phone, ''), phone),
      city = COALESCE(NULLIF(p_city, ''), city),
      source = COALESCE(NULLIF(p_source, ''), source),
      metadata = COALESCE(p_metadata, metadata),
      access_token = v_token,
      updated_at = now()
    WHERE id = v_lead_id;

    RAISE LOG '[UPSERT_LEAD] ✅ Lead mis à jour';

  ELSE
    -- Nouveau lead : création
    RAISE LOG '[UPSERT_LEAD] ✨ Création d''un NOUVEAU lead';
    v_is_new := true;
    v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    v_lead_id := gen_random_uuid();

    RAISE LOG '[UPSERT_LEAD] 🔑 Lead ID: %', v_lead_id;
    RAISE LOG '[UPSERT_LEAD] 🔑 Token: %', substring(v_token from 1 for 16) || '...';

    INSERT INTO crm_leads (
      id,
      email,
      first_name,
      last_name,
      phone,
      city,
      source,
      status,
      current_stage_key,
      pipeline_stage,
      metadata,
      access_token,
      created_at,
      updated_at,
      stage_entered_at
    ) VALUES (
      v_lead_id,
      p_email,
      p_first_name,
      COALESCE(p_last_name, ''),
      COALESCE(p_phone, ''),
      COALESCE(p_city, ''),
      COALESCE(p_source, 'website'),
      'NOUVEAU_LEAD'::lead_status,
      'nouveau_lead',
      'nouveau_lead',
      COALESCE(p_metadata, '{}'::jsonb),
      v_token,
      now(),
      now(),
      now()
    );

    RAISE LOG '[UPSERT_LEAD] ✅ Nouveau lead créé dans crm_leads';
  END IF;

  -- Retourner les résultats
  RAISE LOG '[UPSERT_LEAD] 🎉 Fin - Lead ID: %, Is New: %', v_lead_id, v_is_new;
  RETURN QUERY SELECT v_lead_id, v_token, v_is_new;

EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[UPSERT_LEAD] ❌ ERREUR CRITIQUE: % (Code: %)', SQLERRM, SQLSTATE;
  RAISE;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION upsert_lead TO anon;
GRANT EXECUTE ON FUNCTION upsert_lead TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_lead TO service_role;

COMMENT ON FUNCTION upsert_lead IS 'Crée ou met à jour un lead avec logs détaillés pour diagnostic';

-- ============================================
-- 2. RLS PERMISSIONS POUR SERVICE_ROLE
-- ============================================

-- Supprimer les anciennes policies restrictives si elles existent
DROP POLICY IF EXISTS "Allow service_role all operations" ON crm_leads;

-- Créer une policy permissive pour service_role (utilisée par les fonctions SECURITY DEFINER)
CREATE POLICY "Allow service_role all operations"
ON crm_leads
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- S'assurer que RLS est activée
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;

COMMENT ON POLICY "Allow service_role all operations" ON crm_leads IS
'Permet à service_role (fonctions SECURITY DEFINER) de faire toutes les opérations';

-- ============================================
-- 3. VÉRIFIER ET RÉACTIVER LE TRIGGER EMAIL
-- ============================================

DO $$
DECLARE
  trigger_status char(1);
  trigger_exists boolean;
BEGIN
  RAISE NOTICE '🔍 Vérification du trigger trg_send_lead_email_brevo...';

  -- Vérifier si le trigger existe
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'crm_leads'::regclass
    AND tgname = 'trg_send_lead_email_brevo'
  ) INTO trigger_exists;

  IF NOT trigger_exists THEN
    RAISE NOTICE '❌ CRITIQUE: Le trigger trg_send_lead_email_brevo n''existe PAS!';
    RAISE NOTICE '➡️  Vérifier la migration 20260224004916_fix_lead_email_correct_supabase_url_24fev2026.sql';
  ELSE
    -- Récupérer le statut du trigger
    SELECT tgenabled INTO trigger_status
    FROM pg_trigger
    WHERE tgrelid = 'crm_leads'::regclass
    AND tgname = 'trg_send_lead_email_brevo';

    IF trigger_status = 'O' THEN
      RAISE NOTICE '✅ Trigger actif (status: %)', trigger_status;
    ELSE
      RAISE NOTICE 'ℹ️  Trigger désactivé (status: %), réactivation...', trigger_status;
      ALTER TABLE crm_leads ENABLE TRIGGER trg_send_lead_email_brevo;
      RAISE NOTICE '✅ Trigger réactivé';
    END IF;
  END IF;
END $$;

-- ============================================
-- 4. VÉRIFIER LA TABLE EMAIL_QUEUE
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_queue') THEN
    RAISE NOTICE '❌ CRITIQUE: La table email_queue n''existe PAS!';
    RAISE NOTICE '➡️  Vérifier la migration qui crée cette table';
  ELSE
    RAISE NOTICE '✅ Table email_queue existe';
  END IF;
END $$;

-- ============================================
-- 5. TEST AUTOMATIQUE DU SYSTÈME
-- ============================================

DO $$
DECLARE
  test_result record;
  email_count int;
  test_email text := 'test-auto-' || floor(random() * 1000000)::text || '@taxiassur.com';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════╗';
  RAISE NOTICE '║    🧪 TEST AUTOMATIQUE DU SYSTÈME         ║';
  RAISE NOTICE '╚════════════════════════════════════════════╝';
  RAISE NOTICE '';

  -- Test 1: Créer un lead
  RAISE NOTICE '📝 Test 1: Création d''un lead via upsert_lead...';
  BEGIN
    SELECT * INTO test_result FROM upsert_lead(
      test_email,
      'Test',
      'Auto',
      '0600000999',
      'TestVille',
      'test',
      '{"test": true}'::jsonb
    );

    IF test_result.lead_id IS NOT NULL THEN
      RAISE NOTICE '✅ Lead créé avec succès!';
      RAISE NOTICE '   Lead ID: %', test_result.lead_id;
      RAISE NOTICE '   Token: %...', substring(test_result.access_token from 1 for 16);
      RAISE NOTICE '   Is New: %', test_result.is_new;
    ELSE
      RAISE NOTICE '❌ ÉCHEC: upsert_lead n''a pas retourné de lead_id';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERREUR lors de la création du lead: % (Code: %)', SQLERRM, SQLSTATE;
  END;

  -- Test 2: Vérifier le lead dans la table
  RAISE NOTICE '';
  RAISE NOTICE '📝 Test 2: Vérification dans crm_leads...';
  IF EXISTS (SELECT 1 FROM crm_leads WHERE id = test_result.lead_id) THEN
    RAISE NOTICE '✅ Lead trouvé dans crm_leads';
  ELSE
    RAISE NOTICE '❌ Lead NON trouvé dans crm_leads!';
  END IF;

  -- Test 3: Attendre le trigger et vérifier les emails
  RAISE NOTICE '';
  RAISE NOTICE '📝 Test 3: Vérification des emails (attente 3 secondes pour le trigger)...';
  PERFORM pg_sleep(3);

  SELECT COUNT(*) INTO email_count
  FROM email_queue
  WHERE metadata->>'lead_id' = test_result.lead_id::text
  OR to_email = test_email
  OR (metadata->>'lead_id' IS NOT NULL AND created_at > now() - interval '10 seconds');

  IF email_count >= 2 THEN
    RAISE NOTICE '✅ % emails trouvés dans la queue (attendu: 2)', email_count;
  ELSIF email_count = 1 THEN
    RAISE NOTICE '⚠️  Seulement % email trouvé (attendu: 2)', email_count;
  ELSE
    RAISE NOTICE '❌ Aucun email dans la queue!';
    RAISE NOTICE '   Causes possibles:';
    RAISE NOTICE '   1. Le trigger trg_send_lead_email_brevo n''est pas actif';
    RAISE NOTICE '   2. La fonction send_lead_email_via_brevo échoue silencieusement';
    RAISE NOTICE '   3. L''Edge Function send-lead-email-brevo a un problème';
  END IF;

  -- Nettoyage
  RAISE NOTICE '';
  RAISE NOTICE '🧹 Nettoyage du test...';
  DELETE FROM crm_leads WHERE email = test_email;
  DELETE FROM email_queue WHERE to_email = test_email OR metadata->>'lead_id' = test_result.lead_id::text;
  RAISE NOTICE '✅ Test nettoyé';

  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════╗';
  RAISE NOTICE '║    ✅ TEST TERMINÉ                        ║';
  RAISE NOTICE '╚════════════════════════════════════════════╝';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ ERREUR CRITIQUE: % (Code: %)', SQLERRM, SQLSTATE;
END $$;