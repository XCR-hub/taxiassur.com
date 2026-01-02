/*
  # Sécurisation des Fonctions - Search Path - Batch 2

  ## Fonctions Sécurisées (Batch 2/3)
  11. update_sms_campaign_updated_at
  12. cleanup_old_audit_logs
  13. calculate_ai_metrics
  14. cleanup_old_webhook_logs
  15. create_ai_suggestion_for_lead
  16. trigger_recalculate_score
  17. cleanup_old_rate_limits
  18. update_sms_logs_updated_at
  19. upsert_wa_contact_conversation
  20. update_wa_conv_on_msg
*/

-- 11. update_sms_campaign_updated_at
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_sms_campaign_updated_at') THEN
    EXECUTE (
      SELECT 'ALTER FUNCTION ' || p.oid::regprocedure::text || ' SET search_path = public, pg_temp'
      FROM pg_proc p WHERE p.proname = 'update_sms_campaign_updated_at' LIMIT 1
    );
    RAISE NOTICE '✅ update_sms_campaign_updated_at sécurisé';
  END IF;
END $$;

-- 12. cleanup_old_audit_logs
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_old_audit_logs') THEN
    EXECUTE (
      SELECT 'ALTER FUNCTION ' || p.oid::regprocedure::text || ' SET search_path = public, pg_temp'
      FROM pg_proc p WHERE p.proname = 'cleanup_old_audit_logs' LIMIT 1
    );
    RAISE NOTICE '✅ cleanup_old_audit_logs sécurisé';
  END IF;
END $$;

-- 13. calculate_ai_metrics
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_ai_metrics') THEN
    EXECUTE (
      SELECT 'ALTER FUNCTION ' || p.oid::regprocedure::text || ' SET search_path = public, pg_temp'
      FROM pg_proc p WHERE p.proname = 'calculate_ai_metrics' LIMIT 1
    );
    RAISE NOTICE '✅ calculate_ai_metrics sécurisé';
  END IF;
END $$;

-- 14. cleanup_old_webhook_logs
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_old_webhook_logs') THEN
    EXECUTE (
      SELECT 'ALTER FUNCTION ' || p.oid::regprocedure::text || ' SET search_path = public, pg_temp'
      FROM pg_proc p WHERE p.proname = 'cleanup_old_webhook_logs' LIMIT 1
    );
    RAISE NOTICE '✅ cleanup_old_webhook_logs sécurisé';
  END IF;
END $$;

-- 15. create_ai_suggestion_for_lead
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_ai_suggestion_for_lead') THEN
    EXECUTE (
      SELECT 'ALTER FUNCTION ' || p.oid::regprocedure::text || ' SET search_path = public, pg_temp'
      FROM pg_proc p WHERE p.proname = 'create_ai_suggestion_for_lead' LIMIT 1
    );
    RAISE NOTICE '✅ create_ai_suggestion_for_lead sécurisé';
  END IF;
END $$;

-- 16. trigger_recalculate_score
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trigger_recalculate_score') THEN
    EXECUTE (
      SELECT 'ALTER FUNCTION ' || p.oid::regprocedure::text || ' SET search_path = public, pg_temp'
      FROM pg_proc p WHERE p.proname = 'trigger_recalculate_score' LIMIT 1
    );
    RAISE NOTICE '✅ trigger_recalculate_score sécurisé';
  END IF;
END $$;

-- 17. cleanup_old_rate_limits
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_old_rate_limits') THEN
    EXECUTE (
      SELECT 'ALTER FUNCTION ' || p.oid::regprocedure::text || ' SET search_path = public, pg_temp'
      FROM pg_proc p WHERE p.proname = 'cleanup_old_rate_limits' LIMIT 1
    );
    RAISE NOTICE '✅ cleanup_old_rate_limits sécurisé';
  END IF;
END $$;

-- 18. update_sms_logs_updated_at
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_sms_logs_updated_at') THEN
    EXECUTE (
      SELECT 'ALTER FUNCTION ' || p.oid::regprocedure::text || ' SET search_path = public, pg_temp'
      FROM pg_proc p WHERE p.proname = 'update_sms_logs_updated_at' LIMIT 1
    );
    RAISE NOTICE '✅ update_sms_logs_updated_at sécurisé';
  END IF;
END $$;

-- 19. upsert_wa_contact_conversation
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'upsert_wa_contact_conversation') THEN
    EXECUTE (
      SELECT 'ALTER FUNCTION ' || p.oid::regprocedure::text || ' SET search_path = public, pg_temp'
      FROM pg_proc p WHERE p.proname = 'upsert_wa_contact_conversation' LIMIT 1
    );
    RAISE NOTICE '✅ upsert_wa_contact_conversation sécurisé';
  END IF;
END $$;

-- 20. update_wa_conv_on_msg
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_wa_conv_on_msg') THEN
    EXECUTE (
      SELECT 'ALTER FUNCTION ' || p.oid::regprocedure::text || ' SET search_path = public, pg_temp'
      FROM pg_proc p WHERE p.proname = 'update_wa_conv_on_msg' LIMIT 1
    );
    RAISE NOTICE '✅ update_wa_conv_on_msg sécurisé';
  END IF;
END $$;

-- Rapport
DO $$ BEGIN
  RAISE NOTICE '✅ Batch 2: 10 fonctions sécurisées';
END $$;
