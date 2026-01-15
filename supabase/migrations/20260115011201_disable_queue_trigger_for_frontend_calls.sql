/*
  # Désactiver le trigger de queue
  
  Le frontend appellera directement l'edge function pour un envoi instantané
*/

-- Désactiver le trigger
DROP TRIGGER IF EXISTS trg_after_insert_queue_emails ON crm_leads;
DROP FUNCTION IF EXISTS trg_queue_lead_emails();
