/*
  # Fix Security Definer View (Security Fix)

  **Security Issue**: View with SECURITY DEFINER bypasses RLS
  
  The email_stats view is defined with SECURITY DEFINER, which means it runs
  with the permissions of the view creator, bypassing RLS. This is a security risk.
  
  We recreate the view without SECURITY DEFINER (SECURITY INVOKER is the default).
  
  ## View Fixed:
  - email_stats
*/

-- Drop and recreate the view without SECURITY DEFINER
DROP VIEW IF EXISTS email_stats;

-- Recreate with SECURITY INVOKER (default, safer)
CREATE OR REPLACE VIEW email_stats AS
SELECT 
  es.lead_id,
  COUNT(DISTINCT es.id) as emails_sent,
  COUNT(DISTINCT eo.id) as emails_opened,
  COUNT(DISTINCT ec.id) as emails_clicked,
  COUNT(DISTINCT er.id) as emails_replied,
  CASE 
    WHEN COUNT(DISTINCT es.id) > 0 
    THEN ROUND((COUNT(DISTINCT eo.id)::numeric / COUNT(DISTINCT es.id)::numeric) * 100, 2)
    ELSE 0 
  END as open_rate,
  CASE 
    WHEN COUNT(DISTINCT es.id) > 0 
    THEN ROUND((COUNT(DISTINCT ec.id)::numeric / COUNT(DISTINCT es.id)::numeric) * 100, 2)
    ELSE 0 
  END as click_rate,
  CASE 
    WHEN COUNT(DISTINCT es.id) > 0 
    THEN ROUND((COUNT(DISTINCT er.id)::numeric / COUNT(DISTINCT es.id)::numeric) * 100, 2)
    ELSE 0 
  END as reply_rate
FROM email_sends es
LEFT JOIN email_opens eo ON es.tracking_id = eo.tracking_id
LEFT JOIN email_clicks ec ON es.tracking_id = ec.tracking_id
LEFT JOIN email_replies er ON es.id = er.email_send_id
GROUP BY es.lead_id;

-- Grant access to authenticated users only
GRANT SELECT ON email_stats TO authenticated;
