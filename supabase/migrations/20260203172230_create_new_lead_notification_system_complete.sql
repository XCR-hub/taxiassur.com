/*
  # Système de Notifications en Temps Réel pour Nouveaux Leads

  1. Nouvelles Tables
    - Table pour tracer les leads vus par chaque utilisateur
    - Optimisation des notifications

  2. Triggers
    - Notification automatique sur nouveau lead
    - Notification sur changement de statut important

  3. Realtime
    - Enable realtime sur crm_event_notifications
    - Enable realtime sur crm_leads
*/

-- Table pour tracker les leads vus par utilisateur (éviter les notifications répétées)
CREATE TABLE IF NOT EXISTS crm_user_lead_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  first_viewed_at timestamptz DEFAULT now(),
  last_viewed_at timestamptz DEFAULT now(),
  view_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_user_lead_views_user ON crm_user_lead_views(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lead_views_lead ON crm_user_lead_views(lead_id);

-- RLS sur user_lead_views
ALTER TABLE crm_user_lead_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own views"
  ON crm_user_lead_views
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fonction pour créer une notification sur nouveau lead
CREATE OR REPLACE FUNCTION notify_new_lead()
RETURNS TRIGGER AS $$
BEGIN
  -- Insérer une notification importante pour tous les commerciaux
  INSERT INTO crm_event_notifications (
    lead_id,
    notification_type,
    title,
    message,
    priority,
    action_url,
    metadata
  )
  VALUES (
    NEW.id,
    'new_lead',
    'Nouveau Lead!',
    'Nouveau lead: ' || COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, NEW.email),
    'high',
    '/backoffice/crm/lead/' || NEW.id,
    jsonb_build_object(
      'lead_id', NEW.id,
      'email', NEW.email,
      'phone', NEW.phone,
      'status', NEW.status,
      'created_at', NEW.created_at
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur insertion de lead
DROP TRIGGER IF EXISTS trigger_notify_new_lead ON crm_leads;
CREATE TRIGGER trigger_notify_new_lead
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead();

-- Fonction pour notifier sur changement de statut important
CREATE OR REPLACE FUNCTION notify_lead_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_priority text := 'medium';
  v_title text;
  v_message text;
BEGIN
  -- Ignorer si le statut n'a pas changé
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Déterminer la priorité et le message selon le nouveau statut
  CASE NEW.status
    WHEN 'DOCUMENTS_VALIDES' THEN
      v_priority := 'high';
      v_title := 'Documents Validés';
      v_message := 'Tous les documents de ' || COALESCE(NEW.first_name, NEW.email) || ' ont été validés';
    WHEN 'ATTENTE_SIGNATURE' THEN
      v_priority := 'high';
      v_title := 'En Attente de Signature';
      v_message := COALESCE(NEW.first_name, NEW.email) || ' doit signer le contrat';
    WHEN 'CLIENT_ACTIF' THEN
      v_priority := 'high';
      v_title := 'Nouveau Client!';
      v_message := COALESCE(NEW.first_name, NEW.email) || ' est maintenant client actif';
    WHEN 'CLIENT_LOST' THEN
      v_priority := 'medium';
      v_title := 'Lead Perdu';
      v_message := 'Lead ' || COALESCE(NEW.first_name, NEW.email) || ' marqué comme perdu';
    ELSE
      -- Ne pas notifier pour les autres changements de statut
      RETURN NEW;
  END CASE;

  -- Insérer la notification
  INSERT INTO crm_event_notifications (
    lead_id,
    notification_type,
    title,
    message,
    priority,
    action_url,
    metadata
  )
  VALUES (
    NEW.id,
    'status_change',
    v_title,
    v_message,
    v_priority,
    '/backoffice/crm/lead/' || NEW.id,
    jsonb_build_object(
      'lead_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur update de statut
DROP TRIGGER IF EXISTS trigger_notify_lead_status_change ON crm_leads;
CREATE TRIGGER trigger_notify_lead_status_change
  AFTER UPDATE OF status ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_lead_status_change();

-- Enable Realtime sur les tables critiques
ALTER PUBLICATION supabase_realtime ADD TABLE crm_event_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE crm_leads;

-- Fonction RPC pour marquer une notification comme lue
CREATE OR REPLACE FUNCTION mark_notification_as_read(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE crm_event_notifications
  SET 
    read = true,
    read_at = now()
  WHERE id = p_notification_id;

  RETURN true;
END;
$$;

-- Fonction RPC pour marquer toutes les notifications comme lues
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE crm_event_notifications
  SET 
    read = true,
    read_at = now()
  WHERE read = false;

  RETURN true;
END;
$$;