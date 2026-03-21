
/*
  # Nettoyage des leads - Suppression spam, système et tests
  
  ## Objectif
  Supprimer tous les leads qui ne sont pas de véritables prospects taxi :
  
  1. Emails système/automatiques (zapiermail, hunter.io, mailer-daemon, twilio, instagram)
  2. Emails no-reply / notifications (monetico, CIC, Bulletin marchés publics)
  3. Emails de compagnies d'assurance (MFA, Monceau Assurances)
  4. Entrées de test (team@taxiassur.com, master@taxiassur.com, example.com)
  5. Lumeus - société non-taxi
*/

DO $$
DECLARE
  spam_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO spam_ids
  FROM crm_leads
  WHERE 
    email ILIKE '%zapiermail%'
    OR email ILIKE '%hunter.io%'
    OR email ILIKE '%mailer-daemon%'
    OR email ILIKE '%twilio%' OR email ILIKE '%qualtrics-survey%'
    OR email ILIKE '%instagram.com%'
    OR email = 'ne-pas-repondre-svp@monetico.com'
    OR email = 'centrecom@e-i.com'
    OR email ILIKE '%bulletin-des-marches-publics%'
    OR email ILIKE '%mfa.fr%'
    OR email ILIKE '%monceauassurances%'
    OR email = 'lumeus@lumeusinfo.fr'
    OR email = 'team@taxiassur.com'
    OR email = 'master@taxiassur.com'
    OR email = 'votreemail@example.com'
    OR email = 'test.notif@example.com';

  IF spam_ids IS NULL OR array_length(spam_ids, 1) = 0 THEN
    RAISE NOTICE 'Aucun lead spam trouvé';
    RETURN;
  END IF;

  RAISE NOTICE 'Suppression de % leads spam/système/tests', array_length(spam_ids, 1);

  DELETE FROM crm_interactions WHERE lead_id = ANY(spam_ids);
  DELETE FROM crm_lead_documents WHERE lead_id = ANY(spam_ids);
  DELETE FROM prospect_documents WHERE lead_id = ANY(spam_ids);
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_company_quotes') THEN
    DELETE FROM lead_company_quotes WHERE lead_id = ANY(spam_ids);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_timeline') THEN
    DELETE FROM crm_timeline WHERE lead_id = ANY(spam_ids);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_event_notifications') THEN
    DELETE FROM crm_event_notifications WHERE lead_id = ANY(spam_ids);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ready_for_quote_queue') THEN
    DELETE FROM ready_for_quote_queue WHERE lead_id = ANY(spam_ids);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_messages') THEN
    DELETE FROM email_messages WHERE lead_id = ANY(spam_ids);
  END IF;

  DELETE FROM crm_leads WHERE id = ANY(spam_ids);
  
  RAISE NOTICE 'Nettoyage terminé';
END $$;
