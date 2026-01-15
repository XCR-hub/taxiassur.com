/*
  # OPTIMISATION : Accélérer l'INSERT des leads
  
  ## Problème
  - 3 triggers AFTER INSERT s'exécutent et ralentissent la page
  - trigger_schedule_stage_actions appelle schedule_stage_actions
  - trigger_initialize_lead_quotes appelle initialize_lead_quotes
  
  ## Solution
  - Désactiver ces triggers sur INSERT
  - Les garder uniquement sur UPDATE (quand c'est vraiment nécessaire)
  - Garder uniquement queue_lead_notifications pour les emails
*/

-- Désactiver trigger_schedule_stage_actions (on le garde sur UPDATE seulement)
DROP TRIGGER IF EXISTS trg_schedule_stage_actions ON crm_leads;
CREATE TRIGGER trg_schedule_stage_actions
  AFTER UPDATE OF current_stage_key ON crm_leads
  FOR EACH ROW
  WHEN (OLD.current_stage_key IS DISTINCT FROM NEW.current_stage_key)
  EXECUTE FUNCTION trigger_schedule_stage_actions();

-- on_lead_ready_for_quote : uniquement sur UPDATE (pas sur INSERT)
DROP TRIGGER IF EXISTS on_lead_ready_for_quote ON crm_leads;
CREATE TRIGGER on_lead_ready_for_quote
  AFTER UPDATE OF status ON crm_leads
  FOR EACH ROW
  WHEN (NEW.status = 'READY_FOR_QUOTE' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION trigger_initialize_lead_quotes();

COMMENT ON TRIGGER trg_schedule_stage_actions ON crm_leads IS
  'Optimisé : uniquement sur UPDATE pour ne pas ralentir INSERT';

COMMENT ON TRIGGER on_lead_ready_for_quote ON crm_leads IS
  'Optimisé : uniquement sur UPDATE pour ne pas ralentir INSERT';
