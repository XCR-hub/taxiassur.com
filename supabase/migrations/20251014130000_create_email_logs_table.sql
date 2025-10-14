/*
  # Création de la Table des Logs d'Emails

  ## Description
  Table pour enregistrer tous les emails envoyés aux leads avec leur statut.

  ## Table Créée
  - `email_logs` - Historique des emails envoyés

  ## Sécurité
  - RLS activé pour protéger les données
*/

-- Table des logs d'emails
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  email_type text NOT NULL CHECK (email_type IN ('welcome', 'devis_ready', 'follow_up', 'contract', 'reminder')),
  recipient text NOT NULL,
  subject text NOT NULL,
  sent_at timestamptz DEFAULT NOW(),
  opened_at timestamptz,
  clicked_at timestamptz,
  status text DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_email_logs_lead_id ON email_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

-- Activer RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert email logs"
  ON email_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update email logs"
  ON email_logs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fonction pour obtenir les statistiques d'emails
CREATE OR REPLACE FUNCTION get_email_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_sent', COALESCE((SELECT COUNT(*) FROM email_logs WHERE status = 'sent'), 0),
    'total_opened', COALESCE((SELECT COUNT(*) FROM email_logs WHERE opened_at IS NOT NULL), 0),
    'total_clicked', COALESCE((SELECT COUNT(*) FROM email_logs WHERE clicked_at IS NOT NULL), 0),
    'open_rate', COALESCE((
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::numeric / NULLIF(COUNT(*), 0)) * 100,
        2
      )
      FROM email_logs
      WHERE status = 'sent'
    ), 0),
    'click_rate', COALESCE((
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::numeric / NULLIF(COUNT(*), 0)) * 100,
        2
      )
      FROM email_logs
      WHERE opened_at IS NOT NULL
    ), 0),
    'by_type', (
      SELECT jsonb_object_agg(
        email_type,
        count
      )
      FROM (
        SELECT email_type, COUNT(*) as count
        FROM email_logs
        GROUP BY email_type
      ) t
    )
  ) INTO v_stats;

  RETURN v_stats;
END;
$$;

-- Grant
GRANT EXECUTE ON FUNCTION get_email_stats() TO authenticated, anon;

-- Fonction pour envoyer un email automatiquement lors d'un changement de statut
CREATE OR REPLACE FUNCTION send_automatic_email_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Envoyer un email de bienvenue pour les nouveaux leads
  IF NEW.status = 'nouveau' AND OLD.status IS NULL THEN
    -- Appeler l'Edge Function pour envoyer l'email
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-lead-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_key', true)
      ),
      body := jsonb_build_object(
        'leadId', NEW.id,
        'emailType', 'welcome'
      )
    );
  END IF;

  -- Envoyer un email lorsque le devis est envoyé
  IF NEW.status = 'devis_envoye' AND OLD.status != 'devis_envoye' THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-lead-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_key', true)
      ),
      body := jsonb_build_object(
        'leadId', NEW.id,
        'emailType', 'devis_ready',
        'customData', jsonb_build_object('devisUrl', 'https://taxiassur.com/devis/' || NEW.id)
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Créer le trigger (commenté car nécessite l'extension http)
-- CREATE TRIGGER trigger_send_email_on_status_change
--   AFTER INSERT OR UPDATE OF status ON leads
--   FOR EACH ROW
--   EXECUTE FUNCTION send_automatic_email_on_status_change();

-- Log de création
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'seo_webhook_events'
  ) THEN
    INSERT INTO seo_webhook_events (source, event_type, payload, processed)
    VALUES (
      'system',
      'email_system_created',
      jsonb_build_object(
        'table', 'email_logs',
        'functions', jsonb_build_array('get_email_stats', 'send_automatic_email_on_status_change'),
        'created_at', NOW(),
        'message', 'Système d''emails automatique créé avec succès'
      ),
      true
    );
  END IF;
END $$;
