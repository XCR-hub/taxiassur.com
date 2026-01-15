/*
  # Supprimer tous les triggers qui ralentissent
  
  1. Suppression
    - DROP tous les triggers sur crm_leads liés aux notifications
    - DROP toutes les fonctions trigger
  
  2. Le CRON process-lead-queue traite déjà la queue toutes les 30s
*/

-- Supprimer TOUS les triggers sur crm_leads
DROP TRIGGER IF EXISTS on_lead_created_queue_notifications ON crm_leads;
DROP TRIGGER IF EXISTS trg_queue_notifications ON crm_leads;
DROP TRIGGER IF EXISTS trg_lead_insert_queue ON crm_leads;

-- Supprimer les fonctions trigger avec CASCADE
DROP FUNCTION IF EXISTS queue_lead_notifications() CASCADE;
DROP FUNCTION IF EXISTS trg_queue_lead_notifications() CASCADE;

-- Le CRON process-lead-queue traite déjà la queue toutes les 30 secondes
-- Plus besoin de trigger synchrone qui ralentit !
