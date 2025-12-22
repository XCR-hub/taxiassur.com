-- ═══════════════════════════════════════════════════════════════
--  PARTIE 1: AJOUTER LES COLONNES
-- ═══════════════════════════════════════════════════════════════

-- Ajouter title
ALTER TABLE backlink_opportunities 
  ADD COLUMN IF NOT EXISTS title text;

-- Ajouter description
ALTER TABLE backlink_opportunities 
  ADD COLUMN IF NOT EXISTS description text;

-- Ajouter contact_email
ALTER TABLE backlink_opportunities 
  ADD COLUMN IF NOT EXISTS contact_email text;

-- Ajouter contact_name
ALTER TABLE backlink_opportunities 
  ADD COLUMN IF NOT EXISTS contact_name text;

-- Ajouter quality_score
ALTER TABLE backlink_opportunities 
  ADD COLUMN IF NOT EXISTS quality_score numeric DEFAULT 0;

-- Ajouter domain_authority
ALTER TABLE backlink_opportunities 
  ADD COLUMN IF NOT EXISTS domain_authority numeric;

-- Ajouter status
ALTER TABLE backlink_opportunities 
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'new';

-- Ajouter opportunity_id à backlink_outreach_log
ALTER TABLE backlink_outreach_log 
  ADD COLUMN IF NOT EXISTS opportunity_id uuid;

SELECT '✅ PARTIE 1 TERMINÉE - Colonnes ajoutées' as status;
