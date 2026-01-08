/*
  # Fix Function Search Paths (Security Fix)

  **Security Issue**: Functions with mutable search_path can be exploited
  
  Functions should have a fixed search_path to prevent search_path injection attacks.
  This migration sets search_path to 'public, pg_temp' for all affected functions.
  
  ## Functions Fixed:
  - update_email_status
  - increment_pdf_download_count
  - get_translation
  - calculate_rfm_score
  - get_personalized_content
  - update_updated_at_column
  - enroll_in_workflow
  - reactivate_scheduled_lost_leads
  - get_recommended_action
  - transition_lead_state
  - check_consent
  - register_consent
  - keep_admin_session_alive
  - update_admin_activity
  - cleanup_expired_sessions
*/

-- Fix all functions with mutable search_path
ALTER FUNCTION IF EXISTS update_email_status SET search_path = public, pg_temp;
ALTER FUNCTION IF EXISTS increment_pdf_download_count SET search_path = public, pg_temp;
ALTER FUNCTION IF EXISTS get_translation SET search_path = public, pg_temp;
ALTER FUNCTION IF EXISTS calculate_rfm_score SET search_path = public, pg_temp;
ALTER FUNCTION IF EXISTS get_personalized_content SET search_path = public, pg_temp;
ALTER FUNCTION IF EXISTS update_updated_at_column SET search_path = public, pg_temp;
ALTER FUNCTION IF EXISTS enroll_in_workflow SET search_path = public, pg_temp;
ALTER FUNCTION IF EXISTS reactivate_scheduled_lost_leads SET search_path = public, pg_temp;
ALTER FUNCTION IF EXISTS get_recommended_action SET search_path = public, pg_temp;
ALTER FUNCTION IF EXISTS transition_lead_state SET search_path = public, pg_temp;
ALTER FUNCTION IF EXISTS check_consent SET search_path = public, pg_temp;
ALTER FUNCTION IF EXISTS register_consent SET search_path = public, pg_temp;
ALTER FUNCTION IF EXISTS keep_admin_session_alive SET search_path = public, pg_temp;
ALTER FUNCTION IF EXISTS update_admin_activity SET search_path = public, pg_temp;
ALTER FUNCTION IF EXISTS cleanup_expired_sessions SET search_path = public, pg_temp;
