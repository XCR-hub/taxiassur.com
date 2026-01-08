/*
  # Migration des leads existants vers crm_leads

  ## Objectif
  Migrer tous les leads de l'ancienne table `leads` vers la nouvelle table `crm_leads`
  en mappant correctement les statuts et les champs.

  ## Mapping des statuts
  - "Nouveau Lead" → 'NEW_LEAD'
  - "Contact Établi" → 'CONTACT_CONFIRMED'
  - "contacté" → 'CONTACT_CONFIRMED'
  - "nouveau" → 'NEW_LEAD'
  - Par défaut → 'NEW_LEAD'
*/

-- Fonction pour mapper les anciens statuts vers les nouveaux
CREATE OR REPLACE FUNCTION map_old_status_to_new(old_stage TEXT, old_lead_status TEXT) 
RETURNS lead_status AS $$
BEGIN
  -- Mapping basé sur le stage
  IF old_stage = 'Contact Établi' OR old_lead_status = 'contacté' THEN
    RETURN 'CONTACT_CONFIRMED'::lead_status;
  ELSIF old_stage = 'Nouveau Lead' OR old_lead_status = 'nouveau' THEN
    RETURN 'NEW_LEAD'::lead_status;
  ELSE
    RETURN 'NEW_LEAD'::lead_status;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Migrer les leads
INSERT INTO crm_leads (
  id,
  first_name,
  last_name,
  email,
  phone,
  address,
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
  id,
  COALESCE(first_name, split_part(name, ' ', 1)),
  COALESCE(last_name, split_part(name, ' ', 2)),
  email,
  phone,
  NULL as address,
  city,
  company_name,
  map_old_status_to_new(stage, lead_status) as status,
  source,
  assigned_to,
  COALESCE(lead_score, 0),
  COALESCE(tags, ARRAY[]::TEXT[]),
  COALESCE(metadata, '{}'::jsonb) || 
    jsonb_build_object(
      'old_stage', stage,
      'old_lead_status', lead_status,
      'migrated_from', 'leads_table'
    ),
  created_at,
  updated_at,
  last_contact_at,
  next_followup_at
FROM leads
ON CONFLICT (id) DO NOTHING;

-- Nettoyer la fonction temporaire
DROP FUNCTION IF EXISTS map_old_status_to_new(TEXT, TEXT);
