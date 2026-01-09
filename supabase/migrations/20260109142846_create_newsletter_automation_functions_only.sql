/*
  # Fonctions d'automatisation Newsletter

  1. Fonctions utilitaires
    - run_weekly_newsletter() : Lance la newsletter hebdomadaire
    - cleanup_old_newsletter_analytics() : Nettoie les anciennes données
  
  2. Vues statistiques
    - newsletter_stats : Stats globales newsletter
*/

-- Fonction pour exécuter la newsletter hebdomadaire
CREATE OR REPLACE FUNCTION run_weekly_newsletter()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_campaign_id uuid;
  v_send_result jsonb;
BEGIN
  -- Créer la campagne automatique
  SELECT create_auto_newsletter_campaign() INTO v_result;
  
  -- Si succès, programmer l'envoi
  IF (v_result->>'success')::boolean = true THEN
    v_campaign_id := (v_result->>'campaign_id')::uuid;
    
    -- Préparer les envois pour les abonnés
    SELECT send_newsletter_campaign(v_campaign_id) INTO v_send_result;
    
    RETURN jsonb_build_object(
      'success', true,
      'campaign_id', v_campaign_id,
      'send_result', v_send_result
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Pas de nouveaux articles disponibles'
    );
  END IF;
END;
$$;

-- Fonction : Nettoyer les anciennes analytics (>90 jours)
CREATE OR REPLACE FUNCTION cleanup_old_newsletter_analytics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count int;
BEGIN
  DELETE FROM newsletter_analytics
  WHERE created_at < now() - interval '90 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'message', 'Analytics nettoyées'
  );
END;
$$;

-- Vue : Statistiques newsletter globales
CREATE OR REPLACE VIEW newsletter_stats AS
SELECT
  COUNT(DISTINCT CASE WHEN status = 'active' THEN id END) as active_subscribers,
  COUNT(DISTINCT CASE WHEN status = 'unsubscribed' THEN id END) as unsubscribed_count,
  AVG(CASE WHEN status = 'active' THEN engagement_score END) as avg_engagement,
  SUM(total_opens) as total_opens,
  SUM(total_clicks) as total_clicks,
  COUNT(*) FILTER (WHERE subscribed_at > now() - interval '30 days') as new_subscribers_30d,
  COUNT(*) FILTER (WHERE subscribed_at > now() - interval '7 days') as new_subscribers_7d
FROM newsletter_subscribers;

-- Vue : Performance des campagnes
CREATE OR REPLACE VIEW newsletter_campaign_performance AS
SELECT
  c.id,
  c.name,
  c.subject,
  c.status,
  c.scheduled_at,
  c.sent_at,
  c.total_subscribers,
  c.total_sent,
  c.total_opened,
  c.total_clicked,
  CASE 
    WHEN c.total_sent > 0 
    THEN ROUND((c.total_opened::numeric / c.total_sent::numeric * 100), 2)
    ELSE 0 
  END as open_rate,
  CASE 
    WHEN c.total_sent > 0 
    THEN ROUND((c.total_clicked::numeric / c.total_sent::numeric * 100), 2)
    ELSE 0 
  END as click_rate,
  c.created_at
FROM newsletter_campaigns c
ORDER BY c.created_at DESC;

-- Vue : Top abonnés engagés
CREATE OR REPLACE VIEW newsletter_top_subscribers AS
SELECT
  id,
  email,
  first_name,
  engagement_score,
  total_opens,
  total_clicks,
  last_opened_at,
  subscribed_at
FROM newsletter_subscribers
WHERE status = 'active'
ORDER BY engagement_score DESC, total_opens DESC
LIMIT 100;

-- Grant accès aux vues
GRANT SELECT ON newsletter_stats TO authenticated;
GRANT SELECT ON newsletter_campaign_performance TO authenticated;
GRANT SELECT ON newsletter_top_subscribers TO authenticated;
