/*
  # Fonctions de calcul d'engagement

  1. Fonctions
    - calculate_engagement_score_v2 : Calcul du score d'engagement
    - update_engagement_score_on_interaction_v2 : Mise à jour automatique

  2. Triggers
    - Sur email_opens, email_clicks, email_replies
*/

-- Fonction pour calculer le score d'engagement
CREATE OR REPLACE FUNCTION calculate_engagement_score_v2(lead_uuid uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  score int := 0;
  open_rate decimal;
  click_rate decimal;
  reply_rate decimal;
BEGIN
  -- Récupérer les taux
  SELECT 
    les.open_rate,
    les.click_rate,
    les.reply_rate
  INTO open_rate, click_rate, reply_rate
  FROM lead_engagement_scores les
  WHERE les.lead_id = lead_uuid;

  -- Calculer le score (sur 100)
  score := (
    (COALESCE(open_rate, 0) * 0.3) +
    (COALESCE(click_rate, 0) * 0.4) +
    (COALESCE(reply_rate, 0) * 0.3)
  )::int;

  RETURN GREATEST(0, LEAST(100, score));
END;
$$;

-- Fonction pour mettre à jour automatiquement les scores
CREATE OR REPLACE FUNCTION update_engagement_score_on_interaction_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_uuid uuid;
  total_sent int;
  total_opened int;
  total_clicked int;
  total_replied int;
BEGIN
  -- Récupérer le lead_id depuis email_sends
  IF TG_TABLE_NAME = 'email_opens' THEN
    SELECT es.lead_id INTO lead_uuid
    FROM email_sends es
    WHERE es.id = NEW.email_send_id;
  ELSIF TG_TABLE_NAME = 'email_clicks' THEN
    SELECT es.lead_id INTO lead_uuid
    FROM email_sends es
    WHERE es.id = NEW.email_send_id;
  ELSIF TG_TABLE_NAME = 'email_replies' THEN
    SELECT es.lead_id INTO lead_uuid
    FROM email_sends es
    WHERE es.id = NEW.email_send_id;
  END IF;

  -- Si pas de lead_id, sortir
  IF lead_uuid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Compter les interactions
  SELECT
    COUNT(DISTINCT es.id),
    COUNT(DISTINCT eo.id),
    COUNT(DISTINCT ec.id),
    COUNT(DISTINCT er.id)
  INTO total_sent, total_opened, total_clicked, total_replied
  FROM email_sends es
  LEFT JOIN email_opens eo ON eo.email_send_id = es.id
  LEFT JOIN email_clicks ec ON ec.email_send_id = es.id
  LEFT JOIN email_replies er ON er.email_send_id = es.id
  WHERE es.lead_id = lead_uuid;

  -- Upsert du score
  INSERT INTO lead_engagement_scores (
    lead_id,
    total_emails_sent,
    total_emails_opened,
    total_emails_clicked,
    total_emails_replied,
    open_rate,
    click_rate,
    reply_rate,
    engagement_score,
    last_interaction_at
  ) VALUES (
    lead_uuid,
    total_sent,
    total_opened,
    total_clicked,
    total_replied,
    CASE WHEN total_sent > 0 THEN (total_opened::decimal / total_sent * 100) ELSE 0 END,
    CASE WHEN total_sent > 0 THEN (total_clicked::decimal / total_sent * 100) ELSE 0 END,
    CASE WHEN total_sent > 0 THEN (total_replied::decimal / total_sent * 100) ELSE 0 END,
    0,
    now()
  )
  ON CONFLICT (lead_id) DO UPDATE SET
    total_emails_sent = EXCLUDED.total_emails_sent,
    total_emails_opened = EXCLUDED.total_emails_opened,
    total_emails_clicked = EXCLUDED.total_emails_clicked,
    total_emails_replied = EXCLUDED.total_emails_replied,
    open_rate = EXCLUDED.open_rate,
    click_rate = EXCLUDED.click_rate,
    reply_rate = EXCLUDED.reply_rate,
    engagement_score = calculate_engagement_score_v2(lead_uuid),
    last_interaction_at = now(),
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Triggers pour mise à jour automatique des scores
DROP TRIGGER IF EXISTS update_engagement_on_open_v2 ON email_opens;
CREATE TRIGGER update_engagement_on_open_v2
  AFTER INSERT ON email_opens
  FOR EACH ROW
  EXECUTE FUNCTION update_engagement_score_on_interaction_v2();

DROP TRIGGER IF EXISTS update_engagement_on_click_v2 ON email_clicks;
CREATE TRIGGER update_engagement_on_click_v2
  AFTER INSERT ON email_clicks
  FOR EACH ROW
  EXECUTE FUNCTION update_engagement_score_on_interaction_v2();

DROP TRIGGER IF EXISTS update_engagement_on_reply_v2 ON email_replies;
CREATE TRIGGER update_engagement_on_reply_v2
  AFTER INSERT ON email_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_engagement_score_on_interaction_v2();
