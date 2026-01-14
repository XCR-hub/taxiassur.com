/*
  # Fonctions automatiques de gestion du workflow de devis

  1. Nouvelles Fonctions
    - initialize_lead_quotes() - Initialise les 5 devis obligatoires pour un lead
    - check_all_quotes_processed() - Vérifie si les 5 compagnies ont été traitées
    - get_lead_quotes_summary() - Résumé des devis d'un lead
    - notify_client_new_quote() - Notifie le client qu'un devis est disponible
    
  2. Triggers
    - Trigger pour initialiser les devis quand lead passe à READY_FOR_QUOTE
*/

-- 1. Fonction pour initialiser les 5 devis obligatoires
CREATE OR REPLACE FUNCTION initialize_lead_quotes(lead_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_rec RECORD;
BEGIN
  -- Pour chaque compagnie obligatoire
  FOR company_rec IN 
    SELECT id, code, name 
    FROM insurance_companies 
    WHERE is_mandatory = true 
    ORDER BY priority_order
  LOOP
    -- Insérer un devis en statut pending si n'existe pas déjà
    INSERT INTO lead_quotes (lead_id, company_id, status)
    VALUES (lead_id_param, company_rec.id, 'pending')
    ON CONFLICT (lead_id, company_id) DO NOTHING;
  END LOOP;
END;
$$;

-- 2. Fonction pour vérifier si tous les devis sont traités
CREATE OR REPLACE FUNCTION check_all_quotes_processed(lead_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_mandatory INTEGER;
  total_processed INTEGER;
BEGIN
  -- Compter les compagnies obligatoires
  SELECT COUNT(*) INTO total_mandatory
  FROM insurance_companies
  WHERE is_mandatory = true;
  
  -- Compter les devis traités (uploadés ou refusés par la compagnie)
  SELECT COUNT(*) INTO total_processed
  FROM lead_quotes lq
  JOIN insurance_companies ic ON ic.id = lq.company_id
  WHERE lq.lead_id = lead_id_param
    AND ic.is_mandatory = true
    AND (lq.status IN ('quote_uploaded', 'refused_by_company'));
  
  RETURN total_processed >= total_mandatory;
END;
$$;

-- 3. Fonction pour obtenir un résumé des devis
CREATE OR REPLACE FUNCTION get_lead_quotes_summary(lead_id_param UUID)
RETURNS TABLE (
  total_companies INTEGER,
  quotes_pending INTEGER,
  quotes_uploaded INTEGER,
  quotes_refused_by_company INTEGER,
  quotes_accepted_by_client INTEGER,
  quotes_refused_by_client INTEGER,
  all_processed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_companies,
    COUNT(*) FILTER (WHERE lq.status = 'pending')::INTEGER as quotes_pending,
    COUNT(*) FILTER (WHERE lq.status = 'quote_uploaded')::INTEGER as quotes_uploaded,
    COUNT(*) FILTER (WHERE lq.status = 'refused_by_company')::INTEGER as quotes_refused_by_company,
    COUNT(*) FILTER (WHERE lq.status = 'accepted_by_client')::INTEGER as quotes_accepted_by_client,
    COUNT(*) FILTER (WHERE lq.status = 'refused_by_client')::INTEGER as quotes_refused_by_client,
    check_all_quotes_processed(lead_id_param) as all_processed
  FROM lead_quotes lq
  JOIN insurance_companies ic ON ic.id = lq.company_id
  WHERE lq.lead_id = lead_id_param
    AND ic.is_mandatory = true;
END;
$$;

-- 4. Trigger pour initialiser les devis quand le lead est prêt
CREATE OR REPLACE FUNCTION trigger_initialize_lead_quotes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si le lead passe à READY_FOR_QUOTE, initialiser les 5 devis
  IF NEW.status = 'READY_FOR_QUOTE' AND (OLD.status IS NULL OR OLD.status != 'READY_FOR_QUOTE') THEN
    PERFORM initialize_lead_quotes(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS on_lead_ready_for_quote ON crm_leads;
CREATE TRIGGER on_lead_ready_for_quote
  AFTER INSERT OR UPDATE OF status ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_initialize_lead_quotes();

-- 5. Fonction pour notifier le client d'un nouveau devis
CREATE OR REPLACE FUNCTION notify_client_new_quote(lead_id_param UUID, company_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_rec RECORD;
  company_rec RECORD;
BEGIN
  SELECT first_name, last_name, email, phone INTO lead_rec
  FROM crm_leads
  WHERE id = lead_id_param;
  
  SELECT name INTO company_rec
  FROM insurance_companies
  WHERE id = company_id_param;
  
  IF FOUND THEN
    -- Créer une notification
    INSERT INTO crm_event_notifications (
      lead_id,
      event_type,
      message,
      priority,
      context_data
    ) VALUES (
      lead_id_param,
      'new_quote_available',
      format('Nouveau devis disponible de %s', company_rec.name),
      10,
      jsonb_build_object(
        'company_id', company_id_param,
        'company_name', company_rec.name
      )
    );
  END IF;
END;
$$;

-- 6. Trigger pour notifier quand un devis est uploadé
CREATE OR REPLACE FUNCTION trigger_notify_new_quote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si un devis passe de pending à quote_uploaded
  IF NEW.status = 'quote_uploaded' AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
    PERFORM notify_client_new_quote(NEW.lead_id, NEW.company_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS on_quote_uploaded ON lead_quotes;
CREATE TRIGGER on_quote_uploaded
  AFTER UPDATE OF status ON lead_quotes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notify_new_quote();