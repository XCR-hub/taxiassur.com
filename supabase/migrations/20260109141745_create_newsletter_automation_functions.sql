/*
  # Fonctions d'automatisation Newsletter

  1. Création automatique de campagnes depuis nouveaux articles
  2. Envoi segmenté aux abonnés
  3. Tracking ouvertures/clics
  4. Désabonnement automatique
*/

-- Fonction : Créer campagne automatique depuis nouveaux articles
CREATE OR REPLACE FUNCTION create_auto_newsletter_campaign()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_articles jsonb;
  v_campaign_id uuid;
  v_article_count int;
BEGIN
  -- Récupérer les articles publiés récemment
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'title', title,
        'excerpt', excerpt,
        'slug', slug,
        'category', category,
        'featured_image', featured_image,
        'created_at', created_at
      )
    ),
    COUNT(*)
  INTO v_new_articles, v_article_count
  FROM blog_posts
  WHERE published = true
    AND created_at > now() - interval '24 hours'
  ORDER BY created_at DESC
  LIMIT 5;
  
  -- Vérifier qu'il y a des articles
  IF v_article_count = 0 OR v_new_articles IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Aucun nouvel article trouvé'
    );
  END IF;
  
  -- Créer la campagne
  INSERT INTO newsletter_campaigns (
    subject,
    preview_text,
    template,
    articles,
    status,
    scheduled_for,
    target_categories
  )
  VALUES (
    'Nouvelles actualités assurance taxi - ' || to_char(now(), 'DD/MM/YYYY'),
    'Découvrez les ' || v_article_count || ' derniers articles du jour',
    'weekly_digest',
    v_new_articles,
    'scheduled',
    now() + interval '1 hour',
    ARRAY['assurance-taxi', 'actualites']
  )
  RETURNING id INTO v_campaign_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'campaign_id', v_campaign_id,
    'article_count', v_article_count
  );
END;
$$;

-- Fonction : Envoyer campagne aux abonnés segmentés
CREATE OR REPLACE FUNCTION send_newsletter_campaign(p_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign newsletter_campaigns;
  v_subscriber record;
  v_recipients_count int := 0;
BEGIN
  -- Récupérer la campagne
  SELECT * INTO v_campaign
  FROM newsletter_campaigns
  WHERE id = p_campaign_id
    AND status = 'scheduled';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Campagne non trouvée ou déjà envoyée'
    );
  END IF;
  
  -- Mettre à jour le statut
  UPDATE newsletter_campaigns
  SET status = 'sending'
  WHERE id = p_campaign_id;
  
  -- Créer les envois pour chaque abonné éligible
  FOR v_subscriber IN
    SELECT id, email, first_name, categories, engagement_score
    FROM newsletter_subscribers
    WHERE status = 'active'
      AND (v_campaign.target_categories IS NULL 
           OR categories && v_campaign.target_categories)
      AND engagement_score >= COALESCE(v_campaign.min_engagement_score, 0)
  LOOP
    INSERT INTO newsletter_sends (
      campaign_id,
      subscriber_id,
      status
    )
    VALUES (
      p_campaign_id,
      v_subscriber.id,
      'pending'
    )
    ON CONFLICT (campaign_id, subscriber_id) DO NOTHING;
    
    v_recipients_count := v_recipients_count + 1;
  END LOOP;
  
  -- Mettre à jour les stats de la campagne
  UPDATE newsletter_campaigns
  SET 
    recipients_count = v_recipients_count,
    status = 'sent',
    sent_at = now()
  WHERE id = p_campaign_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'campaign_id', p_campaign_id,
    'recipients_count', v_recipients_count
  );
END;
$$;

-- Fonction : Marquer comme ouvert
CREATE OR REPLACE FUNCTION mark_newsletter_opened(
  p_send_id uuid,
  p_device text DEFAULT 'desktop'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_send newsletter_sends;
  v_campaign_id uuid;
BEGIN
  -- Récupérer l'envoi
  SELECT * INTO v_send
  FROM newsletter_sends
  WHERE id = p_send_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Envoi non trouvé');
  END IF;
  
  v_campaign_id := v_send.campaign_id;
  
  -- Mettre à jour l'envoi (première ouverture seulement)
  IF v_send.opened_at IS NULL THEN
    UPDATE newsletter_sends
    SET opened_at = now()
    WHERE id = p_send_id;
    
    -- Mettre à jour le subscriber
    UPDATE newsletter_subscribers
    SET 
      total_opens = total_opens + 1,
      last_opened_at = now(),
      engagement_score = LEAST(100, COALESCE(engagement_score, 50) + 2)
    WHERE id = v_send.subscriber_id;
    
    -- Mettre à jour la campagne
    UPDATE newsletter_campaigns
    SET open_count = open_count + 1
    WHERE id = v_campaign_id;
    
    -- Analytics
    INSERT INTO newsletter_analytics (campaign_id, hour, opens, mobile_opens, desktop_opens)
    VALUES (
      v_campaign_id,
      date_trunc('hour', now()),
      1,
      CASE WHEN p_device = 'mobile' THEN 1 ELSE 0 END,
      CASE WHEN p_device = 'desktop' THEN 1 ELSE 0 END
    )
    ON CONFLICT (campaign_id, hour) DO UPDATE SET
      opens = newsletter_analytics.opens + 1,
      mobile_opens = newsletter_analytics.mobile_opens + 
        CASE WHEN p_device = 'mobile' THEN 1 ELSE 0 END,
      desktop_opens = newsletter_analytics.desktop_opens + 
        CASE WHEN p_device = 'desktop' THEN 1 ELSE 0 END;
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Fonction : Marquer comme cliqué
CREATE OR REPLACE FUNCTION mark_newsletter_clicked(
  p_send_id uuid,
  p_link text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_send newsletter_sends;
  v_campaign_id uuid;
BEGIN
  SELECT * INTO v_send
  FROM newsletter_sends
  WHERE id = p_send_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Envoi non trouvé');
  END IF;
  
  v_campaign_id := v_send.campaign_id;
  
  -- Mettre à jour l'envoi (premier clic seulement)
  IF v_send.clicked_at IS NULL THEN
    UPDATE newsletter_sends
    SET clicked_at = now()
    WHERE id = p_send_id;
    
    -- Mettre à jour le subscriber
    UPDATE newsletter_subscribers
    SET 
      total_clicks = total_clicks + 1,
      engagement_score = LEAST(100, COALESCE(engagement_score, 50) + 5)
    WHERE id = v_send.subscriber_id;
    
    -- Mettre à jour la campagne
    UPDATE newsletter_campaigns
    SET click_count = click_count + 1
    WHERE id = v_campaign_id;
    
    -- Analytics
    INSERT INTO newsletter_analytics (campaign_id, hour, clicks)
    VALUES (v_campaign_id, date_trunc('hour', now()), 1)
    ON CONFLICT (campaign_id, hour) DO UPDATE SET
      clicks = newsletter_analytics.clicks + 1;
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Fonction : Désabonnement
CREATE OR REPLACE FUNCTION unsubscribe_newsletter(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscriber newsletter_subscribers;
BEGIN
  -- Trouver l'abonné
  SELECT * INTO v_subscriber
  FROM newsletter_subscribers
  WHERE unsubscribe_token = p_token
    AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Token invalide ou déjà désabonné'
    );
  END IF;
  
  -- Désabonner
  UPDATE newsletter_subscribers
  SET 
    status = 'unsubscribed',
    unsubscribed_at = now(),
    engagement_score = 0
  WHERE id = v_subscriber.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Vous êtes bien désabonné'
  );
END;
$$;
