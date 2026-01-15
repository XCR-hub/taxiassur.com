/*
  # SUPPRESSION DE TOUS LES TRIGGERS - FRONTEND GÈRE TOUT
  
  ## Problème
  - Multiples triggers qui se marchent dessus
  - Système trop complexe
  
  ## Solution SIMPLE
  - Le frontend appelle directement send-lead-email-brevo après création du lead
  - Pas de trigger database
  - Simple, fiable, contrôlable
  
  ## Emails envoyés
  1. team@taxiassur.com - notification nouveau lead
  2. Prospect - email de bienvenue avec lien documents
*/

-- Supprimer TOUS les triggers sur crm_leads liés aux notifications
DROP TRIGGER IF EXISTS trigger_notify_new_lead ON crm_leads;
DROP TRIGGER IF EXISTS trg_crm_leads_after_insert ON crm_leads;
DROP TRIGGER IF EXISTS trg_send_lead_notification ON crm_leads;
DROP TRIGGER IF EXISTS trg_lead_notification_webhook ON crm_leads;
DROP TRIGGER IF EXISTS trg_send_lead_email_brevo ON crm_leads;

-- Supprimer les fonctions obsolètes
DROP FUNCTION IF EXISTS notify_new_lead();
DROP FUNCTION IF EXISTS send_lead_email_via_brevo();
DROP FUNCTION IF EXISTS trigger_lead_notification();

COMMENT ON TABLE crm_leads IS 
'Table CRM principale - Les notifications emails sont gérées par le frontend qui appelle directement l''edge function send-lead-email-brevo';
