/*
  # Synchronisation COMPLETE leads vers crm_leads + Fix Pipeline

  1. Ajoute colonnes manquantes (quality_score, internal_notes, full_name)
  2. Synchronise TOUS les leads existants de la table leads vers crm_leads
  3. Calcule quality_score automatiquement
  4. Fix l'affichage dans le pipeline Kanban
*/

-- Ajouter colonnes manquantes dans crm_leads
ALTER TABLE crm_leads
ADD COLUMN IF NOT EXISTS quality_score integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS internal_notes text,
ADD COLUMN IF NOT EXISTS full_name text GENERATED ALWAYS AS (
  TRIM(COALESCE(first_name || ' ' || NULLIF(last_name, ''), first_name, last_name, email))
) STORED;

-- Synchroniser TOUS les leads existants
INSERT INTO crm_leads (
  id,
  first_name,
  last_name,
  email,
  phone,
  city,
  company_name,
  status,
  source,
  assigned_to,
  lead_score,
  tags,
  metadata,
  created_at,
  updated_at,
  last_contact_at,
  next_followup_at
)
SELECT
  l.id,
  COALESCE(l.first_name, split_part(l.name, ' ', 1), 'Prospect'),
  COALESCE(l.last_name, NULLIF(split_part(l.name, ' ', 2), ''), ''),
  l.email,
  l.phone,
  COALESCE(l.city, ''),
  l.company_name,
  CASE
    WHEN l.lead_status = 'contacté' OR l.status = 'Contacté' THEN 'CONTACT_CONFIRMED'::lead_status
    WHEN l.lead_status = 'nouveau' OR l.status = 'Nouveau' OR l.lead_status IS NULL THEN 'NEW_LEAD'::lead_status
    WHEN l.lead_status = 'converti' OR l.client_at IS NOT NULL THEN 'ACTIVE_CLIENT'::lead_status
    WHEN l.lead_status = 'perdu' THEN 'CLIENT_LOST'::lead_status
    WHEN l.devis_envoye_at IS NOT NULL OR l.quote_sent_at IS NOT NULL THEN 'QUOTE_SENT'::lead_status
    ELSE 'NEW_LEAD'::lead_status
  END,
  COALESCE(l.source, 'website'),
  l.assigned_to,
  COALESCE(l.behavior_score, 50),
  ARRAY[]::TEXT[],
  COALESCE(l.metadata, '{}'::jsonb) || jsonb_build_object(
    'immatriculation', l.immatriculation,
    'activity_type', l.activity_type,
    'old_status', l.status,
    'old_lead_status', l.lead_status,
    'synced_from', 'leads_table',
    'synced_at', NOW()
  ),
  l.created_at,
  l.updated_at,
  l.contacted_at,
  NULL
FROM leads l
ON CONFLICT (id) DO UPDATE SET
  first_name = COALESCE(EXCLUDED.first_name, crm_leads.first_name),
  last_name = COALESCE(EXCLUDED.last_name, crm_leads.last_name),
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  city = EXCLUDED.city,
  company_name = EXCLUDED.company_name,
  source = EXCLUDED.source,
  metadata = crm_leads.metadata || EXCLUDED.metadata,
  updated_at = NOW();

-- Calculer quality_score pour tous
UPDATE crm_leads
SET quality_score = LEAST(100, GREATEST(0,
  CASE WHEN email LIKE '%@%' AND email LIKE '%.%' THEN 20 ELSE 0 END +
  CASE WHEN phone IS NOT NULL AND LENGTH(phone) >= 10 THEN 20 ELSE 0 END +
  CASE WHEN city IS NOT NULL AND city != '' THEN 15 ELSE 0 END +
  CASE WHEN company_name IS NOT NULL AND company_name != '' THEN 15 ELSE 0 END +
  CASE WHEN first_name IS NOT NULL AND first_name != '' AND first_name != 'Prospect' THEN 15 ELSE 0 END +
  CASE WHEN last_name IS NOT NULL AND last_name != '' THEN 15 ELSE 0 END
))
WHERE quality_score IS NULL OR quality_score <= 50;

-- Créer index pour performances
CREATE INDEX IF NOT EXISTS idx_crm_leads_full_name ON crm_leads(full_name);
CREATE INDEX IF NOT EXISTS idx_crm_leads_quality_score ON crm_leads(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status_created ON crm_leads(status, created_at DESC);

-- Mettre à jour le trigger pour inclure quality_score et full_name
CREATE OR REPLACE FUNCTION sync_lead_to_crm_leads()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO crm_leads (
    id,
    first_name,
    last_name,
    email,
    phone,
    city,
    company_name,
    status,
    source,
    assigned_to,
    lead_score,
    tags,
    metadata,
    created_at,
    updated_at,
    last_contact_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.first_name, split_part(NEW.name, ' ', 1), 'Prospect'),
    COALESCE(NEW.last_name, NULLIF(split_part(NEW.name, ' ', 2), ''), ''),
    NEW.email,
    NEW.phone,
    COALESCE(NEW.city, ''),
    NEW.company_name,
    CASE
      WHEN NEW.lead_status = 'contacté' THEN 'CONTACT_CONFIRMED'::lead_status
      WHEN NEW.lead_status = 'converti' OR NEW.client_at IS NOT NULL THEN 'ACTIVE_CLIENT'::lead_status
      WHEN NEW.lead_status = 'perdu' THEN 'CLIENT_LOST'::lead_status
      WHEN NEW.devis_envoye_at IS NOT NULL OR NEW.quote_sent_at IS NOT NULL THEN 'QUOTE_SENT'::lead_status
      ELSE 'NEW_LEAD'::lead_status
    END,
    COALESCE(NEW.source, 'website'),
    NEW.assigned_to,
    COALESCE(NEW.behavior_score, 50),
    ARRAY[]::TEXT[],
    COALESCE(NEW.metadata, '{}'::jsonb) || jsonb_build_object(
      'immatriculation', NEW.immatriculation,
      'activity_type', NEW.activity_type,
      'synced_from', 'leads_table',
      'synced_at', NOW()
    ),
    NEW.created_at,
    NEW.updated_at,
    NEW.contacted_at
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = COALESCE(EXCLUDED.first_name, crm_leads.first_name),
    last_name = COALESCE(EXCLUDED.last_name, crm_leads.last_name),
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    city = EXCLUDED.city,
    company_name = EXCLUDED.company_name,
    status = EXCLUDED.status,
    metadata = crm_leads.metadata || EXCLUDED.metadata,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaires
COMMENT ON COLUMN crm_leads.full_name IS 'Nom complet généré: first_name + last_name';
COMMENT ON COLUMN crm_leads.quality_score IS 'Score qualité lead 0-100 (auto-calculé)';
COMMENT ON COLUMN crm_leads.internal_notes IS 'Notes internes équipe commerciale';