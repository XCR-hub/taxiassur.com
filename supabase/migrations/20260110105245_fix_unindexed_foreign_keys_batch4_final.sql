/*
  # Fix Unindexed Foreign Keys - Batch 4 (Final)

  1. Performance Optimization
    - Add indexes on remaining foreign key columns
    - Covers blog, SEO, and miscellaneous tables
    - Final batch to complete foreign key indexing

  2. Tables Affected
    - blog_posts
    - city_pages
    - quotes
    - page_analytics
    - backlink_prospects
    - insurance_company_contacts
*/

-- blog_posts indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blog_posts') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'blog_posts' AND column_name = 'author_id') THEN
      CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id
        ON blog_posts(author_id) WHERE author_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- city_pages indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'city_pages') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'city_pages' AND column_name = 'created_by') THEN
      CREATE INDEX IF NOT EXISTS idx_city_pages_created_by
        ON city_pages(created_by) WHERE created_by IS NOT NULL;
    END IF;
  END IF;
END $$;

-- quotes indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'lead_id') THEN
      CREATE INDEX IF NOT EXISTS idx_quotes_lead_id
        ON quotes(lead_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'created_by') THEN
      CREATE INDEX IF NOT EXISTS idx_quotes_created_by
        ON quotes(created_by) WHERE created_by IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'insurance_company_id') THEN
      CREATE INDEX IF NOT EXISTS idx_quotes_insurance_company_id
        ON quotes(insurance_company_id) WHERE insurance_company_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- page_analytics indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'page_analytics') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'page_analytics' AND column_name = 'user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_page_analytics_user_id
        ON page_analytics(user_id) WHERE user_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- backlink_prospects indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'backlink_prospects') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'backlink_prospects' AND column_name = 'assigned_to') THEN
      CREATE INDEX IF NOT EXISTS idx_backlink_prospects_assigned_to
        ON backlink_prospects(assigned_to) WHERE assigned_to IS NOT NULL;
    END IF;
  END IF;
END $$;

-- insurance_company_contacts indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'insurance_company_contacts') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'insurance_company_contacts' AND column_name = 'company_id') THEN
      CREATE INDEX IF NOT EXISTS idx_insurance_company_contacts_company_id
        ON insurance_company_contacts(company_id);
    END IF;
  END IF;
END $$;

-- leads table - main foreign keys
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'assigned_to') THEN
      CREATE INDEX IF NOT EXISTS idx_leads_assigned_to
        ON leads(assigned_to) WHERE assigned_to IS NOT NULL;
    END IF;
  END IF;
END $$;

-- crm_leads table - main foreign keys
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_leads') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'crm_leads' AND column_name = 'assigned_to') THEN
      CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned_to
        ON crm_leads(assigned_to) WHERE assigned_to IS NOT NULL;
    END IF;
  END IF;
END $$;
