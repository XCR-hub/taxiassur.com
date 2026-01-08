/*
  # Synchronisation automatique leads → crm_leads

  ## Problème
  - Les formulaires frontend insèrent dans la table `leads` (ancienne)
  - Le CRM Pipeline lit depuis la table `crm_leads` (nouvelle)
  - Aucune synchronisation automatique n'existe
  - Résultat: les nouveaux leads n'apparaissent pas dans le pipeline

  ## Solution
  1. Créer un trigger qui copie automatiquement chaque nouveau lead vers crm_leads
  2. Ajouter une politique RLS pour permettre aux utilisateurs anonymes d'insérer dans crm_leads
  3. Mapper correctement les statuts entre les deux schémas

  ## Sécurité
  - Les utilisateurs anonymes peuvent uniquement INSERT
  - Tous les autres accès nécessitent l'authentification admin
*/

-- Fonction de synchronisation automatique
CREATE OR REPLACE FUNCTION sync_lead_to_crm_leads()
RETURNS TRIGGER AS $$
BEGIN
  -- Mapper le statut de l'ancien format vers le nouveau
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
  ) VALUES (
    NEW.id,
    COALESCE(NEW.first_name, split_part(NEW.name, ' ', 1)),
    COALESCE(NEW.last_name, split_part(NEW.name, ' ', 2)),
    NEW.email,
    NEW.phone,
    NULL,
    NEW.city,
    NEW.company_name,
    CASE
      WHEN NEW.stage = 'Contact Établi' OR NEW.lead_status = 'contacté' THEN 'CONTACT_CONFIRMED'::lead_status
      WHEN NEW.stage = 'Nouveau Lead' OR NEW.lead_status = 'nouveau' THEN 'NEW_LEAD'::lead_status
      ELSE 'NEW_LEAD'::lead_status
    END,
    COALESCE(NEW.source, 'website'),
    NEW.assigned_to,
    COALESCE(NEW.lead_score, 0),
    COALESCE(NEW.tags, ARRAY[]::TEXT[]),
    COALESCE(NEW.metadata, '{}'::jsonb) ||
      jsonb_build_object(
        'old_stage', NEW.stage,
        'old_lead_status', NEW.lead_status,
        'synced_from', 'leads_table',
        'immatriculation', NEW.immatriculation
      ),
    NEW.created_at,
    NEW.updated_at,
    NEW.last_contact_at,
    NEW.next_followup_at
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = COALESCE(EXCLUDED.first_name, crm_leads.first_name),
    last_name = COALESCE(EXCLUDED.last_name, crm_leads.last_name),
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    city = EXCLUDED.city,
    company_name = EXCLUDED.company_name,
    source = EXCLUDED.source,
    assigned_to = EXCLUDED.assigned_to,
    lead_score = EXCLUDED.lead_score,
    tags = EXCLUDED.tags,
    metadata = EXCLUDED.metadata,
    updated_at = EXCLUDED.updated_at,
    last_contact_at = EXCLUDED.last_contact_at,
    next_followup_at = EXCLUDED.next_followup_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger pour synchroniser automatiquement
DROP TRIGGER IF EXISTS sync_new_lead_to_crm ON leads;
CREATE TRIGGER sync_new_lead_to_crm
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION sync_lead_to_crm_leads();

-- Ajouter politique RLS pour permettre l'insertion anonyme dans crm_leads
-- Cela permettra à terme de migrer complètement vers crm_leads
CREATE POLICY "Anonymous users can insert leads"
  ON crm_leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Commenter pour documentation
COMMENT ON FUNCTION sync_lead_to_crm_leads() IS 'Synchronise automatiquement les nouveaux leads de la table leads vers crm_leads';
COMMENT ON TRIGGER sync_new_lead_to_crm ON leads IS 'Trigger de synchronisation automatique vers crm_leads';
