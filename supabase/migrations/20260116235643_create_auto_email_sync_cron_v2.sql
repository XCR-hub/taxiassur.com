/*
  # Création du système de synchronisation automatique complète des emails
  
  1. Objectif
    - Synchroniser automatiquement les emails IMAP toutes les 5 minutes
    - Lier automatiquement les emails aux leads existants
    - Créer les interactions et extraire les documents automatiquement
    - Système complètement autonome, sans intervention manuelle
  
  2. Fonctionnement
    - Cron job toutes les 5 minutes
    - Appelle sync-all-emails-complete (récupère les emails IMAP)
    - Appelle link_unassigned_emails_to_leads (lie les emails aux leads)
    - Les triggers existants créent automatiquement interactions et documents
  
  3. Avantages
    - Synchronisation continue et automatique
    - Pas d'intervention manuelle nécessaire
    - Les commerciaux voient les emails en temps réel
    - Tout l'historique est préservé
*/

-- Fonction de synchronisation automatique complète
CREATE OR REPLACE FUNCTION auto_sync_emails_complete()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sync_response record;
  link_result jsonb;
  final_result jsonb;
BEGIN
  -- 1. Synchroniser les nouveaux emails depuis IMAP
  SELECT status, content::jsonb as data INTO sync_response
  FROM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-all-emails-complete',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );

  -- 2. Lier les emails non assignés aux leads existants
  SELECT link_unassigned_emails_to_leads() INTO link_result;

  -- Construire le résultat final
  final_result := jsonb_build_object(
    'success', true,
    'timestamp', NOW(),
    'sync_status', sync_response.data,
    'link_status', link_result,
    'message', format('Sync: %s emails | Liés: %s', 
      COALESCE((sync_response.data->'stats'->>'emails_inserted')::text, '0'),
      COALESCE((link_result->>'emails_linked')::text, '0')
    )
  );

  RAISE NOTICE '✅ Auto-sync completed: %', final_result->>'message';
  
  RETURN final_result;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '❌ Erreur lors de la synchronisation automatique: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'timestamp', NOW()
  );
END;
$$;

-- Supprimer les anciens crons s'ils existent
SELECT cron.unschedule('sync-emails-and-assign-leads') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-emails-and-assign-leads'
);

SELECT cron.unschedule('auto-sync-emails-complete') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-sync-emails-complete'
);

-- Créer le nouveau cron job de synchronisation automatique
SELECT cron.schedule(
  'auto-sync-emails-complete',
  '*/5 * * * *', -- Toutes les 5 minutes
  $$
  SELECT auto_sync_emails_complete();
  $$
);

-- Fonction pour obtenir le statut de la synchronisation automatique
CREATE OR REPLACE FUNCTION get_auto_sync_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job_info record;
  unlinked_count bigint;
  total_emails bigint;
BEGIN
  -- Récupérer les informations du cron job
  SELECT 
    active,
    schedule
  INTO job_info
  FROM cron.job
  WHERE jobname = 'auto-sync-emails-complete';

  -- Compter les emails non liés
  SELECT COUNT(*) INTO unlinked_count
  FROM email_messages
  WHERE lead_id IS NULL AND direction = 'inbound';

  -- Compter le total d'emails
  SELECT COUNT(*) INTO total_emails
  FROM email_messages;

  RETURN jsonb_build_object(
    'active', COALESCE(job_info.active, false),
    'schedule', '*/5 * * * *',
    'interval_minutes', 5,
    'description', 'Synchronisation automatique des emails toutes les 5 minutes',
    'unlinked_emails', unlinked_count,
    'total_emails', total_emails,
    'last_check', NOW()
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION auto_sync_emails_complete() TO service_role;
GRANT EXECUTE ON FUNCTION get_auto_sync_status() TO authenticated;
GRANT EXECUTE ON FUNCTION get_auto_sync_status() TO anon;

-- Commentaires
COMMENT ON FUNCTION auto_sync_emails_complete() IS 
'Synchronise automatiquement les emails IMAP, les lie aux leads et crée les interactions. Appelée par cron toutes les 5 minutes.';

COMMENT ON FUNCTION get_auto_sync_status() IS 
'Retourne le statut de la synchronisation automatique et le nombre d''emails non liés.';

-- Log de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Synchronisation automatique activée !';
  RAISE NOTICE 'Fréquence: Toutes les 5 minutes';
  RAISE NOTICE 'Actions automatiques:';
  RAISE NOTICE '  1. Récupération des nouveaux emails IMAP';
  RAISE NOTICE '  2. Liaison automatique aux leads existants';
  RAISE NOTICE '  3. Création automatique des interactions';
  RAISE NOTICE '  4. Extraction automatique des documents';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Le système est maintenant complètement autonome !';
END $$;
