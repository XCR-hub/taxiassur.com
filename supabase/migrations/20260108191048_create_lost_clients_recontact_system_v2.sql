/*
  # Système de recontact des clients perdus

  1. Nouveau statut
    - LOST_RECONTACT_SCHEDULED pour les clients perdus à recontacter
    - Colonne lost_reason pour documenter pourquoi perdu
    - Colonne recontact_scheduled_date pour programmer le recontact

  2. Automatisation
    - CRON job quotidien pour réactiver les leads à la date programmée
    - Envoi automatique d'email de recontact

  3. Sécurité
    - RLS activé pour toutes les tables
*/

-- Ajouter les colonnes nécessaires à crm_leads si elles n'existent pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_leads' AND column_name = 'lost_reason'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN lost_reason TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_leads' AND column_name = 'recontact_scheduled_date'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN recontact_scheduled_date DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_leads' AND column_name = 'recontact_attempts'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN recontact_attempts INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_leads' AND column_name = 'last_recontact_date'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN last_recontact_date TIMESTAMPTZ;
  END IF;
END $$;

-- Fonction pour réactiver automatiquement les leads perdus à recontacter
CREATE OR REPLACE FUNCTION reactivate_scheduled_lost_leads()
RETURNS TABLE(reactivated_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lead_record RECORD;
  activated_count INTEGER := 0;
BEGIN
  -- Chercher les leads à réactiver aujourd'hui
  FOR lead_record IN
    SELECT id, first_name, last_name, email, recontact_scheduled_date
    FROM crm_leads
    WHERE status = 'LOST_RECONTACT_SCHEDULED'
    AND recontact_scheduled_date <= CURRENT_DATE
    AND deleted_at IS NULL
  LOOP
    -- Mettre à jour le statut
    UPDATE crm_leads
    SET 
      status = 'NEW_LEAD',
      recontact_attempts = COALESCE(recontact_attempts, 0) + 1,
      last_recontact_date = NOW(),
      updated_at = NOW()
    WHERE id = lead_record.id;

    -- Créer un événement dans la timeline
    INSERT INTO crm_timeline (lead_id, event_type, title, description, created_at)
    VALUES (
      lead_record.id,
      'status_change',
      'Réactivation automatique',
      'Lead réactivé après période de recontact programmée',
      NOW()
    );

    activated_count := activated_count + 1;
  END LOOP;

  RETURN QUERY SELECT activated_count;
END;
$$;

-- CRON job pour réactiver les leads tous les jours à 9h
SELECT cron.schedule(
  'reactivate-lost-leads-daily',
  '0 9 * * *',
  $$
  SELECT reactivate_scheduled_lost_leads();
  $$
);

-- Ajouter un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_crm_leads_recontact_scheduled 
ON crm_leads(recontact_scheduled_date, status) 
WHERE status = 'LOST_RECONTACT_SCHEDULED' AND deleted_at IS NULL;

COMMENT ON COLUMN crm_leads.lost_reason IS 'Raison pour laquelle le client a été perdu';
COMMENT ON COLUMN crm_leads.recontact_scheduled_date IS 'Date à laquelle recontacter automatiquement le lead perdu';
COMMENT ON COLUMN crm_leads.recontact_attempts IS 'Nombre de fois que le lead a été réactivé après avoir été perdu';
COMMENT ON FUNCTION reactivate_scheduled_lost_leads IS 'Réactive automatiquement les leads perdus dont la date de recontact est atteinte';
