/*
  # Fonctions IA pour CRM
  
  1. Scoring automatique leads
  2. Suggestions actions commerciales
  3. Apprentissage des patterns de succès
  4. Génération templates optimisés
*/

-- ==============================
-- SCORING AUTOMATIQUE LEADS
-- ==============================

CREATE OR REPLACE FUNCTION calculate_lead_score(
  p_lead_id uuid
)
RETURNS integer AS $$
DECLARE
  v_score integer := 0;
  v_lead record;
  v_interaction_count integer;
  v_last_interaction_days integer;
BEGIN
  SELECT * INTO v_lead FROM crm_leads_enhanced WHERE id = p_lead_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Base score selon source
  CASE v_lead.source
    WHEN 'direct' THEN v_score := v_score + 20;
    WHEN 'organic' THEN v_score := v_score + 15;
    WHEN 'referral' THEN v_score := v_score + 25;
    WHEN 'paid' THEN v_score := v_score + 10;
    ELSE v_score := v_score + 5;
  END CASE;
  
  -- Score selon activité
  IF v_lead.vehicle_count > 5 THEN
    v_score := v_score + 30;
  ELSIF v_lead.vehicle_count > 1 THEN
    v_score := v_score + 15;
  ELSE
    v_score := v_score + 5;
  END IF;
  
  -- Valeur estimée
  IF v_lead.estimated_value_annual > 5000 THEN
    v_score := v_score + 25;
  ELSIF v_lead.estimated_value_annual > 2000 THEN
    v_score := v_score + 15;
  END IF;
  
  -- Engagement (interactions)
  SELECT COUNT(*) INTO v_interaction_count
  FROM crm_interactions
  WHERE lead_id = p_lead_id;
  
  v_score := v_score + LEAST(v_interaction_count * 5, 30);
  
  -- Récence dernière interaction
  SELECT EXTRACT(DAY FROM NOW() - MAX(created_at))::integer INTO v_last_interaction_days
  FROM crm_interactions
  WHERE lead_id = p_lead_id;
  
  IF v_last_interaction_days IS NOT NULL THEN
    IF v_last_interaction_days < 2 THEN
      v_score := v_score + 10;
    ELSIF v_last_interaction_days < 7 THEN
      v_score := v_score + 5;
    ELSIF v_last_interaction_days > 30 THEN
      v_score := v_score - 15;
    END IF;
  END IF;
  
  -- Documents uploadés
  v_score := v_score + (
    SELECT COUNT(*) * 3
    FROM crm_documents
    WHERE lead_id = p_lead_id AND status = 'validated'
  );
  
  -- Cap à 100
  v_score := LEAST(v_score, 100);
  v_score := GREATEST(v_score, 0);
  
  -- Update lead
  UPDATE crm_leads_enhanced
  SET lead_score = v_score
  WHERE id = p_lead_id;
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- ==============================
-- PROBABILITÉ CONVERSION
-- ==============================

CREATE OR REPLACE FUNCTION calculate_conversion_probability(
  p_lead_id uuid
)
RETURNS numeric AS $$
DECLARE
  v_probability numeric := 0.0;
  v_lead record;
  v_similar_converted integer;
  v_similar_total integer;
BEGIN
  SELECT * INTO v_lead FROM crm_leads_enhanced WHERE id = p_lead_id;
  
  IF NOT FOUND THEN
    RETURN 0.0;
  END IF;
  
  -- Analyser leads similaires convertis
  SELECT 
    COUNT(*) FILTER (WHERE converted_at IS NOT NULL) as converted,
    COUNT(*) as total
  INTO v_similar_converted, v_similar_total
  FROM crm_leads_enhanced
  WHERE 
    source = v_lead.source
    AND vehicle_count = v_lead.vehicle_count
    AND created_at > NOW() - INTERVAL '90 days';
  
  IF v_similar_total > 0 THEN
    v_probability := (v_similar_converted::numeric / v_similar_total) * 100;
  ELSE
    v_probability := 30.0; -- Défaut
  END IF;
  
  -- Ajustements selon score
  IF v_lead.lead_score > 80 THEN
    v_probability := v_probability * 1.5;
  ELSIF v_lead.lead_score > 60 THEN
    v_probability := v_probability * 1.2;
  ELSIF v_lead.lead_score < 30 THEN
    v_probability := v_probability * 0.7;
  END IF;
  
  -- Cap à 95%
  v_probability := LEAST(v_probability, 95.0);
  
  -- Update
  UPDATE crm_leads_enhanced
  SET conversion_probability = v_probability
  WHERE id = p_lead_id;
  
  RETURN v_probability;
