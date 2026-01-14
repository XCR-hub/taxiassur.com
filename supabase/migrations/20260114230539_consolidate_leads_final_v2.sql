/*
  # Migration finale - Consolidation des Leads
  
  ## Contexte
  Migration des leads de l'ancienne table `leads` vers `crm_leads`.
  Correction: temperature doit etre en majuscules (COLD, WARM, HOT).
  
  ## Actions
  1. Desactiver les triggers INSERT sur crm_leads
  2. Migrer les leads uniques
  3. Reactiver les triggers
  4. Archiver les tables obsoletes
*/

-- 1. Desactiver temporairement les triggers INSERT
ALTER TABLE crm_leads DISABLE TRIGGER trg_on_new_lead_created_unified;
ALTER TABLE crm_leads DISABLE TRIGGER on_lead_ready_for_quote;
ALTER TABLE crm_leads DISABLE TRIGGER trg_crm_leads_access_token;
ALTER TABLE crm_leads DISABLE TRIGGER trg_schedule_stage_actions;
ALTER TABLE crm_leads DISABLE TRIGGER trigger_notify_new_lead;

-- 2. Migrer les leads uniques de `leads` vers `crm_leads`
INSERT INTO crm_leads (
  first_name,
  last_name,
  email,
  phone,
  city,
  company_name,
  source,
  status,
  lead_score,
  metadata,
  tags,
  created_at,
  updated_at,
  last_contact_at,
  next_followup_at,
  internal_notes,
  temperature
)
SELECT DISTINCT ON (LOWER(l.email))
  COALESCE(l.first_name, SPLIT_PART(l.name, ' ', 1)) as first_name,
  COALESCE(l.last_name, NULLIF(TRIM(SUBSTRING(l.name FROM POSITION(' ' IN l.name))), ''), 'Inconnu') as last_name,
  LOWER(l.email) as email,
  l.phone,
  l.city,
  l.company_name,
  COALESCE(l.source, 'website') as source,
  CASE l.lead_status
    WHEN 'nouveau' THEN 'NEW_LEAD'::lead_status
    WHEN 'contacté' THEN 'CONTACT_ATTEMPTED'::lead_status
    WHEN 'devis envoyé' THEN 'QUOTE_SENT'::lead_status
    WHEN 'client' THEN 'ACTIVE_CLIENT'::lead_status
    WHEN 'perdu' THEN 'LOST_RECONTACT_SCHEDULED'::lead_status
    ELSE 'NEW_LEAD'::lead_status
  END as status,
  COALESCE(l.lead_score, 50) as lead_score,
  COALESCE(l.metadata, '{}') as metadata,
  COALESCE(l.tags, ARRAY[]::text[]) as tags,
  l.created_at,
  l.updated_at,
  l.last_contact_at,
  l.next_followup_at,
  l.notes as internal_notes,
  'WARM' as temperature
FROM leads l
WHERE NOT EXISTS (
  SELECT 1 FROM crm_leads c WHERE LOWER(c.email) = LOWER(l.email)
)
ORDER BY LOWER(l.email), l.created_at DESC;

-- 3. Reactiver les triggers
ALTER TABLE crm_leads ENABLE TRIGGER trg_on_new_lead_created_unified;
ALTER TABLE crm_leads ENABLE TRIGGER on_lead_ready_for_quote;
ALTER TABLE crm_leads ENABLE TRIGGER trg_crm_leads_access_token;
ALTER TABLE crm_leads ENABLE TRIGGER trg_schedule_stage_actions;
ALTER TABLE crm_leads ENABLE TRIGGER trigger_notify_new_lead;

-- 4. Generer les access_token pour les leads migres qui n'en ont pas
UPDATE crm_leads 
SET access_token = encode(gen_random_bytes(32), 'hex')
WHERE access_token IS NULL;

-- 5. Archiver les tables obsoletes (renommage securise)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads' AND table_schema = 'public') THEN
    ALTER TABLE leads RENAME TO leads_archive_20260114;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'taxi_prospects' AND table_schema = 'public') THEN
    ALTER TABLE taxi_prospects RENAME TO taxi_prospects_archive_20260114;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exit_intent_leads' AND table_schema = 'public') THEN
    ALTER TABLE exit_intent_leads RENAME TO exit_intent_leads_archive_20260114;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_documents' AND table_schema = 'public') THEN
    ALTER TABLE lead_documents RENAME TO lead_documents_archive_20260114;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prospect_documents' AND table_schema = 'public') THEN
    ALTER TABLE prospect_documents RENAME TO prospect_documents_archive_20260114;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_lead_companies' AND table_schema = 'public') THEN
    ALTER TABLE crm_lead_companies RENAME TO crm_lead_companies_archive_20260114;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_contracts' AND table_schema = 'public') THEN
    ALTER TABLE lead_contracts RENAME TO lead_contracts_archive_20260114;
  END IF;
END $$;

-- 6. Creer un index unique sur email (lowercase) pour eviter doublons futurs
CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_email_unique_lower 
ON crm_leads (LOWER(email)) 
WHERE deleted_at IS NULL;