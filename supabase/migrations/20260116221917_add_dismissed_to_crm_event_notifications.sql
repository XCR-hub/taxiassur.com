/*
  # Ajout du champ "dismissed" aux notifications CRM
  
  1. Modifications
    - Ajout de la colonne `dismissed` (boolean, default false) à `crm_event_notifications`
    - Ajout d'un index sur `dismissed` pour les requêtes de filtrage
    - Modification des requêtes pour filtrer les notifications non supprimées
    
  2. Usage
    - `dismissed = false` : notification visible dans le centre
    - `dismissed = true` : notification masquée (traitée)
    - Permet aux commerciaux de "fermer" les notifications traitées
*/

-- Ajouter la colonne dismissed si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_event_notifications' AND column_name = 'dismissed'
  ) THEN
    ALTER TABLE crm_event_notifications ADD COLUMN dismissed boolean DEFAULT false;
  END IF;
END $$;

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_crm_event_notifications_dismissed 
ON crm_event_notifications(dismissed) 
WHERE dismissed = false;

-- Index composite pour les requêtes fréquentes (non dismissed + order by created_at)
CREATE INDEX IF NOT EXISTS idx_crm_event_notifications_active 
ON crm_event_notifications(dismissed, created_at DESC) 
WHERE dismissed = false;

-- Commentaire sur la colonne
COMMENT ON COLUMN crm_event_notifications.dismissed IS 'Indique si la notification a été fermée/traitée par un utilisateur';