END;
$$ LANGUAGE plpgsql;

-- ==============================
-- SUGGESTIONS IA AUTOMATIQUES
-- ==============================

CREATE OR REPLACE FUNCTION generate_ai_suggestions(
  p_lead_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_lead record;
  v_last_interaction timestamptz;
  v_interaction_count integer;
  v_suggestions jsonb := '[]'::jsonb;
  v_suggestion jsonb;
BEGIN
  SELECT * INTO v_lead FROM crm_leads_enhanced WHERE id = p_lead_id;
  
  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;
  
  -- Dernière interaction
  SELECT MAX(created_at) INTO v_last_interaction
  FROM crm_interactions
  WHERE lead_id = p_lead_id;
  
  SELECT COUNT(*) INTO v_interaction_count
  FROM crm_interactions
  WHERE lead_id = p_lead_id;
  
  -- SUGGESTION 1 : Premier contact rapide
  IF v_interaction_count = 0 AND v_lead.created_at > NOW() - INTERVAL '10 minutes' THEN
    INSERT INTO crm_ai_suggestions (
      lead_id,
      suggestion_type,
      suggestion_text,
      reasoning,
      priority_score,
      urgency
    ) VALUES (
      p_lead_id,
      'call_now',
      'Appeler IMMÉDIATEMENT ce prospect',
      'Lead frais (moins de 10min). Statistiques : 5x plus de chances de conversion si appel dans les 5min. Ce lead a un score de ' || v_lead.lead_score || '/100.',
      95.0,
      'critical'
    );
  END IF;
  
  -- SUGGESTION 2 : Relance après silence
  IF v_last_interaction IS NOT NULL 
     AND v_last_interaction < NOW() - INTERVAL '3 days'
     AND v_lead.stage NOT IN ('Contrat Signé', 'Perdu') THEN
    
    INSERT INTO crm_ai_suggestions (
      lead_id,
      suggestion_type,
      suggestion_text,
      reasoning,
      priority_score,
      urgency
    ) VALUES (
      p_lead_id,
      'send_email',
      'Relancer ce prospect par email',
      'Pas de contact depuis ' || EXTRACT(DAY FROM NOW() - v_last_interaction) || ' jours. Risque de perte. Template suggéré : Relance amicale avec nouveau bénéfice.',
      75.0,
      'high'
    );
  END IF;
  
  -- SUGGESTION 3 : Documents manquants
  IF v_lead.stage IN ('Qualifié', 'Devis Envoyé') THEN
    IF NOT EXISTS (
      SELECT 1 FROM crm_documents 
      WHERE lead_id = p_lead_id 
      AND document_type = 'carte_grise'
      AND status = 'validated'
    ) THEN
      INSERT INTO crm_ai_suggestions (
        lead_id,
        suggestion_type,
        suggestion_text,
        reasoning,
        priority_score,
        urgency
      ) VALUES (
        p_lead_id,
        'send_document',
        'Demander la carte grise',
        'Document manquant pour finaliser le dossier. Envoyer lien upload sécurisé.',
        70.0,
        'high'
      );
    END IF;
  END IF;
  
  -- SUGGESTION 4 : Devis à envoyer
  IF v_lead.stage = 'Qualifié'
     AND NOT EXISTS (
       SELECT 1 FROM crm_quotes_sent 
       WHERE lead_id = p_lead_id 
       AND sent_at > NOW() - INTERVAL '7 days'
     ) THEN
    
    INSERT INTO crm_ai_suggestions (
      lead_id,
      suggestion_type,
      suggestion_text,
      reasoning,
      priority_score,
      urgency
    ) VALUES (
      p_lead_id,
      'send_email',
      'Envoyer le devis personnalisé',
      'Lead qualifié mais aucun devis envoyé. Probabilité conversion : ' || v_lead.conversion_probability || '%.',
      85.0,
      'high'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'suggestions_created', true,
    'lead_id', p_lead_id
  );
END;
$$ LANGUAGE plpgsql;

-- ==============================
-- APPRENTISSAGE PATTERNS SUCCÈS
-- ==============================

CREATE OR REPLACE FUNCTION learn_from_conversion(
  p_contract_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_contract record;
  v_lead record;
  v_interactions jsonb;
  v_pattern jsonb;
BEGIN
  SELECT * INTO v_contract FROM crm_contracts_signed WHERE id = p_contract_id;
  SELECT * INTO v_lead FROM crm_leads_enhanced WHERE id = v_contract.lead_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Contract or lead not found');
  END IF;
  
  -- Analyser le parcours de conversion
  SELECT jsonb_agg(
    jsonb_build_object(
      'type', type,
      'day_number', EXTRACT(DAY FROM created_at - v_lead.created_at),
      'sentiment', sentiment_score
    ) ORDER BY created_at
  ) INTO v_interactions
  FROM crm_interactions
  WHERE lead_id = v_contract.lead_id;
  
  -- Identifier pattern de succès
  v_pattern := jsonb_build_object(
    'source', v_lead.source,
    'vehicle_count', v_lead.vehicle_count,
    'final_score', v_lead.lead_score,
    'interactions_count', (SELECT COUNT(*) FROM crm_interactions WHERE lead_id = v_contract.lead_id),
    'days_to_convert', EXTRACT(DAY FROM v_contract.signed_at - v_lead.created_at),
    'interactions_timeline', v_interactions,
    'final_premium', v_contract.annual_premium
  );
  
  -- Stocker dans ai_learning_data
  INSERT INTO ai_learning_data (
    learning_type,
    source_id,
    input_data,
    output_data,
    confidence_score,
    tags
  ) VALUES (
    'conversion_pattern',
    v_contract.lead_id::text,
    v_pattern,
    jsonb_build_object(
      'outcome', 'converted',
      'contract_value', v_contract.annual_premium
    ),
    95.0,
    ARRAY['crm', 'conversion', 'success_pattern']
  );
  
  RETURN jsonb_build_object(
    'pattern_learned', true,
    'pattern', v_pattern
  );
END;
$$ LANGUAGE plpgsql;

-- ==============================
-- OPTIMISATION TEMPLATES EMAIL
-- ==============================

CREATE OR REPLACE FUNCTION optimize_email_template(
  p_template_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_template record;
  v_best_performing record;
BEGIN
  SELECT * INTO v_template FROM crm_email_templates WHERE id = p_template_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Template not found');
  END IF;
  
  -- Trouver template similaire le plus performant
  SELECT * INTO v_best_performing
  FROM crm_email_templates
  WHERE category = v_template.category
    AND id != p_template_id
    AND use_count > 10
  ORDER BY performance_score DESC
  LIMIT 1;
  
  IF FOUND THEN
    -- Logger amélioration suggérée
    UPDATE crm_email_templates
    SET ai_improvements = ai_improvements || jsonb_build_array(
      jsonb_build_object(
        'date', NOW(),
        'suggestion', 'Inspirez-vous du template "' || v_best_performing.name || '" qui a ' || v_best_performing.performance_score || '% de performance',
        'best_subject', v_best_performing.subject
      )
    )
    WHERE id = p_template_id;
  END IF;
  
  RETURN jsonb_build_object(
    'optimized', true,
    'best_performing', v_best_performing.name
  );
END;
$$ LANGUAGE plpgsql;

-- ==============================
-- NOTIFICATION AUTOMATIQUE
-- ==============================

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_lead_id uuid DEFAULT NULL,
  p_priority text DEFAULT 'normal'
)
RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO crm_notifications (
    user_id,
    lead_id,
    type,
    title,
    message,
    priority
  ) VALUES (
    p_user_id,
    p_lead_id,
    p_type,
    p_title,
    p_message,
    p_priority
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- ==============================
-- TRIGGERS AUTOMATIQUES
-- ==============================

-- Trigger : Nouveau lead → Notification + Scoring
CREATE OR REPLACE FUNCTION trigger_new_lead()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculer score immédiatement
  PERFORM calculate_lead_score(NEW.id);
  PERFORM calculate_conversion_probability(NEW.id);
  
  -- Générer suggestions IA
  PERFORM generate_ai_suggestions(NEW.id);
  
  -- Notifier commercial assigné (si existant)
  IF NEW.assigned_to IS NOT NULL THEN
    PERFORM create_notification(
      NEW.assigned_to,
      'new_lead',
      '🆕 Nouveau lead assigné',
      'Un nouveau lead (' || COALESCE(NEW.first_name || ' ' || NEW.last_name, NEW.email) || ') vous a été assigné. Score: ' || NEW.lead_score || '/100',
      NEW.id,
      'high'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_lead_created
  AFTER INSERT ON crm_leads_enhanced
  FOR EACH ROW
  EXECUTE FUNCTION trigger_new_lead();

-- Trigger : Document uploadé → Notification + Classification
CREATE OR REPLACE FUNCTION trigger_document_uploaded()
RETURNS TRIGGER AS $$
DECLARE
  v_lead record;
BEGIN
  SELECT * INTO v_lead FROM crm_leads_enhanced WHERE id = NEW.lead_id;
  
  IF FOUND AND v_lead.assigned_to IS NOT NULL THEN
    PERFORM create_notification(
      v_lead.assigned_to,
      'document_uploaded',
      '📄 Document reçu',
      'Le prospect ' || COALESCE(v_lead.first_name || ' ' || v_lead.last_name, v_lead.email) || ' a uploadé : ' || NEW.file_name,
      NEW.lead_id,
      'normal'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_document_uploaded
  AFTER INSERT ON crm_documents
  FOR EACH ROW
  EXECUTE FUNCTION trigger_document_uploaded();

-- Trigger : Interaction → Recalculer score
CREATE OR REPLACE FUNCTION trigger_interaction_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_lead_score(NEW.lead_id);
  PERFORM calculate_conversion_probability(NEW.lead_id);
  
  -- Update last_contact_at
  UPDATE crm_leads_enhanced
  SET last_contact_at = NEW.created_at
  WHERE id = NEW.lead_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_interaction_created
  AFTER INSERT ON crm_interactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_interaction_created();

-- Trigger : Contrat signé → Apprentissage IA
CREATE OR REPLACE FUNCTION trigger_contract_signed()
RETURNS TRIGGER AS $$
BEGIN
  -- Marquer lead comme converti
  UPDATE crm_leads_enhanced
  SET 
    converted_at = NEW.signed_at,
    stage = 'Contrat Signé',
    status = 'converted'
  WHERE id = NEW.lead_id;
  
  -- Apprendre du pattern de succès
  PERFORM learn_from_conversion(NEW.id);
  
  -- Notifier commercial
  IF NEW.signed_by IS NOT NULL THEN
    PERFORM create_notification(
      NEW.signed_by,
      'contract_signed',
      '🎉 Contrat signé !',
      'Félicitations ! Contrat n°' || NEW.contract_number || ' signé. Commission : ' || NEW.commission_amount || '€',
      NEW.lead_id,
      'high'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_contract_signed
  AFTER INSERT ON crm_contracts_signed
  FOR EACH ROW
  EXECUTE FUNCTION trigger_contract_signed();

-- ==============================
-- CRONS AUTOMATIQUES
-- ==============================

-- Recalculer scores toutes les heures
SELECT cron.schedule(
  'recalculate_lead_scores',
  '15 * * * *',
  $$
  SELECT calculate_lead_score(id)
  FROM crm_leads_enhanced
  WHERE status = 'active'
  AND stage NOT IN ('Contrat Signé', 'Perdu');
  $$
);

-- Générer suggestions IA toutes les 2h
SELECT cron.schedule(
  'generate_ai_suggestions_cron',
  '0 */2 * * *',
  $$
  SELECT generate_ai_suggestions(id)
  FROM crm_leads_enhanced
  WHERE status = 'active'
  AND stage NOT IN ('Contrat Signé', 'Perdu');
  $$
);

-- Nettoyer suggestions expirées quotidiennement
SELECT cron.schedule(
  'cleanup_expired_suggestions',
  '0 2 * * *',
  $$
  DELETE FROM crm_ai_suggestions
  WHERE expires_at < NOW()
  AND status = 'pending';
  $$
);