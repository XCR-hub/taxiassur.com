/*
  # Données de démonstration pour Analytics

  1. Données
    - Sessions analytics réalistes (dernières 24h)
    - Page views avec patterns réalistes
    - Events de conversion
    - Distribution géographique

  2. Notes
    - Données générées pour démonstration
    - Patterns réalistes (heures de pointe, sources variées)
    - Compatible avec dashboard analytics
*/

-- Insérer des sessions analytics réalistes pour aujourd'hui
INSERT INTO analytics_sessions (
  id,
  session_id,
  visitor_id,
  started_at,
  last_activity_at,
  ip_address,
  user_agent,
  referrer_url,
  landing_page,
  current_page,
  pages_visited,
  city,
  country,
  device_type,
  browser,
  os,
  is_converted,
  conversion_value,
  utm_source,
  utm_medium,
  utm_campaign
)
SELECT
  gen_random_uuid(),
  'sess_' || generate_series || '_' || extract(epoch from now())::text,
  'visitor_' || (generate_series % 50)::text,
  now() - (random() * interval '23 hours'),
  now() - (random() * interval '20 hours'),
  '192.168.' || (random() * 255)::int || '.' || (random() * 255)::int,
  CASE (random() * 4)::int
    WHEN 0 THEN 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    WHEN 1 THEN 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)'
    WHEN 2 THEN 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    ELSE 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
  END,
  CASE (random() * 5)::int
    WHEN 0 THEN 'https://www.google.com/search?q=assurance+taxi'
    WHEN 1 THEN 'https://www.facebook.com'
    WHEN 2 THEN 'https://www.linkedin.com'
    WHEN 3 THEN NULL
    ELSE 'https://www.google.com/search?q=assurance+taxi+paris'
  END,
  CASE (random() * 10)::int
    WHEN 0 THEN '/'
    WHEN 1 THEN '/assurance-taxi-paris'
    WHEN 2 THEN '/assurance-taxi-lyon'
    WHEN 3 THEN '/blog'
    WHEN 4 THEN '/prix-assurance-taxi'
    WHEN 5 THEN '/assurance-vtc'
    WHEN 6 THEN '/devis-instantane'
    WHEN 7 THEN '/contact'
    ELSE '/assurance-taxi'
  END,
  CASE (random() * 8)::int
    WHEN 0 THEN '/'
    WHEN 1 THEN '/assurance-taxi-paris'
    WHEN 2 THEN '/contact'
    WHEN 3 THEN '/devis-instantane'
    ELSE '/assurance-taxi'
  END,
  (random() * 5 + 1)::int,
  CASE (random() * 15)::int
    WHEN 0 THEN 'Paris'
    WHEN 1 THEN 'Lyon'
    WHEN 2 THEN 'Marseille'
    WHEN 3 THEN 'Toulouse'
    WHEN 4 THEN 'Bordeaux'
    WHEN 5 THEN 'Nice'
    WHEN 6 THEN 'Nantes'
    WHEN 7 THEN 'Lille'
    WHEN 8 THEN 'Strasbourg'
    WHEN 9 THEN 'Rennes'
    ELSE 'Montpellier'
  END,
  'France',
  CASE (random() * 3)::int
    WHEN 0 THEN 'desktop'
    WHEN 1 THEN 'mobile'
    ELSE 'tablet'
  END,
  CASE (random() * 4)::int
    WHEN 0 THEN 'Chrome'
    WHEN 1 THEN 'Safari'
    WHEN 2 THEN 'Firefox'
    ELSE 'Edge'
  END,
  CASE (random() * 4)::int
    WHEN 0 THEN 'Windows'
    WHEN 1 THEN 'iOS'
    WHEN 2 THEN 'macOS'
    ELSE 'Android'
  END,
  random() < 0.08, -- 8% conversion rate
  CASE WHEN random() < 0.08 THEN (random() * 500 + 100)::numeric ELSE NULL END,
  CASE (random() * 5)::int
    WHEN 0 THEN 'google'
    WHEN 1 THEN 'facebook'
    WHEN 2 THEN 'linkedin'
    WHEN 3 THEN 'direct'
    ELSE NULL
  END,
  CASE (random() * 4)::int
    WHEN 0 THEN 'organic'
    WHEN 1 THEN 'cpc'
    WHEN 2 THEN 'social'
    ELSE 'referral'
  END,
  CASE (random() * 3)::int
    WHEN 0 THEN 'autumn_2024'
    WHEN 1 THEN 'promo_taxi'
    ELSE NULL
  END
FROM generate_series(1, 150);

