/*
  # Fix Unindexed Foreign Keys - Batch 3

  1. Performance Optimization
    - Add indexes on foreign key columns
    - Covers email, newsletter, and social media tables
    - Improves JOIN performance

  2. Tables Affected
    - email_campaigns
    - email_tracking
    - inbox_emails
    - newsletter_campaigns
    - newsletter_subscribers
    - social_posts
    - wa_templates
*/

-- email_campaigns indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_campaigns') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_campaigns' AND column_name = 'created_by') THEN
      CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_by
        ON email_campaigns(created_by);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_campaigns' AND column_name = 'template_id') THEN
      CREATE INDEX IF NOT EXISTS idx_email_campaigns_template_id
        ON email_campaigns(template_id) WHERE template_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- email_tracking indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_tracking') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_tracking' AND column_name = 'lead_id') THEN
      CREATE INDEX IF NOT EXISTS idx_email_tracking_lead_id
        ON email_tracking(lead_id) WHERE lead_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- inbox_emails indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inbox_emails') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inbox_emails' AND column_name = 'lead_id') THEN
      CREATE INDEX IF NOT EXISTS idx_inbox_emails_lead_id
        ON inbox_emails(lead_id) WHERE lead_id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inbox_emails' AND column_name = 'parent_id') THEN
      CREATE INDEX IF NOT EXISTS idx_inbox_emails_parent_id
        ON inbox_emails(parent_id) WHERE parent_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- newsletter_campaigns indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'newsletter_campaigns') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'newsletter_campaigns' AND column_name = 'created_by') THEN
      CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_created_by
        ON newsletter_campaigns(created_by) WHERE created_by IS NOT NULL;
    END IF;
  END IF;
END $$;

-- newsletter_subscribers indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'newsletter_subscribers') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'newsletter_subscribers' AND column_name = 'lead_id') THEN
      CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_lead_id
        ON newsletter_subscribers(lead_id) WHERE lead_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- social_posts indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'social_posts') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_posts' AND column_name = 'created_by') THEN
      CREATE INDEX IF NOT EXISTS idx_social_posts_created_by
        ON social_posts(created_by) WHERE created_by IS NOT NULL;
    END IF;
  END IF;
END $$;

-- wa_templates indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wa_templates') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wa_templates' AND column_name = 'created_by') THEN
      CREATE INDEX IF NOT EXISTS idx_wa_templates_created_by
        ON wa_templates(created_by) WHERE created_by IS NOT NULL;
    END IF;
  END IF;
END $$;
