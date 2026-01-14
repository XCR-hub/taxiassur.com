/*
  # Activation RLS pour crm_event_notifications
  
  ## Problème
  - La table crm_event_notifications n'a pas de politique RLS
  - Les notifications ne peuvent pas être lues depuis le frontend
  
  ## Solution
  - Activer RLS sur la table
  - Permettre la lecture à tous les utilisateurs authentifiés
  - Permettre l'insertion via les triggers (service role)
  
  ## Sécurité
  - Les notifications sont visibles par tous les admins
  - Seuls les triggers peuvent créer des notifications
*/

-- Activer RLS si pas déjà fait
ALTER TABLE crm_event_notifications ENABLE ROW LEVEL SECURITY;

-- Politique de lecture : tous les admins peuvent lire toutes les notifications
DROP POLICY IF EXISTS "Admins can read all notifications" ON crm_event_notifications;
CREATE POLICY "Admins can read all notifications"
  ON crm_event_notifications
  FOR SELECT
  TO authenticated
  USING (true);

-- Politique de mise à jour : admins peuvent marquer comme lu
DROP POLICY IF EXISTS "Admins can update notifications" ON crm_event_notifications;
CREATE POLICY "Admins can update notifications"
  ON crm_event_notifications
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Politique d'insertion : seulement via service role (triggers)
DROP POLICY IF EXISTS "Service role can insert notifications" ON crm_event_notifications;
CREATE POLICY "Service role can insert notifications"
  ON crm_event_notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Commentaire
COMMENT ON TABLE crm_event_notifications IS 
  'Notifications CRM en temps réel. Visibles par tous les admins. Créées automatiquement par les triggers.';
