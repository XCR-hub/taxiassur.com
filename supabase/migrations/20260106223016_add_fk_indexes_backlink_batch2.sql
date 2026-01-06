/*
  # Add Missing Foreign Key Indexes - Backlink Tables (Batch 2)

  1. Changes
    - Adds indexes for backlink-related foreign keys
    - 8 indexes added

  2. Tables Covered
    - backlink_email_logs (1 FK)
    - backlink_email_tracking (1 FK)
    - backlink_notifications (1 FK)
    - backlink_outreach (2 FKs)
    - backlink_outreach_log (1 FK)
    - backlink_workflow_steps (1 FK)
    - email_conversations (1 FK)

  3. Performance Impact
    - Faster backlink campaign queries
    - Improved email tracking performance
    - Better JOIN performance
*/

-- backlink_email_logs
CREATE INDEX IF NOT EXISTS idx_backlink_email_logs_campaign_id_fk 
ON public.backlink_email_logs(campaign_id);

-- backlink_email_tracking
CREATE INDEX IF NOT EXISTS idx_backlink_email_tracking_campaign_id_fk 
ON public.backlink_email_tracking(campaign_id);

-- backlink_notifications
CREATE INDEX IF NOT EXISTS idx_backlink_notifications_opportunity_id_fk 
ON public.backlink_notifications(opportunity_id);

-- backlink_outreach
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_campaign_id_fk 
ON public.backlink_outreach(campaign_id);

CREATE INDEX IF NOT EXISTS idx_backlink_outreach_opportunity_id_fk 
ON public.backlink_outreach(opportunity_id);

-- backlink_outreach_log
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_log_opportunity_id_fk 
ON public.backlink_outreach_log(opportunity_id);

-- backlink_workflow_steps
CREATE INDEX IF NOT EXISTS idx_backlink_workflow_steps_opportunity_id_fk 
ON public.backlink_workflow_steps(opportunity_id);

-- email_conversations
CREATE INDEX IF NOT EXISTS idx_email_conversations_contact_id_fk 
ON public.email_conversations(contact_id);
