/*
  # Fonctions de classification intelligente des emails

  Fonctions pour :
  - Classifier automatiquement les emails
  - Créer des dossiers lead automatiques  
  - Suggérer des actions
  - Gérer les threads de conversation
*/

-- Fonction de classification intelligente d'un email
CREATE OR REPLACE FUNCTION classify_email(p_email_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email record;
  v_classification_type text := 'other';
  v_confidence decimal := 0.0;
  v_suggested_action text := 'manual_review';
  v_suggested_lead_id uuid := NULL;
  v_reason text := '';
  v_keywords text[] := ARRAY[]::text[];
  v_rule record;
  v_max_confidence decimal := 0.0;
BEGIN
  -- Récupérer l'email
  SELECT * INTO v_email
  FROM email_messages
  WHERE id = p_email_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email not found');
  END IF;

  -- Parcourir les règles de classification par ordre de priorité
  FOR v_rule IN
    SELECT * FROM email_classification_rules
    WHERE is_active = true
    ORDER BY priority DESC, confidence_weight DESC
  LOOP
    CASE v_rule.rule_type
      WHEN 'sender_domain' THEN
        IF v_email.from_email ~* v_rule.pattern THEN
          IF v_rule.confidence_weight > v_max_confidence THEN
            v_classification_type := v_rule.classification_type;
            v_max_confidence := v_rule.confidence_weight;
            v_keywords := array_append(v_keywords, v_rule.name);
          END IF;
        END IF;
      
      WHEN 'subject_pattern' THEN
        IF v_email.subject ~* v_rule.pattern THEN
          IF v_rule.confidence_weight > v_max_confidence THEN
            v_classification_type := v_rule.classification_type;
            v_max_confidence := v_rule.confidence_weight;
            v_keywords := array_append(v_keywords, v_rule.name);
          END IF;
        END IF;
      
      WHEN 'content_pattern' THEN
        IF v_email.body_text ~* v_rule.pattern OR v_email.body_html ~* v_rule.pattern THEN
          IF v_rule.confidence_weight > v_max_confidence THEN
            v_classification_type := v_rule.classification_type;
            v_max_confidence := v_rule.confidence_weight;
            v_keywords := array_append(v_keywords, v_rule.name);
          END IF;
        END IF;
    END CASE;
  END LOOP;

  v_confidence := v_max_confidence;

  -- Déterminer l'action suggérée basée sur la classification
  CASE v_classification_type
    WHEN 'lead' THEN
      v_suggested_action := 'create_lead';
      v_reason := 'Demande de devis ou contact commercial détectée';
    WHEN 'reply' THEN
      -- Chercher si c'est une réponse à un lead existant
      SELECT lead_id INTO v_suggested_lead_id
      FROM email_messages
      WHERE from_email = v_email.to_email
        AND to_email = v_email.from_email
        AND lead_id IS NOT NULL
      ORDER BY received_at DESC
      LIMIT 1;
      
      IF v_suggested_lead_id IS NOT NULL THEN
        v_suggested_action := 'link_to_lead';
        v_reason := 'Réponse d''un lead existant détectée';
      ELSE
        v_suggested_action := 'manual_review';
        v_reason := 'Réponse détectée mais origine inconnue';
      END IF;
    WHEN 'spam', 'notification' THEN
      v_suggested_action := 'archive';
      v_reason := 'Email automatique ou notification';
    WHEN 'partnership' THEN
      v_suggested_action := 'manual_review';
      v_reason := 'Demande de partenariat détectée';
    ELSE
      v_suggested_action := 'manual_review';
      v_reason := 'Classification incertaine';
  END CASE;

  -- Créer la classification
  INSERT INTO email_classifications (
    email_id,
    classification_type,
    confidence_score,
    suggested_action,
    suggested_lead_id,
    reason,
    keywords_matched
  ) VALUES (
    p_email_id,
    v_classification_type,
    v_confidence,
    v_suggested_action,
    v_suggested_lead_id,
    v_reason,
    v_keywords
  )
  ON CONFLICT (email_id) DO UPDATE SET
    classification_type = EXCLUDED.classification_type,
    confidence_score = EXCLUDED.confidence_score,
    suggested_action = EXCLUDED.suggested_action,
    suggested_lead_id = EXCLUDED.suggested_lead_id,
    reason = EXCLUDED.reason,
    keywords_matched = EXCLUDED.keywords_matched;

  -- Assigner automatiquement à un dossier
  PERFORM assign_email_to_folder(p_email_id, v_classification_type, v_suggested_lead_id);

  RETURN jsonb_build_object(
    'success', true,
    'classification_type', v_classification_type,
    'confidence', v_confidence,
    'suggested_action', v_suggested_action,
    'suggested_lead_id', v_suggested_lead_id,
    'reason', v_reason
  );
END;
$$;

-- Fonction pour assigner un email à un dossier
CREATE OR REPLACE FUNCTION assign_email_to_folder(
  p_email_id uuid,
  p_classification_type text,
  p_lead_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folder_id uuid;
  v_folder_name text;
BEGIN
  -- Déterminer le dossier cible selon la classification
  CASE p_classification_type
    WHEN 'notification', 'spam' THEN
      v_folder_name := CASE p_classification_type
        WHEN 'notification' THEN 'Notifications'
        WHEN 'spam' THEN 'Spam'
      END;
    WHEN 'partnership' THEN
      v_folder_name := 'Partenariats';
    WHEN 'lead', 'reply' THEN
      IF p_lead_id IS NOT NULL THEN
        -- Créer ou récupérer le dossier du lead
        SELECT id INTO v_folder_id
        FROM inbox_folders
        WHERE lead_id = p_lead_id AND folder_type = 'lead';
        
        IF NOT FOUND THEN
          -- Créer le dossier lead
          INSERT INTO inbox_folders (name, folder_type, lead_id, parent_folder_id, is_auto)
          SELECT 
            COALESCE(cl.first_name || ' ' || cl.last_name, cl.email),
            'lead',
            p_lead_id,
            (SELECT id FROM inbox_folders WHERE name = 'Leads' AND is_system = true LIMIT 1),
            true
          FROM crm_leads cl
          WHERE cl.id = p_lead_id
          RETURNING id INTO v_folder_id;
        END IF;
      ELSE
        v_folder_name := 'Leads';
      END IF;
    ELSE
      v_folder_name := 'Boîte de réception';
  END CASE;

  -- Si on n'a pas encore de folder_id, le récupérer par nom
  IF v_folder_id IS NULL AND v_folder_name IS NOT NULL THEN
    SELECT id INTO v_folder_id
    FROM inbox_folders
    WHERE name = v_folder_name AND is_system = true
    LIMIT 1;
  END IF;

  -- Assigner l'email au dossier
  IF v_folder_id IS NOT NULL THEN
    INSERT INTO email_folder_assignments (email_id, folder_id)
    VALUES (p_email_id, v_folder_id)
    ON CONFLICT (email_id, folder_id) DO NOTHING;
  END IF;
END;
$$;

-- Fonction pour créer ou mettre à jour un thread de conversation
CREATE OR REPLACE FUNCTION manage_email_thread(p_email_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email record;
  v_thread_id uuid;
  v_clean_subject text;
BEGIN
  -- Récupérer l'email
  SELECT * INTO v_email
  FROM email_messages
  WHERE id = p_email_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Nettoyer le sujet (enlever Re:, Fwd:, etc.)
  v_clean_subject := regexp_replace(v_email.subject, '^(Re:|RE:|Fwd:|FW:)\s*', '', 'gi');

  -- Chercher un thread existant avec le même sujet nettoyé
  SELECT id INTO v_thread_id
  FROM email_threads
  WHERE subject = v_clean_subject
    AND (
      v_email.from_email = ANY(participants)
      OR v_email.to_email = ANY(participants)
    )
    AND is_archived = false
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_thread_id IS NULL THEN
    -- Créer un nouveau thread
    INSERT INTO email_threads (
      subject,
      lead_id,
      first_message_id,
      last_message_id,
      participants
    )
    VALUES (
      v_clean_subject,
      v_email.lead_id,
      p_email_id,
      p_email_id,
      ARRAY[v_email.from_email, v_email.to_email]
    )
    RETURNING id INTO v_thread_id;
  ELSE
    -- Mettre à jour le thread existant
    UPDATE email_threads
    SET
      last_message_id = p_email_id,
      message_count = message_count + 1,
      participants = array_append(participants, v_email.from_email),
      updated_at = now()
    WHERE id = v_thread_id;
  END IF;

  -- Ajouter le message au thread
  INSERT INTO email_thread_messages (thread_id, email_id, position)
  VALUES (v_thread_id, p_email_id, (
    SELECT COALESCE(MAX(position), 0) + 1
    FROM email_thread_messages
    WHERE thread_id = v_thread_id
  ))
  ON CONFLICT DO NOTHING;

  RETURN v_thread_id;
END;
$$;

COMMENT ON FUNCTION classify_email(uuid) IS 'Classifie intelligemment un email et suggère des actions';
COMMENT ON FUNCTION assign_email_to_folder(uuid, text, uuid) IS 'Assigne automatiquement un email à un dossier';
COMMENT ON FUNCTION manage_email_thread(uuid) IS 'Crée ou met à jour un thread de conversation';
