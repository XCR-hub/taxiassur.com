/*
  # Add Missing Foreign Key Indexes - Admin & Analytics Tables (Batch 1)

  1. Changes
    - Adds indexes for unindexed foreign keys
    - Improves JOIN performance and foreign key constraint checks
    - Essential for query optimization

  2. Tables Covered
    - admin_notifications (1 FK)
    - admin_sessions (1 FK)
    - admin_users (1 FK)
    - ai_comments_published (1 FK)
    - ai_learning_feedback (1 FK)
    - analytics_events (1 FK)
    - auto_corrections (1 FK)

  3. Performance Impact
    - Faster JOIN operations
    - Faster DELETE cascades
    - Improved foreign key constraint validation
*/

-- admin_notifications
CREATE INDEX IF NOT EXISTS idx_admin_notifications_document_id_fk 
ON public.admin_notifications(document_id);

-- admin_sessions
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id_fk 
ON public.admin_sessions(admin_id);

-- admin_users
CREATE INDEX IF NOT EXISTS idx_admin_users_created_by_fk 
ON public.admin_users(created_by);

-- ai_comments_published
CREATE INDEX IF NOT EXISTS idx_ai_comments_published_response_id_fk 
ON public.ai_comments_published(response_id);

-- ai_learning_feedback
CREATE INDEX IF NOT EXISTS idx_ai_learning_feedback_response_id_fk 
ON public.ai_learning_feedback(response_id);

-- analytics_events
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id_fk 
ON public.analytics_events(session_id);

-- auto_corrections
CREATE INDEX IF NOT EXISTS idx_auto_corrections_health_check_id_fk 
ON public.auto_corrections(health_check_id);