-- Insérer des page views pour les sessions
INSERT INTO analytics_page_views (
  id,
  session_id,
  page_url,
  page_title,
  viewed_at,
  time_on_page,
  scroll_depth,
  exit_page
)
SELECT
  gen_random_uuid(),
  s.id,
  CASE (random() * 15)::int
    WHEN 0 THEN '/'
    WHEN 1 THEN '/assurance-taxi'
    WHEN 2 THEN '/assurance-taxi-paris'
    WHEN 3 THEN '/assurance-taxi-lyon'
    WHEN 4 THEN '/prix-assurance-taxi'
    WHEN 5 THEN '/assurance-vtc'
    WHEN 6 THEN '/contact'
    WHEN 7 THEN '/devis-instantane'
    WHEN 8 THEN '/blog'
    WHEN 9 THEN '/faq'
    WHEN 10 THEN '/avis'
    WHEN 11 THEN '/partenaires'
    WHEN 12 THEN '/assurance-taxi-marseille'
    WHEN 13 THEN '/rc-professionnelle'
    ELSE '/flotte-vehicules'
  END,
  'Assurance Taxi - Page',
  s.started_at + (random() * interval '15 minutes'),
  (random() * 300 + 30)::int,
  (random() * 100)::int,
  random() < 0.3
FROM analytics_sessions s
CROSS JOIN generate_series(1, (random() * 4 + 1)::int);

-- Insérer des events de conversion
INSERT INTO analytics_events (
  id,
  session_id,
  event_type,
  event_name,
  event_data,
  created_at
)
SELECT
  gen_random_uuid(),
  s.id,
  CASE (random() * 8)::int
    WHEN 0 THEN 'form_submit'
    WHEN 1 THEN 'button_click'
    WHEN 2 THEN 'scroll'
    WHEN 3 THEN 'video_play'
    WHEN 4 THEN 'download'
    WHEN 5 THEN 'phone_click'
    WHEN 6 THEN 'chat_open'
    ELSE 'email_click'
  END,
  CASE (random() * 5)::int
    WHEN 0 THEN 'lead_form_submit'
    WHEN 1 THEN 'cta_click'
    WHEN 2 THEN 'quote_request'
    WHEN 3 THEN 'call_button'
    ELSE 'newsletter_signup'
  END,
  jsonb_build_object(
    'page', '/assurance-taxi',
    'element', 'cta-button',
    'value', random() * 100
  ),
  s.started_at + (random() * interval '10 minutes')
FROM analytics_sessions s
WHERE random() < 0.4; -- 40% des sessions génèrent des events

-- Créer des index si ils n'existent pas
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started_at ON analytics_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_city ON analytics_sessions(city);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_converted ON analytics_sessions(is_converted);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_session ON analytics_page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);

-- Fonction pour obtenir les stats en temps réel
CREATE OR REPLACE FUNCTION get_realtime_stats()
RETURNS TABLE (
  active_sessions bigint,
  today_sessions bigint,
  today_conversions bigint,
  today_quote_requests bigint,
  pending_quotes bigint,
  avg_session_duration numeric,
  top_traffic_source text,
  top_city text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT CASE WHEN s.last_activity_at > now() - interval '5 minutes' THEN s.id END) as active_sessions,
    COUNT(DISTINCT CASE WHEN s.started_at >= date_trunc('day', now()) THEN s.id END) as today_sessions,
    COUNT(DISTINCT CASE WHEN s.is_converted AND s.started_at >= date_trunc('day', now()) THEN s.id END) as today_conversions,
    COUNT(DISTINCT CASE WHEN e.event_name = 'quote_request' AND e.created_at >= date_trunc('day', now()) THEN e.id END) as today_quote_requests,
    COUNT(DISTINCT CASE WHEN l.status = 'nouveau' THEN l.id END) as pending_quotes,
    ROUND(AVG(EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at)) / 60), 1) as avg_session_duration,
    (SELECT s2.utm_source FROM analytics_sessions s2 WHERE s2.started_at >= date_trunc('day', now()) AND s2.utm_source IS NOT NULL GROUP BY s2.utm_source ORDER BY COUNT(*) DESC LIMIT 1) as top_traffic_source,
    (SELECT s3.city FROM analytics_sessions s3 WHERE s3.started_at >= date_trunc('day', now()) GROUP BY s3.city ORDER BY COUNT(*) DESC LIMIT 1) as top_city
  FROM analytics_sessions s
  LEFT JOIN analytics_events e ON e.session_id = s.id
  LEFT JOIN leads l ON l.created_at >= date_trunc('day', now());
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_realtime_stats() TO authenticated;

-- Function to get top pages today
CREATE OR REPLACE FUNCTION get_top_pages_today()
RETURNS TABLE (
  page_url text,
  views bigint,
  unique_visitors bigint,
  conversion_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pv.page_url,
    COUNT(pv.id) as views,
    COUNT(DISTINCT pv.session_id) as unique_visitors,
    ROUND(
      (COUNT(DISTINCT CASE WHEN s.is_converted THEN s.id END)::numeric /
       NULLIF(COUNT(DISTINCT s.id), 0) * 100),
      1
    ) as conversion_rate
  FROM analytics_page_views pv
  JOIN analytics_sessions s ON s.id = pv.session_id
  WHERE pv.viewed_at >= date_trunc('day', now())
  GROUP BY pv.page_url
  ORDER BY views DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_top_pages_today() TO authenticated;
