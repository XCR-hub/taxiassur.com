/*
  # Fix fonction newsletter pour utiliser schéma existant
  
  Adaptation de create_auto_newsletter_campaign pour utiliser
  la structure existante de newsletter_campaigns :
  - name, subject, content_html (pas preview_text, template, articles)
*/

CREATE OR REPLACE FUNCTION create_auto_newsletter_campaign()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_articles jsonb;
  v_campaign_id uuid;
  v_article_count int;
  v_html_content text;
BEGIN
  -- Compter les articles récents
  SELECT COUNT(*)
  INTO v_article_count
  FROM blog_posts
  WHERE published = true
    AND created_at > now() - interval '24 hours';
  
  -- Vérifier qu'il y a des articles
  IF v_article_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Aucun nouvel article trouvé'
    );
  END IF;
  
  -- Récupérer les articles pour générer le HTML
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'title', title,
      'excerpt', excerpt,
      'slug', slug,
      'category', category,
      'featured_image', featured_image
    )
  )
  INTO v_new_articles
  FROM (
    SELECT *
    FROM blog_posts
    WHERE published = true
      AND created_at > now() - interval '24 hours'
    ORDER BY created_at DESC
    LIMIT 5
  ) articles;
  
  -- Générer HTML simple (sera remplacé par template complet dans edge function)
  v_html_content := '<h1>Newsletter TaxiAssur</h1><p>' || v_article_count || ' nouveaux articles disponibles</p>';
  
  -- Créer la campagne avec le schéma existant
  INSERT INTO newsletter_campaigns (
    name,
    subject,
    content_html,
    status,
    scheduled_at
  )
  VALUES (
    'Newsletter Auto - ' || to_char(now(), 'DD/MM/YYYY HH24:MI'),
    'Nouvelles actualités assurance taxi',
    v_html_content,
    'scheduled',
    now() + interval '1 hour'
  )
  RETURNING id INTO v_campaign_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'campaign_id', v_campaign_id,
    'article_count', v_article_count
  );
END;
$$;

-- Fonction adaptée pour envoyer campagne
CREATE OR REPLACE FUNCTION send_newsletter_campaign(p_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign record;
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
    SELECT id, email, first_name, engagement_score
    FROM newsletter_subscribers
    WHERE status = 'active'
      AND engagement_score >= 0
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
    total_subscribers = v_recipients_count,
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
